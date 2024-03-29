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
 *
 * ***** END LICENSE BLOCK ***** */

const RDF_LINK = "rdf_link";

function find_license_links(meta_doc) {
    // return a list of license links found in <link rel="meta" ...> tags

    var result = new Array();

    // query the document using xpath
    var contextNode = meta_doc.document;
    var nsResolver = meta_doc.document.createNSResolver( 
          contextNode.ownerDocument == null ? 
                                   contextNode.documentElement : 
                                   contextNode.ownerDocument.documentElement );

    var link_snapshot =meta_doc.document.evaluate( '//link[@rel="meta"]/@href',
        contextNode, document.createNSResolver(meta_doc.document), 
        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);

    for ( var i=0; i < link_snapshot.snapshotLength; i++) {

        result.push(makeAbsolute(meta_doc.uri, 
                                 link_snapshot.snapshotItem(i).textContent));

    } // for each node found

    return result;

} // find_license_links

function rdf_link(meta_doc) {

    // find all remote license links
	var links = find_license_links(meta_doc);

	for (var i = 0; i < links.length; i++) {
	    var lic_link_uri = links[i];

	    logMessage("retrieving remote datasource: " + lic_link_uri);

	    // check if we've seen this URI
	    if (meta_doc.seen.indexOf(lic_link_uri) > -1) continue;

	    // we have now...
	    meta_doc.seen.push(lic_link_uri);

	    // retrieve the remote URI
	    var req = new XMLHttpRequest();

	    req.open('GET', lic_link_uri, true);
	    req.remote_uri = lic_link_uri;
	    req.meta_doc = meta_doc;

	    // attach the handler and go...
	    req.onload = function(event) {

		// ******************************************************
		// ** 
		// **  onLoad Handler
		// **

		// extract RDF from the returned document
		var results = new Array();

		var lastModified = event.target.getResponseHeader(
							       "Last-Modified");

		if (lastModified == null) {
		    // lastModified not provided; 
		    // use a hash of the response text instead
		    var obj = Components.classes[
				    "@mozilla.org/io/string-input-stream;1"].
			createInstance(
			           Components.interfaces.nsIStringInputStream);

		    obj.setData(event.target.responseText, -1);
		    var hashFactory = Components.classes[
				      "@mozilla.org/security/hash;1"].
			createInstance(Components.interfaces.nsICryptoHash);

		    // use the SHA1 hash
		    hashFactory.initWithString("SHA1");
		    hashFactory.updateFromStream(obj, -1);

		    lastModified = hashFactory.finish(true);
		    logMessage("using hash instead of lastModified: " + lastModified);
		} // if lastModified not provided

		meta_doc = event.target.meta_doc;
		remote_uri = event.target.remote_uri;
		var remote_pageid = -1;

		// check our record last-modified information if the server
		// provided a last-modified header for the request
		if (!getStorage().needs_update(remote_uri, lastModified)) {

			 // no update needed
			 return;

		} else {
		    // make sure we're in the pages table
		    getStorage().update(remote_uri, lastModified);

		    // get the page id for the remote data source
		    remote_pageid = getStorage().page_id(remote_uri);

		    // flush the current rdf for this page + provider
		    getStorage().flush_assertions(remote_pageid, RDF_LINK);

		} // if needs updated


		extractRdf(event.target.responseText, 
			   event.target.remote_uri, results);

		for each (var block in results) {
			for each (var t in block.triples()) {
				getStorage().assert(remote_pageid, t, RDF_LINK);
				// logMessage(remote_pageid + " " + t);
			    } // for each triple...

		    } // for each RDF block extracted
		 
	    } // onload handler


	    req.send(null);

	} // for each...

	logMessage("rdf_link completed.");

} //rdf_link

// register
ccMetaView.registerExtractor(RDF_LINK, rdf_link);
