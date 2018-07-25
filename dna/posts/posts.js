'use strict';

// -----------------------------------------------------------------
//  This stub Zome code file was auto-generated by hc-scaffold
// -----------------------------------------------------------------

// -----------------------------------------------------------------
//  Exposed functions with custom logic https://developer.holochain.org/API_reference
// -----------------------------------------------------------------

// Helper anchor functions

function anchor(anchorType, anchorText) {
  return call('anchors', 'anchor', {
    anchorType: anchorType,
    anchorText: anchorText
  }).replace(/"/g, '');
}

function anchorExists(anchorType, anchorText) {
  return call('anchors', 'exists', {
    anchorType: anchorType,
    anchorText: anchorText
  });
}

// Helper timemachine functions

function markUpdated(newEntry, oldEntry) {
  return call('timemachine', 'markUpdated', {
    newEntry: newEntry,
    oldEntry: oldEntry
  });
}

function makeUnique(entry) {
  var newEntry = entry;
  newEntry.keyHash = App.Key.Hash;
  newEntry.timestamp = Date.now();
  return newEntry;
}

// Exposed functions

function postCreate(input) {
  var postEntry = makeUnique(input.postEntry);
  var postHash = commit("post", postEntry);
  for(var i = 0; i < input.subs.length; i++) {
    var sub = input.subs[i];
    var anchorHash = anchor("sub", sub || '');
    var subLinkHash = commit("subLink", {
      Links: [
        {
          Base: anchorHash,
          Link: postHash,
          Tag: 'post'
        }
      ]
    });
  }
  var userLinkHash = commit("userLink", {
    Links: [
      {
        Base: App.Agent.Hash,
        Link: postHash,
        Tag: 'post'
      }
    ]
  });
  return postHash;
}

function postRead(postHash) {
  var post = get(postHash);
  return post;
}

function postUpdate(params) {
  var replaces = params.replaces;
  var newEntry = makeUnique(params.newEntry);
  var postHash = update("post", newEntry, replaces);
  markUpdated(postHash, replaces);
  return postHash;
}

function postDelete(postHash) {
  var result = remove(postHash, "deleted");
  return result;
}

function fromSub(sub, statusMask) {
  return JSON.stringify(getLinks(anchor("sub", sub), "post", { Load: true, StatusMask: statusMask || HC.Status.Live }));
}

function fromUser(keyHash, statusMask) {
  return JSON.stringify(getLinks(keyHash, 'post', { Load: true, StatusMask: statusMask || HC.Status.Live }));
}

function crosspost(input) {
  for(var i = 0; i < input.to.length; i++) {
    var sub = input.to[i];
    var anchorHash = anchor("sub", sub);
    var subLinkHash = commit("subLink", {
      Links: [
        {
          Base: anchorHash,
          Link: input.from,
          Tag: 'post'
        }
      ]
    });
    var userLinkHash = commit("userLink", {
      Links: [
        {
          Base: App.Agent.Hash,
          Link: input.from,
          Tag: 'post'
        }
      ]
    });
  }
}


// -----------------------------------------------------------------
//  The Genesis Function https://developer.holochain.org/genesis
// -----------------------------------------------------------------

/**
 * Called only when your source chain is generated
 * @return {boolean} success
 */
function genesis() {
  return true;
}

// -----------------------------------------------------------------
//  Validation functions for every change to the local chain or DHT
// -----------------------------------------------------------------

/**
 * Called to validate any changes to the local chain or DHT
 * @param {string} entryName - the type of entry
 * @param {*} entry - the entry data to be set
 * @param {object} header - header for the entry containing properties EntryLink, Time, and Type
 * @param {*} pkg - the extra data provided by the validate[X]Pkg methods
 * @param {object} sources - an array of strings containing the keys of any authors of this entry
 * @return {boolean} is valid?
 */
function validateCommit(entryName, entry, header, pkg, sources) {
  switch (entryName) {
    case "post":
      // be sure to consider many edge cases for validating
      // do not just flip this to true without considering what that means
      // the action will ONLY be successfull if this returns true, so watch out!
      return entry.keyHash == sources[0];
    case "subLink":
    case "userLink":
      return true;
    default:
      // invalid entry name
      return false;
  }
}

/**
 * Called to validate any changes to the local chain or DHT
 * @param {string} entryName - the type of entry
 * @param {*} entry - the entry data to be set
 * @param {object} header - header for the entry containing properties EntryLink, Time, and Type
 * @param {*} pkg - the extra data provided by the validate[X]Pkg methods
 * @param {object} sources - an array of strings containing the keys of any authors of this entry
 * @return {boolean} is valid?
 */
function validatePut(entryName, entry, header, pkg, sources) {
  switch (entryName) {
    case "post":
      // be sure to consider many edge cases for validating
      // do not just flip this to true without considering what that means
      // the action will ONLY be successfull if this returns true, so watch out!
      return true;
    case "subLink":
    case "userLink":
      return true;
    default:
      // invalid entry name
      return false;
  }
}

/**
 * Called to validate any changes to the local chain or DHT
 * @param {string} entryName - the type of entry
 * @param {*} entry - the entry data to be set
 * @param {object} header - header for the entry containing properties EntryLink, Time, and Type
 * @param {string} replaces - the hash for the entry being updated
 * @param {*} pkg - the extra data provided by the validate[X]Pkg methods
 * @param {object} sources - an array of strings containing the keys of any authors of this entry
 * @return {boolean} is valid?
 */
function validateMod(entryName, entry, header, replaces, pkg, sources) {
  switch (entryName) {
    case "post":
      // be sure to consider many edge cases for validating
      // do not just flip this to true without considering what that means
      // the action will ONLY be successfull if this returns true, so watch out!
      return get(replaces, { GetMask: HC.GetMask.Sources })[0] == sources[0];
    case "subLink":
    case "userLink":
      return false;
    default:
      // invalid entry name
      return false;
  }
}

/**
 * Called to validate any changes to the local chain or DHT
 * @param {string} entryName - the type of entry
 * @param {string} hash - the hash of the entry to remove
 * @param {*} pkg - the extra data provided by the validate[X]Pkg methods
 * @param {object} sources - an array of strings containing the keys of any authors of this entry
 * @return {boolean} is valid?
 */
function validateDel(entryName, hash, pkg, sources) {
  switch (entryName) {
    case "post":
    case "subLink":
    case "userLink":
      return get(hash, { GetMask: HC.GetMask.Sources })[0] == sources[0];
    default:
      // invalid entry name
      return false;
  }
}

/**
 * Called to validate any changes to the local chain or DHT
 * @param {string} entryName - the type of entry
 * @param {string} baseHash - the hash of the base entry being linked
 * @param {?} links - ?
 * @param {*} pkg - the extra data provided by the validate[X]Pkg methods
 * @param {object} sources - an array of strings containing the keys of any authors of this entry
 * @return {boolean} is valid?
 */
function validateLink(entryName, baseHash, links, pkg, sources) {
  switch (entryName) {
    case "post":
      // be sure to consider many edge cases for validating
      // do not just flip this to true without considering what that means
      // the action will ONLY be successfull if this returns true, so watch out!
      return false;
    case "subLink":
      var baseEntry = get(links[0].Base);
      if(baseEntry.anchorType != "sub" || baseEntry.anchorText != Math.abs(parseInt(baseEntry.anchorText)).toString()) {
        return false;
      }
    case "userLink":
      var linkEntryType = get(links[0].Link, { GetMask: HC.GetMask.EntryType });
      return linkEntryType == "post";
    default:
      // invalid entry name
      return false;
  }
}

/**
 * Called to get the data needed to validate
 * @param {string} entryName - the name of entry to validate
 * @return {*} the data required for validation
 */
function validatePutPkg(entryName) {
  return null;
}

/**
 * Called to get the data needed to validate
 * @param {string} entryName - the name of entry to validate
 * @return {*} the data required for validation
 */
function validateModPkg(entryName) {
  return null;
}

/**
 * Called to get the data needed to validate
 * @param {string} entryName - the name of entry to validate
 * @return {*} the data required for validation
 */
function validateDelPkg(entryName) {
  return null;
}

/**
 * Called to get the data needed to validate
 * @param {string} entryName - the name of entry to validate
 * @return {*} the data required for validation
 */
function validateLinkPkg(entryName) {
  return null;
}