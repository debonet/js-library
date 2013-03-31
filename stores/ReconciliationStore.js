// ---------------------------------------------------------------------------
// ReconciliationStore
// 
// base class for reconciliation stores. Provide the standard store interfaces:
//
//   fRead(vs,fCallback), fWrite(vs,x,fCallback), fDelete(vs,fCallback)
//
// A ReconciliationStore provides a collection of multi-key-value items
// where the value of each key is unique across all other values for that key in 
// the entire collection. Duplicate values can exist across keys, but not 
// within a key. The only exception to this rule is null/undefined.
// 
// Three interfaces are provided. Either [], [ key, value ] or [ key, value, target-key ]
// 
// if no key and value are provided, then for read, all records are returned, for write
// the record is written, and delete all records are deleted
//
// if key value are provided then they are used as a filter to identify the record, which is
// read, written or deleted
// 
// If provided target-key provides the key in the record whose value is read, written or deleted,
//
// EXAMPLE
//
// given a ReconciliationStore with the following items
//   [
//     {a: 1, b:1, c:3},
//     {a: 2, b:2, c:"happy"},
//   ]
//
// fRead() yields 
//   [
//     {a: 1, b:1, c:3},
//     {a: 2, b:2, c:"happy"},
//   ]
//
// fRead(["a",1]) yields {a: 1, b:1, c:3}
//
// fRead(["a",1,"c"]) yields 3
//  
// fRead(["a",5]) yields error (not present)
//
// fRead(["b",2,"c"]) yields "happy"
//
// fWrite(["b",1],{a: 3, b:1, c:7}) yields a store of:
//   [
//     {a: 3, b:1, c:7},
//     {a: 2, b:2, c:"happy"},
//   ]
//  
// fWrite(["b",1],{a: 3, b:5, c:7}) yields a store of:
//   [
//     {a: 3, b:5, c:7},
//     {a: 2, b:2, c:"happy"},
//   ]
//  
// fWrite(["b",1],{a: 2, b:1, c:7}) yields an error (duplicate key)
//  
// fWrite(["b",3],{a: 7, b:3, d:18}) yields a store of:
//   [
//     {a: 1, b:1, c:3},
//     {a: 2, b:2, c:"happy"},
//     {a: 7, b:3,          d:18},
//   ]
//
// fWrite(["b",3],{a: 7, b:3, d:18}) yields a store of:
//   [
//     {a: 1, b:1, c:3},
//     {a: 2, b:2, c:"happy"},
//     {a: 7, b:3,          d:18},
//   ]
//
// fWrite({a: 7, b:3, d:18}) yields a store of:
//   [
//     {a: 1, b:1, c:3},
//     {a: 2, b:2, c:"happy"},
//     {a: 7, b:3,          d:18},
//   ]
//  
// fWrite(["b",2,"c"],"sad") yields a store of:
//   [
//     {a: 1, b:1, c:3},
//     {a: 2, b:2, c:"sad"},
//   ]
//  
// fWrite(["b",3,"c"],"grumpy") yields a store of:
//   [
//     {a: 1, b:1, c:3},
//     {a: 2, b:2, c:"happy"},
//     {b:3, c:"grumpy"},
//   ]
//  
// fRead() yields 
//   [
//     {a: 1, b:1, c:3},
//     {a: 2, b:2, c:"happy"},
//   ]
//
// ---------------------------------------------------------------------------
var ReconciliationStore = function(){};

ReconciliationStore.prototype.fRead = function(vs,fCallback){
	E("ReconciliationStore","fRead","not implemented");
	fCallback("not implemented");
};

ReconciliationStore.prototype.fWrite = function(vs,x,fCallback){
	E("ReconciliationStore","fWrite","not implemented");
	fCallback("not implemented");
};

ReconciliationStore.prototype.fDelete = function(vs,fCallback){
	E("ReconciliationStore","fDelete","not implemented");
	fCallback("not implemented");
};


ReconciliationStore.fasStringifyValues = function(ax){
	return ax.map(function(x){return x.toString();});
};

// convert a stringified numbers back into numbers
ReconciliationStore.fxNumberifyValues = function(x){
	var r = parseFloat(x);
	if (r === undefined || isNaN(r)){
		return x;
	}
	/*jshint eqeqeq:false*/
	return r == x ? r: x;
};
/*jshint eqeqeq:true*/

// convert any stringified numbers back into numbers in 
// a record
ReconciliationStore.faxNumberifyValues = function(ax){
	return ax.map(ReconciliationStore.fxNumberifyValues);
};

// convert any stringified numbers back into numbers in a 
// vector of records
ReconciliationStore.fvaxNumberifyValues = function(vax){
	return vax.map(ReconciliationStore.faxNumberifyValues);
};


module.exports = ReconciliationStore;
