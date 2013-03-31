var nsPack = require('nsPack');

// TODO: figure out how to reap some of this memory for old invocations 
//  but keep in mind some things (e.g. resource allocators) should never be reaped

// method-safe, synchronous or async function memoization 
var ffMemoize = (
	function(){
		// each function that gets memoized gets a unique id
		var idMemoizedFunctionCounter = 0;

		return function (f, bSynchronous, fsHashArg) {

			// give a function creation a unique id
			var idMemoizedFunction = idMemoizedFunctionCounter;
			idMemoizedFunctionCounter++;

			fsHashArg = fsHashArg || function(x){return nsPack.fsPack(x,true);};

			return function ffMemoizedFunction() {

				// if this is the first time any memoized function has been run
				// on this object create its memoization structure inside of 'this'
				if (!this.aMemoize){
					Object.defineProperty(
						this,
						"aMemoize",
						{
							value: { asxMemorizedReturns : {}, asvfQueue : {} },
							enumerable: false
						}
					);
				}

				var aMemoize = this.aMemoize;

				var self      = this;
				var vxArg     = Array.prototype.slice.call(arguments);

				var fCallback;
				if (!bSynchronous){
					fCallback = vxArg.pop();
				}
				// make a key which is a combination of the unique id and the arguemnts
				// the unique id is needed because the 
				var sKey      = fsHashArg.call(this, [idMemoizedFunction, vxArg]);

				if (bSynchronous){
					if (!(sKey in aMemoize.asxMemorizedReturns)){
						aMemoize.asxMemorizedReturns[sKey] = f.apply(this, vxArg);
					}
					return aMemoize.asxMemorizedReturns[sKey];
				}
				else{
					if (sKey in aMemoize.asxMemorizedReturns) {
						fCallback.apply(this, aMemoize.asxMemorizedReturns[sKey]);
					}
					else if (sKey in aMemoize.asvfQueue) {
						aMemoize.asvfQueue[sKey].push(fCallback);
					}
					else {
						aMemoize.asvfQueue[sKey] =[fCallback];
						vxArg.push(
							function () {
								aMemoize.asxMemorizedReturns[sKey] = arguments;
								var vfQueue = aMemoize.asvfQueue[sKey];
								delete aMemoize.asvfQueue[sKey];
								for (var i = 0, l = vfQueue.length; i < l; i++) {
									vfQueue[i].apply(self, arguments);
								}
							}
						);
						f.apply(this, vxArg);
					}
				}

				return null;
			};
		};
	}
)();


module.exports = ffMemoize;
