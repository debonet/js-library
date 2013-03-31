var ns = {};

//----------------------------------------------------------------------------
// fnsGetNamespace 
//
//   retrieves or creates a requested namespace from within some context.
//   If not found, will create a newnamespace
//
// Params
//
//   snsToCreate := name of the namespace to fetch 
//
//   oContext    := scope or context within which to look for the 
//                  requested namespace. Defaults to (global || window)
//               
//     TODO: Generally unused. Consider removing.
//
// Returns
//   the requested namespace
//
ns.fnsGetNamespace = function(snsToCreate, oContext){
	if (!oContext){
		if (typeof(global) !== "undefined"){
			oContext = global;
		}
		else{
			oContext = window;
		}
	}

	snsToCreate = snsToCreate || "";
	snsToCreate = snsToCreate.replace(/(\.\.\/|\.\/|.js$)/g,"");

	var vs = snsToCreate.split('.');

	if (vs.length === 1 && vs[0] === ""){
		return oContext;
	}

	var o = oContext;
	for (var n=0, c=vs.length; n<c; n++){
		var s = vs[n];
		if (!(s  in o) || (!o[s])){
			(function(){
				var f = function(){
					return f.__f.apply(this,arguments);
				};
				
				o[s] = f;
			})();
		}
		o = o[s];
	}

	return o;
};


//----------------------------------------------------------------------------
// fSetNamespace 
//
//   sets, or creates and sets, the indicated namespace within some context 
//   to the given value. Importantly, this will not create a new namespace
//   object, but rather convert the existing namespace to be the same as the
//   passed in object. This way anything holding a pointer to the namespace 
//   will get the updated value
//
// Params
//
//   snsToCreate := name of the namespace to set
// 
//   oValue      := the object to store in the namespace
//
//   oContext    := scope or context within which to look for the 
//                  requested namespace. Defaults to (global || window)
//               
//     TODO: Generally unused. Consider removing.
//
ns.fSetNamespace = function(snsToCreate, oValue, oContext){

	if (!oContext){
		if (typeof(global) !== "undefined"){
			oContext = global;
		}
		else{
			oContext = window;
		}
	}

	snsToCreate = snsToCreate.replace(/(\.\.\/|\.\/|.js$)/g,"");
	var vs = snsToCreate.split('.');

	if (vs.length === 1 && vs[0] === ""){
		// can't requir.e fThrow! because requir.e throws off unify!
		throw('illigally trying to rewrite the global namespace');
	}

	var o = oContext;
	var s;
	for (var n=0, c=vs.length-1; n<c; n++){
		s = vs[n];
		if (!(s  in o)){
			o[s] = {};
		}
		o = o[s];
	}


	s = vs[vs.length-1];
	if (o[s]){
		var sT;
		for (sT in o[s]){
			if (o[s].hasOwnProperty(sT)){
				delete o[s][sT];
			}
		}
		// in case we've got a function, switch the prototypes
		o[s].prototype   = oValue.prototype;
		o[s].__f         = oValue;

		// copy over all the members
		for (sT in oValue){
			if (oValue.hasOwnProperty(sT)){
				o[s][sT]=oValue[sT];
			}
		}
	}
	else{
		o[s] = oValue;
	}
};

// HACK: use the fnsGetNamespace() function itself to get the global scope
// and create a namespace() function in it
//ns.fnsGetNamespace('').namespace       = ns.fnsGetNamespace;
//ns.fnsGetNamespace('').set_namespace   = ns.sfSetNamespace;

module.exports = ns;

