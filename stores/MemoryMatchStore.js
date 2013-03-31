var MatchStore = require("MatchStore");
var nsClasses  = require("nsClasses");
var nsTypes    = require("nsTypes");
var StringSet  = require("StringSet");


// ---------------------------------------------------------------------------
// ffSortWordStart
//  returns a sorting function which first prefers words which have the 
//  match as prefix, then where the match starts a word, then 
//  leaves in order found
//
// Param
//  sMatch := string to use for preference detection
//  
// Returns
//  `function(sKey1, sKey2)` that preferentially selects words starting 
//  with the given match string
//
var ffSortWordStart = function(sMatch){
	return function(sKey1,sKey2){
		var n1 = sKey1.indexOf(sMatch);

		if (n1 === 0){
			return -1;
		}

		var n2 = sKey2.indexOf(sMatch);

		if (n2 === 0){
			return 1;
		}

		var nWord1 = sKey1.indexOf(" " + sMatch);
		var nWord2 = sKey2.indexOf(" " + sMatch);

		if (nWord1 !==-1 && nWord2 !== -1){
			return (nWord1 < nWord2) ? -1 : 1;
		}

		if (nWord1 !==-1){
			return -1;
		}

		if (nWord2 !==-1){
			return 1;
		}

		return -1;
	};
};




// ---------------------------------------------------------------------------
// MemoryMatchStore
// 
//   memory based match store that adheres to the MemoryMatchStore promise.
//
// Params
//   aOptions := options:
//      cCache           := the size of the cache to maintain, in number 
//                          of past matches  to remember (default 100)
//      bCaseInsensitive := should matches ignore case (default: true)
//      cMaxRead         := maximum number of items to return, of 0 
//                          return all (default: 0)
//      ffSortPriority   := Optional. `function(sMatch)` returns 
//                          a sorting function `function(sKey1,sKey2)` 
//                          (default: ffSortWordStart)
//
// See Also
//  [doc/MatchStore.md]
//  [ffSortWordStart]
//
var MemoryMatchStore = function(aOptions){
	aOptions = {
		cCache           : 100,
		cMaxRead         : 0,
		bCaseInsensitive : true,
		ffSortPriority   : ffSortWordStart
	}.mergeIn(aOptions);

	this.aOptions = aOptions;

	this.aKeyValue = {};
	this.vaMatchInitial = [];
	this.vavaCachedMatchSets = [];
};

nsClasses.fInherit(MemoryMatchStore,MatchStore);



// ---------------------------------------------------------------------------
// fsetsMatchingKeys
//  returns the set of keys which match the given string. First checks the 
//  cache for the closest match, then continues to pare down set for any
//  new suffixes
//
// Params
//   mms := MemoryMatchStore to search
//
//   sMatch := string to match
//
// Returns
//   set of matching keys
//
// Side Effects
//   Updates the internal match cache table
//
// Scope => Private
var fsetsMatchingKeys = function(mms,sMatch){
	// find best match in cache
	var cMatchLength = 0;
	var vaMatchSet = mms.vaMatchInitial;

	if (mms.aOptions.bCaseInsensitive){
		sMatch = sMatch.toLowerCase();
	}

	mms.vavaCachedMatchSets.each(function(avaMatchSet){
		if (avaMatchSet.sMatch.length > cMatchLength){
			if (sMatch.indexOf(avaMatchSet.sMatch) === 0){
				vaMatchSet = avaMatchSet.vaMatchSet;
				cMatchLength = avaMatchSet.sMatch.length;
			}
		}
	});

	I("MemoryMatchStore","fsetsMatchingKeys","best key length and set length",cMatchLength, vaMatchSet.length);

	// extract subset that does match each subsequent letter
	for (var n=cMatchLength,c=sMatch.length; n<c; n++){
		var chTest = sMatch.charAt(n);

		/*jshint loopfunc:true*/
		vaMatchSet = vaMatchSet.select(function(aMatch){
			return aMatch.s.charAt(aMatch.n + n) === chTest;
		});
		/*jshint loopfunc:false*/

		// TODO: consider updating cache here on a letter by letter basis
	}
	
	I("MemoryMatchStore","fsetsMatchingKeys","matches found",vaMatchSet.length);

	// update cache if a new match 
	if (cMatchLength < sMatch.length){
		if (mms.vavaCachedMatchSets.length >= mms.aOptions.cCache){
			mms.vavaCachedMatchSets.shift();
		}
		mms.vavaCachedMatchSets.push({ sMatch: sMatch, vaMatchSet : vaMatchSet});
	}

	// return a set of the matching keys
	var setsMatchingKeys = new StringSet();
	vaMatchSet.each(function(aMatch){
		setsMatchingKeys.fAdd(aMatch.s);
	});

	return setsMatchingKeys;
};


