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
        dna::entry_types::Sharing,
        entry::Entry,
        error::HolochainError,
        json::JsonString,
        link::LinkMatch,
    },
    EntryValidationData,
};
use holochain_wasm_utils::api_serialization::get_links::GetLinksResult;

#[derive(Serialize, Deserialize, Debug, DefaultJson, Clone)]
struct Anchor {
    anchor_type: String,
    anchor_text: String,
}

fn handle_anchor(anchor: Anchor) -> ZomeApiResult<Address> {
    let anchor_type = anchor.anchor_type.clone();
    let anchor_entry = Entry::App("anchor".into(), anchor.into());
    let anchor_address = api::entry_address(&anchor_entry)?;
    // if anchor exists:
    if api::get_entry(&anchor_address)?.is_some() {
        // return it
        Ok(anchor_address)
    } else {
        let type_anchor = Anchor {
            anchor_type,
            anchor_text: "".to_owned(),
        };
        let type_anchor_entry = Entry::App("anchor".into(), type_anchor.into());
        let type_anchor_address = api::entry_address(&type_anchor_entry)?;
        // if type anchor does not exist:
        if api::get_entry(&type_anchor_address)? == None {
            let root_anchor = Anchor {
                anchor_type: "anchor_types".to_owned(),
                anchor_text: "".to_owned(),
            };
            let root_anchor_entry =
                Entry::App("anchor".into(), root_anchor.into());
            let root_anchor_address = api::entry_address(&root_anchor_entry)?;
            // if root anchor does not exist:
            if api::get_entry(&root_anchor_address)? == None {
                // create it
                api::commit_entry(&root_anchor_entry)?;
            }
            // create, link type anchor
            let type_anchor_address = api::commit_entry(&type_anchor_entry)?;
            api::link_entries(&root_anchor_address, &type_anchor_address, "", "")?;
        }
        // create, link, return anchor
        api::commit_entry(&anchor_entry)?;
        api::link_entries(&type_anchor_address, &anchor_address, "", "")?;
        Ok(anchor_address)
    }
}

fn handle_anchor_exists(anchor_address: Address) -> ZomeApiResult<JsonString> {
    match api::get_entry(&anchor_address) {
        Ok(Some(_)) => Ok(JsonString::from_json(&true.to_string())),
        Ok(None) => Ok(JsonString::from_json(&false.to_string())),
        Err(e) => Err(e),
    }
}

fn handle_anchors(anchor_type: String) -> ZomeApiResult<GetLinksResult> {
    let type_anchor = Anchor {
        anchor_type,
        anchor_text: "".to_owned(),
    };
    let type_anchor_entry = Entry::App("anchor".into(), type_anchor.into());
    let type_anchor_address = api::entry_address(&type_anchor_entry)?;
    api::get_links(&type_anchor_address, LinkMatch::Exactly(""), LinkMatch::Any)
}

define_zome! {
    entries: [
        entry!(
            name: "anchor",
            description: "An object which can be located on the network by anybody and linked from",
            sharing: Sharing::Public,

            validation_package: || hdk::ValidationPackageDefinition::Entry,
            validation: |entry_validation_data: hdk::EntryValidationData<Anchor>| {
                match entry_validation_data {
                    EntryValidationData::Create { .. } => Ok(()),
                    _ => Err("Anchors are read-only".to_owned()),
                }
            },
            links: [
                to!(
                    "anchor",
                    link_type: "",
                    validation_package: || hdk::ValidationPackageDefinition::Entry,
                    validation: |_link_validation_data: hdk::LinkValidationData| Ok(())
                )
            ]
        )
    ]

    genesis: || { Ok(()) }

    functions: [
        anchor: {
            inputs: |anchor: Anchor|,
            outputs: |anchor_hash: ZomeApiResult<Address>|,
            handler: handle_anchor
        }
        exists: {
            inputs: |anchor_address: Address|,
            outputs: |anchor_exists: ZomeApiResult<JsonString>|,
            handler: handle_anchor_exists
        }
        anchors: {
            inputs: |anchor_type: String|,
            outputs: |anchors: ZomeApiResult<GetLinksResult>|,
            handler: handle_anchors
        }
    ]

    traits: {
        hc_public [anchor, exists, anchors]
    }
}
