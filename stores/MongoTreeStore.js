var Mongo      = require("Mongo");
var MongoStore = require("MongoStore");
var TreeStore  = require("TreeStore");
var nsClasses    = require("nsClasses");
var nsTypes    = require("nsTypes");
require("logging");

// ---------------------------------------------------------------------------
// MongoTreeStore
//
//   provides fRead,fWrite,fDelete
//
// TODO: figure out partial trees
// ---------------------------------------------------------------------------

// TODO: should be able to provide the cache name. Otherwise can risk namespace
// collisions if multiple treecaches are in the same database.
var MongoTreeStore = function(
	cKeyGrouping, xMongoSpec
){
	this.mongo         = new Mongo(xMongoSpec);
	this.cKeyGrouping  = cKeyGrouping;
	this.sCollection   = xMongoSpec.collection || "treecache";
};

nsClasses.fInherit(MongoTreeStore, MongoStore);
nsClasses.fInherit(MongoTreeStore, TreeStore);

// keys are stored in mogo with the following pattern
//   db.vs[0].{key : vs[1]...vs[cKeyGrouping], vs[cKeyGrouping+1]:{vs[cKeyGrouping+2]...}}
//
// example:
//   with cKeyGrouping set to 2, the key a.b.c.d.e.f is stored in
// 
//  db.a.{key: "b.c", c:{d:{e:{f:5}}}}
MongoTreeStore.prototype.faQueryParams = function(vs){
	vs               = this.fxMongoClean(vs,true);

	var a            = {};
	a.sCollection    = this.sCollection;

	a.sKey           = vs.slice(0,this.cKeyGrouping).join(".");
	a.sKey           = a.sKey;
	a.aQuery         = a.sKey.length > 0 ? {key: a.sKey} : {};

	a.vsDoc          = vs.slice(this.cKeyGrouping);
	a.vsDoc.unshift("val");
	a.sDoc           = a.vsDoc.join(".");

	return a;
};


MongoTreeStore.prototype.fRead = function(vs,fCallback){
	vs              = this.fvsEnsureArray(vs);

	if (vs.length < this.cKeyGrouping && vs.length > 1){
		W("MongoTreeStore","fRead","MongoTreeStore has a multi-key that can't be split");
		return fCallback("MongoTreeStore has a multi-key that can't be split");
	}

	var a           = this.faQueryParams(vs);

	var aFilter     = {};
	aFilter['_id']  = 0;
	aFilter[a.sDoc] = 1;

	var sSubDoc = "";
	for (var n=0,c=a.vsDoc.length; n<c-1; n++){
		sSubDoc += a.vsDoc[n] + ".";
		aFilter[sSubDoc + TreeStore.sState] = TreeStore.PARTIAL;
	}

//	I("MongoTreeStore","fRead","reading",	a.sCollection,	a.aQuery,	aFilter);

	var store = this;

	this.mongo.fFind(
		a.sCollection, a.aQuery, aFilter,
		function(err,vax){
			if (err){return fCallback(err);}
			if (vax.length !== 1){
				return fCallback(true);
			}

			store.fWalkTreeToValue(
				a.vsDoc,
				vax[0],
				function(err,ax){
					if (err){return fCallback(err);}
					ax = store.fxMongoUnClean(ax);
					fCallback(null,ax);
				}
			);
		}
	);
};


MongoTreeStore.prototype.fWrite = function(vs,x,fCallback){
	vs = this.fvsEnsureArray(vs);

	// if the key is too big, recursively split and recuse
	if (vs.length < this.cKeyGrouping){
		var mongostore = this;
//		I("MongoTreeStore","fWrite","asyncwrite", vs);
		return x.asynceach(
			function(xSub,sKey,fCallbackAsync){
				var vsSub = vs.concat([sKey]);
				mongostore.fWrite(vsSub,xSub,fCallbackAsync);
			},
			fCallback
		);
	}

	x            = this.fxMongoClean(x);
	var a        = this.faQueryParams(vs);
	var aSet     = {};
	aSet[a.sDoc] = x;
	if (a.sKey.length>0){
		aSet['key']  = a.sKey;
	}
	var sSubDoc = "";
	for (var n=0,c=a.vsDoc.length; n<c-1; n++){
		sSubDoc += a.vsDoc[n] + ".";
		aSet[sSubDoc + TreeStore.sState] = TreeStore.PARTIAL;
	}

	var aUpdate = {$set: aSet};

//	I("MongoTreeStore","fWrite","writing",	a.sCollection,	a.aQuery);

	this.mongo.fUpdate(
		a.sCollection,
		a.aQuery,
		aUpdate,
		{upsert:true},
		fCallback
	);
};


MongoTreeStore.prototype.fDelete = function(vs,fCallback){
	vs             = this.fvsEnsureArray(vs);
	var a          = this.faQueryParams(vs);

	var aUnset     = {};
	aUnset[a.sDoc] = 1;

	// NOTE: this isn't quite right because it does not differentiate
	// between PARTIAL and PARTIALCHILD states
	// NOTE: using bitfields didnt work
	var aSet    = {};
	var sSubDoc = "";
	for (var n=0,c=a.vsDoc.length; n<c-1; n++){
		sSubDoc += a.vsDoc[n] + ".";
		aSet[sSubDoc + TreeStore.sState] = TreeStore.PARTIAL;
	}

	var aUpdate = {$unset: aUnset, $set: aSet};

//	I("MongoTreeStore","fDelete","deleting",	a.sCollection,	a.aQuery,	aUpdate);

	this.mongo.fUpdate(
		a.sCollection,
		a.aQuery,
		aUpdate,
		{},
		fCallback
	);
};



module.exports = MongoTreeStore;


