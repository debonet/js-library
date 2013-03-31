var Mongo       = require("Mongo");
var MongoStore  = require("MongoStore");
var nsClasses   = require("nsClasses");
var nsTypes     = require("nsTypes");
var nsDate      = require("nsDate");
var nsUtilities = require("nsUtilities");
require("logging");


// ---------------------------------------------------------------------------
// fxProcessLeaves
//   recursively walk an object/array and execute a function on all leaves 
//   (non array/object) 
//
// Params:
//   xIn  := object or value whos leaves are to be processed
//   fx   := `function(x)` that returns a processed value
//
// Returns 
//   an identical structure with its leaves transformed
//
var fxProcessLeaves = function(xIn,fx){
	if (nsTypes.fbIsObject(xIn) || nsTypes.fbIsArray(xIn)){
		return xIn.map(function(x,s){
			return fxProcessLeaves(x,fx);
		});
	}
	else{
		return fx(xIn);
	}
};

// ---------------------------------------------------------------------------
// JournalingStore
//   See [/doc/storgeapi.js] for an explanation
// 
// Params
//   aConfig := options
//     fxPreprocess := function applied prior to storing data
//     fxPostprocess := function applied to stored data prior to retrieval
//     xObjectIndicator := the indicator stored in Mongo to indicat that a 
//                         key now stores an object, not a value. To be safe
//                         you can use {} which can't be stored, or to be 
//                         efficient, use some obscure number. However, this
//                         number can't be stored in the JournalingStore as
//                         it will be misinterpreted.
//
//     options foro Mogo := See also [Mongo.js]
//

// ---------------------------------------------------------------------------
var JournalingStore = function(aConfig){
	aConfig = {
		"collection"     : "journalstore",
		xObjectIndicator : -999123999,
		xArrayIndicator  : -999124999,
		fxPreprocess     : function(x){return x;},
		fxPostprocess    : function(x){return x;}
	}.mergeIn(aConfig);

	this.aConfig = aConfig;
	this.fSuper("constructor",aConfig);
};

nsClasses.fInherit(JournalingStore, MongoStore);

// ---------------------------------------------------------------------------
// fvsEnsureArray 
//   convert dotted lists to an array if necessary
// 
// Params
//   x := either a dotted string or an array
//
// Returns
//   an array or [] if the input isn't a string or array
//
JournalingStore.prototype.fvsEnsureArray = function(x){
	if (nsTypes.fbIsArray(x)){
		return x;
	}
	if (nsTypes.fbIsString(x)){
		return x.split('.');
	}

	return [];
};


// ---------------------------------------------------------------------------
var fsEscapeForRegEx = function(s){
	return s.replace(/([\]\.\[])/g,"\\$1");
};

// ---------------------------------------------------------------------------
var fsRegExForSelfAndDescendants = function(s){
	s=s || "";
	if (s === ""){
		return "^.*$";
	}
	return "^" + fsEscapeForRegEx(s) + "([\\.\\[].*)?$";
};

// ---------------------------------------------------------------------------
var fsRegExForDescendants = function(s){
	s=s || "";
	if (s === ""){
		return "^.*$";
	}
	return "^" + fsEscapeForRegEx(s) + "[\\.\\[].*$";
};

