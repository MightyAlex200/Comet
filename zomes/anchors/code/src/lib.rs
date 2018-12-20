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
    },
    EntryAction,
};
use holochain_wasm_utils::api_serialization::get_links::GetLinksResult;

#[derive(Serialize, Deserialize, Debug, DefaultJson, Clone)]
struct Anchor {
    anchor_type: String,
    anchor_text: String,
}

fn handle_anchor(anchor: Anchor) -> JsonString {
    fn handle_anchor_helper(anchor: Anchor) -> ZomeApiResult<JsonString> {
        let anchor_type = anchor.anchor_type.clone();
        let anchor_entry = Entry::new(EntryType::App("anchor".to_owned()), anchor);
        let anchor_address = api::entry_address(&anchor_entry)?;
        // if anchor exists:
        if let Some(_) = api::get_entry(anchor_address.clone())? {
            // return it
            return Ok(anchor_address.into());
        } else {
            let type_anchor = Anchor {
                anchor_type: anchor_type,
                anchor_text: "".to_owned(),
            };
            let type_anchor_entry = Entry::new(EntryType::App("anchor".to_owned()), type_anchor);
            let type_anchor_address = api::entry_address(&type_anchor_entry)?;
            // if type anchor does not exist:
            if api::get_entry(type_anchor_address.clone())? == None {
                let root_anchor = Anchor {
                    anchor_type: "anchor_types".to_owned(),
                    anchor_text: "".to_owned(),
                };
                let root_anchor_entry =
                    Entry::new(EntryType::App("anchor".to_owned()), root_anchor);
                let root_anchor_address = api::entry_address(&root_anchor_entry)?;
                // if root anchor does not exist:
                if api::get_entry(root_anchor_address.clone())? == None {
                    // create it
                    api::commit_entry(&root_anchor_entry)?;
                }
                // create, link type anchor
                let type_anchor_address = api::commit_entry(&type_anchor_entry)?;
                api::link_entries(&root_anchor_address, &type_anchor_address, "")?;
            }
            // create, link, return anchor
            api::commit_entry(&anchor_entry)?;
            api::link_entries(&type_anchor_address, &anchor_address, "")?;
            Ok(anchor_address.into())
        }
    }
    match handle_anchor_helper(anchor) {
        Ok(x) => x,
        Err(e) => e.into(),
    }
}

fn handle_anchor_exists(anchor_address: Address) -> JsonString {
    match api::get_entry(anchor_address) {
        Ok(Some(_)) => "true".into(),
        Ok(None) => "false".into(),
        Err(e) => e.into(),
    }
}

fn handle_anchors(anchor_type: String) -> JsonString {
    fn handle_anchors_helper(anchor_type: String) -> ZomeApiResult<GetLinksResult> {
        let type_anchor = Anchor {
            anchor_type: anchor_type,
            anchor_text: "".to_owned(),
        };
        let type_anchor_entry = Entry::new(EntryType::App("anchor".to_owned()), type_anchor);
        let type_anchor_address = api::entry_address(&type_anchor_entry)?;
        api::get_links(&type_anchor_address, "")
    }
    match handle_anchors_helper(anchor_type) {
        Ok(result) => result
            .addresses()
            .iter()
            .map(|address| address.to_string())
            .collect::<Vec<String>>()
            .into(),
        Err(e) => e.into(),
    }
}

define_zome! {
    entries: [
        entry!(
            name: "anchor",
            description: "An object which can be located on the network by anybody and linked from",
            sharing: Sharing::Public,
            native_type: Anchor,
            validation_package: || hdk::ValidationPackageDefinition::Entry,
            validation: |entry: Anchor, ctx: hdk::ValidationData| {
                match ctx.action {
                    EntryAction::Commit => Ok(()),
                    _ => Err("Anchors are read only.".to_owned()),
                }
            },
            links: [
                to!(
                    "anchor",
                    tag: "",
                    validation_package: || hdk::ValidationPackageDefinition::Entry,
                    validation: |base: Address, target: Address, _ctx: hdk::ValidationData| Ok(())
                )
            ]
        )
    ]

    genesis: || { Ok(()) }

    functions: {
        main(Public) {
            anchor: {
                inputs: |anchor: Anchor|,
                outputs: |anchor_hash: JsonString|,
                handler: handle_anchor
            }
            exists: {
                inputs: |anchor_address: Address|,
                outputs: |anchor_exists: JsonString|,
                handler: handle_anchor_exists
            }
            anchors: {
                inputs: |anchor_type: String|,
                outputs: |anchors: JsonString|,
                handler: handle_anchors
            }
        }
    }
}
