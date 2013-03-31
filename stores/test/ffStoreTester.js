// TODO: rename this object tester, since it is far more general than just deailing with stores

var should = require('should');
var nsUtilities = require('nsUtilities');
var nsTypes = require("nsTypes");

var fShouldEqual = function(x1,x2){
	if (x2===null || typeof(x2) === "undefined"){
		return should.not.exist(x1);
	}

	if (x1===null || typeof(x1) === "undefined"){
		should.fail("expected undefined to be " + x2);
	}

	return x1.should.eql(x2);
};


// ---------------------------------------------------------------------------
// ffStoreTester
//   creates a function which runs a series of tests on a Store-derived object
//  
// Params
//   classStore := the store classs to be tested.
//   vxArgs := additional args to be passed to the classStore constructor
//
// Returns
//   a function of the form `function(vvTest, fCallback)`
//
//     Params
//       vvTest := an array of vTests
//                 vTest elements 
//                   [0] := `sfMethod` -  method to call
//                   [1] := `vxArgs` - arguments to method
//                   [2] := `xResponseExpected` - optional. if given, should equal 
//                          the response received (default: undefined)
//                   [3] := `xShouldWork` - optional. if false, call should fail;
//                          if true, call should work;
//                          if a function, it must work, and the function will be
//                          called on the response before comparison
//
//       fCallback := `function(err)` called when done
//
//     Throws
//       any detected errors are thrown via the should assertion mechanisms
//
var ffStoreTester = function(classStore, vxArgs){
	return function(vvTest,fCallback){

		// this funky bit allows us to use .call on a constructor
		// by making a temporary class with an empty constructor
		var classTemp = function(){};
		// but with the same prototype as the first,
		classTemp.prototype = classStore.prototype;
		// then creating the object
		var store = new classTemp();
		// and applying the original constructor to is
		var storeReplaced = classStore.call(store, vxArgs);
		// and in case the constructor has a return, instead of just side effects
		// keep the return value
		store = storeReplaced || store;

		vvTest.serialeach(
			function(vTest,n,fCallbackAsync){
				var sf                = vTest[0];
				var vxArg             = vTest[1];
				var xResponseExpected = vTest[2];
				var xShouldWork       = nsTypes.fbIsUndefined(vTest[3]) ? true : vTest[3];

				vxArg.push(function(err,xResponse){
					if (!xShouldWork){
						should.exist(err);
					}
					else{
						should.not.exist(err);
						if (vTest.length >= 3){
							if (nsTypes.fbIsFunction(xShouldWork)){
								xResponse = xShouldWork(xResponse);
							}
						}
						fShouldEqual(xResponse,xResponseExpected);
					}
					fCallbackAsync(null);
				});

				store[sf].apply(store, vxArg);
			},
			function(err){
				should.not.exist(err);						
				fCallback(null);
			}
		);
	};
};


module.exports = ffStoreTester;