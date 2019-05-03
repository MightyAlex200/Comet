#![feature(try_from)]

#[macro_use]
extern crate hdk;
extern crate serde;
#[macro_use]
extern crate serde_derive;
extern crate serde_json;
#[macro_use]
extern crate holochain_core_types_derive;
// extern crate anchors;

// use anchors::Anchor;
#[derive(Serialize, Deserialize, Debug, DefaultJson, Clone)]
pub struct Anchor {
    anchor_type: String,
    anchor_text: String,
}

use hdk::utils;
use hdk::{
    api,
    {EntryValidationData, LinkValidationData},
    error::{ZomeApiError, ZomeApiResult},
    holochain_core_types::{
        cas::content::Address, dna::entry_types::Sharing, entry::Entry, error::HolochainError,
        json::JsonString, time::Iso8601,
        chain_header::ChainHeader
    },
    holochain_wasm_utils::api_serialization::get_links::GetLinksResult,
    ValidationPackageDefinition,
};
use std::{
    collections::{HashMap as HMap, HashSet},
    iter::FromIterator,
};

/// Represents a post in Comet, which will be linked to and from:
/// - Tag anchors
/// - Comments
/// - Votes
#[derive(Debug, Clone, DefaultJson, Serialize, Deserialize)]
struct Post {
    title: String,
    /// Body of the post. Intended to be formatted in Markdown.
    content: String,
    /// Key hash of the person who created this post.
    /// Used to avoid malicious hash collisions
    key_hash: Address,
    /// Time of the post creation.
    /// They are used to avoid accidental hash collisions.
    ///
    /// *Should not be used as real timestamp.*
    timestamp: Iso8601,
}

/// The type of post that the "client" will give the "server".
/// Missing `key_hash` and `timestamp` from `Post`
#[derive(Debug, Clone, DefaultJson, Serialize, Deserialize)]
struct PostContent {
    title: String,
    content: String,
    utc_unix_time: u64,
}

impl Into<Post> for PostContent {
    fn into(self) -> Post {
        Post {
            title: self.title,
            content: self.content,
            key_hash: api::AGENT_ADDRESS.clone(),
            timestamp: self.utc_unix_time.into(),
        }
    }
}

/// Type representing "tags", the "things" posts are linked to/from.
/// They are not strings for i18n reasons.
///
/// Must implement `ToString` for anchors.
type Tag = u64;

/// Represents post search queries.
///
/// # Examples
/// `And(vec![Exactly(1), Exactly(2)])` is a search query that would return
/// all posts linked from tag 1 and 2.
///
/// `Not(vec![Xor(vec![9, 3]), Exactly(6)])` is a search query that would
/// return all posts with either (**not** both) 9 or 3 and are not tagged 1.
#[derive(Serialize, Deserialize, Debug, DefaultJson, Clone, PartialEq)]
#[serde(rename_all = "lowercase")]
#[serde(tag = "type", content = "values")]
enum Search {
    /// Returned posts will match all search requirements
    And(Vec<Search>),
    /// Returned posts will match at least one search requirement
    Or(Vec<Search>),
    /// Returned posts will match exactly one search requirement
    Xor(Vec<Search>),
    /// Returned posts will match the first search requirement,
    /// and not match any other
    Not(Vec<Search>),
    /// Returned posts will have this tag
    Exactly(Tag),
}

/// Type that represents the tags a search result was picked for
///
/// For example, `Or(vec![Exactly(1), Exactly(2)])` will return
/// `{1}` for a post tagged with just `1`, `{2}` for a post tagged
/// with `2`, and `{1, 2}` for a post tagged as both.
type InTermsOf = HashSet<Tag>;

/// Struct that represents the original and crosspost tags of a post
///
/// # Examples
/// Let's say that you made a post titled "Hello!", posted it to tags 1 and
/// 2, and then somebody else reposted it to tags 3 and 4. Calling `post_tags`
/// on this post would yield a `PostTags` that looks like this:
///
/// ```
/// PostTags {
///     original_tags: [1, 2],
///     crosspost_tags: [3, 4],
/// }
/// ```
#[derive(Deserialize, Serialize, DefaultJson, Debug)]
struct PostTags {
    original_tags: Vec<Tag>,
    crosspost_tags: Vec<Tag>,
}