// ---------------------------------------------------------------------------
// JournalingStore.fRead
//   retrieves the latest value from a journal store
// 
// Params
//   s := the path to retrieve
//   fCallback := `function(err,x)` - called with result
//
// See Also
//   [JournalingStore.fReadJournal]
//
JournalingStore.prototype.fRead = function(s,fCallback){
	var xObjectIndicator = this.aConfig.xObjectIndicator;
	var xArrayIndicator = this.aConfig.xArrayIndicator;
	var fxPostprocess = this.aConfig.fxPostprocess;

	this.mongo.fFind(
		this.sCollection,
		{"key" : {"$regex": fsRegExForSelfAndDescendants(s)}, "value" : {"$ne" : null}},
		{"key" : 1, "value" : 1, "_id" : 0},
		function(err,va){
			if (err){ return fCallback(err); }

			var aOut = {};
			va.each(function(a){
				if (
					!nsTypes.fbEqual(a["value"],xObjectIndicator)
						&& !nsTypes.fbEqual(a["value"],xArrayIndicator)
				){
					nsUtilities.fSetTreePath(aOut,a["key"], a["value"]);
				}
			});

			var xOut = nsUtilities.fxGetTreePath(aOut,s);
			xOut = fxProcessLeaves(xOut, fxPostprocess);

			fCallback(null, xOut);
		}
	);
};


// ---------------------------------------------------------------------------
// JournalingStore.fReadTimestamp
//   retrieves the latest timestamp for the change in the value from 
// 
// Params
//   s := the path to retrieve
//   fCallback := `function(err,x)` - called with result
//
// See Also
//   [JournalingStore.fReadJournal]
//
JournalingStore.prototype.fReadTimestamp = function(s,fCallback){
	var xObjectIndicator = this.aConfig.xObjectIndicator;
	var xArrayIndicator = this.aConfig.xArrayIndicator;
	var fxPostprocess = this.aConfig.fxPostprocess;

	this.mongo.fFind(
		this.sCollection,
		{"key" : {"$regex": fsRegExForSelfAndDescendants(s)}, "value" : {"$ne" : null}},
		{"key" : 1, "timestamp" : 1, "_id" : 0},
		function(err,va){
			if (err){ return fCallback(err); }

			var tmOut;
			va.each(function(a){
				if (!tmOut || tmOut < a["timestamp"]){
					tmOut = a["timestamp"];
				}
			});

			fCallback(null, tmOut);
		}
	);
};


// ---------------------------------------------------------------------------
// JournalingStore.fReadKeys
//   retrieves the current keys (subtree branches) from a node in the store
// 
// Params
//   s := the path to the node whos subkeys are to be retrieved
//   fCallback := `function(err,x)` - called with result
//
// See Also
//   [JournalingStore.fReadJournal]
//
JournalingStore.prototype.fReadKeys = function(s,fCallback){
	var xObjectIndicator = this.aConfig.xObjectIndicator;
	var xArrayIndicator = this.aConfig.xArrayIndicator;
	var fxPostprocess = this.aConfig.fxPostprocess;

	this.mongo.fFind(
		this.sCollection,
		{"key" : {"$regex": fsRegExForDescendants(s)}, "value" : {"$ne" : null}},
		{"key" : 1, "_id" : 0},
		function(err,va){
			if (err){ return fCallback(err); }

			var vsOut = [];
			var cchSkip = s.length? s.length + 1 : 0;
			va.each(function(a){
				vsOut.push(a["key"].substring(cchSkip));
			});

			fCallback(null, vsOut);
		}
	);
};



// ---------------------------------------------------------------------------
var fMergeInAndWipeNull =	function (aBase, a){
	for (var sKey in a){
		if (a.hasOwnProperty(sKey)){

			if (nsTypes.fbIsNullOrUndefined(a[sKey])){
				delete aBase[sKey];
			}
			else if (nsTypes.fbIsObject(aBase[sKey]) && nsTypes.fbIsObject(a[sKey])){
				fMergeInAndWipeNull(aBase[sKey],a[sKey]);
			}
			else{
				aBase[sKey] = a[sKey];
			}
		}
	}
	return aBase;
};


