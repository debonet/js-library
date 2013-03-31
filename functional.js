//TODO: split this into functional.object.js and functional.array.js

require('logging');
var nsClasses = require('nsClasses');
var nsTypes   = require('nsTypes');

var fAddNonEnumerable = require("fAddNonEnumerable");

//----------------------------------------------------------------------------
// Object.map() applies a  function of (sKey,sVal) to every element
// and assigns it into a new object with the function applied to every
// element. Keys are not changed.
fAddNonEnumerable(
	Object.prototype,
	'map',
	function (f){
		var o=nsClasses.foInsantiate(this);
		for (var sKey in this){
			if (this.hasOwnProperty(sKey)){
				o[sKey]=f(this[sKey],sKey);
			}
		}
		return o;
	}
);

//----------------------------------------------------------------------------
// Object.map() applies a  function of (sKey,sVal) to every element
// and assigns it into a new object with the function applied to every
// element. Keys are not changed.
fAddNonEnumerable(
	Object.prototype,
	'foCopy',
	function (f){
		var o = nsClasses.foInsantiate(this);
		for (var sKey in this){
			if (this.hasOwnProperty(sKey)){
				o[sKey] = nsClasses.fxCopy(this[sKey]);
			}
		}
		return o;
	}
);

//----------------------------------------------------------------------------
// become
fAddNonEnumerable(
	Object.prototype,
	'become',
	function (o){
		for (var sKey in this){
			if (this.hasOwnProperty(sKey)){
				delete this[sKey];
			}
		}
		this.prototype = o.prototype;

		for (sKey in o){
			if (o.hasOwnProperty(sKey)){
				this[sKey] = o[sKey];
			}
		}
		return o;
	}
);


//----------------------------------------------------------------------------
// Object.vmap() applies a  function of (sKey,sVal) to every element
// and pushes them into an array which is returned. the order of the array
// is not guaranteed
fAddNonEnumerable(
	Object.prototype,
	'vmap',
	function (f){
		var v = [];
		for (var sKey in this){
			if (this.hasOwnProperty(sKey)){
				v.push(f(this[sKey],sKey));
			}
		}
		return v;
	}
);


//----------------------------------------------------------------------------
// Object.remove() test funtion against every element and if it returns
// truen then remove the matching element, in place
fAddNonEnumerable(
	Object.prototype,
	'remove',
	function (x){
		var sKey;
		if ((x instanceof Object) && x.constructor && x.call && x.apply){
			var f=x;

			for (sKey in this){
				if (this.hasOwnProperty(sKey)){
					if (f(this[sKey],sKey)){
						delete this[sKey];
					}
				}
			}
		}
		else{
			for (sKey in this){
				if (this.hasOwnProperty(sKey)){
					if (this[sKey] === x){
						delete this[sKey];
					}
				}
			}
		}
	}
);


//----------------------------------------------------------------------------
// Object.accumulate() applies a  function of (sKey,sVal) to every element
// and assigns it into a vector with the concat() of the function applied to 
// every element 
fAddNonEnumerable(
	Object.prototype,
	'accumulate',
	function (f){
		var v=[];
		for (var sKey in this){
			if (this.hasOwnProperty(sKey)){
				v = v.concat( f(this[sKey],sKey) );
			}
		}
		return v;
	}
);

//----------------------------------------------------------------------------
// Object.mergeIn() recursively merges another's object's values in
fAddNonEnumerable(
	Object.prototype,
	'mergeIn',
	function (a){
		for (var sKey in a){
			if (a.hasOwnProperty(sKey)){

				switch(nsTypes.fsTypeOf(this[sKey])){
				case 'array':
					if (nsTypes.fbIsArray(a[sKey])){
						this[sKey] = this[sKey].concat(a[sKey]);
					}
					else{
						this[sKey] = a[sKey];
					}
					break;

				case 'object':
					if (nsTypes.fbIsObject(a[sKey])){
						this[sKey].mergeIn(a[sKey]);
					}
					else{
						this[sKey] = a[sKey];
					}
					break;

				default:
					this[sKey] = a[sKey];
					break;
				}
			}
		}
		return this;
	}
);

