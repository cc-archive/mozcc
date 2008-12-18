/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is MozCC 2.
 *
 * The Initial Developer of the Original Code is
 * Nathan R. Yergler, Creative Commons.
 * Portions created by the Initial Developer are Copyright (C) 2006
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *
 * Nathan R. Yergler <nathan@creativecommons.org>
 * Asheesh Laroia <asheesh@creativecommons.org>
 *
 * ***** END LICENSE BLOCK ***** */

function _log(msg) {
    
    // log a message to the Javascript console with normal severity
    Application.console.log("MozCC UI: " + msg);

} // logMessage

function _query(subject, predicate) {
    _log("Asked to search for subject <" + subject +
	 "> + predicate <" + predicate + ">.");

    var store = getStorage();

    var literal_predicate = ''; /* This will store the actual predicate
				   that we search for. */

    var meta_rows = store.query_by_subject(subject);

    
					   
   
    var results = Array();
    var inner_results = null; /* To store the results inner to the loop. */

    var prefixes = cc_namespaces;

    if (predicate == "license") {
	prefixes = ['http://www.w3.org/1999/xhtml#'].concat(prefixes);
    }

    for each (var ns in prefixes) {
	    literal_predicate = ns + predicate;
	    inner_results = store.query(subject, literal_predicate);
	    results = results.concat(inner_results);
	}

    /* FIXME: Later, look for consensus in these values and 
     * if there is not consensus, log that weirdness. 
     */

    return results;
}

function open_license(event) {
    // open the license when the URI is clicked

    uri = event.target.getElementById('mozcc-license-uri').value;
    _log("Should have actually followed the license link!");

} // open_license

function last_url_segment(element) {

    var url_segments = element[0].split("/");
    url_segments.reverse();

    return url_segments[0].toLowerCase();

} // last_url_segment

function clearStatusBar() {

    var panel = document.getElementById('mozcc-attrib-icons');
    
    if (panel) {
	while(panel.hasChildNodes()) {
	    panel.removeChild(panel.firstChild);
	}
    }
    
} // clearStatusBar

function addIcon(filename) {
    // add the icon to the status bar

    var icon = document.createElement('image');
    icon.setAttribute("src", "chrome://mozcc/content/icons/" + filename);

    document.getElementById('mozcc-attrib-icons').appendChild(icon);
} // addIcon

function updateStatusBar(page_uri) {
    _log('updatestatusbar');

    // update the status bar with current licensing information
    clearStatusBar();

    /* Look for a license predicate and grab its value(s) */
    var license_data = _query(page_uri, 'license');
    
    // if we retrieved license information, set the tooltip and enable the icon
    if (license_data.length > 0) {
	document.getElementById("mozcc-info").hidden = false;

	// get the license URI itself
	// XXX we should really handle ambiguous results above!
	license_uri = license_data[0][0];

	// show the license URI
	document.getElementById("mozcc-license-uri").value = license_uri;
	_log(license_uri);

	return;

	// add the status bar images
	// ***************************************************************
	var requires = getStorage().query(license_uri,
					  'http://web.resource.org/cc/requires').map(last_url_segment);

	var prohibits = getStorage().query(license_uri,
					'http://web.resource.org/cc/prohibits').
	    map(last_url_segment);
	var permits = getStorage().query(license_uri,
					'http://web.resource.org/cc/permits').
	    map(last_url_segment);

	// attribution
	if ( (requires.indexOf('notice') > -1) ||
	     (requires.indexOf('attribution') > -1) ) {

	    addIcon('attrib');
	}

	// non-commercial
	if (prohibits.indexOf('commercialuse') > -1) {

	    addIcon('noncomm');
	}

	// no-derivatives
	if ((permits.length > 0) && (permits.indexOf('derivativeworks') == -1)) {
	    addIcon('nomod');
	}

	// share-alike
	if (requires.indexOf('sharealike') > -1) {
	    addIcon('share');
	}

    } else {
	document.getElementById("mozcc-info").hidden = true;
	license_uri = '';
	_log('weird, no lic');
    }

} // updateStatusBar

function mozcc_onPageShow(callback_arg) {
    /* Is the load really complete? May want to investigate further at e.g.
     * http://forums.mozillazine.org/viewtopic.php?t=403296
     */
    var uri = content.document.location.href;
    _log('mozz_onpageshow: updating status bar based on uri: ' + uri);
    updateStatusBar(uri);
}