// ---------------------------------------------------------------------------
// MemoryMatchStore.fRead 
//  calls back with all values which match the current key, as per our definition of match
//
// Params
//   vs := the search parameters
//          [0] := `sMatch` - the string we need to match
//          [1...n] := `vsField` - the fields to return
//   fCallback := `function(err,vxValue)` the values whose keys matched 
//
MemoryMatchStore.prototype.fRead = function(vs,fCallback){
	var sMatch  = vs[0];
	var vsField = vs.slice(1);

	I("MemoryMatchStore","fRead","searching for",sMatch);

	// find set of matching keys
	var setsMatchingKeys = fsetsMatchingKeys(this, sMatch);

	var store = this;

	var vxValue;

	if (this.aOptions.ffSortPriority){
		var vsKeys = setsMatchingKeys.vmap(function(sKey){
			return sKey;
		});

		vsKeys.sort(this.aOptions.ffSortPriority(sMatch));

		vxValue = vsKeys.map(function(sKey){
			return store.aKeyValue[sKey];
		});
	}
	else{
		vxValue = setsMatchingKeys.vmap(function(sKey){
			return store.aKeyValue[sKey];
		});
	}

	// if fields are specified, xValue had better be an object
	// and we will pull out only some fields in each xValue
	if (vsField.length > 0){
		vxValue = vxValue.map(function(xField){
			return xField.filterFields(vsField);
		});
	}

	if (this.aOptions.cMaxRead){
		vxValue = vxValue.slice(0,this.aOptions.cMaxRead);
	}

	fCallback(null,vxValue);
};


// ---------------------------------------------------------------------------
// MemoryMatchStore.fWrite
//   add a new key value pair to the store, adds index into initial set
//
// Params
//   vs := the search parameters
//          [0] := `sKey`/`sMatch` - the key under which the value is to be stored
//          [1...n] := `vsField` - if provided only these values will be written
//                      and will be merged into any prexisting value
//
//   xValue := the value to store
//
//   fCallback := `function(err)` called when done
//
// Side Effects 
//   vaMatchInitial member is updated to include all zero-length offsets for the 
//   new key

MemoryMatchStore.prototype.fWrite = function(vs,xValue,fCallback){
	var sMatch  = vs[0];
	var vsField = vs.slice(1);

	if (!sMatch){
		return fCallback("no key");
	}

	if (vsField.length === 0){
		var sKey = sMatch;

		if (this.aOptions.bCaseInsensitive){
			sKey = sKey.toLowerCase();
		}

		// too many
		//		I("MemoryMatchStore","fWrite","key value",sKey, xValue);
		if (!(sKey  in this.aKeyValue)){
/*
			for(var n=0, c=sKey.length; n<c; n++){
				this.vaMatchInitial.push({s:sKey, n:n});
			}
	*/
			for(var n=0, c=sKey.length; n<c; n++){
				if (n===0 || sKey.charAt(n-1) === ' '){
					this.vaMatchInitial.push({s:sKey, n:n});
				}
			}

		}
		this.aKeyValue[sKey] = xValue;
	}
	else{
		I("MemoryMatchStore","fWrite","match alter",sMatch, vsField, xValue);

		// find best match in cache
		var setsMatchingKeys = fsetsMatchingKeys(this, sMatch);

		xValue = xValue.filterFields(vsField);

		var store = this;
		setsMatchingKeys.each(function(sKey){
			store.aKeyValue[sKey].mergeIn(xValue);
		});
	}

	fCallback(null);
};


// ---------------------------------------------------------------------------
// MemoryMatchStore.fDelete 
//  removes all values which match the current key, as per our definition of match
//
// Params
//   vs := the search parameters
//          [0] := `sMatch` - the string we need to match
//          [1...n] := `vsField` - the fields to return
//
//   fCallback := `function(err)` 
//
// Side Effects
//   flushes the internal match cache table completely as fixing it would 
//   be too slow
//
MemoryMatchStore.prototype.fDelete = function(vs,fCallback){
	var sMatch  = vs[0];
	var vsField = vs.slice(1);

	I("MemoryMatchStore","fDelete","searching for",sMatch);

	// get matching keys
	var setsMatchingKeys = fsetsMatchingKeys(this,sMatch);

	// wipe the entire cache
	// updating each entry would be very slow, comparable to rebuilding, and not worth it
	this.vavaCachedMatchSets = [];

	// if no fields provided delete the entire key from the key value hash
	var store = this;
	if (vsField.length === 0){
		setsMatchingKeys.each(function(sKey){
			delete store.vavaCachedMatchSets[sKey];
		});

		// delete the keys from nomatch table
		store.vaMatchInitial = store.vaMatchInitial.select(function(aMatch){
			return !setsMatchingKeys.fbHas(aMatch.s);
		});
	}
	// if fields provided delete only those keys from the key value hash
	else{
		setsMatchingKeys.each(function(sKey){
			store.vavaCachedMatchSets[sKey] = store.vavaCachedMatchSets[sKey].filterOutFields(vsField);
		});

	}

	fCallback(null);
};
		

module.exports = MemoryMatchStore;