//----------------------------------------------------------------------------
// Object.shallowmergeIn() merge another's object's values in without recursion
fAddNonEnumerable(
	Object.prototype,
	'shallowmergeIn',
	function (a){
		for (var sKey in a){
			if (a.hasOwnProperty(sKey)){
				this[sKey] = a[sKey];
			}
		}
		return this;
	}
);

//----------------------------------------------------------------------------
// Object.filterFields
//
//   creates a new object with only a subset of the members of the original 
//   that are on the provided list of field names
//
// Param
//   vsFields := a list of fields to retain
//
// Returns 
//   an object containing only the listed members
//
fAddNonEnumerable(
	Object.prototype,
	'filterFields',
	function (vsFields){
		var a = {};
		for (var n=0, c=vsFields.length; n<c; n++){
			a[vsFields[n]] = this[vsFields[n]];
		}
		return a;
	}
);

//----------------------------------------------------------------------------
// Object.filterOutFields
//
//   creates a new object with only a subset of the members of the original 
//   that are **not** on the provided list of field names
//
// Param
//   vsFields := a list of fields to remove
//
// Returns 
//   an object containing all but the listed members
//
fAddNonEnumerable(
	Object.prototype,
	'filterOutFields',
	function (vsFields){
		var a = {};
		for (var sKey in this){
			if (this.hasOwnProperty(sKey)){
				a[sKey]=this[sKey];
			}
		}
		for (var n=0, c=vsFields.length; n<c; n++){
			delete a[vsFields[n]];
		}
		return a;
	}
);


//----------------------------------------------------------------------------
// Object.foMerge() recursively merges another's object's values and returns 
// the result but does not modify the original object
fAddNonEnumerable(
	Object.prototype,
	'foMerge',
	function (a){
		var aOut = this.foCopy();

		for (var sKey in a){
			if (a.hasOwnProperty(sKey)){
				switch(nsTypes.fsTypeOf(aOut[sKey])){
				case 'array':
					if (nsTypes.fbIsArray(a[sKey])){
						aOut[sKey] = aOut[sKey].concat(a[sKey]);
					}
					else{
						aOut[sKey] = a[sKey];
					}
					break;

				case 'object':
					if (nsTypes.fbIsObject(a[sKey])){
						aOut[sKey].mergeIn(a[sKey]);
					}
					else{
						aOut[sKey] = a[sKey];
					}
					break;

				default:
					aOut[sKey] = a[sKey];
					break;
				}
			}
		}
		return aOut;
	}
);


//----------------------------------------------------------------------------
// Object.count returns the number of properties in the object (or keys in 
// the associative array) 
// NOTE: this could not be called 'length' because of some sort of conflict with
// jQuery UI
Object.defineProperty(
	Object.prototype,
	'count',
	{
		enumerable: false,
		"get":function (){
			var c=0;
			for (var sKey in this){
				if (this.hasOwnProperty(sKey)){
					c++;
				}
			}
			return c;
		}
	}
);

//----------------------------------------------------------------------------
// Object.fxFirst() 
fAddNonEnumerable(
	Object.prototype,
	'fxFirst',
	function (f){
		f=f||function(x){return x;};
		for (var sKey in this){
			if (this.hasOwnProperty(sKey)){
				var x=f(this[sKey],sKey);
				if (x){
					return x;
				}
			}
		}
		return false;
	}
);

//----------------------------------------------------------------------------
// Object.each() applies a  function of (sKey,sVal,object) to every element
// if the function returns false the loop terminates
fAddNonEnumerable(
	Object.prototype,
	'each',
	function (f){
		for (var sKey in this){
			if (this.hasOwnProperty(sKey)){
				f(this[sKey],sKey,this);
			}
		}
	}
);



//----------------------------------------------------------------------------
// Array.reduce() 
if (!Object.prototype.reduce){
	fAddNonEnumerable(
		Object.prototype,
		'reduce',
		function (f,x){
			if (this.length === 0){
				return x;
			}

			for (var sKey in this){
				if (this.hasOwnProperty(sKey)){
					if (x === undefined){
						x=this[sKey];
					}
					else{
						x=f(x,this[sKey],sKey,this);
					}
				}
			}
			return x;
		}
	);
}