// ---------------------------------------------------------------------------
// faRangeLimitFromXRangeLimit
//  converts a loosely formed XRangeLimit into a structured aRangeLimit
//  
//
// Params:
//   xRange := a number of different forms
//     [tmFrom, tmTo]            := returns all the entries between the given timestamps
//     [tmFrom, tmTo, xLimit]    := returns the specified subset of the entries between 
//                                  the given timestamps
//     {tmFrom:, tmTo:, cLimit:} := returns the specified subset of the entries between 
//                                  the given timestamps
//     xLimit                    := returns the subset of all entries specified by the 
//                                  limit (see below) of all 
//                          
//     Where an xLimit is given by one of:
//       'all'          := returns all available entries (same as 0)
//       'latest'       := returns just the latest entry (same as 1)
//       'first'        := returns just the first entry (same as -1)
//       +N             := returns the last N entries
//       -N             := returns the first N entries
//
// Returns
//   the standard-form aRangeLimit {tmFrom:, tmTo:, cLimit:}
//
var faRangeLimitFromXRangeLimit = function(xRangeLimit){

	var fcLimitFromXLimit = function(xLimit){
		if (nsTypes.fbIsNumber(xLimit)){
			return xLimit;
		}
		else if (xLimit === 'all'){
			return 0;
		}
		else if (xLimit === 'latest'){
			return 1;
		}
		else if (xLimit === 'first'){
			return -1;
		}
		return 0;
	};

	if (nsTypes.fbIsObject(xRangeLimit)){
		// if we get an object it had better be a legitimate xRangeLimit
		return xRangeLimit;
	}
	else if (nsTypes.fbIsArray(xRangeLimit)){
		return {
			tmFrom : xRangeLimit[0],
			tmTo   : xRangeLimit[1],
			cLimit : fcLimitFromXLimit(xRangeLimit[2])
		};
	}

	return {
		tmFrom : 0, // beginning of time
		tmTo   : 999999999999999, // distant future
		cLimit : fcLimitFromXLimit(xRangeLimit)
	};
};



// ---------------------------------------------------------------------------
// fvaSnapshotPrunedToRangeLimit
//   prune out elements of a journal snapshot to those that fit within the
//   specification of the range limit
//
// Params
//   vaSnapshot := the current unpruned journal snapshot
//   aRangeLimit := range limit specification {tmFrom:, tmTo, cLimit:}
//
// Returns
//   the subset of the given journal which fits within the range limit
//
var fvaSnapshotPrunedToRangeLimit = function(vaSnapshot, aRangeLimit){

	// cut entries before or after the date limits
	vaSnapshot = vaSnapshot.accumulate(function(aSnapshot){
		var tm = aSnapshot["timestamp"];
		if (tm >= aRangeLimit.tmFrom && tm <= aRangeLimit.tmTo){
			return [aSnapshot];
		}
		return [];
	});

	// cut out entries before or after the limit
	if (aRangeLimit.cLimit < 0){
		vaSnapshot = vaSnapshot.slice(0,Math.max(-aRangeLimit.cLimit,-vaSnapshot.length));
	}
	else if (aRangeLimit.cLimit > 0){
		vaSnapshot = vaSnapshot.slice(Math.max(vaSnapshot.length-aRangeLimit.cLimit,0),vaSnapshot.length);
	}

	return vaSnapshot;
};


