/**
 * @param anchor Object of the form {anchorType: <string>, anchorText: <string>}
 * @return anchorHash
 **/
function anchor(anchor){
  var anchorType = {anchorType: anchor.anchorType, anchorText: ''};
  var rootAnchortype =  {anchorType: 'anchorTypes', anchorText: ''};
  var anchorHash = makeHash('anchor', anchor);
  var anchorGet = get(anchorHash);
  if(anchorGet === null){
    var anchorTypeGet = get(makeHash('anchor', anchorType));
    if(anchorTypeGet === null){
      var rootAnchorTypeHash = makeHash('anchor', rootAnchortype);
      if (get(rootAnchorTypeHash) === null){
        rootAnchorTypeHash = commit('anchor', rootAnchortype);
      }
      var anchorTypeHash = commitAnchor(anchorType,rootAnchorTypeHash, anchorType.anchorType);
    } else {
      anchorTypeHash = makeHash('anchor', anchorType);
    }
    anchorHash = commitAnchor(anchor,anchorTypeHash, anchor.anchorText);
  }
  return anchorHash;
}

// helper function to commit the anchor and the anchor link
function commitAnchor(anchor,base,tag) {
    var linkHash = commit('anchor', anchor);
    commit('anchor_link', { Links:[{Base: base, Link: linkHash, Tag: tag}]});
    return linkHash;
}

/**
 * @param anchor Object of the form {anchorType: <string>, anchorText: <string>}
 * @return boolean
 **/
function exists(anchor){
  var key = get(makeHash('anchor', anchor));
  if(key !== null){
    return true;
  }
  return false;
}

/**
 * @param type (string)
 * @return array of anchor entries
 **/
function anchors(type){
  var links = getLinks(makeHash('anchor', {anchorType: type, anchorText: ''}), '');
  return links;
}

function genesis() {
  return true;
}

function validatePut(entry_type,entry,header,pkg,sources) {
  // debug('Anchors validatePut:' + sources)
  return validateCommit(entry_type,entry,header,pkg,sources);
}
function validateCommit(entry_type,entry,header,pkg,sources) {
  // debug('Anchors validatePut:' + sources)
    if (entry_type == 'anchor') {
        return true;
    }
    if (entry_type == 'anchor_link') {
        return true;
    }
    return false;
}



function validateLink(linkingEntryType,baseHash,linkHash,pkg,sources){
  // debug('Anchors validateLink:' + sources)
  return true;
}
function validateMod(entry_type,hash,newHash,pkg,sources){
  // debug('Anchors validateMod:' + sources)
  return true;
}
function validateDel(entry_type,hash,pkg,sources) {
  // debug('Anchors validateDel:' + sources)
  return true;
}
function validatePutPkg(entry_type) {
  // debug('Anchors validatePutPkg')
  return null;
}
function validateModPkg(entry_type) {
  // debug('Anchors validateModPkg')
  return null;
}
function validateDelPkg(entry_type) {
  // debug('Anchors validateDelPkg')
  return null;
}
function validateLinkPkg(entry_type) {
  // debug('Anchors validateLinkPkg')
  return null;
}
