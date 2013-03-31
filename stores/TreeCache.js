var Cache       = require('Cache');
var TreeStore   = require('TreeStore');
var nsClasses   = require("nsClasses");
var nsTypes     = require("nsTypes");

// ---------------------------------------------------------------------------
// TreeCache
// 
// ARGS
//    store    : a store object to supply an answer to the query and store back
//               any responses from the xForward
//    xForward : a store, or just a simple read function
//    options  : an array of options
// 
// OPTIONS
//    vcForwardDepth : when what depth of the tree to request when forwarding
//                     the request on to a provider. This should be a monotonically
//                     increasing list. 0,null and undefined means don't expand 
//                     request at all.
//
//		bAsyncWrites   : whether or not its ok to return a value without actually
//                     and complete the storage asynchronously
// ---------------------------------------------------------------------------
var TreeCache = function(vxForward, aOptions){
	this.vxForward = vxForward;

	this.aOptions    = {
		vcForwardDepth : undefined,
		bAsyncWrites  : false
	}.mergeIn(aOptions);
};

nsClasses.fInherit(TreeCache, TreeStore);
nsClasses.fInherit(TreeCache, Cache);

// tests if the vs1 is a superset of vs2
TreeCache.prototype.fbIsSuperset = function (vs1,vs2){
	for (var n=0, c=vs1.length; n<c; n++){
		if (vs1[n] !== vs2[n]){
			return false;
		}
	}
	return true;
};


// Main access function for non-chaining clients
// calls back with only the object requested
TreeCache.prototype.fRead = function(vs,fCallback){
	var tc = this;
	vs = this.fvsEnsureArray(vs);

	this.fReadTree(
		vs,
		function(err, vsLineage, x){
			vsLineage = tc.fvsEnsureArray(vsLineage);
			if (!tc.fbIsSuperset(vsLineage,vs)){
				return fCallback("Did not return superset " + vsLineage + " of " + vs);
			}
			vs = vs.slice(vsLineage.length);

			for (var n=0, c=vs.length; n<c; n++){
				if (!nsTypes.fbIsObject(x) || !(vs[n] in x)){
					// lets not return an error, but rather a null
					return fCallback(null,null);
//					return fCallback(
//						"did not find " + vs + " in " + x +" "+vsLineage
//					);
				}

				x=x[vs[n]];
			}

			x=tc.fxCleanCacheResponse(nsClasses.fxCopy(x));

			return fCallback(null,x);
		}
	);
};



// ---------------------------------------------------------------------------
// Main access function for getting data, asks each store in turn, then when
// found, writes back to prior stores (if capable) 
TreeCache.prototype.fReadTree = function(vsKey,fCallback){
	var cache = this;

	var c = this.vxForward.length;

	this.vxForward.serialfirst(
		function(xForward,n,fSerialCallback){

			var fReadForward = nsTypes.fbIsFunction(xForward) ? xForward : xForward.fRead;
			var oThis = nsTypes.fbIsFunction(xForward) ? null : xForward;

			if (
				cache.aOptions.vcForwardDepth 
					&& cache.aOptions.vcForwardDepth[n] > 0
					&& cache.aOptions.vcForwardDepth[n] < vsKey.length
			){
				vsKey = vsKey.slice(0,cache.aOptions.vcForwardDepth[n]);
			}

			return fReadForward.call(
				oThis,
				vsKey, 
				function(err,vsKeyRead,xData){
					// missing content errors should just be forwareded, so 
					// we return false, and continue searching
					if (err){
						return fSerialCallback(null,false);
					}

					if (arguments.length === 2){
						xData = vsKeyRead;
						vsKeyRead = vsKey;
					}

					// TODO: perhaps different kinds of rules, for right now, if 
					// marked partial then indicate we don't have it
					if (n<c-1 && !cache.fbOkToSend(xData)){
						// partial or expired content should not be forwareded, so 
						// we return false, and continue searching
						return fSerialCallback(null,false);
					}

					// otherwise, we found it so we return true, followed by
					// the data found
					return fSerialCallback(null,true,vsKeyRead,xData);
				}
			);
		},
		// get called with the first matching index, then the true from above
		// then the data
		function(err,n,bTrue,vsKeyRead,xData){
			if (err){return fCallback(err);}

			if (n && n>0 && bTrue){
				var sfEach = cache.bAsyncWrites ? "asynceach" : "serialeach";

				cache.vxForward.slice(0,n-1)[sfEach](
					function(xForward,n,fLoopCallback){
						if (xForward.fWrite){
							xForward.fWrite(vsKeyRead,xData,fLoopCallback);
						}
						else{
							fLoopCallback(null);
						}
					},
					function(){
						fCallback(null,vsKeyRead,xData);
					}
				);
			}
			else{
				// could not find it
				return fCallback("Could not find at any level");
			}
		}
	);
};


// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
module.exports = TreeCache;
