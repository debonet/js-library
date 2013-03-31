require("functional");
require("logging");
var nsUtilities = require("nsUtilities");
var nsTypes = require("nsTypes");



module.exports = (function(){

	var fveSelect;

	// ---------------------------------------------------------------------------
	// fbSelectType
	//   tests if the element type equals the given type
	//
	// Params
	//   s := desired type
	//   e := element to test
	//
	// Returns:
	//   true if element's type is the desired type
	//
	var fbSelectType = function(s, e){
		if (!s){
			return true;
		}
		if (e["type"] !== "tag"){
			return false;
		}
		if (s === "*"){
			return true;
		}
		return e["name"] === s;
	};


	// ---------------------------------------------------------------------------
	// fbSelectId
	//   tests if the element id equals the given id
	//
	// Params
	//   s := desired id
	//   e := element to test
	//
	// Returns:
	//   true if element's id is the desired id
	//
	var fbSelectId = function(s, e){
		if (!s){
			return true;
		}

		if (!e["attribs"]){
			return false;
		}

		return e["attribs"]["id"] === s;
	};

	// ---------------------------------------------------------------------------
	// fbSelectClass
	//   tests if the element has the the given class
	//
	// Params
	//   s := desired class
	//   e := element to test
	// 
	// Side Effects:
	//   modifies the element to cache the split class string
	//  
	// Returns:
	//   true if element has the desired class
	//
	var fbSelectClass = function(s, e){
		if (!s){
			return true;
		}

		if (!e["attribs"] || !e["attribs"]["class"]){
			return false;
		}

		if (!e["__splitclass"]){
			e["__splitclass"] = e["attribs"]["class"].split(/\s+/);
		}

		return e["__splitclass"].indexOf(s) !== -1;
	};

	// ---------------------------------------------------------------------------
	// fbSelectAttr
	//   tests if the element matches the indicated attribute test
	//   currently tests of =, !=, ^=, $=, *=, ~=, |= are supported
	//
	// Params
	//   sAttr     := attribute to test
	//   sAttrTest := optional. test to perform (defaults to existance test)
	//   sAttrVal  := value to test the attribute against
	//   e         := element to test
	// 
	// Returns:
	//   true if element has the desired class
	//
	var fbSelectAttr = function(sAttr, sAttrTest, sAttrVal, e){
		if (!sAttr){
			return true;
		}

		if (!sAttrTest){
			return sAttr in e["attribs"];
		}

		if (!("attribs" in e)){
			return false;
		}

		var sAttrValActual = e["attribs"][sAttr] || "";

		switch(sAttrTest){
		case "=": // exact match
			return sAttrValActual === sAttrVal;
		case "!=": // exact match
			return sAttrValActual !== sAttrVal;
		case "^=": // head match
			return sAttrValActual.indexOf(sAttrVal) === 0;
		case "$=": // tail match
			return sAttrValActual.indexOf(sAttrVal) === sAttrValActual.length - sAttrVal.length;
		case "*=": // any partial match
			return sAttrValActual.indexOf(sAttrVal) !== -1;
		case "~=": // exactly one of a space separated list
			return sAttrValActual.split(' ').indexOf(sAttrVal) !== -1;
		case "|=": // exactly one of a hyphen separated list
			return sAttrValActual.split('-').indexOf(sAttrVal) !== -1;
		default:
			E("CSSSelector", "fbSelectAttr", "unknown selector attribute test", sAttrTest);
			return true;
		}
	};


	// ---------------------------------------------------------------------------
	// fTestNthChild
	//   tests whether an index passes the nth-child class of pseudo selector 
	//   test. 
	//
	// Params
	//   n           := index to test
	//   sPseudoArg  := either 'odd', 'even', or the first integer in the (A) 
	//                  or (An+B) forms
	//   sPseudoArg2 := optional. If given, interpreted as the B part of the
	//                  (An+B) form.
	//
	// Returns 
	//   true if the index passes the test
	//
	var fTestNthChild = function(n,sPseudoArg, sPseudoArg2){
		switch(sPseudoArg){
		case "even": 
			return ((n+1)%2) === 0;
		case "odd" : 
			return ((n+1)%2) === 1;
		default:
			if (nsTypes.fbIsUndefined(sPseudoArg2)){
				return n === (sPseudoArg-1);
			}

			return ((n - (sPseudoArg2-1)) % sPseudoArg) === 0;
		}
	};


	// ---------------------------------------------------------------------------
	// fEnsureStateHasOfTypeInfo
	//   computes the information required for *-of-type selector pseudo-classes
	// 
	// Params
	//   aState := object into which state information can be stored
	//   ve     := array of elements whos state OfType information is
	//             to be computed
	//
	// Side Effects
	//   if not already present, it adds to the aState object:
	//
	//     vnOfType :=  array which indicates which instance of each type the 
	//                  element is.
	//     acOfType :=  hash of counts for each type
	//
	//
	var fEnsureStateHasOfTypeInfo = function(aState, ve){
		if (aState.aOfType){
			return;
		}

		aState.vnOfType=[];
		aState.acOfType={};

		ve.each(function(e,n){
			if (e["type"] === "tag"){
				if (!aState.acOfType[e["name"]]){
					aState.acOfType[e["name"]] = 0;
				}

				aState.vnOfType[n] = aState.acOfType[e["name"]];
				aState.acOfType[e["name"]]++;
			}
		});
	};



	// ---------------------------------------------------------------------------
	// fbSelectPseudo
	//   tests whether the given element matches the pseudo class selector
	//
	//   Currently supported pseudo class selectors:
	//     * first-child
	//     * last-child
	//     * nth-child
	//     * nth-last-child
	//     * first-of-type
	//     * last-of-type
	//     * only-of-type
	//     * nth-of-type
	//     * nth-last-of-type
	//     * empty
	//     * not
	//     * contains
	//
	// Params:
	//   sPseudo     := pseudo class selector
	//   sPseudoArg  := optional. first argument to the selector
	//   sPseudoArg2 := optional. second argument to the selector, if its of the
	//                  form (An+B)
	//   e           := element to test
	//   n           := index of this element (i.e. which sibling)
	//   ve          := the array of siblings of the element
	//
	// Returns
	//   true if the 
	// unsupported
	//  first-line
	//  first-letter
	//
	var fbSelectPseudo = function(sPseudo, sPseudoArg, sPseudoArg2, e, n, aState, ve){

		var c = ve.length;
		var asMatch, nFirst, cStep;

		switch(sPseudo){

		case undefined:
			return true;

		case "first-child":
			return n === 0;

		case "last-child":
			return n === ve.length-1;

		case 'nth-child':
			return fTestNthChild(n,sPseudoArg,sPseudoArg2);

		case 'nth-last-child':
			return fTestNthChild(c - 1 - n,sPseudoArg,sPseudoArg2);
 
		case 'first-of-type':
			fEnsureStateHasOfTypeInfo(aState, ve);
			return aState.vnOfType[n] === 0;

		case 'last-of-type':
			fEnsureStateHasOfTypeInfo(aState, ve);
			return aState.vnOfType[n] === aState.acOfType[e["name"]];

		case 'only-of-type':
			fEnsureStateHasOfTypeInfo(aState, ve);
			return aState.acOfType[e["name"]] === 1;

		case 'nth-of-type':
			fEnsureStateHasOfTypeInfo(aState, ve);
			return fTestNthChild(aState.vnOfType[n], sPseudoArg,sPseudoArg2);

		case 'nth-last-of-type':
			fEnsureStateHasOfTypeInfo(aState, ve);
			return fTestNthChild(aState.acOfType[e["name"]] - 1 - aState.vnOfType[n], sPseudoArg,sPseudoArg2);

		case 'empty':
			return (!("children" in e) || (e["children"].length===0));

		case 'not':
			//return fveSelect([e], sPseudoArg, true, false).length === 0;
			return fveSelect(ve, sPseudoArg, true, false,n, n).length === 0;

		case 'contains':
			return fveSelect(e["children"], sPseudoArg).length > 0;

		default:
			E("CSSSelector", "fbSelectPseudo", "unknown pseudo selector", sPseudo, sPseudoArg,sPseudoArg2);
		}
	};



	// ---------------------------------------------------------------------------
	// fvaTestForSelector
	//   parse a selector into a series of test structures which can be applied to
	//   elements
	//
	// Params
	//   sel := selector
	//
	// Returns
	//   an array of aTest, on for each level of the selector, which contains:
	//
	//     fb := a `function(e, n, aState, ve)` - which tests whether an element 
	//           matches the current level of the selector
	//     
	//     sSubordinationType := an indicator which specifies the meaning
	//        of subsequent selectors in the chain. It can be one of:
	// 
	//        ''  := subsequent selectors match any descendants
	//        '>' := subsequent selectors match any immediate descendants
	//        '~' := subsequent selectors match any following siblings
	//        '+' := subsequent selectors match the immediately following sibling
	//
	var fvaTestForSelector = function(sel){

		var re = new RegExp(
			"^"
			// tag/type
				+ "([\\w*_-]*)" 
			// id
				+ "(#([\\w-]*))?" 
			// class
				+ "(\\.([\\w-]*))?" 
			// attribute, test, testval
				+ "(\\[\\s*([\\w-]*)\\s*(([^\\w\\s-]*)\\s*((['\"]([^'\"]*)['\"])|([\\w-]*))\\s*)?\\])?" 
			// pseudo, pseudoarg, pseudoarg2
				+ "(:([\\w-]+)(\\(((([0-9]+)n\\+([0-9]+))|([^\\)]*))\\))?)?" 
			// subortination type and continuation
				+ "(\\s*([\\s+~>]?)\\s*(.+))?" 
		);

		//	D("SIMPLE TEST",re.exec(sel));

		var vaTest = [];
		var bMatch = true;
		while(sel && sel.length && bMatch){
			bMatch = (function(asMatch){ 
				if (!asMatch){
					E("CSSSelector","fvaTestForSelector","Bad selector",sel);
					return false;
				}

				/*
					asMatch.each(function(s,n){
					D(n + ": " + asMatch[n]);
					});
				*/
		
				var sType = asMatch[1];
				var sId = asMatch[3];
				var sClass = asMatch[5];
				var sAttr = asMatch[7];
				var sAttrTest = asMatch[9];
				var sAttrVal = asMatch[12] || asMatch[13];
				var sPseudo = asMatch[15];
				var sPseudoArg = asMatch[19] || asMatch[17];
				var sPseudoArg2 = asMatch[20];
				var sSubordinationType = asMatch[23];
				var selNew = nsUtilities.fsTrim(asMatch[24] || "");

				if (selNew === sel){
					E("CSSSelector","fvaTestForSelector","Bad selector",sel);
					return false;
				}

				sel = selNew;

				vaTest.push({
					sSubordinationType : sSubordinationType,
					sel : asMatch[0],
					fb: function(e, n, aState, ve){
						/*
							D();
							D("fbSelectType",sType,fbSelectType(sType, e));
							D("fbSelectId",sId,fbSelectId(sId, e));
							D("fbSelectClass",sClass,fbSelectClass(sClass, e));
							D("fbSelectAttr",sAttr,sAttrTest,sAttrVal,fbSelectAttr(sAttr, sAttrTest, sAttrVal, e));
							D("fbSelectPseudo",sPseudo,sPseudoArg,fbSelectPseudo(sPseudo, sPseudoArg, sPseudoArg2, e, n, aState, ve));
						*/

						return (
							// TODO: consider returning text as well for :first-line and :first-letter pseudo elements
							e["type"] === "tag" 
								&& fbSelectType(sType, e) 
								&& fbSelectId(sId, e)
								&& fbSelectClass(sClass, e)
								&& fbSelectAttr(sAttr, sAttrTest, sAttrVal, e)
								&& fbSelectPseudo(sPseudo, sPseudoArg, sPseudoArg2, e, n, aState, ve)
						);
					}
				});

				return true;
			})(re.exec(sel));
		}


		return bMatch ? vaTest : false;
	};



	// ---------------------------------------------------------------------------
	// fveSelectVePassingTests 
	//   filters an array of elements with a series of selector tests
	//
	// Params
	//   ve           := arary of elements to be filtered
	//   vaTest       := a series of tests to be tested against the elements
	//                   See also: [fvaTestForSelector]
	//   bNextSibling := optional. if true, then the first element in ve 
	//                   must match the first component of the selector
	//   bOnlySibling := optional. if true, then one fo the element in ve 
	//                   must match the first component of the selector 
	//   nStart       := optional. if given, the first element in the array 
	//                   to test                  
	//   nEnd         := optional. if given, the last element in the array 
	//                   to test                  
	//                   
	// Returns
	//   an array of elements which match the selector
	//
	var fveSelectVePassingTests = function(
		ve, vaTest,bNextSibling, bOnlySibling, nStart, nEnd
	){
		if (!ve){
			return [];
		}

		var veOut = [];

		var aState = {};

		nStart = nStart || 0;
		nEnd = nEnd || ve.length - 1;
		for (var n = nStart, c = nEnd+1; n<c; n++){
			var fbTest = vaTest[0].fb;
			var sSubordinationType = vaTest[0].sSubordinationType;
			var e=ve[n];

			var bPasses = fbTest(e,n,aState,ve);

			if (!bPasses && bNextSibling){
				return [];
			}

			var veRest = [];

			if (bPasses){
				if (vaTest.length===1){
					veRest = [e];
				}
				else{
					switch(sSubordinationType){
					case '': // find any descendants against remaining pattern
						if ("children" in e){
							veRest = fveSelectVePassingTests(e["children"], vaTest.slice(1), false, false);
						}
						break;
					case '>': // find any immediate descendants against remaining pattern
						if ("children" in e){
							D("here", vaTest.slice(1));
							veRest = fveSelectVePassingTests(e["children"], vaTest.slice(1), false, true);
						}
						break;
					case '~': // find any  sibling against remaining pattern
						if (n<c){
							veRest = fveSelectVePassingTests(ve.slice(n), vaTest.slice(1), false, true);
						}
						break;
					case '+': // find any immediate sibling against remaining pattern
						if (n<c){
							veRest = fveSelectVePassingTests(ve.slice(1), vaTest.slice(1), true, false);
						}
						break;
					default:
						E("CSSSelector","fveSelectVePassingTests","Unknown sSubordinationType", sSubordinationType);
					}
				}
			}

			veOut = veOut.concat(veRest);

			// recurse
			if (!bOnlySibling){
				veOut = veOut.concat(fveSelectVePassingTests(e["children"], vaTest, false, false));
			}
		}

		return veOut;
	};



	// ---------------------------------------------------------------------------
	// fveSelect
	//   filter an array of elements with a selector or multiple comma separated 
	//   selectors, (i.e. a compound-selector)
	//
	// Params
	//   ve           := arary of elements to be filtered
	//   selCompound  := CSS selector
	//   bNextSibling := optional. if true, then the first element in ve 
	//                   must match the first component of the selector
	//   bOnlySibling := optional. if true, then one fo the element in ve 
	//                   must match the first component of the selector 
	//   nStart       := optional. if given, the first element in the array 
	//                   to test                  
	//   nEnd         := optional. if given, the last element in the array 
	//                   to test                  
	//
	// Returns
	//   an array of elements which match the selector
	//
	fveSelect = function(
		ve, selCompound, bNextSibling, bOnlySibling, nStart, nEnd
	){
		var vsel = selCompound.split(/\\\s*,\s*/);

		var veOut = vsel.accumulate(function(sel){
			var aMatch = /^\s*>(.*)$/.exec(sel);
			if (aMatch){
				bOnlySibling = true;
				sel= aMatch[1];
			}
			var vaTest = fvaTestForSelector(sel);
			if (!vaTest){
				return [];
			}

			return fveSelectVePassingTests(
				ve, vaTest, bNextSibling, bOnlySibling, nStart, nEnd
			);
		});

		// remove duplicates
		for (var n = 0, c=veOut.length; n<c; n++){
			if (veOut[n].__duplicate){
				veOut.splice(n,1);
				n--;
				c--;
			}
			else{
				veOut[n].__duplicate = true;
			}
		}
	
		for (n = 0, c=veOut.length; n<c; n++){
			delete veOut[n].__duplicate;
		}

		return veOut;
	};


	return fveSelect;

})();


//fveSelectAndRemoveMatchingSimpleSelector([], "sType#sId.sClass[sAttr^=sVal]:sPseudo(sPseudoArg)>sRemai