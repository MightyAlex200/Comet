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
use std::collections::HashSet;

#[derive(Debug, Clone, DefaultJson, Serialize, Deserialize)]
struct Post {
    title: String,
    content: String,
    key_hash: String,
    timestamp: Iso8601,
}

type Tag = i64;

/// Represents post search queries
#[derive(Serialize, Deserialize, Debug, DefaultJson, Clone)]
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

fn handle_search(query: Search) -> JsonString {
    fn handle_search_helper(query: &Search) -> ZomeApiResult<HashSet<Address>> {
        match query {
            Search::And(args) => match args.first() {
                Some(first) => {
                    let firsts = handle_search_helper(&first)?;
                    let rest = args[1..]
                        .into_iter()
                        .filter_map(|arg| handle_search_helper(&arg).ok());
                    Ok(rest.fold(firsts, |acc, set| acc.intersection(&set).cloned().collect()))
                }
                None => Ok(HashSet::new()),
            },
            Search::Or(args) => Ok(args
                .iter()
                .filter_map(|arg| handle_search_helper(&arg).ok())
                .flatten()
                .collect()),
            Search::Xor(args) => match args.first() {
                Some(first) => {
                    let firsts = handle_search_helper(&first)?;
                    let rest = args[1..]
                        .into_iter()
                        .filter_map(|arg| handle_search_helper(&arg).ok());
                    Ok(rest.fold(firsts, |acc, set| {
                        acc.symmetric_difference(&set).cloned().collect()
                    }))
                }
                None => Ok(HashSet::new()),
            },
            Search::Not(args) => match args.first() {
                Some(first) => {
                    let firsts = handle_search_helper(&first)?;
                    let rest = args[1..]
                        .into_iter()
                        .filter_map(|arg| handle_search_helper(&arg).ok());
                    Ok(rest.fold(firsts, |acc, set| acc.difference(&set).cloned().collect()))
                }
                None => Ok(HashSet::new()),
            },
            Search::Exactly(tag) => {
                let tag_anchor_address = anchor("tag".to_owned(), tag.to_string())?;
                Ok(api::get_links(&tag_anchor_address, "tag")?
                    .addresses()
                    .iter()
                    .cloned()
                    .collect())
            }
        }
    }
    match handle_search_helper(&query) {
        Ok(address) => address.iter().collect::<Vec<_>>().into(),
        Err(e) => e.into(),
    }
}

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
