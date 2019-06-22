#![feature(try_from)]
#[macro_use]
extern crate hdk;
extern crate serde;
#[macro_use]
extern crate serde_derive;
extern crate serde_json;
#[macro_use]
extern crate holochain_core_types_derive;

use hdk::api;
use hdk::{EntryValidationData, LinkValidationData};
use hdk::error::{ZomeApiError, ZomeApiResult};
use hdk::holochain_core_types::{
    cas::content::Address, dna::entry_types::Sharing, entry::Entry, error::HolochainError,
    json::JsonString, time::Iso8601, link::LinkMatch
};
use hdk::utils;
use hdk::ValidationPackageDefinition;
use holochain_wasm_utils::api_serialization::query::{
    QueryArgsNames, QueryArgsOptions, QueryResult,
};

/// Type for tags
///
/// Should be exact same as in `posts` zome
type Tag = u64;

/// A user vote
///
/// Can be "cast" (linked) from posts and comments.
#[derive(Clone, Serialize, Deserialize, Debug, DefaultJson, PartialEq)]
pub struct Vote {
    /// Number from 1 to -1
    ///
    /// - Positive = 'I like this'
    /// - Negative = 'I don't like this'
    fraction: f32,
    /// What this vote has been cast in terms of
    ///
    /// e.g. a cat picture would be great (positive vote) on the tag
    /// representing cats, but not so good (negative vote) on a tag representing
    /// dogs
    in_terms_of: Vec<Tag>,
    /// What is being voted on. Used to prevent accidental collisions
    target_hash: Address,
    /// Who casted this vote. Used to prevent avoid malicious collisions
    key_hash: Address,
    /// Time of the vote cast.
    /// They are used to avoid accidental hash collisions.
    ///
    /// *Should not be used as real timestamp.*
    timestamp: Iso8601,
}

/// Wrapper struct to get around the lack of implementation of
/// `Into<JsonString>` for `T` where `T: Serialize`
#[derive(Serialize)]
struct PossibleVote(Option<Vote>);

impl Into<JsonString> for PossibleVote {
    fn into(self) -> JsonString {
        JsonString::from_json(&serde_json::to_string(&self).expect("Failed to encode Option<Vote>"))
    }
}

/// Create and link a vote on a target if one does not exist, otherwise update
/// the current one to reflect the new fractional value requested
fn handle_vote(
    utc_unix_time: u64,
    fraction: f32,
    in_terms_of: Vec<Tag>,
    target: Address,
) -> ZomeApiResult<Address> {
    let vote = Vote {
        fraction,
        in_terms_of: in_terms_of.clone(),
        target_hash: target.clone(),
        key_hash: api::AGENT_ADDRESS.clone(),
        timestamp: utc_unix_time.into(),
    };

    if let Some(prev_vote) = find_my_vote(&target, &in_terms_of)? {
        api::update_entry(Entry::App("vote".into(), vote.into()), &prev_vote)
    } else {
        let result = api::commit_entry(&Entry::App("vote".into(), vote.into()))?;
        api::link_entries(&target, &result, "vote", "")?;

        Ok(result)
    }
}

/// Get all votes linked from a specific address
fn handle_votes_from_address(address: Address) -> ZomeApiResult<Vec<Vote>> {
    Ok(api::get_links_and_load(&address, LinkMatch::Exactly("vote"), LinkMatch::Any)?
        .into_iter()
        .filter_map(|result| result.ok())
        .filter_map(|entry| match entry {
            Entry::App(_, value) => serde_json::from_str::<Vote>(&Into::<String>::into(value)).ok(),
            _ => None,
        })
        .collect())
}

/// Get the user's current vote on `address` in terms of `in_terms_of`
fn find_my_vote(address: &Address, in_terms_of: &[Tag]) -> ZomeApiResult<Option<Address>> {
    match api::query_result(
        QueryArgsNames::QueryName("vote".to_string()),
        QueryArgsOptions {
            start: 0,
            limit: usize::max_value(),
            headers: false,
            entries: true,
        },
    )? {
        QueryResult::Entries(entries) => Ok(entries
            .into_iter()
            .filter_map(|(address, entry)| match entry {
                Entry::App(_, value) => serde_json::from_str::<Vote>(&Into::<String>::into(value))
                    .map(|vote| (address, vote))
                    .ok(),
                _ => None,
            })
            .filter(|(_, vote)| &vote.target_hash == address)
            .find(|(_, vote)| vote.in_terms_of.iter().any(|tag| in_terms_of.contains(tag)))
            .map(|(address, _)| address)),
        _ => unreachable!(),
    }
}

/// Find and return the user's vote on some address in terms of `in_terms_of`,
/// if it exists
fn handle_get_my_vote(address: Address, in_terms_of: Vec<Tag>) -> ZomeApiResult<PossibleVote> {
    let my_vote = find_my_vote(&address, &in_terms_of)?;

    if let Some(address) = my_vote {
        if let Some(entry) = api::get_entry(&address)? {
            match entry {
                Entry::App(_, value) => {
                    if let Ok(vote) = serde_json::from_str::<Vote>(&Into::<String>::into(value)) {
                        Ok(PossibleVote(Some(vote)))
                    } else {
                        Err(ZomeApiError::Internal(
                            "Could not convert vote entry to vote".to_string(),
                        ))
                    }
                }
                _ => Err(ZomeApiError::Internal(
                    "Getting vote address returned non-App entry".to_string(),
                )),
            }
        } else {
            Err(ZomeApiError::Internal(
                "Vote address was uninhabited".to_string(),
            ))
        }
    } else {
        Ok(PossibleVote(None))
    }
}

