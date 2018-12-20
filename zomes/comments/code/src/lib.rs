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
        cas::content::Address,
        dna::zome::entry_types::Sharing,
        entry::{entry_type::EntryType, Entry},
        error::HolochainError,
        json::JsonString,
        validation::ValidationPackageDefinition,
    },
    EntryAction,
};

/// Represents a users comment
#[derive(Serialize, Deserialize, Debug, DefaultJson)]
struct Comment {
    /// The content of the comment
    content: String,
}

/// Returns `Ok(())` if these comments can be linked in a parent/child
/// relationship without causing problems
fn validate_comment_link(_parent: Address, _child: Address) -> Result<(), String> {
    // TODO: Cycle detection
    Ok(())
}

/// Creates a comment on a target
fn handle_create_comment(comment: Comment, target: Address) -> JsonString {
    fn handle_create_comment_helper(comment: Comment, target: Address) -> ZomeApiResult<Address> {
        let comment_entry = Entry::new(EntryType::App("comment".to_owned()), comment);
        let comment_address = api::commit_entry(&comment_entry)?;
        api::link_entries(&target, &comment_address, "comment")?;
        api::link_entries(&comment_address, &target, "child_of")?;
        Ok(comment_address)
    }

    match handle_create_comment_helper(comment, target) {
        Ok(address) => address.into(),
        Err(e) => e.into(),
    }
}

/// Read a comment
fn handle_read_comment(address: Address) -> JsonString {
    match api::get_entry(address) {
        Ok(Some(entry)) => match serde_json::from_str::<Comment>(entry.value().into()) {
            Ok(comment) => comment.into(),
            Err(_) => "Failed to deserialize entry into comment".into(),
        },
        Ok(None) => JsonString::null(),
        Err(e) => e.into(),
    }
}

/// Update a comment at address `old_address` with the entry `new_entry`
fn handle_update_comment(old_address: Address, new_entry: Comment) -> JsonString {
    let new_comment_entry = Entry::new(EntryType::App("comment".to_owned()), new_entry);
    match api::update_entry("comment", new_comment_entry, old_address) {
        Ok(address) => address.into(),
        Err(e) => e.into(),
    }
}

/// Delete a comment
fn handle_delete_comment(address: Address) -> JsonString {
    match api::remove_entry(address, "Comment removed") {
        Ok(_) => true.to_string().into(),
        Err(_) => false.to_string().into(),
    }
}

/// Return the addresses of entries linked by "comment"
fn handle_comments_from_address(address: Address) -> JsonString {
    fn handle_comments_from_address_helper(address: Address) -> ZomeApiResult<Vec<Address>> {
        Ok(api::get_links(&address, "comment")?.addresses().clone())
    }
    match handle_comments_from_address_helper(address) {
        Ok(links) => links.into(),
        Err(e) => e.into(),
    }
}

define_zome! {
    entries: [
        entry!(
            name: "comment",
            description: "User comment",
            sharing: Sharing::Public,
            native_type: Comment,
            validation_package: || ValidationPackageDefinition::ChainHeaders,
            // TODO: Better way to find if post is in source chain
            validation: |comment: Comment, ctx: hdk::ValidationData| {
                match ctx.action {
                    EntryAction::Commit => Ok(()),
                    _ => {
                        let comment_address = match hdk::entry_address(&Entry::new(EntryType::App("comment".to_owned()), comment)) {
                            Ok(address) => address,
                            Err(e) => return Err("Couldn't get address of comment.".to_owned()),
                        };
                        match ctx.package.source_chain_headers {
                            Some(headers) =>
                                if headers
                                    .iter()
                                    .map(|header| header.entry_address())
                                    .any(|entry_address| entry_address == &comment_address)
                                {
                                    Ok(())
                                } else {
                                    Err("Cannot alter comment that is not yours.".to_owned())
                                },
                            None => Err("Invalid validation package.".to_owned())
                        }
                    }
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

    functions: {
        main(Public) {
            create_comment: {
                inputs: |comment: Comment, target: Address|,
                outputs: |address: Address|,
                handler: handle_create_comment
            }
            read_comment: {
                inputs: |address: Address|,
                outputs: |comment: Comment|,
                handler: handle_read_comment
            }
            update_comment: {
                inputs: |old_address: Address, new_entry: Comment|,
                outputs: |new_comment: Address|,
                handler: handle_update_comment
            }
            delete_comment: {
                inputs: |address: Address|,
                outputs: |ok: bool|,
                handler: handle_delete_comment
            }
            comments_from_address: {
                inputs: |address: Address|,
                outputs: |comments: Vec<Address>|,
                handler: handle_comments_from_address
            }
        }
    }
}