// ---------------------------------------------------------------------------
// JournalingStore.fReadJournal
//   retrieves the entire journal value from a journal store
// 
// Params
//   s        := the path to retrieve
//
//   xRangeLimit   := optional. A range or limit definition
//                    see also [faRangeLimitFromXRangeLimit]
//
//     defaults to 'all'
//
//  fCallback := `function(err,vaJournal)` called back with a sorted array of
//               journal entries of the form: {value:, timestamp:} 
//
// See Also
//   [JournalingStore.fReadJournal]
//
JournalingStore.prototype.fReadJournal = function(s,xRangeLimit,fCallback){
	if (!fCallback){
		fCallback   = xRangeLimit;
		xRangeLimit = undefined;
	}

	var aRangeLimit      = faRangeLimitFromXRangeLimit(xRangeLimit);
	var xObjectIndicator = this.aConfig.xObjectIndicator;
	var xArrayIndicator = this.aConfig.xArrayIndicator;
	var fxPostprocess    = this.aConfig.fxPostprocess;

	this.mongo.fFind(
		this.sCollection,
		{"key" : {"$regex": fsRegExForSelfAndDescendants(s)}},
		{"key" : 1, "journal" : 1, "_id" : 0},
		function(err,va){
			if (err){ return fCallback(err); }

			// build an array of time->change, combining multiple changes at the same 
			// time into a single action stored at that time
			var axValueAtTm = {};
			va.each(function(aItem){
				aItem["journal"].each(function(aEntry){
					if (!nsTypes.fbEqual(aEntry["value"], xObjectIndicator)){
						nsUtilities.fSetTreePath(
							axValueAtTm,
							aEntry["timestamp"] + "." + aItem["key"],
							aEntry["value"]
						);
					}
				});
			});

			// convert the tree to an array
			var vaJournal = axValueAtTm.vmap(function(xValue,tm){
				return {
					"value"     : nsUtilities.fxGetTreePath(xValue,s),
					"timestamp" : tm
				};
			});

			// so it can be sorted
			vaJournal.sort(function(aJournal1,aJournal2){
				return aJournal1["timestamp"] - aJournal2["timestamp"];
			});

			// merge succeeding changes, being sure to wipe sets-to-null, into
			// a consolidated snapshot
			var xValue;
			var bValueIsObject = false;
			var vaSnapshot = vaJournal.map(function(aJournal){
				if (nsTypes.fbIsObject(aJournal["value"])){
					if (bValueIsObject){
						fMergeInAndWipeNull(xValue, aJournal["value"]);
					}
					else{
						bValueIsObject = true;
						xValue = aJournal["value"];
					}
				}
				else{
					bValueIsObject = false;
					xValue = aJournal["value"];
				}

				return {
					"timestamp" : aJournal["timestamp"],
					"value" : nsClasses.fxCopy(xValue)
				};
			});
			
			// free memory
			vaJournal = undefined;

			// prune to the range limit
			vaSnapshot = fvaSnapshotPrunedToRangeLimit(vaSnapshot, aRangeLimit);

			// postprocess remaining values
			vaSnapshot = vaSnapshot.map(function(aSnapshot){
				return {
					"timeout": aSnapshot["timeout"],
					"value" : fxProcessLeaves(aSnapshot["value"], fxPostprocess)
				};
			});

			fCallback(null, vaSnapshot);
		}
	);
};


