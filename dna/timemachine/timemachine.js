function genesis() {
  return true;
}

function markUpdated(input) {
  return commit("updated", {
    Links: [
      {
        Base: input.newEntry,
        Link: input.oldEntry,
        Tag: 'updated'
      }
    ]
  });
}

function getOldVersions(oldEntry) {
  return JSON.stringify(
    getLinks(oldEntry, "updated")
  );
}

function validateCommit(entryType) {
  return entryType == "updated";
}

function validatePut() {
  return true;
}

function validateMod() {
  return false;
}

function validateDel() {
  return false;
}

function validateLink() {
  return true;
}

function validatePutPkg() {
  return null;
}

function validateModPkg() {
  return null;
}

function validateDelPkg() {
  return null;
}

function validateLinkPkg() {
  return null;
}
