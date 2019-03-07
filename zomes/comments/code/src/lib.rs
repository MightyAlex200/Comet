#![feature(try_from)]

#[macro_use]
extern crate hdk;
extern crate serde;
#[macro_use]
extern crate serde_derive;
extern crate serde_json;
#[macro_use]
extern crate holochain_core_types_derive;

use hdk::{
    api,
    error::ZomeApiResult,
    holochain_core_types::{
        cas::content::Address, dna::entry_types::Sharing, entry::Entry, error::HolochainError,
        hash::HashString, json::JsonString, time::Iso8601, validation::ValidationPackageDefinition,
    },
};

/// Represents a users comment
#[derive(Serialize, Deserialize, Debug, DefaultJson)]
struct Comment {
    /// The content of the comment
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

/// Returns `Ok(())` if these comments can be linked in a parent/child
/// relationship without causing problems
fn validate_comment_link(_parent: Address, _child: Address) -> Result<(), String> {
    // TODO: Cycle detection
    Ok(())
}

/// Creates a comment on a target
fn handle_create_comment(comment: Comment, target: Address) -> ZomeApiResult<Address> {
    let comment_entry = Entry::App("comment".into(), comment.into());
    let comment_address = api::commit_entry(&comment_entry)?;
    api::link_entries(&target, &comment_address, "comment")?;
    api::link_entries(&comment_address, &target, "child_of")?;
    Ok(comment_address)
}

/// Read a comment
fn handle_read_comment(address: Address) -> ZomeApiResult<Option<Entry>> {
    api::get_entry(&address)
}

/// Update a comment at address `old_address` with the entry `new_entry`
fn handle_update_comment(old_address: Address, new_entry: Comment) -> ZomeApiResult<Address> {
    let new_comment_entry = Entry::App("comment".into(), new_entry.into());
    api::update_entry(new_comment_entry, &old_address)
}

/// Delete a comment
fn handle_delete_comment(address: Address) -> ZomeApiResult<()> {
    api::remove_entry(&address)
}

/// Return the addresses of entries linked by "comment"
fn handle_comments_from_address(address: Address) -> ZomeApiResult<Vec<Address>> {
    Ok(api::get_links(&address, "comment")?.addresses().clone())
}

define_zome! {
    entries: [
        entry!(
            name: "comment",
            description: "User comment",
            sharing: Sharing::Public,
            native_type: Comment,
            validation_package: || ValidationPackageDefinition::Entry,
            validation: |comment: Comment, ctx: hdk::ValidationData| {
                match HashString::from(comment.key_hash) == ctx.sources()[0] {
                    true => Ok(()),
                    false => Err("Cannot alter comment that is not yours".to_owned()),
                }
            },
            links: [
                // Tags applies from base to link
                // Comments can be made on other comments
                from!(
                    "comment",
                    tag: "comment",
                    validation_package: || ValidationPackageDefinition::Entry,
                    validation: |base: Address, link: Address, _ctx: hdk::ValidationData| {
                        validate_comment_link(base, link)
                    }
                ),
                to!(
                    "comment",
                    tag: "child_of",
                    validation_package: || ValidationPackageDefinition::Entry,
                    validation: |base: Address, link: Address, _ctx: hdk::ValidationData| {
                        validate_comment_link(link, base)
                    }
                ),
                // Comments can be made on posts
                from!(
                    "post",
                    tag: "comment",
                    validation_package: || ValidationPackageDefinition::Entry,
                    validation: |base: Address, link: Address, _ctx: hdk::ValidationData| {
                        // TODO: Should linking to the same comment from
                        // different posts be disallowed?
                        Ok(())
                    }
                ),
                to!(
                    "post",
                    tag: "child_of",
                    validation_package: || ValidationPackageDefinition::Entry,
                    validation: |base: Address, link: Address, _ctx: hdk::ValidationData| {
                        validate_comment_link(link, base)
                    }
                )
            ]
        )
    ]

    genesis: || { Ok(()) }

    functions: [
        create_comment: {
            inputs: |comment: Comment, target: Address|,
            outputs: |address: ZomeApiResult<Address>|,
            handler: handle_create_comment
        }
        read_comment: {
            inputs: |address: Address|,
            outputs: |comment: ZomeApiResult<Option<Entry>>|,
            handler: handle_read_comment
        }
        update_comment: {
            inputs: |old_address: Address, new_entry: Comment|,
            outputs: |new_comment: ZomeApiResult<Address>|,
            handler: handle_update_comment
        }
        delete_comment: {
            inputs: |address: Address|,
            outputs: |ok: ZomeApiResult<()>|,
            handler: handle_delete_comment
        }
        comments_from_address: {
            inputs: |address: Address|,
            outputs: |comments: ZomeApiResult<Vec<Address>>|,
            handler: handle_comments_from_address
        }
    ]

    traits: {
        hc_public [create_comment, read_comment, update_comment, delete_comment, comments_from_address]
    }
}