/// Flattens an `Iterator` of `HashMap<Address, InTermsOf>` to a
/// `HashMap<Address, InTermsOf>`, combining `InTermsOf`s.
///
/// # Examples
/// `[{'abc' => {2}}, {'abc' => {3}}]` becomes `{'abc' => {2, 3}}`
/// (where `'abc'` represents the address of the post)
fn flatten_searches<T: Iterator<Item = HMap<Address, InTermsOf>>>(
    iter: T,
) -> HMap<Address, InTermsOf> {
    let mut hash_map: HMap<Address, InTermsOf> = HMap::new();
    for iter_hash_map in iter {
        for (address, in_terms_of) in iter_hash_map.into_iter() {
            hash_map
                .entry(address)
                .and_modify(|entry_in_terms_of| {
                    *entry_in_terms_of =
                        HashSet::from_iter(entry_in_terms_of.union(&in_terms_of).cloned());
                })
                .or_insert(in_terms_of);
        }
    }
    hash_map
}

/// Represents the result of a search query. Specifically for
/// serialization.
#[derive(Serialize)]
struct SearchResult {
    address: Address,
    in_terms_of: InTermsOf,
}

impl From<(Address, InTermsOf)> for SearchResult {
    fn from((address, in_terms_of): (Address, InTermsOf)) -> Self {
        SearchResult {
            address,
            in_terms_of,
        }
    }
}

/// Anchor function from anchors zome.
// TODO: `extern crate anchors`?
fn anchor(anchor_type: String, anchor_text: String) -> ZomeApiResult<Address> {
    #[derive(Serialize, Deserialize, Debug, DefaultJson)]
    struct AnchorCallType {
        anchor: Anchor,
    }
    let anchor = Anchor {
        anchor_type,
        anchor_text,
    };
    let json_string: String = api::call(
        hdk::THIS_INSTANCE,
        "anchors",
        Address::from(api::PUBLIC_TOKEN.to_string()),
        "anchor",
        (AnchorCallType { anchor }).into(),
    )?
    .into();
    serde_json::from_str::<ZomeApiResult<Address>>(&json_string)
        .map_err(|_| ZomeApiError::Internal("Failed to deserialize anchor result".to_owned()))
        .and_then(|address_result| address_result)
}

/// Turn a search query into a JsonString containing the results
fn handle_search(query: Search, exclude_crossposts: bool) -> ZomeApiResult<Vec<SearchResult>> {
    fn handle_search_helper(
        query: Search,
        exclude_crossposts: bool,
    ) -> ZomeApiResult<HMap<Address, InTermsOf>> {
        match query {
            Search::And(args) => {
                // convert `args` to `results`: Iterator<Item = HMap<Address, InTermsOf>>
                let mut results = args
                    .into_iter()
                    .filter_map(|arg| handle_search_helper(arg, exclude_crossposts).ok());
                // map `results` to `intersection`: where elements only have *completely* non-unique keys
                let intersection = results.clone().map(|result| {
                    result
                        .into_iter()
                        .filter(|(address, _)| {
                            results.all(|results| results.keys().any(|key| key == address))
                        })
                        .collect()
                });
                // flatten `intersection`
                Ok(flatten_searches(intersection))
            }
            Search::Or(args) => {
                Ok(flatten_searches(args.into_iter().filter_map(|arg| {
                    handle_search_helper(arg, exclude_crossposts).ok()
                })))
            }
            Search::Xor(args) => {
                let results = args.into_iter().filter_map(|arg| {
                    match handle_search_helper(arg.clone(), exclude_crossposts) {
                        Ok(result) => Some((arg, result)),
                        Err(_) => None,
                    }
                });
                // map `results` to `intersection`: where elements only have unique keys
                let intersection = results.clone().map(|(search, result)| {
                    result
                        .clone()
                        .into_iter()
                        .filter(|(address, _)| {
                            results.clone().all(|(f_search, f_result)| {
                                f_search == search || f_result.keys().all(|key| key != address)
                            })
                        })
                        .collect()
                });
                // flatten `intersection`
                Ok(flatten_searches(intersection))
            }
            Search::Not(args) => {
                // convert `args` to `results`: Iterator<Item = HMap<Address, InTermsOf>>
                let mut results = args
                    .into_iter()
                    .filter_map(|arg| handle_search_helper(arg, exclude_crossposts).ok());
                let intersection = match results.next() {
                    Some(result) => result.into_iter().filter(|(address, _)| {
                        results
                            .clone()
                            .all(|result| !result.keys().any(|key| key == address))
                    }),
                    None => return Ok(HMap::new()),
                };
                // flatten `intersection`
                Ok(intersection.collect())
            }
            Search::Exactly(tag) => {
                let tag_anchor_address = anchor("tag".to_owned(), tag.to_string())?;
                let original_links = api::get_links(&tag_anchor_address, "original_tag")?;
                let original_tags = original_links.addresses().into_iter().map(|address| {
                    let mut in_terms_of = HashSet::new();
                    in_terms_of.insert(tag);
                    (address, in_terms_of)
                });
                if exclude_crossposts {
                    Ok(original_tags.collect())
                } else {
                    let crosspost_links = api::get_links(&tag_anchor_address, "crosspost_tag")?;
                    let crosspost_tags =
                        crosspost_links.addresses().into_iter().map(|address| {
                            let mut in_terms_of = HashSet::new();
                            in_terms_of.insert(tag);
                            (address, in_terms_of)
                        });
                    Ok(original_tags.chain(crosspost_tags).collect())
                }
            }
        }
    }
    handle_search_helper(query, exclude_crossposts).map(|hmap| {
        hmap.into_iter()
            .map(|result| result.into())
            .collect::<Vec<SearchResult>>()
    })
}

