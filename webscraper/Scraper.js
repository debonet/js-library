var nsUtilities   = require("nsUtilities");
var nsTypes       = require("nsTypes");
var nsHtmlparser  = require("htmlparser");
//var fveSelect     = require("soupselect").select;
var fveSelect     = require("CSSSelector");
var nsHttpRepair  = require("nsHttpRepair");


// -------------------------------------------------------------------------
// fMeshInto
//   merge an array of values into one field of an array of objects
//
// Params
//   va := array of objects into which value is to be meshed
//   s  := field into which values are to be stored
//   vx := aray of values 
//   fxTransform  := optional. a function which transforms the value
//                   before storing
//
var fMeshInto = function(va, s, vx, fxTransform){
	if (!vx){
		return;
	}

	fxTransform = fxTransform || function(x){return x;};

	for (var n=0, c=vx.length; n<c; n++){
		if (va.length <= n){
			va[n] = {};
		}
		
		va[n][s] = fxTransform(vx[n]);
	}
};



//---------------------
var Scraper = function(ve){
	if (nsTypes.fbIsArray(ve)){
		this.ve = ve;
	}
	else if (nsTypes.fbIsObject(ve)){
		this.ve = [ve];
	}
};

//-----------------------------------------------------------------------------
Scraper.prototype.each = function(f){
	var scraper = this;
	return this.ve.each(function(e,n){
		f.call(scraper, e, n);
	});
};

//-----------------------------------------------------------------------------
Scraper.prototype.feGet = function(n){
	return this.ve[n];
};

//-----------------------------------------------------------------------------
Scraper.prototype.fc = function(){
	return this.ve.length;
};

//-----------------------------------------------------------------------------
Scraper.prototype.fxMap = function(f){
	return this.ve.map(f);
};

//-----------------------------------------------------------------------------
Scraper.prototype.fscraperFind = function(sel){
	if (!sel){
		return this;
	}

	return new Scraper(fveSelect(this.ve, sel));
};

//-----------------------------------------------------------------------------
Scraper.prototype.fscraperChildren = function(){
	return new Scraper( 
		this.ve.accumulate(function(e){
			return e["children"] || [];
		})
	);
};

//-----------------------------------------------------------------------------
var fsText = function(e){
	return e["type"] === 'text' ? nsUtilities.fsTrim(e["data"]) : "";
};


//-----------------------------------------------------------------------------
Scraper.prototype.fvsText = function(){
	return this.fxMap(function(e){
		var vs = [];
		if (e["children"]){
			e["children"].each(function(eSub){
				vs.push(fsText(eSub));
			});
		}

		return nsUtilities.fsTrim(vs.join(' '));
	});
};


//-----------------------------------------------------------------------------
Scraper.prototype.fsText = function(){
	return nsUtilities.fsTrim(this.fvsText().join(' '));
};


//-----------------------------------------------------------------------------
var fvsTextWithinElement = function(e){
	var vs = [];
	if (e["type"] === 'text'){
		vs.push(nsUtilities.fsTrim(e["data"]));
	}
	
	if (e["children"]){
		e["children"].each(function(eSub){
			vs = vs.concat(fvsTextWithinElement(eSub));
		});
	}
	
	return vs;
};

//-----------------------------------------------------------------------------
var fsHtmlWithinElement = function(e){
	var scraper = new Scraper(e);
	return scraper.fshtml();
};

//-----------------------------------------------------------------------------
var fsTextWithinElement = function(e){
	return nsUtilities.fsTrim(fvsTextWithinElement(e).join(' '));
};

//-----------------------------------------------------------------------------
Scraper.prototype.fsTextWithin = function(){
	return nsUtilities.fsTrim(this.fvsTextWithin().join(' '));
};


//-----------------------------------------------------------------------------
Scraper.prototype.fvsTextWithin = function(){
	return this.fxMap(function(e){
		return nsUtilities.fsTrim(fvsTextWithinElement(e).join(' '));
	});
};

//-----------------------------------------------------------------------------
Scraper.prototype.fvsHtmlWithin = function(){
	return this.fxMap(function(e){
		return nsUtilities.fsTrim(fsHtmlWithinElement(e));
	});
};


