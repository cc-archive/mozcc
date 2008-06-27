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
 * Portions created by the Initial Developer are Copyright (C) 2006 - 2007
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *
 * Nathan R. Yergler <nathan@creativecommons.org>
 *
 * ***** END LICENSE BLOCK ***** */


const CC = Components.classes;
const CI = Components.interfaces;
const CU = Components.utils;

const NOTIFY_STATE_DOCUMENT = CI.nsIWebProgress.NOTIFY_STATE_DOCUMENT;
const STATE_START = CI.nsIWebProgressListener.STATE_START;
const STATE_STOP = CI.nsIWebProgressListener.STATE_STOP;

function make_meta_doc(a_document) {
   // Take a Document object and return a meta_doc instance.

   meta_doc = {'uri' : a_document.documentURI,
               'document' : a_document,
               'lastModified' : a_document.lastModified,
               'changed' : getStorage().needs_update(a_document.documentURI,
                                                     a_document.lastModified),
               'page_id' : null,
               'seen' : new Array()
              }

   return meta_doc;

} // make_meta_doc

var ccMetaView_ProgressListener = {

    QueryInterface: function(aIID) {
	if (aIID.equals(CI.nsIWebProgressListener) ||
	    aIID.equals(CI.nsISupportsWeakReference) ||
	    aIID.equals(CI.nsISupports))
	    return this;
	throw Components.results.NS_NOINTERFACE;
    },

    onStateChange: function(aWebProgress, aRequest, aFlag, aStatus) {

	if(aFlag & STATE_STOP) {
	    // This fires when the load finishes
	    logMessage('Loading finished.');
	    ccMetaView.onShowPage();
	    // wikihow.lookForWiki(aWebProgress);
	}
	return 0;
    },
    

    onLocationChange: function(aProgress, aRequest, aURI) {
	// This fires when the location bar changes; i.e load event is confirmed
	// or when the user switches tabs. If you use myListener for more than one tab/window,
	// use aProgress.DOMWindow to obtain the tab/window which triggered the change.
  
	if (aProgress.isLoadingDocument == false) {
	    logMessage('location changed');
	    ccMetaView.onShowPage();
	    // wikihow.lookForWiki(aProgress);
	}
	return 0;
    },

    onStatusChange: function() {return 0;},
    onProgressChange: function() {return 0;},
    onSecurityChange: function() {return 0;},
    onLinkIconAvailable: function() {return 0;}

} // ccMetaView_ProgressListener

var ccMetaView = {

    init: function() {
	// attach the progress listener
	logMessage('attaching listener');
	window.getBrowser().addProgressListener(ccMetaView_ProgressListener, 
						NOTIFY_STATE_DOCUMENT);

    },

    uninit: function() {
	window.getBrowser().removeProgressListener(ccMetaView_ProgressListener);
    },

    metadataExtractorRegistry: [],

    /*  registerExtractor
     *  -------------------------
     *  Add a metadata extractor by calling:
     * 
     *    ccMetaView.registerExtractor(name, extract_fn);
     * 
     *  extract_fn is a callable which takes a single parameter,
     *  an object as returned by make_meta_doc.
     * 
     */
    registerExtractor: function(name, e) {
	this.metadataExtractorRegistry[name] = e;
    },

    updateUrlBar: function(meta_doc) {

	var meta_rows = getStorage().query_by_subject(
            meta_doc.document.documentURI);

	if (meta_rows.length > 0) {
	    document.getElementById("metacore-icon").setAttribute("select", "true");
	} else {
	    document.getElementById("metacore-icon").removeAttribute("select");
	}


    }, // updateUrlBar

    processPage: function(meta_doc) {

	// call each metadata extractor
	for (x in this.metadataExtractorRegistry) {
	    this.metadataExtractorRegistry[x](meta_doc);
	}

    }, // processPage

    processUri: function(uri) {
	// retrieve the specified URI and scan it for rdf-in-a-commnent
	// XXX this should eventually be a generalized entry point to parsers

	logMessage("Retrieving additional metadata from " + uri);

	// retrieve the remote URI
	var req = new XMLHttpRequest();

	req.open('GET', uri, true);
	req.remote_uri = uri;

	// attach the handler and go...
	req.onload = function(event) {

	    // ******************************************************
	    // ** 
	    // **  onLoad Handler
	    // **

	    // extract RDF from the returned document
	    var results = new Array();

	    var lastModified = event.target.getResponseHeader("Last-Modified");

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

	    var remote_uri = event.target.remote_uri;
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
		getStorage().flush_assertions(remote_pageid, RDFCOMMENT);

	    } // if needs updated


	    extractRdf(event.target.responseText, 
		       event.target.remote_uri, results);

	    for each (var block in results) {
		    for each (var t in block.triples()) {
			    getStorage().assert(remote_pageid, t, RDFCOMMENT);
			    // logMessage(remote_pageid + " " + t);
			} // for each triple...

		} // for each RDF block extracted
		 
	    // make another call to the tab selector to pick up any changes
	    // XXX onSelectTab(null);

	} // onload handler

	req.send(null);

    }, // processUri

    onShowPage: function () {
    /*
     * Page Load Event Handler
     *
     * - get page information including URI and lastModified 
     * - query storage to find out if we've seen the page or new lastModified 
     * - construct a IMetaDoc object
     * - iterate through the extractors
     *
     */

    // make sure we're dealing with an HTML document
	/*
    if ( (!(event.originalTarget instanceof HTMLDocument)) ||
         (event.originalTarget != content.document) ) return;

    // see if we're loading from the cache
    if (!event.persisted) {
	*/
        // not loading from the cache
        var meta_doc = make_meta_doc(content.document);

        // update the page table if necessary; 
        // do this before calling extractors
        // so that calls to page_id will succeed
        if (meta_doc.changed) {

	    logMessage("lastModified changed; updating stored information.");

	    // update the last modified information
	    getStorage().update(meta_doc.uri, meta_doc.lastModified);

        } // if meta_doc.changed...

        // get the page id to save on future db hits
        meta_doc.page_id = getStorage().page_id(meta_doc.uri);

        // process the page contents
        this.processPage(meta_doc);

	// } // if not loading from cache...

    // update the display window
    this.updateUrlBar(meta_doc);

    } // onShowPage

}


// Register constructor and destructor
logMessage('registered load/unload');
window.addEventListener("load", ccMetaView.init, false);
window.addEventListener("unload", ccMetaView.uninit, false);