/// Create a post and link to to/from a set of tags
fn handle_create_post(post: PostContent, tags: Vec<Tag>) -> ZomeApiResult<Address> {
    handle_create_post_raw(post.into(), tags)
}

/// Create a post given a full `Post` struct, including `timestamp` and
/// `key_hash`
fn handle_create_post_raw(post: Post, tags: Vec<Tag>) -> ZomeApiResult<Address> {
    let post_entry = Entry::App("post".into(), post.into());
    let post_entry_address = api::commit_entry(&post_entry)?;
    for tag in tags {
        let tag_anchor = anchor("tag".to_owned(), tag.to_string())?;
        // Link from post to tag anchor and vice versa
        utils::link_entries_bidir(
            &post_entry_address,
            &tag_anchor,
            "original_tag",
            "original_tag",
        )?;
        // Link from author
        api::link_entries(&api::AGENT_ADDRESS, &post_entry_address, "author")?;
    }
    Ok(post_entry_address)
}

/// Read a post into a JsonString
fn handle_read_post(address: Address) -> ZomeApiResult<Post> {
    utils::get_as_type(address)
}

/// Update a post at address `old_address` with the entry `new_entry`
fn handle_update_post(old_address: Address, new_entry: PostContent) -> ZomeApiResult<Address> {
    let new_entry: Post = new_entry.into();
    api::update_entry(Entry::App("post".into(), new_entry.into()), &old_address)
}

/// Delete a post
fn handle_delete_post(address: Address) -> ZomeApiResult<Address> {
    api::remove_entry(&address)
}

/// Determine if a post to anchor link is valid. Returns
/// `Ok(())` if it is, `Err(e)` when it's not where `e`
/// is a `String` detailing why it is not valid.
fn post_anchor_link_valid(
    post_address: Address,
    anchor_address: Address,
    source_chain_headers: Option<Vec<ChainHeader>>,
    must_be_author: bool,
) -> Result<(), String> {
    // TODO: Better way to find if post is in source chain
    match source_chain_headers {
        Some(headers) => {
            if !must_be_author
                || headers
                    .iter()
                    .map(|header| header.entry_address())
                    .any(|entry_address| entry_address == &post_address)
            {
                match utils::get_as_type::<Anchor>(anchor_address) {
                    Ok(anchor) => match serde_json::from_str::<Tag>(&anchor.anchor_text) {
                        Ok(_) => Ok(()),
                        Err(_) => Err("`anchor_text` is not a valid tag.".to_owned()),
                    },
                    Err(_) => Err("Error getting link entry.".to_owned()),
                }
            } else {
                Err("Could not find post in chain.".to_owned())
            }
        }
        None => Err("Internal error: Invalid validation package.".to_owned()),
    }
}

/// "Crosspost" a post to a set of tags
/// Return Ok(()) if the action completely successfully
fn handle_crosspost(post_address: Address, tags: Vec<Tag>) -> ZomeApiResult<()> {
    for tag in tags {
        let tag_anchor = anchor("tag".to_owned(), tag.to_string())?;
        utils::link_entries_bidir(&tag_anchor, &post_address, "crosspost_tag", "crosspost_tag")?;
    }
    Ok(())
}

