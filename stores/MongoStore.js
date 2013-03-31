var Mongo     = require("Mongo");
var Store     = require("Store");
var nsClasses = require("nsClasses");
var nsTypes   = require("nsTypes");
require("logging");

// ---------------------------------------------------------------------------
// MongoStore
//
//   provides fRead,fWrite,fDelete
// ---------------------------------------------------------------------------
var MongoStore = function(xMongoSpec){
	this.mongo = new Mongo(xMongoSpec);

	this.sCollection   = xMongoSpec.collection || "cache" ;
};

nsClasses.fInherit(MongoStore, Store);

MongoStore.prototype.fxMongoClean = function(x,bCleanAll){
	var store = this;

	switch(nsTypes.fsTypeOf(x)){
	case "string":
		if (bCleanAll){
			x = x.replace(/_/g,'_u');
			x = x.replace(/\//g,'_f');
			x = x.replace(/\\/g,'_b');
			x = x.replace(/\./g,'_p');
			x = x.replace(/\$/g,'_s');
		}
		return x;

	case "array":
		return x.map(
			function(xSub){return store.fxMongoClean(xSub,bCleanAll);}
		);

	case "object":
		var xOut={};
		x.each(
			function(xVal,s){
				xOut[store.fxMongoClean(s,true)] = store.fxMongoClean(xVal,false);
			}
		);
		return xOut;

	default:
		return x;
	}

};

MongoStore.prototype.fxMongoUnClean = function(x,bUnCleanAll){
	var store = this;

	switch(nsTypes.fsTypeOf(x)){
	case "string":
		if (bUnCleanAll){
			x = x.replace(/_u/g,'_');
			x = x.replace(/_f/g,'/');
			x = x.replace(/_b/g,'\\');
			x = x.replace(/_s/g,'$');
			x = x.replace(/_p/g,'.');
		}
		return x;

	case "array":
		return x.map(
			function(xSub){return store.fxMongoUnClean(xSub,bUnCleanAll);}
		);

	case "object":
		var xOut={};
		x.each(
			function(xVal,s){
				xOut[store.fxMongoUnClean(s,true)] = store.fxMongoUnClean(xVal,false);
			}
		);
		return xOut;

	default:
		return x;
	}

};



MongoStore.prototype.fRead = function(s,fCallback){
	if (nsTypes.fbIsArray(s)){
		s = s.join('/');
	}

	var aFilter     = {};
	var aQuery      = {key: s};

	I("MongoStore","fRead","reading",	this.sCollection,	aQuery,	aFilter);

	var store = this;
	this.mongo.fFind(
		this.sCollection, aQuery, aFilter,
		function(err,vax){
			if (err){
				W("MongoStore","fRead","find error",err);
			}

			if (vax.length !== 1){
				return fCallback(true);
			}

			var xOut = store.fxMongoUnClean(vax[0].val);
			fCallback(null,xOut);
		}
	);
};


MongoStore.prototype.fWrite = function(s,x,fCallback){
	if (nsTypes.fbIsArray(s)){
		s = s.join('/');
	}

	x           = this.fxMongoClean(x);
	var aQuery  = {key: s};
	var aUpsert = {key: s, val: x};

	I("MongoStore","fWrite","writing]",	this.sCollection,	aQuery,	aUpsert);

	this.mongo.fUpdate(
		this.sCollection,
		aQuery,
		aUpsert,
		{upsert:true},
		fCallback
	);
};


MongoStore.prototype.fDelete = function(s,fCallback){
	if (nsTypes.fbIsArray(s)){
		s = s.join('/');
	}

	var aQuery      = {key: s};

	I("MongoStore","fDelete","deleting",	this.sCollection, aQuery);

	this.mongo.fRemove(
		this.sCollection,
		aQuery,
		{},
		fCallback
	);
};



module.exports = MongoStore;