//-----------------------------------------------------------------------------
Scraper.prototype.fvsAttribute = function(sAttr){
	if (sAttr === "_text"){
		return this.fvsText();
	}

	if (sAttr === "_textwithin"){
		return this.fvsTextWithin();
	}

	if (sAttr === "_html"){
		return this.fvsHtmlWithin();
	}

	return this.fxMap(function(e,n){
		return ("attribs" in e) ? e["attribs"][sAttr] : "undefined";
	});
};

//-----------------------------------------------------------------------------
Scraper.prototype.fvaAttribute = function(vsAttr){
	if (nsTypes.fbIsString(vsAttr)){
		vsAttr = [vsAttr];
	}

	if (vsAttr){
		return this.fxMap(function(e){
			var a = {};
			var sVal;
			for (var n=0, c=vsAttr.length; n<c; n++){
				switch(vsAttr[n]){
				case "_text":
					sVal = fsText(e);
					break;
				case "_textwithin":
					sVal = fsTextWithinElement(e);
					break;
				default:						
					sVal = e["attribs"][vsAttr[n]];
					break;
				}

				if (sVal){
					a[vsAttr[n]] = sVal;
				}
			}
			return a;
		});
	}

	return this.fxMap(function(e){
		if ("attribs" in e){
			return e.attribs.fxCopy();
		}
		return {};
	});
};


// ----------------------------------------------------------------------------
// fxScrape 
//   recursively scrape out parts of the tree building a structure which
//   is proscribed by the given xDefinition
// 
// Params
//   xDefinition := vDefinition | aDefinintion where:
//
//     vDefinition   := vValueSpec | vEachSpec
//       vValueSpec     := [attribute, selector, fxTransform] 
//                         picks out a single value, optionally 
//                         transforming it
//        vEachSpec     := ["_each", selector, xDefinition]
//                         for each child matching the selector, the 
//                         definition is rerun
//
//     aDefinition   := {sStoreAs : xDefinition}
//
// Returns
//   a structure of arrays and hashes as described by the definition
//   
Scraper.prototype.fxScrape = function(xDefinition){
	var x;

	if (nsTypes.fbIsArray(xDefinition)){
		var scraperSub = this.fscraperFind(xDefinition[1]);

		if (xDefinition[0] === "_each"){
			x = scraperSub.fxMap(function(e){
				return new Scraper(e).fxScrape(xDefinition[2]);
			});
		}
		else if (xDefinition[0] === "_mesh"){
				x = scraperSub.fvaMeshScrape(xDefinition[2]);
		}
		else{
			var vx = scraperSub.fvsAttribute(xDefinition[0]);
			vx = vx.map(xDefinition[2] || function(x){return x;});
			x = vx.join('');
		}
	}
	else{
		var scraperChildren = this.fscraperChildren();

		x = xDefinition.map(function(xDefinitionSub,sKey){
			return scraperChildren.fxScrape(xDefinitionSub);
		});
	}

	return x;
};


// ----------------------------------------------------------------------------
// fMeshScrapeMerge
//   scrape a collection of patterns and mesh them into an array 
//   of objects
// 
// Params
//   va              := array into which key,values are to be merged
//
//   vaPatternForKey := an array of entries of the form 
//
//                   {sKey : [sAttribute, sPattern]},
//      where:
//
//         sKey       := the key in va into which the retrieved value
//                       is to be stored
//         sAttribute := the attribute to retrieve from matching elements
//         sPattern   := the pattern for which to search
//
// Side Effects
//   input argument va is modified to contain the array
// 
Scraper.prototype.fMeshScrapeMerge = function(va, vaPatternForKey){
	for (var sKey in vaPatternForKey){
		if (vaPatternForKey.hasOwnProperty(sKey)){
			var sAttribute = vaPatternForKey[sKey][0];
			var sPattern   = vaPatternForKey[sKey][1];
			fMeshInto(
				va, 
				sKey, 
				this.fscraperFind(sPattern).fvsAttribute(sAttribute), 
				vaPatternForKey[sKey][2]
			);
		}
	}
};