/// Get the tags of a post.
/// Returned as a json with the structure
/// ```
/// {
///     original_tags: Vec<Tag>,
///     crosspost_tags: Vec<Tag>,
/// }
/// ```
fn handle_post_tags(address: Address) -> ZomeApiResult<PostTags> {
    fn get_tags(links: GetLinksResult) -> Vec<Tag> {
        links
            .addresses()
            .iter()
            .cloned()
            .filter_map(|address| match utils::get_as_type::<Anchor>(address) {
                Ok(anchor) => match serde_json::from_str::<Tag>(&anchor.anchor_text) {
                    Ok(tag) => Some(tag),
                    Err(_) => None,
                },
                _ => None,
            })
            .collect()
    }

    match (
        api::get_links(&address, "original_tag"),
        api::get_links(&address, "crosspost_tag"),
    ) {
        (Ok(original_tags), Ok(crosspost_tags)) => Ok(PostTags {
            original_tags: get_tags(original_tags),
            crosspost_tags: get_tags(crosspost_tags),
        }),
        (Err(e), _) => Err(e),
        (_, Err(e)) => Err(e),
    }
}

/// Return the addresses of posts a user has made by their key address
fn handle_user_posts(author: Address) -> ZomeApiResult<Vec<Address>> {
    api::get_links(&author, "author").map(|links| links.addresses())
}