// ---------------------------------------------------------------------------
// JournalingStore.fWrite
//   stores new values in the store
// 
// Params
//   s := store path
//   x := value to store
//   fCallback := `function(err)` called when done
//
JournalingStore.prototype.fWrite = function(s,x,fCallback){

	var mongo            = this.mongo;
	var sCollection      = this.sCollection;
	var xObjectIndicator = this.aConfig.xObjectIndicator;
	var xArrayIndicator  = this.aConfig.xArrayIndicator;
	var fxPreprocess     = this.aConfig.fxPreprocess;

	// -------------------------
	// ffEnsureAndSet
	//   a two step, serial process: 
	//     1. make sure the key exists, and if it does remove any journal entry for this time
	//     2. set the new value and add the new journal entry
	//
	// TODO: 
	//   theres a subtle issue here when trying to recover a broken transaction:
	//   if the value field has been set by the transaction, then we need to be 
	//   careful when backing out the transaction to make sure that we reset the
	//   value to what it was PRIOR to the transaction (or at least same or different
	//   from the soon-to-be-value) otherwise we'll either lose journal entries, or
	//   have double changes.
	//
	var ffEnsureAndSet = function(s,x,tm){
		return function(fCallbackAsync){
			mongo.fUpdate(
				sCollection,
				{"key" : s},
				{
					"$set" : {"key" : s},
					"$pull" : {"journal" : {"value" : x, "timestamp" : tm}}
				},
				{"safe":true, "upsert" : true},
				function(err){
					if (err){ return fCallbackAsync(err); }
					mongo.fUpdate(
						sCollection,
						{"key" : s, "value" : {"$ne" : x}},
						{
							"$set" : {"value" : x, "timestamp" : tm}, 
							"$push" : {"journal" : {"value" : x, "timestamp" : tm}}
							//							"$push" : {"journal" : x}
						},
						{"safe":true},
						fCallbackAsync
					);
				}
			);
		};
	};


	// -------------------------
	var ffWipeDecendants = function(s,tm){

		var sRe = fsEscapeForRegEx(s);

		return function(fCallbackAsync){
			mongo.fUpdate(
				sCollection,
				{"key" : {"$regex" : "^" + sRe + "\\..*"}, "value" : {"$ne":null}},
				{
					"$set" : {"value" : null, "timestamp":tm}, 
					"$push" : {"journal" : {"value" : null, "timestamp" : tm}}
//					"$push" : {"journal" : null}

				},
				{"safe":true, "multi":true},
				fCallbackAsync
			);
		};
	};


	// -------------------------
	var fvfStoreValue = function(s,x,tm){
		// we make a fake timestamp with a counter as a fractional part

		var xToStore;

		var sType = nsTypes.fsTypeOf(x);
		switch(sType){
		case "object":
			xToStore = xObjectIndicator;
			break;
		case "array":
			xToStore = xArrayIndicator;
			break;
		default:
			xToStore = fxPreprocess(x);
			break;
		}

		var vf = [];

		vf.push(ffEnsureAndSet(s, xToStore, tm));
		vf.push(ffWipeDecendants(s,tm));

		if (sType === "object"){
			x.each(function(xSub, sSub){
				vf = vf.concat(fvfStoreValue(s + '.' + sSub, xSub, tm));
			});
		}
		else if (sType === "array"){
			x.each(function(xSub, sSub){
				vf = vf.concat(fvfStoreValue(s + '[' + sSub + ']', xSub, tm));
			});
		}

		return vf;
	};


	// -------------------------
	var vs=s.split(/([.\[])/);

	var vf = [];
	var tm = nsDate.ftmNow();

	// make sure all ancestors of vs are objects
	for (var n=0, c=vs.length; n < c-1; n+=2){
		var sAncestor = vs.slice(0,n*2+1).join('');
		var xIndicator = (vs[n*2+1]==='.')?xObjectIndicator:xArrayIndicator;
		vf.push(ffEnsureAndSet(sAncestor, xIndicator, tm));
	}

	vf = vf.concat(fvfStoreValue(s,x,tm));

	// TODO: handle atomicity
	vf.asyncrun(fCallback);

};

// ---------------------------------------------------------------------------
// JournalingStore.fDelete
//  you cannot delete from a journal store. Instead store null
//
JournalingStore.prototype.fDelete = function(vs,fCallback){
	this.fWrite(vs,null,fCallback);
};

// ---------------------------------------------------------------------------
// JournalingStore.fExpunge
//
JournalingStore.prototype.fExpunge = function(s,fCallback){
	this.mongo.fRemove(
		this.sCollection,
		{"key" : {"$regex" : fsRegExForSelfAndDescendants(s)}},
		{"safe":true, "multi":true},
		function(err,x){
			fCallback(err);
		}
	);
};



// ---------------------------------------------------------------------------
// JournalingStore.fWipe
//  DANGER!! DANGER!! DANGER!! DANGER!! DANGER!! DANGER!! DANGER!! DANGER!! 
//  this permanently wipes the entire store 
//  DANGER!! DANGER!! DANGER!! DANGER!! DANGER!! DANGER!! DANGER!! DANGER!! 
//
JournalingStore.prototype.fWipe = function(fCallback){
	this.mongo.fRemove(this.sCollection, {}, fCallback);
};


// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
module.exports = JournalingStore;

