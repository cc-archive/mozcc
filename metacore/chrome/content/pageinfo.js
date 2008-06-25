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

function addMetaRow(aRootID, row_cells) {
   const kXULNS = 
     "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
   var root = document.getElementById(aRootID);
   var item = document.createElementNS(kXULNS, "treeitem");
   root.appendChild(item);
   var row = document.createElementNS(kXULNS, "treerow");
   item.appendChild(row);

   for each (var c in row_cells) {

	   var cell = document.createElementNS(kXULNS, "treecell");
	   cell.setAttribute("label", c);
	   row.appendChild(cell);
       }

   return row;

} // addMetaRow

function on_dbl_click_item(event) {
    var tree = document.getElementById("metacore-tree");

    // make sure we're on a predicate row
    if (tree.view.getLevel(tree.currentIndex) != 1) return;

    // get the cell text
    var uri = tree.view.getCellText(tree.currentIndex,
				    tree.columns.getColumnAt(0));

    // open the new window
    // alert(uri);

} // on_dbl_click_item


function MetacoreLoadFunc() {

    var doc_uri = gDocument.documentURI;

    // populate the appropriate labels on this page
    window.document.getElementById('metacore-page-uri').value = doc_uri;

    // add rows for metadata, grouped by predicate
    var meta_rows = getStorage().query_by_subject(doc_uri);

    var last = "__XXX__";
    for each (var meta in meta_rows) {
	    // see if we need to repeat the predicate
	    if (meta[0] == last) {
		meta[0] = "";
	    } // if the first column is repeated
	    else { last=meta[0];}

	    addMetaRow("metacore-tree-children", meta);
	} // for each metadata row

} // MetacoreLoadFunc


// register our loader
onLoadRegistry.push(MetacoreLoadFunc);