// ----------------------------------------------------------------------------
// fvaMeshScrape
//   scrape a collection of patterns and mesh them into an array 
//   of objects
// 
// Params
//   vaPatternForKey := an array of entries of the form 
//
//                   {sKey : [sAttribute, sPattern]},
//      where:
//
//         sKey       := the key in va into which the retrieved value
//                       is to be stored
//         sAttribute := the attribute to retrieve from matching elements
//         sPattern   := the pattern for which to search
//
Scraper.prototype.fvaMeshScrape = function(vaPatternForKey){
	var va = [];
	this.fMeshScrapeMerge(va,vaPatternForKey);
	return va;
};

// ----------------------------------------------------------------------------
// fMeshScrapeAppend
//   scrape a collection of patterns and append them to a preexisting array 
// 
// Params
//   va              := array into which key,values are to be merged
//
//   vaPatternForKey := an array of entries of the form 
//
//                   {sKey : [sAttribute, sPattern]},
//      where:
//
//         sKey       := the key in va into which the retrieved value
//                       is to be stored
//         sAttribute := the attribute to retrieve from matching elements
//         sPattern   := the pattern for which to search
//
// Side Effects
//   input argument va is modified to contain the array
// 
Scraper.prototype.fMeshScrapeAppend = function(va, vaPatternForKey){
	this.fvaMeshScrape(vaPatternForKey).each(function(a){
		va.push(a);
	});
};


// ---------------------------------------------------------------------------
// fsTree
//   generate a string representation of the current parse tree
//
// Params:
//   aOptions := an object with the following optional parameters
//
//      cMaxDepth    := maximum number of levels to show 
//                      (default: infinite)
//
//      sIndent      := string to be used to indent each element 
//                      (defaults to tab, i.e. '\t')
//
//      sLineStart   := initial indentation string 
//                      (defaults to '')
//
//      vsAttributes := array of attributes to show for each node 
//                      (default: [], use undefined for all)
//
//      bShowText    := if true, text is shown (default: false)
// 
// Returns:
//   a multiline string which reprepresents the in the given htmlparse 
//   indented to show the hierarchy
//
Scraper.prototype.fsTree = function(aOptions){


	// -------------------
	var fvsTreeForVe = function(ve, cMaxDepth, sLineStart){
		if (cMaxDepth === 0){
			return [];
		}

		var vsOut = [];
		ve.each(function(e){

			if (!aOptions.vsAttributes || (e["type"] === "text" && aOptions.bShowText)){
				vsOut.push(sLineStart + nsUtilities.fsTrim(e["data"]));
			}
			else if (e["type"] === "tag"){
				var sLine = sLineStart + e["name"] + "(" + e["id"] + ")";
				if ("attribs" in e){
					sLine += aOptions.vsAttributes.map(function(sAttribute){
						if (sAttribute in e["attribs"]){
							return " " + sAttribute + "='" + e["attribs"][sAttribute] + "'";
						}
						return "";
					}).join('');
				}
				vsOut.push(sLine);
			}

			if ("children" in e){
				vsOut = vsOut.concat(
					fvsTreeForVe(
						e["children"],
						cMaxDepth?cMaxDepth - 1:cMaxDepth,
						sLineStart + aOptions.sIndent
					)
				);
			}
		});

		return vsOut;
	};

	aOptions = {
		cMaxDepth : undefined,
		sIndent : "\t",
		sLineStart : "",
		vsAttributes : [],
		bShowText : false
	}.mergeIn(aOptions || {});


	return fvsTreeForVe(
		this.ve, aOptions.cMaxDepth, aOptions.sLineStart
	).join('\n');
};

