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

use hdk::{
    api,
    error::{ZomeApiError, ZomeApiResult},
    holochain_core_types::{
        cas::content::Address,
        dna::zome::entry_types::Sharing,
        entry::{entry_type::EntryType, Entry},
        error::{error::ZomeApiInternalResult, HolochainError},
        hash::HashString,
        json::JsonString,
        time::Iso8601,
    },
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
    key_hash: String,
    /// Time of the post creation.
    /// They are used to avoid accidental hash collisions.
    ///
    /// *Should not be used as real timestamp.*
    timestamp: Iso8601,
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
            address: address,
            in_terms_of: in_terms_of,
        }
    }
}

/// Anchor function from anchors zome.
// TODO: `extern crate anchors`?
fn anchor(anchor_type: String, anchor_text: String) -> ZomeApiResult<Address> {
    let anchor: JsonString = Anchor {
        anchor_type: anchor_type,
        anchor_text: anchor_text,
    }
    .into();
    let json_string: String = api::call(
        "anchors",
        "main",
        "anchor",
        format!("{{ \"anchor\": {} }}", anchor).into(),
    )?
    .into();
    match serde_json::from_str::<ZomeApiInternalResult>(&json_string[..]) {
        Ok(result) => match result.ok {
            true => {
                // Remove quotes
                let mut unquoted = result.value[1..].to_owned();
                unquoted.pop();
                return Ok(unquoted.into());
            }
            false => Err(ZomeApiError::Internal(result.error)),
        },
        Err(_) => Err(ZomeApiError::Internal(
            "Could not deserialze anchor".to_owned(),
        )),
    }
}

/// Turn a search query into a JsonString containing the results
fn handle_search(query: Search) -> JsonString {
    fn handle_search_helper(query: Search) -> ZomeApiResult<HMap<Address, InTermsOf>> {
        // TODO: Helper function for `intersection` without impractically large type signature?
        match query {
            Search::And(args) => {
                // convert `args` to `results`: Iterator<Item = HMap<Address, InTermsOf>>
                let mut results = args
                    .into_iter()
                    .filter_map(|arg| handle_search_helper(arg).ok());
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
            Search::Or(args) => Ok(flatten_searches(
                args.into_iter()
                    .filter_map(|arg| handle_search_helper(arg).ok()),
            )),
            Search::Xor(args) => {
                let results =
                    args.into_iter()
                        .filter_map(|arg| match handle_search_helper(arg.clone()) {
                            Ok(result) => Some((arg, result)),
                            Err(_) => None,
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
                    .filter_map(|arg| handle_search_helper(arg).ok());
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
                Ok(api::get_links(&tag_anchor_address, "tag")?
                    .addresses()
                    .iter()
                    .cloned()
                    .map(|address| {
                        let mut in_terms_of = HashSet::new();
                        in_terms_of.insert(tag);
                        (address, in_terms_of)
                    })
                    .collect())
            }
        }
    }
    match handle_search_helper(query) {
        Ok(results) => results
            .into_iter()
            .map(|result| result.into())
            .collect::<Vec<SearchResult>>()
            .into(),
        Err(e) => e.into(),
    }
}

/// Create a post and link to to/from a set of tags
fn handle_create_post(post: Post, tags: Vec<Tag>) -> JsonString {
    fn handle_create_post_helper(post: Post, tags: Vec<Tag>) -> ZomeApiResult<JsonString> {
        let post_entry = Entry::new(EntryType::App("post".to_owned()), post);
        let post_entry_address = api::commit_entry(&post_entry)?;
        for tag in tags {
            let tag_anchor = anchor("tag".to_owned(), tag.to_string())?;
            // Link from post to tag anchor
            api::link_entries(&post_entry_address, &tag_anchor, "tag")?;
            // Link from tag anchor to post
            api::link_entries(&tag_anchor, &post_entry_address, "tag")?;
        }
        Ok(post_entry_address.into())
    }

    match handle_create_post_helper(post, tags) {
        Ok(x) => x,
        Err(e) => e.into(),
    }
}

define_zome! {
    entries: [
        entry!(
            name: "post",
            description: "User post",
            sharing: Sharing::Public,
            native_type: Post,
            validation_package: || ValidationPackageDefinition::Entry,
            validation: |post: Post, ctx: hdk::ValidationData| {
                match HashString::from(post.key_hash) == ctx.sources[0] {
                    true => Ok(()),
                    false => Err("Cannot alter post that is not yours".to_owned()),
                }
            },
            links: [
                // Posts link to tags and are linked from tags
                // TODO: Better way to find if post is in source chain
                // TODO: Verify anchor_text is valid (deserializable to Tag type)
                to!(
                    "anchor",
                    tag: "tag",
                    validation_package: || hdk::ValidationPackageDefinition::ChainHeaders,
                    validation: |base: Address, link: Address, ctx: hdk::ValidationData| {
                        match ctx.package.source_chain_headers {
                            Some(headers) => match headers.iter().map(|header| header.entry_address()).any(|entry_address| entry_address == &base) {
                                true => Ok(()),
                                false => Err("Could not find post in chain.".to_owned()),
                            },
                            None => Err("Internal error: Invalid validation package.".to_owned()),
                        }
                    }
                ),
                from!(
                    "anchor",
                    tag: "tag",
                    validation_package: || hdk::ValidationPackageDefinition::ChainHeaders,
                    validation: |base: Address, link: Address, ctx: hdk::ValidationData| {
                        match ctx.package.source_chain_headers {
                            Some(headers) => match headers.iter().map(|header| header.entry_address()).any(|entry_address| entry_address == &link) {
                                true => Ok(()),
                                false => Err("Could not find post in chain.".to_owned()),
                            },
                            None => Err("Internal error: Invalid validation package.".to_owned()),
                        }
                    }
                )
            ]
        )
    ]

    genesis: || { Ok(()) }

    functions: {
        main(Public) {
            create_post: {
                inputs: |post: Post, tags: Vec<Tag>|,
                outputs: |post_address: Address|,
                handler: handle_create_post
            }
            search: {
                inputs: |query: Search|,
                outputs: |result: Vec<Address>|,
                handler: handle_search
            }
        }
    }
}
