var Store     = require("Store");
var nsClasses = require("nsClasses");
var nsTypes   = require("nsTypes");
var nsDate    = require("nsDate");

var TreeStore = function(){};

nsClasses.fInherit(TreeStore, Store);

// constants
TreeStore.sState       = "*state";
TreeStore.sExpiration  = "*expiration";
TreeStore.COMPLETE     = 0; // bitfieds
TreeStore.PARTIAL      = 1;
TreeStore.PARTIALCHILD = 2;
TreeStore.EXPIRATION   = 4;

// convert dotted lists to an array if necessary
TreeStore.prototype.fvsEnsureArray = function(x){
	if (nsTypes.fbIsArray(x)){
		return x;
	}
	if (!x){
		return [];
	}
	return x.split('.');
};

// check rules for valid return of a cached element
TreeStore.prototype.fbOkToSend = function(a){

	// values are always good to send in this model
	if (!nsTypes.fbIsObject(a)){
		return true;
	}

	/*jshint bitwise:false */
	if (
		(a[TreeStore.sState] & TreeStore.PARTIALCHILD) 
			|| (a[TreeStore.sState] & TreeStore.PARTIAL)
	){
//		D("CONTENT PARTIAL");
		return false;
	}

	// check expiration
	if (
		(a[TreeStore.sState] & TreeStore.EXPIRATION)
			&& (a[TreeStore.sExpiration] < nsDate.ftmNow())
	){
//		D("CONTENT EXPIRED");
		return false;
	}
			
	return true;
};


// remove special flags within the tree data
TreeStore.prototype.fxCleanCacheResponse = function (x){
	var tc=this;
	if (nsTypes.fbIsObject(x)){
		delete x[TreeStore.sState];
		delete x[TreeStore.sExpiration];
		for(var s in x){
			if (x.hasOwnProperty(s)){
				tc.fxCleanCacheResponse(x[s]);
			}
		}
	} 
	return x;
};

// walk down a tree, find the value and return it.
// if the value is not ok to send, return an error
// if the value is missing, but the parent is not PARTIAL then send null
TreeStore.prototype.fWalkTreeToValue = function(vs,a,fCallback){
	var bOkToSend=false;
	for (var n=0, c=vs.length; n<c; n++){
		bOkToSend = this.fbOkToSend(a);

		if (nsTypes.fbIsObject(a) && vs[n] in a){
			a = a[vs[n]];
			if (nsTypes.fbIsObject(a)){
				bOkToSend = this.fbOkToSend(a);
			}
		}
		else if (!bOkToSend){
//			D("NOT OK TO SEND IMMEDIATE");
			return fCallback(true);
		}
		else{
			return fCallback(null,null);
		}
	}
	
	if (!bOkToSend){
//			D("NOT OK TO SEND");
		return fCallback(true);
	}

//	D("OK TO SEND");
	fCallback(null, a);
};


// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
module.exports = TreeStore;
