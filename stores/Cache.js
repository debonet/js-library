var Store     = require('Store');
var nsClasses = require("nsClasses");
var nsTypes   = require("nsTypes");
var fThrow    = require("fThrow");

// ---------------------------------------------------------------------------
// Cache
// 
// ARGS
//    vxForward : an array of stores, or just a simple read function,
//                each are checked for content in succession, then when found
//                written back (if capable)
//    options  : an array of options
// 
// OPTIONS
//		bAsyncWrites  : whether or not its ok to return a value without actually
//                      and complete the storage asynchronously
// ---------------------------------------------------------------------------
var Cache = function(vxForward, aOptions){
	this.vxForward = vxForward;

	if (arguments.length > 2){
		fThrow("Cache","constructor","old style caller", arguments);
	}

	this.aOptions    = {
		bAsyncWrites  : false
	}.mergeIn(aOptions || {});
};

nsClasses.fInherit(Cache, Store);



// ---------------------------------------------------------------------------
// Main access function for getting data, asks each store in turn, then when
// found, writes back to prior stores (if capable) 
Cache.prototype.fRead = function(xKey,fCallback){
	var cache = this;

	this.vxForward.serialfirst(
		function(xForward,n,fSerialCallback){
			var fReadForward = nsTypes.fbIsFunction(xForward) ? xForward : xForward.fRead;
			var oThis = nsTypes.fbIsFunction(xForward) ? null : xForward;
			return fReadForward.call(
				oThis,
				xKey, 
				function(err,xKeyRead,xData){
					// missing content errors should just be forwareded, so 
					// we return false, and continue searching
					if (err){
						fSerialCallback(null,false);
					}
					// otherwise, we found it so we return true, followed by
					// the data found
					else{
						if (arguments.length === 3){
							fSerialCallback(null,true,xKeyRead,xData);
						}
						else{
							fSerialCallback(null,true,xKeyRead);
						}
					}
				}
			);
		},
		// get called with the first matching index, then the true from above
		// then the data
		function(err,n,bTrue,xKeyRead,xData){

			if (err){return fCallback(err);}
			//D(arguments,arguments.length,arguments.length === 4);
			if (arguments.length === 4){
				xData = xKeyRead;
				xKeyRead = xKey;
			}

			I("Cache","fRead","found data at level",n);
			if (n>0){
				var sfEach = cache.bAsyncWrites ? "asynceach" : "serialeach";

				cache.vxForward.slice(0,n-1)[sfEach](
					function(xForward,n,fLoopCallback){
						if (xForward.fWrite){
							xForward.fWrite(xKey,xData,fLoopCallback);
						}
						else{
							fLoopCallback(null);
						}
					},
					function(){
						fCallback(null,xData);
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
// Access function for deleting content
Cache.prototype.fDelete = function(xKey,fCallback){
	var sfEach = this.bAsyncWrites ? "asynceach" : "serialeach";
	this.vxForward[sfEach](
		function(xForward,n,fLoopCallback){
			if (xForward.fWrite){
				xForward.fDelete(xKey,fLoopCallback);
			}
			else{
				fLoopCallback(null);
			}
		},
		function(){
			fCallback(null);
		}
	);
};

// ---------------------------------------------------------------------------
// Access function for inject content
Cache.prototype.fWrite = function(xKey,xData,fCallback){
	var sfEach = this.bAsyncWrites ? "asynceach" : "serialeach";

	this.vxForward[sfEach](
		function(xForward,n,fLoopCallback){
			if (xForward.fWrite){
				xForward.fWrite(xKey,xData,fLoopCallback);
			}
			else{
				fLoopCallback(null);
			}
		},
		fCallback
	);
};


// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
module.exports = Cache;