fn validate_vote_link(from: &Address, to: &Address) -> Result<(), String> {
    let vote: Vote =
        utils::get_as_type(to.clone()).map_err(|_| "Failed to get vote for link validation".to_string())?;

    fn get_votes(exclude: &Vote, target_hash: &Address) -> Result<Vec<Vote>, String> {
        let all_votes = api::query_result(
            QueryArgsNames::QueryName("vote".to_string()),
            QueryArgsOptions {
                start: 0,
                limit: usize::max_value(),
                headers: false,
                entries: true,
            },
        )
        .map_err(|_| "Failed to get your votes for link validation".to_string())?;

        match all_votes {
            QueryResult::Entries(tuple_vec) => Ok(tuple_vec
                .into_iter()
                .map(|(_, b)| b)
                .filter_map(|entry| match entry {
                    Entry::App(_, value) => {
                        serde_json::from_str::<Vote>(&Into::<String>::into(value)).ok()
                    }
                    _ => None,
                })
                .filter(|vote| vote != exclude)
                .filter(|vote| &vote.target_hash == target_hash)
                .collect()),
            _ => {
                Err("Query returned invalid result while getting links for validation".to_string())
            }
        }
    }

    let already_voted = get_votes(&vote, from)?.into_iter().any(|query_vote| {
        for tag_query in &query_vote.in_terms_of {
            for tag_vote in &vote.in_terms_of {
                if tag_vote == tag_query {
                    return true;
                }
            }
        }
        false
    });

    if already_voted {
        Err("You've already voted on this thing in that way".to_string())
    } else {
        Ok(())
    }
}

define_zome! {
    entries: [
        entry!(
            name: "vote",
            description: "User vote on post/comment",
            sharing: Sharing::Public,
            
            validation_package: || ValidationPackageDefinition::Entry,
            validation: |entry_validation_data: hdk::EntryValidationData<Vote>| {
                let not_ok = Err("Cannot alter vote that is not yours.".to_string());
                match entry_validation_data {
                    EntryValidationData::Create {
                        entry: vote,
                        validation_data,
                    } => {
                        let provenances = validation_data.package.chain_header.provenances();
                        if provenances.iter().all(|provenance| provenance.0 == vote.key_hash) {
                            if vote.fraction <= 1.0 && vote.fraction >= -1.0 {
                                Ok(())
                            } else {
                                Err("Vote fraction must be between 1 and -1".to_string())
                            }
                        } else {
                            not_ok
                        }
                    }
                    EntryValidationData::Modify {
                        new_entry: new_vote,
                        old_entry: old_vote,
                        old_entry_header,
                        validation_data,
                    } => {
                        let mut provenances = validation_data.package.chain_header.provenances()
                            .iter()
                            .chain(old_entry_header.provenances());
                        if old_vote.key_hash == new_vote.key_hash
                            && provenances.all(|provenance| provenance.0 == old_vote.key_hash)
                        {
                            if new_vote.fraction <= 1.0 && new_vote.fraction >= -1.0 {
                                Ok(())
                            } else {
                                Err("Vote fraction must be between 1 and -1".to_string())
                            }
                        } else {
                            not_ok
                        }
                    }
                    EntryValidationData::Delete {
                        old_entry: old_vote,
                        old_entry_header,
                        validation_data,
                    } => {
                        let mut provenances = validation_data.package.chain_header.provenances()
                            .iter()
                            .chain(old_entry_header.provenances());
                        if provenances.all(|provenance| provenance.0 == old_vote.key_hash)
                        {
                            Ok(())
                        } else {
                            not_ok
                        }
                    }
                }
            },
            links: [
                from!(
                    "post",
                    link_type: "vote",
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
                        validate_vote_link(link.link().base(), link.link().target())
                    }
                ),
                from!(
                    "comment",
                    link_type: "vote",
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
                        validate_vote_link(link.link().base(), link.link().target())
                    }
                )
            ]
        )
    ]

    genesis: || { Ok(()) }

    functions: [
        vote: {
            inputs: |utc_unix_time: u64, fraction: f32, in_terms_of: Vec<Tag>, target: Address|,
            outputs: |result: ZomeApiResult<Address>|,
            handler: handle_vote
        }
        votes_from_address: {
            inputs: |address: Address|,
            outputs: |result: ZomeApiResult<Vec<Vote>>|,
            handler: handle_votes_from_address
        }
        get_my_vote: {
            inputs: |address: Address, in_terms_of: Vec<Tag>|,
            outputs: |result: ZomeApiResult<PossibleVote>|,
            handler: handle_get_my_vote
        }
    ]

    traits: {
        hc_public [
            vote,
            votes_from_address,
            get_my_vote
        ]
    }
}
