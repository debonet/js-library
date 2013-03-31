var JournalingStore  = require("JournalingStore");
var AccessControlStore  = require("AccessControlStore");
var nsClasses   = require("nsClasses");
var nsTypes     = require("nsTypes");
var nsDate      = require("nsDate");
var nsUtilities = require("nsUtilities");
require("logging");



// ---------------------------------------------------------------------------
// AtomStore
//   A tree storage mechanism which enables:
//    1. granular access control
//    2. encryption
//    3. journaling
//    4. subtree retrieval
//
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
//                         number can't be stored in the AtomStore as
//                         it will be misinterpreted.
//
//     options foro Mogo := See also [Mongo.js]
//

// ---------------------------------------------------------------------------
var AtomStore = function(aConfig){
	aConfig = {
		"collection" : "atomstore"
	}.mergeIn(aConfig);

	aConfig = {
		sCredMaster         : "master",
		"data collection"   : aConfig["collection"] + "-data",
		"access collection" : aConfig["collection"] + "-access"
	}.mergeIn(aConfig);

	this.aConfig = aConfig;

	var aConfigJournalStore = aConfig.foMerge({
		"collection" : aConfig["data collection"] 
	});

	var aConfigAccessControlStore = aConfig.foMerge({
		"collection" : aConfig["access collection"]
	});


	this.journalstore = new JournalingStore(aConfigJournalStore);
	this.accessstore  = new AccessControlStore(aConfigAccessControlStore);
};

// ---------------------------------------------------------------------------
// AtomStore.fRead
//   retrieves the latest value from a journal store
// 
// Params
//   sCred := the credentials
//   s := the path to retrieve
//   fCallback := `function(err,x)` - called with result
//
// See Also
//   [AtomStore.fReadJournal]
//
AtomStore.prototype.fRead = function(sCred, s, fCallback){
	var journalstore = this.journalstore;
	this.accessstore.fRead(
		this.aConfig.sCredMaster,
		sCred,
		s,
		function(err,aPermissions){
			if (err){ return fCallback(err); }
			if (!aPermissions["read"]){
				return fCallback("read permission denied");
			}
			return journalstore.fRead(s,fCallback);
		}
	);
};

// ---------------------------------------------------------------------------
// AtomStore.fReadTimestamp
//   retrieves the latest value from a journal store
// 
// Params
//   sCred := the credentials
//   s := the path to retrieve
//   fCallback := `function(err,x)` - called with result
//
// See Also
//   [AtomStore.fReadJournal]
//
AtomStore.prototype.fReadTimestamp = function(sCred, s, fCallback){
	var journalstore = this.journalstore;
	this.accessstore.fRead(
		this.aConfig.sCredMaster,
		sCred,
		s,
		function(err,aPermissions){
			if (err){ return fCallback(err); }
			if (!aPermissions["read"]){
				return fCallback("read permission denied");
			}
			return journalstore.fReadTimestamp(s,fCallback);
		}
	);
};

// ---------------------------------------------------------------------------
// AtomStore.fReadKeys
//   retrieves the latest keys (subtree branches) from a node in a journal store
// 
// Params
//   sCred := the credentials
//   s := the path to retrieve
//   fCallback := `function(err,x)` - called with result
//
// See Also
//   [AtomStore.fReadJournal]
//
AtomStore.prototype.fReadKeys = function(sCred, s, fCallback){
	var journalstore = this.journalstore;
	this.accessstore.fRead(
		this.aConfig.sCredMaster,
		sCred,
		s,
		function(err,aPermissions){
			if (err){ return fCallback(err); }
			if (!aPermissions["read"]){
				return fCallback("readkeys permission denied");
			}
			return journalstore.fReadKeys(s,fCallback);
		}
	);
};


// ---------------------------------------------------------------------------
// AtomStore.fReadJournal
//   retrieves the entire journal value from a journal store
// 
// Params
//   sCred         := the credentials
//
//   s             := the path to retrieve
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
//   [AtomStore.fReadJournal]
//
AtomStore.prototype.fReadJournal = function(sCred, s, xRangeLimit,fCallback){
	if (!fCallback){
		fCallback   = xRangeLimit;
		xRangeLimit = undefined;
	}

	var journalstore = this.journalstore;
	this.accessstore.fRead(
		this.aConfig.sCredMaster,
		sCred,
		s,
		function(err,aPermissions){
			if (err){ return fCallback(err); }
			if (!aPermissions["read"]){
				return fCallback("readjournal permission denied");
			}
			return journalstore.fReadJournal(s,xRangeLimit,fCallback);
		}
	);
};


// ---------------------------------------------------------------------------
// AtomStore.fWrite
//   stores new values in the store
// 
// Params
//   sCred := the credentials
//   s := store path
//   x := value to store
//   fCallback := `function(err)` called when done
//
AtomStore.prototype.fWrite = function(sCred, s,x,fCallback){
	var journalstore = this.journalstore;
	this.accessstore.fRead(
		this.aConfig.sCredMaster,
		sCred,
		s,
		function(err,aPermissions){
			if (err){ return fCallback(err); }
			if (!aPermissions["write"]){
				return fCallback("write permission denied");
			}
			return journalstore.fWrite(s,x,fCallback);
		}
	);
};

// ---------------------------------------------------------------------------
// AtomStore.fSetAccess
//   changes permissions for a given user
// 
// Params
//   sCredAuth := the credentials authorizing this access change
//   sCred := the credentials
//   s := store path
//   x := value to store
//   fCallback := `function(err)` called when done
//
AtomStore.prototype.fSetAccess = function(sCredAuth, sCred, s, x, fCallback){
	this.accessstore.fWrite(sCredAuth,sCred,s,x,fCallback);
};

// ---------------------------------------------------------------------------
// AtomStore.fGetAccess
//   changes permissions for a given user
// 
// Params
//   sCredAuth := the credentials authorizing this access change
//   sCred := the credentials
//   s := store path
//   fCallback := `function(err)` called when done
//
AtomStore.prototype.fGetAccess = function(sCredAuth, sCred, s, fCallback){
	this.accessstore.fRead(sCredAuth, sCred,s,fCallback);
};

// ---------------------------------------------------------------------------
// AtomStore.fGetAccessJournal
//   changes permissions for a given user
// 
// Params
//   sCredAuth := the credentials authorizing this access change
//   sCred := the credentials
//   s := store path
//   fCallback := `function(err)` called when done
//
AtomStore.prototype.fGetAccessJournal = function(sCredAuth, sCred, s, fCallback){
	this.accessstore.fReadJournal(sCredAuth,sCred,s,fCallback);
};


// ---------------------------------------------------------------------------
// AtomStore.fDelete
//  you cannot delete from a journal store. Instead store null
//
AtomStore.prototype.fDelete = function(vs,fCallback){
	E("Store","fDelete","you cannot delete from a journal store. Instead store null");
	fCallback("not implemented");
};

// ---------------------------------------------------------------------------
// AtomStore.fWipe
//  DANGER!! DANGER!! DANGER!! DANGER!! DANGER!! DANGER!! DANGER!! DANGER!! 
//  this permanently wipes the entire store 
//  DANGER!! DANGER!! DANGER!! DANGER!! DANGER!! DANGER!! DANGER!! DANGER!! 
//
AtomStore.prototype.fWipe = function(fCallback){
	var journalstore = this.journalstore;
	var accessstore = this.accessstore;
	
	[
		function(fCallbackAsync){journalstore.fWipe(fCallbackAsync);},
		function(fCallbackAsync){accessstore.fWipe(fCallbackAsync);}
	].asyncrun(fCallback);
};


// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
module.exports = AtomStore;

