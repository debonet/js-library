var nsTypes = {};

//----------------------------------------------------------------------------
nsTypes.fbIsFunction = function(o) {
	return !!(o && o.constructor && o.call && o.apply);
};

//----------------------------------------------------------------------------
nsTypes.fbIsArray = function(x){
	return x && x.constructor === Array;
};

//----------------------------------------------------------------------------
nsTypes.fbIsNumber = function(x){
	return typeof(x) === "number" && !isNaN(x);
};

//----------------------------------------------------------------------------
nsTypes.fbIsInteger = function(x){
	return typeof(x) === "number" && Math.floor(x) === x;
};

//----------------------------------------------------------------------------
// fbIsNumberLike
//  checks for somethign which can be converted to a number
nsTypes.fbIsNumberLike = function(x){
	try{
		return !isNaN(parseFloat(x));
	}
	catch(e){
		return false;
	}
	return true;
};

//----------------------------------------------------------------------------
// fbIsIntegerLike
//  checks for somethign which can be converted to an integer
nsTypes.fbIsIntegerLike = function(x){
	try{
		return !isNaN(parseInt(x,10));
	}
	catch(e){
		return false;
	}
};

//----------------------------------------------------------------------------
nsTypes.fbIsString = function(x) {
	return typeof(x) === "string";
};

//----------------------------------------------------------------------------
nsTypes.fbIsDate = function(x) {
	// as per http://stackoverflow.com/questions/643782/how-to-know-if-an-object-is-a-date-or-not-with-javascript
	return Object.prototype.toString.call(x) === '[object Date]';
};

//----------------------------------------------------------------------------
nsTypes.fbIsObject = function(x){
	return (x instanceof Object) && (x.constructor !== Array);
};

//----------------------------------------------------------------------------
nsTypes.fbIsNull = function(x){
	return (x === null);
};

//----------------------------------------------------------------------------
nsTypes.fbIsUndefined = function(x){
	return (typeof(x) === "undefined");
};

//----------------------------------------------------------------------------
nsTypes.fbIsUndefinedOrNull = nsTypes.fbIsNullOrUndefined = function(x){
	return (x === null) || (typeof(x) === "undefined");
};


//----------------------------------------------------------------------------
// smarter typeof function that can differentiate between 
// objects, functions, and arrays as well as other types
nsTypes.fsTypeOf = function(x){
	if (nsTypes.fbIsUndefined(x)){ return "undefined"; }
	if (nsTypes.fbIsNull(x)){ return "null"; }
	if (nsTypes.fbIsArray(x)){ return "array"; }
	if (nsTypes.fbIsDate(x)){ return "date"; }
	if (nsTypes.fbIsFunction(x)){ return "function"; }
	if (nsTypes.fbIsObject(x)){ return "object"; }
	return typeof(x);
};

//----------------------------------------------------------------------------
nsTypes.fbEqual = function(x1, x2) {
	if (x1 === x2){
		return true;
	}

	if (nsTypes.fsTypeOf(x1) !== nsTypes.fsTypeOf(x2)){
		return false;
	}

	switch(nsTypes.fsTypeOf(x1)){

	case 'array':
		if (x1.length !== x2.length){
			return false;
		}
		for (var n=0, c=x1.length; n<c; n++){
			if (!nsTypes.fbEqual(x1[n],x2[n])){
				return false;
			}
		}
		return true;

	case 'object':
		var s;
		for (s in x1) {
			if (x1.hasOwnProperty(s)) {
				if (!x2.hasOwnProperty(s) || !nsTypes.fbEqual(x1[s],x2[s])) {
					return false;
				}
			}
		}
		for (s in x2) {
			if (x2.hasOwnProperty(s)) {
				if (!x1.hasOwnProperty(s)){
					return false;
				}
			}
		}
		return true;

	case 'date':
		return x1.getTime() === x2.getTime();

	default:
		return x1===x2;
	}
};



//----------------------------------------------------------------------------
// EXPORTS
//----------------------------------------------------------------------------
module.exports = nsTypes;
