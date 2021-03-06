#[macro_use]
extern crate hdk;
extern crate serde;
#[macro_use]
extern crate serde_derive;
extern crate serde_json;
#[macro_use]
extern crate holochain_json_derive;

use hdk::utils;
use hdk::{
    api,
    holochain_json_api::{ json::JsonString, error::JsonError },
    error::{ ZomeApiResult, ZomeApiError },
    EntryValidationData,
    LinkValidationData,
    holochain_core_types::{
        dna::entry_types::Sharing, entry::Entry,
        time::Iso8601, validation::ValidationPackageDefinition, link::LinkMatch
    },
    holochain_persistence_api::cas::content::Address,
};

/// Represents a users comment
#[derive(Serialize, Deserialize, Debug, DefaultJson, Clone)]
struct Comment {
    /// The content of the comment
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

/// The type of comment that the "client" will give the "server".
/// Missing `key_hash` and `timestamp` from `Comment`
#[derive(Serialize, Deserialize, Debug, DefaultJson)]
struct CommentContent {
    content: String,
    utc_unix_time: u64,
}

impl Into<Comment> for CommentContent {
    fn into(self) -> Comment {
        Comment {
            content: self.content,
            key_hash: api::AGENT_ADDRESS.clone(),
            timestamp: self.utc_unix_time.into(),
        }
    }
}

/// Returns `Ok(())` if these comments can be linked in a parent/child
/// relationship without causing problems
fn validate_comment_link(_parent: &Address, _child: &Address) -> Result<(), String> {
    // TODO: Cycle detection
    Ok(())
}

/// Creates a comment on a target
fn handle_create_comment(comment: CommentContent, target: Address) -> ZomeApiResult<Address> {
    handle_create_comment_raw(comment.into(), target)
}

/// Create a post given a full `Post` struct, including `timestamp` and
/// `key_hash`
fn handle_create_comment_raw(comment: Comment, target: Address) -> ZomeApiResult<Address> {
    let target_type = match api::get_entry(&target)? {
        Some(Entry::App(t, _)) => t,
        _ => return Err(ZomeApiError::Internal("Comment target was not app entry.".to_string())),
    };

    let (link1type, link2type) = match Into::<String>::into(target_type).as_ref() {
        "post" => ("comment_on_post", "child_of_post"),
        "comment" => ("comment_on_comment", "child_of_comment"),
        _ => return Err(ZomeApiError::Internal("Comment target was not post or comment entry.".to_string())),
    };

    let comment_entry = Entry::App("comment".into(), comment.into());
    let comment_address = api::commit_entry(&comment_entry)?;
    utils::link_entries_bidir(&target, &comment_address, link1type, link2type, "", "")?;
    // Link from author
    api::link_entries(&api::AGENT_ADDRESS, &comment_address, "comment_author", "")?;
    Ok(comment_address)
}

/// Read a comment
fn handle_read_comment(address: Address) -> ZomeApiResult<Comment> {
    utils::get_as_type(address)
}

/// Update a comment at address `old_address` with the entry `new_entry`
fn handle_update_comment(
    old_address: Address,
    new_entry: CommentContent,
) -> ZomeApiResult<Address> {
    let new_entry: Comment = new_entry.into();
    let new_comment_entry = Entry::App("comment".into(), new_entry.into());
    api::update_entry(new_comment_entry, &old_address)
}

/// Delete a comment
fn handle_delete_comment(address: Address) -> ZomeApiResult<Address> {
    for post_parent in api::get_links(&address, LinkMatch::Exactly("child_of_post"), LinkMatch::Any)?.addresses() {
        api::remove_link(
            &post_parent,
            &address,
            "comment_on_post",
            "",
        ).ok();
    }
    for comment_parent in api::get_links(&address, LinkMatch::Exactly("child_of_comment"), LinkMatch::Any)?.addresses() {
        api::remove_link(
            &comment_parent,
            &address,
            "comment_on_comment",
            "",
        ).ok();
    }
    api::remove_entry(&address)
}

/// Return the addresses of entries linked by "comment"
fn handle_comments_from_address(address: Address) -> ZomeApiResult<Vec<Address>> {
    Ok(api::get_links(&address, LinkMatch::Regex("comment_on_\\w+"), LinkMatch::Any)?.addresses().clone())
}

define_zome! {
    entries: [
        entry!(
            name: "comment",
            description: "User comment",
            sharing: Sharing::Public,

            validation_package: || ValidationPackageDefinition::Entry,
            validation: |entry_validation_data: hdk::EntryValidationData<Comment>| {
                let not_ok = Err("Cannot alter comment that is not yours.".to_string());
                match entry_validation_data {
                    EntryValidationData::Create {
                        entry: comment,
                        validation_data,
                    } => {
                        let provenances = validation_data.package.chain_header.provenances();
                        if provenances.iter().all(|provenance| provenance.0 == comment.key_hash) {
                            Ok(())
                        } else {
                            not_ok
                        }
                    }
                    EntryValidationData::Modify {
                        new_entry: new_comment,
                        old_entry: old_comment,
                        old_entry_header,
                        validation_data,
                    } => {
                        let mut provenances = validation_data.package.chain_header.provenances()
                            .iter()
                            .chain(old_entry_header.provenances());
                        if old_comment.key_hash == new_comment.key_hash
                            && provenances.all(|provenance| provenance.0 == old_comment.key_hash)
                        {
                            Ok(())
                        } else {
                            not_ok
                        }
                    }
                    EntryValidationData::Delete {
                        old_entry: old_comment,
                        old_entry_header,
                        validation_data,
                    } => {
                        let mut provenances = validation_data.package.chain_header.provenances()
                            .iter()
                            .chain(old_entry_header.provenances());
                        if provenances.all(|provenance| provenance.0 == old_comment.key_hash)
                        {
                            Ok(())
                        } else {
                            not_ok
                        }
                    }
                }
            },
            links: [
                // Tags applies from base to link
                // Comments can be made on other comments
                from!(
                    "comment",
                    link_type: "comment_on_comment",
                    validation_package: || ValidationPackageDefinition::Entry,
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
                        if link.link.tag() != "" {
                            return Err("Tag must be the empty string".to_string());
                        }
                        validate_comment_link(link.link().base(), link.link().target())
                    }
                ),
                to!(
                    "comment",
                    link_type: "child_of_comment",
                    validation_package: || ValidationPackageDefinition::Entry,
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
                        if link.link.tag() != "" {
                            return Err("Tag must be the empty string".to_string());
                        }
                        validate_comment_link(link.link().target(), link.link().base())
                    }
                ),
                // Comments can be made on posts
                from!(
                    "post",
                    link_type: "comment_on_post",
                    validation_package: || ValidationPackageDefinition::Entry,
                    validation: |link_validation_data: hdk::LinkValidationData| {
                        // TODO: Should linking to the same comment from
                        // different posts be disallowed?
                        Ok(())
                    }
                ),
                to!(
                    "post",
                    link_type: "child_of_post",
                    validation_package: || ValidationPackageDefinition::Entry,
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
                        if link.link.tag() != "" {
                            return Err("Tag must be the empty string".to_string());
                        }
                        validate_comment_link(link.link().target(), link.link().base())
                    }
                ),
                // Comments links from (to implicit by `key_hash` field) their author's key hash
                from!(
                    "%agent_id",
                    link_type: "comment_author",
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
                        match utils::get_as_type::<Comment>(link.link().target().clone()) {
                            Ok(comment) => {
                                if &comment.key_hash == link.link().base() {
                                    Ok(())
                                } else {
                                    Err("Cannot link to comment from author not in `key_hash`".to_owned())
                                }
                            },
                            Err(_) => Err("Link was not comment".to_owned())
                        }
                    }
                )
            ]
        )
    ]

    init: || { Ok(()) }

    validate_agent: |validation_data: EntryValidationData::<AgentId>| {{
        Ok(())
    }}

    functions: [
        create_comment: {
            inputs: |comment: CommentContent, target: Address|,
            outputs: |address: ZomeApiResult<Address>|,
            handler: handle_create_comment
        }
        create_comment_raw: {
            inputs: |comment: Comment, target: Address|,
            outputs: |address: ZomeApiResult<Address>|,
            handler: handle_create_comment_raw
        }
        read_comment: {
            inputs: |address: Address|,
            outputs: |comment: ZomeApiResult<Comment>|,
            handler: handle_read_comment
        }
        update_comment: {
            inputs: |old_address: Address, new_entry: CommentContent|,
            outputs: |new_comment: ZomeApiResult<Address>|,
            handler: handle_update_comment
        }
        delete_comment: {
            inputs: |address: Address|,
            outputs: |result: ZomeApiResult<Address>|,
            handler: handle_delete_comment
        }
        comments_from_address: {
            inputs: |address: Address|,
            outputs: |comments: ZomeApiResult<Vec<Address>>|,
            handler: handle_comments_from_address
        }
    ]

    traits: {
        hc_public [
            create_comment,
            read_comment,
            update_comment,
            delete_comment,
            comments_from_address
        ]
    }
}