// ---------------------------------------------------------------------------
// fshtml
//   generate a html string fromt the current parse
//
// Params:
//   sIndent        := optional. string to be used to indent each element 
//                     (defaults to tab, i.e. '\t')
//   sLineStart := optional. initial indentation string (defaults to '')
// 
// Returns:
//   a multiline string which reprepresents the in the given htmlparse 
//   indented to show the hierarchy
//
Scraper.prototype.fshtml = function(sIndent, sLineStart){

	// -------------------
	var fvsForVe = function(ve, sIndent, sLineStart){
		var vsOut = [];
		ve.each(function(e){
			if (e["type"] === "text"){
				vsOut.push(sLineStart + (e["data"]));
			}
			else{
				var vsTag = [];
				var vsEndTag = [];
				vsTag.push(sLineStart);
				vsTag.push("<");
				vsTag.push(e["name"]);
				if ("attribs" in e){
					e["attribs"].each(function(sVal, sAttr){
						vsTag.push(" ");
						vsTag.push(sAttr);
						vsTag.push("='");
						vsTag.push(sVal);
						vsTag.push("'");
					});
				}

				if ("children" in e){
					vsTag.push(">");
					vsOut.push(vsTag.join(''));
					vsOut = vsOut.concat(fvsForVe(e["children"],sIndent, sLineStart + sIndent));

					vsEndTag.push(sLineStart);
					vsEndTag.push("</");
					vsEndTag.push(e["name"]);
					vsEndTag.push(">");
					vsOut.push(vsEndTag.join(''));
				}
				else{
					vsTag.push(" />");
					vsOut.push(vsTag.join(''));
				}
			}
		});

		return vsOut;
	};

	sIndent = sIndent || "\t";
	sLineStart = sLineStart || "";

	return fvsForVe(this.ve, sIndent, sLineStart).join('\n');
};


// ----------------------------------------------------------------------------
// fCleanUp
//   a utility function to perform various cleaning actions on the parse
//
// Todo: 
//   add more fixes here
Scraper.prototype.fCleanUp = function(){
	nsHttpRepair.fEnsureCase(this.ve);
	nsHttpRepair.fEnsureTableLineage(this.ve);
};


// ----------------------------------------------------------------------------
// fMakeScraper
//   a utility function to make a scraper from from HTML
//
// Params
//   shtml     := html to be scraped
//   aOptions  := parser options. See htmlparser documentation
//   fCallback := `function(err, scraper)` called with a scraper prepared 
//                for the given html
//
Scraper.fMakeScraper = function(shtml, aOptions, fCallback){
	if (!fCallback){
		fCallback = aOptions;
		aOptions = {};
	}

	aOptions = {
		"verbose"          : false, 
		"ignoreWhitespace" : true
	}.mergeIn(aOptions);

	(new nsHtmlparser.Parser(
		new nsHtmlparser.DefaultHandler(
			function(err, veDocument){
				if (err){return fCallback(err);	}
				fCallback(null, new Scraper(veDocument));
			},
			aOptions
		)
	)).parseComplete(shtml);
};


// ----------------------------------------------------------------------------
// fMakeScraper
//   a utility function to make a scraper from from XML
//
// Params
//   shtml     := html to be scraped
//   aOptions  := parser options. See htmlparser documentation
//   fCallback := `function(err, scraper)` called with a scraper prepared 
//                for the given html
//
Scraper.fMakeXmlScraper = function(shtml, aOptions, fCallback){
	if (!fCallback){
		fCallback = aOptions;
		aOptions = {};
	}

	aOptions = {
		"enforceEmptyTags" : false
	}.mergeIn(aOptions);

	this.fMakeScraper(shtml,aOptions,fCallback);
};

// generic names
Scraper.prototype.length = Scraper.prototype.fc;
Scraper.prototype.map = Scraper.prototype.fxMap;
Scraper.prototype.find = Scraper.prototype.fscraperFind;
Scraper.prototype.text = Scraper.prototype.fsText;
Scraper.prototype.innerText = Scraper.prototype.fsText;
Scraper.prototype.eachText = Scraper.prototype.fvsText;
Scraper.prototype.eachTextWithin = Scraper.prototype.fvsTextWithin;
Scraper.prototype.eachAttribute = Scraper.prototype.fvsAttribute;
Scraper.prototype.eachAttributes = Scraper.prototype.fvaAttribute;
Scraper.prototype.meshScrape = Scraper.prototype.fvaMeshScrape;

module.exports = Scraper;