//----------------------------------------------------------------------------
// Array.each() / Vector.each()
fAddNonEnumerable(
	Array.prototype,
	'each',
	Array.prototype.map
);


//----------------------------------------------------------------------------
// Array.remove() test a funtion or value against every element and if it returns
// truen then remove the matching element, in place
fAddNonEnumerable(
	Array.prototype,
	'remove',

	function (x){
		var n,c;

		if ((x instanceof Object) && x.constructor && x.call && x.apply){
			var f=x;

			for (n=0, c=this.length; n<c; n++){
				if (f(this[n],n)){
					this.splice(n,1);
					n--;
					c--;
				}
			}
		}
		else{
			for (n=0, c=this.length; n<c; n++){
				if (x === this[n]){
					this.splice(n,1);
					n--;
					c--;
				}
			}
		}
	}
);

//----------------------------------------------------------------------------
// Array.accumulate()  (like map, but returns 0 or more elements in a vector which 
// get concatenated
fAddNonEnumerable(
	Array.prototype,
	'accumulate',
	function (f){
		var v=[];
		for (var n=0, c=this.length; n<c; n++){
			v = v.concat(f(this[n],n));
		}
		return v;
	}
);

//----------------------------------------------------------------------------
// Array.select() 
fAddNonEnumerable(
	Array.prototype,
	'select',
	function (f){
		var v=[];
		for (var n=0, c=this.length; n<c; n++){
			if (f(this[n],n)){
				v.push(this[n]);
			}
		}
		return v;
	}
);

//----------------------------------------------------------------------------
// Array.fxFirst() 
fAddNonEnumerable(
	Array.prototype,
	'fxFirst',
	function (f){
		f=f||function(x){return x;};
		for (var n=0, c=this.length; n<c; n++){
			var x=f(this[n],n);
			if (x){
				return x;
			}
		}
		return false;
	}
);

//----------------------------------------------------------------------------
// Array.contains() 
fAddNonEnumerable(
	Array.prototype,
	'contains',
	function (x){
		for (var n=0, c=this.length; n<c; n++){
			if (this[n]===x){
				return true;
			}
		}
		return false;
	}
);



//----------------------------------------------------------------------------
// Array.unique() 
fAddNonEnumerable(
	Array.prototype,
	'unique',
	function() {
		var v = this.concat().sort();
		for (var n = 1; n < v.length; ) {
			if (v[n-1] === v[n]){
				v.splice(n,1);
			}
			else{
				n++;
			}
		}
		return v;
	}
);

//----------------------------------------------------------------------------
// Array.reduce() 
if (!Array.prototype.reduce){
	fAddNonEnumerable(
		Array.prototype,
		'reduce',
		function (f,x){
			if (this.length === 0){
				return x;
			}

			var n=0;
			if (x === undefined){
				x=this[0];
				n=1;
			}
			for (var c = this.length; n<c; n++){
				x=f(x,this[n],n-1,this);
			}
			return x;
		}
	);
}

//----------------------------------------------------------------------------
fAddNonEnumerable(
	Array.prototype,
	'asyncmap',
	function (f,fCallback){
		var vxIn = this;
		var cRemaining=this.length;
		var verr  = [];
		var vxOut = [];

		if (cRemaining === 0){
			return fCallback(null,[]);
		}

		for (var n=0, c=this.length; n<c; n++){
			(
				/*jshint loopfunc:true*/
				function(nScope){ // let (nScope)
					f(
						vxIn[n],
						n,
						function(err,x){
							if (err){
								verr[nScope]  = err;
							}
							vxOut[nScope] = x;
							cRemaining --;
							if (cRemaining === 0){
								fCallback(
									verr.length === 0 ? null:verr,
									vxOut
								);
							}
						}
					);
				}
			)(n); // let (nScope = n)
		}
	}
);

