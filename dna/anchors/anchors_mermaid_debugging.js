/**
 * @param anchor Object of the form {anchorType: <string>, anchorText: <string>}
 * @return anchorHash
 **/
function anchor(anchor){
  var anchorType = {anchorType: anchor.anchorType, anchorText: ''};
  var rootAnchortype =  {anchorType: 'anchorTypes', anchorText: ''};
  var anchorHash = makeHash('anchor', anchor);
  var anchorGet = get(anchorHash);
  debug('<mermaid>' + App.Agent.String + '->>DHT:Check to see if ' + anchor.anchorText + ' exists</mermaid>');
  if(anchorGet === null){
    var anchorTypeGet = get(makeHash('anchor', anchorType));
    debug('anchorTypeGet ' + JSON.stringify(anchorTypeGet));
    debug('<mermaid>' + App.Agent.String + '-->>DHT:Check to see if ' + anchor.anchorType + ' has been setup</mermaid>');
    if(anchorTypeGet === null){
      var rootAnchorTypeHash = makeHash('anchor', rootAnchortype);
      debug('<mermaid>' + App.Agent.String + '-->>DHT:Check to see if the Root of all anchors has been setup</mermaid>');
      if (get(rootAnchorTypeHash) === null){
        rootAnchorTypeHash = commit('anchor', rootAnchortype);
        debug('<mermaid>' + App.Agent.String + '->>' + App.Agent.String + ':commit Root of all anchors to local chain</mermaid>');
        debug('<mermaid>' + App.Agent.String + '->>DHT:Publish Root of all anchors</mermaid>');
      }
      debug('<mermaid>DHT-->>' + App.Agent.String + ':Return the Root Anchor Type</mermaid>');
      var anchorTypeHash = commitAnchor(anchorType,rootAnchorTypeHash, anchorType.anchorType);
      debug('<mermaid>' + App.Agent.String + '->>DHT:Link ' + anchor.anchorType + ' to Root of all anchors</mermaid>');

    } else {
      anchorTypeHash = makeHash('anchor', anchorType);
      debug('<mermaid>DHT-->>' + App.Agent.String + ':Return the anchorType ' + anchor.anchorType + '</mermaid>');
    }
    anchorHash = commitAnchor(anchor,anchorTypeHash, anchor.anchorText);
    debug('<mermaid>' + App.Agent.String + '->>DHT:Link ' + anchor.anchorText + ' to ' + anchorType.anchorType + '</mermaid>');
  }
  debug('<mermaid>DHT-->>' + App.Agent.String + ':Return the anchor ' + anchor.anchorType + ' = ' + anchor.anchorText + '</mermaid>');
  return anchorHash;
}


// helper function to commit the anchor and the anchor link
function commitAnchor(anchor,base,tag) {
    var linkHash = commit('anchor', anchor);
    debug('<mermaid>' + App.Agent.String + '->>' + App.Agent.String + ':commit ' + tag + ' to local chain</mermaid>');
    debug('<mermaid>' + App.Agent.String + '->>DHT:Publish ' + tag + '</mermaid>');
    commit('anchor_link', { Links:[{Base: base, Link: linkHash, Tag: tag}]});
    return linkHash;
}


/**
 * @param anchor Object of the form {anchorType: <string>, anchorText: <string>}
 * @return boolean
 **/
function exists(anchor){
  debug('<mermaid>' + App.Agent.String + '-->>DHT:Check to see if ' + anchor.anchorText + ' exists</mermaid>');
  var key = get(makeHash('anchor', anchor));
  if(key !== null){
    debug('<mermaid>DHT-->>' + App.Agent.String + ':' + anchor.anchorText + ' exists</mermaid>');
    return true;
  }
  debug('<mermaid>DHT-->>' + App.Agent.String + ':' + anchor.anchorText + ' does not exist</mermaid>');
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