define_zome! {
    entries: [
        entry!(
            name: "post",
            description: "User post",
            sharing: Sharing::Public,
            
            validation_package: || ValidationPackageDefinition::Entry,
            validation: |entry_validation_data: hdk::EntryValidationData<Post>| {
                let not_ok = Err("Cannot alter post that is not yours.".to_string());
                match entry_validation_data {
                    EntryValidationData::Create {
                        entry: post,
                        validation_data,
                    } => {
                        let provenances = validation_data.package.chain_header.provenances();
                        if provenances.iter().all(|provenance| provenance.0 == post.key_hash) {
                            Ok(())
                        } else {
                            not_ok
                        }
                    }
                    EntryValidationData::Modify {
                        new_entry: new_post,
                        old_entry: old_post,
                        old_entry_header,
                        validation_data,
                    } => {
                        let mut provenances = validation_data.package.chain_header.provenances()
                            .iter()
                            .chain(old_entry_header.provenances());
                        if old_post.key_hash == new_post.key_hash
                            && provenances.all(|provenance| provenance.0 == old_post.key_hash)
                        {
                            Ok(())
                        } else {
                            not_ok
                        }
                    }
                    EntryValidationData::Delete {
                        old_entry: old_post,
                        old_entry_header,
                        validation_data,
                    } => {
                        let mut provenances = validation_data.package.chain_header.provenances()
                            .iter()
                            .chain(old_entry_header.provenances());
                        if provenances.all(|provenance| provenance.0 == old_post.key_hash)
                        {
                            Ok(())
                        } else {
                            not_ok
                        }
                    }
                }
            },
            links: [
                // Posts link to and from their original tags
                to!(
                    "anchor",
                    tag: "original_tag",
                    validation_package: || hdk::ValidationPackageDefinition::ChainHeaders,
                    validation: |link_validation_data: hdk::LinkValidationData| {
                        let (link, validation_data) = match link_validation_data {
                            LinkValidationData::LinkAdd {
                                link,
                                validation_data,
                            } => (link, validation_data),
                            LinkValidationData::LinkRemove {
                                link,
                                validation_data,
                            } => (link, validation_data),
                        };
                        post_anchor_link_valid(
                            link.link().base().clone(),
                            link.link().target().clone(),
                            validation_data.package.source_chain_headers,
                            true,
                        )
                    }
                ),
                from!(
                    "anchor",
                    tag: "original_tag",
                    validation_package: || hdk::ValidationPackageDefinition::ChainHeaders,
                    validation: |link_validation_data: hdk::LinkValidationData| {
                        let (link, validation_data) = match link_validation_data {
                            LinkValidationData::LinkAdd {
                                link,
                                validation_data,
                            } => (link, validation_data),
                            LinkValidationData::LinkRemove {
                                link,
                                validation_data,
                            } => (link, validation_data),
                        };
                        post_anchor_link_valid(
                            link.link().target().clone(),
                            link.link().base().clone(),
                            validation_data.package.source_chain_headers,
                            true,
                        )
                    }
                ),
                // Posts link to and from crossposted tags
                to!(
                    "anchor",
                    tag: "crosspost_tag",
                    validation_package: || hdk::ValidationPackageDefinition::ChainHeaders,
                    validation: |link_validation_data: hdk::LinkValidationData| {
                        let (link, validation_data) = match link_validation_data {
                            LinkValidationData::LinkAdd {
                                link,
                                validation_data,
                            } => (link, validation_data),
                            LinkValidationData::LinkRemove {
                                link,
                                validation_data,
                            } => (link, validation_data),
                        };
                        post_anchor_link_valid(
                            link.link().base().clone(),
                            link.link().target().clone(),
                            validation_data.package.source_chain_headers,
                            false,
                        )
                    }
                ),
                from!(
                    "anchor",
                    tag: "crosspost_tag",
                    validation_package: || hdk::ValidationPackageDefinition::ChainHeaders,
                    validation: |link_validation_data: hdk::LinkValidationData| {
                        let (link, validation_data) = match link_validation_data {
                            LinkValidationData::LinkAdd {
                                link,
                                validation_data,
                            } => (link, validation_data),
                            LinkValidationData::LinkRemove {
                                link,
                                validation_data,
                            } => (link, validation_data),
                        };
                        post_anchor_link_valid(
                            link.link().target().clone(),
                            link.link().base().clone(),
                            validation_data.package.source_chain_headers,
                            false,
                        )
                    }
                ),
                // Posts links from (to implicit by `key_hash` field) their author's key hash
                from!(
                    "%agent_id",
                    tag: "author",
                    validation_package: || hdk::ValidationPackageDefinition::Entry,
                    validation: |link_validation_data: hdk::LinkValidationData| {
                        let link = match link_validation_data {
                            LinkValidationData::LinkAdd {
                                link,
                                validation_data,
                            } => link,
                            LinkValidationData::LinkRemove {
                                link,
                                validation_data,
                            } => link,
                        };
                        match utils::get_as_type::<Post>(link.link().target().clone()) {
                            Ok(post) => {
                                if &post.key_hash == link.link().base() {
                                    Ok(())
                                } else {
                                    Err("Cannot link to post from author not in `key_hash`".to_owned())
                                }
                            },
                            Err(_) => Err("Link was not post".to_owned())
                        }
                    }
                )
            ]
        )
    ]

    genesis: || { Ok(()) }

    functions: [
        create_post: {
            inputs: |post: PostContent, tags: Vec<Tag>|,
            outputs: |post_address: ZomeApiResult<Address>|,
            handler: handle_create_post
        }
        create_post_raw: {
            inputs: |post: Post, tags: Vec<Tag>|,
            outputs: |post_address: ZomeApiResult<Address>|,
            handler: handle_create_post_raw
        }
        read_post: {
            inputs: |address: Address|,
            outputs: |post: ZomeApiResult<Post>|,
            handler: handle_read_post
        }
        update_post: {
            inputs: |old_address: Address, new_entry: PostContent|,
            outputs: |new_post: ZomeApiResult<Address>|,
            handler: handle_update_post
        }
        delete_post: {
            inputs: |address: Address|,
            outputs: |ok: ZomeApiResult<Address>|,
            handler: handle_delete_post
        }
        search: {
            inputs: |query: Search, exclude_crossposts: bool|,
            outputs: |result: ZomeApiResult<Vec<SearchResult>>|,
            handler: handle_search
        }
        crosspost: {
            inputs: |post_address: Address, tags: Vec<Tag>|,
            outputs: |ok: ZomeApiResult<()>|,
            handler: handle_crosspost
        }
        post_tags: {
            inputs: |address: Address|,
            outputs: |tags: ZomeApiResult<PostTags>|,
            handler: handle_post_tags
        }
        user_posts: {
            inputs: |author: Address|,
            outputs: |posts: ZomeApiResult<Vec<Address>>|,
            handler: handle_user_posts
        }
    ]

    traits: {
        hc_public [
            create_post,
            create_post_raw,
            read_post,
            update_post,
            delete_post,
            search,
            crosspost,
            post_tags,
            user_posts
        ]
    }
}