//----------------------------------------------------------------------------
fAddNonEnumerable(
	Array.prototype,
	'asynceach',
	function (f,fCallback){
		var vxIn = this;
		var cRemaining=this.length;
		var verr  = [];

		if (cRemaining === 0){
			return fCallback(null);
		}

		for (var n=0, c=this.length; n<c; n++){
			(
				/*jshint loopfunc:true*/
				function(nScope){ // let (nScope)
					f(
						vxIn[n],
						n,
						function(err,x){
							if (err){
								verr[nScope]  = err;
							}
							cRemaining --;
							if (cRemaining === 0){
								fCallback(
									verr.length === 0 ? null:verr
								);
							}
						}
					);
				}
			)(n); // let (nScope = n)
		}
	}
);


//----------------------------------------------------------------------------
fAddNonEnumerable(
	Object.prototype,
	'asynceach',
	function (f,fCallback){
		var vxIn = this;

		// this can't be integrated because callbacks aren't necessarily 
		// asynchronous.
		var cRemaining=this.count;
		var verr  = [];

		if (cRemaining === 0){
			return fCallback(null);
		}

		for (var s in this){
			if (this.hasOwnProperty(s)){
				(
					/*jshint loopfunc:true*/
					function(sScope){ // let (nScope)
						f(
							vxIn[s],
							s,
							function(err,x){
								if (err){
									verr[sScope]  = err;
								}
								cRemaining --;
								if (cRemaining === 0){
									fCallback(
										verr.length === 0 ? null:verr
									);
								}
							}
						);
					}
				)(s); // let (sScope = s)
			}
		}
	}
);

//----------------------------------------------------------------------------
fAddNonEnumerable(
	Object.prototype,
	'asyncrun',
	function (fCallback){

		return this.asynceach(
			function(f,n,fCallbackAsync){	f(fCallbackAsync);	},
			fCallback
		);
	}
);


//----------------------------------------------------------------------------
fAddNonEnumerable(
	Array.prototype,
	'serialeach',
	function (f,fCallback){
		var vx   = this;
		var c    = this.length;
		var n    = 0;

		var fDoIt = function(err){
			if (err){	return fCallback(err,n); }
			if (n<c){
				n++;
				return f.call(null,vx[n-1],n,fDoIt);
			}
			else{
				return fCallback(null);
			}
		};

		fDoIt();
	}
);

//----------------------------------------------------------------------------
fAddNonEnumerable(
	Array.prototype,
	'serialrun',
	function (fCallback){

		return this.serialeach(
			function(f,n,fCallbackAsync){	f(fCallbackAsync);	},
			fCallback
		);
	}
);


//----------------------------------------------------------------------------
// calls first function with element,n,fCallbackAsync for each element
// calls second function with either
//        err,n,element for first truthy n,element
//        or null,false, if no truthy element found
fAddNonEnumerable(
	Array.prototype,
	'serialfirst',
	function (f,fCallback){
		var vx   = this;
		var c    = this.length;
		var n    = 0;

		var fDoIt = function(){
			if (n<c){
				n++;
				return f.call(
					null,
					vx[n-1],
					n-1,
					function(err){
						// if an error, then abort with error and position
						if (err){	return fCallback(err,n); }

						// if success, abort with index then success arguemnts
						if (arguments[1]){
							var vxOut = Array.prototype.slice.call(arguments);  
							vxOut.shift(); // pull off null
							vxOut.unshift(n);
							vxOut.unshift(null);
							return fCallback.apply(null,vxOut);
						}

						// otherwise, try next
						fDoIt();
					}
				);
			}
			else{
				// if no successes, return with no error and false index, and no value
				fCallback(null, false);
			}
		};

		fDoIt();
	}
);





//----------------------------------------------------------------------------
// Array.concatIn() recursively merges another's object's values in
fAddNonEnumerable(
	Object.prototype,
	'concatIn',
	function (x){
		var v = this;
		x.each(	function(xSub){ v.push(xSub); } );
	}
);



//module.exports.fAddNonEnumerable = fAddNonEnumerable;
