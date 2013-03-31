var MongoStore          = require("MongoStore");
var ReconciliationStore = require("ReconciliationStore");
var nsClasses           = require("nsClasses");
var nsPack              = require("nsPack");
var nsTypes             = require("nsTypes");
var Mongo               = require("Mongo");

// ---------------------------------------------------------------------------
// MongoReconciliationStore
// 
// Mongo based reconciliation store that adheres to the MongoReconciliationStore 
// promise.
//
// options:
//     - all Mongo options 
//      
//     - collection : name of the collection to use (defaults to 'reconciliation')
//
//     - safewrites : whether or not to block on writes to report failures
// ---------------------------------------------------------------------------
var MongoReconciliationStore = function(aOptions){
	aOptions.collection = aOptions.collection || "reconciliation";
	this.bSafeWrites = aOptions.safewrites || false;
	this.fSuper('constructor',aOptions);
};

nsClasses.fInherit(MongoReconciliationStore,ReconciliationStore);
nsClasses.fInherit(MongoReconciliationStore,MongoStore);

// ---------------------------------------------------------------------------
MongoReconciliationStore.prototype.fRead = function(vs,fCallback){ // mrs
	var sSearchKey = this.fxMongoClean(vs[0]);
	var sSearchVal = this.fxMongoClean(ReconciliationStore.fxNumberifyValues(vs[1]));
	var sTargetKey = this.fxMongoClean(vs[2]);

	var aFilter = {_id:0};
	var aQuery  = {};

	switch(vs.length){
	case 0: // read all
		aQuery  = {};
		break;

	case 2: // read record
		aQuery[sSearchKey] = sSearchVal;
		break;

	case 3: // read value
		aFilter[sTargetKey] = 1;
		aQuery[sSearchKey] = sSearchVal;
		break;

	default:
		W("MongoReconciliationStore","fRead","malformed request",vs);
		return fCallback("malformed request");
	}

	I("MongoReconciliationStore","fRead","reading",	aQuery,	aFilter);

	var mrs = this;

	this.mongo.fFind(
		this.sCollection, aQuery, aFilter,
		function(err,vax){
			if (err){
				W("MongoReconciliationStore","fRead","find error",err);
				return fCallback("not found");
			}

			if (vax.length === 0 && vs.length !== 0){
				I("MongoReconciliationStore","fRead","key=value not found",vs);
				return fCallback("not found");
			}
			else if (vs.length !== 0 && vax.length !== 1){
				E("MongoReconciliationStore","fRead","invalid ReconciliationStore",vs);
				return fCallback("invalid ReconciliationStore");
			}

			vax = mrs.fxMongoUnClean(vax);

			I("MongoReconciliationStore","fRead","found",vax);
			switch(vs.length){
			case 0:
				return fCallback(null,vax);
			case 2:
				return fCallback(null,vax[0]);
			case 3:
				return fCallback(null,vax[0][sTargetKey]);
			default:
				return fCallback("error");
			}
		}
	);
};
		

// ---------------------------------------------------------------------------
MongoReconciliationStore.prototype.fWrite = function(vs,xWrite,fCallback){
	var sSearchKey = this.fxMongoClean(vs[0]);
	var sSearchVal = this.fxMongoClean(ReconciliationStore.fxNumberifyValues(vs[1]));
	var sTargetKey = this.fxMongoClean(vs[2]);

	var aFilter     = {_id:0};
	var aSet        = {};
	var aQuery;

	switch(vs.length){
	case 0: // blind write
		aSet    = this.fxMongoClean(ReconciliationStore.faxNumberifyValues(xWrite));
		break;

	case 2: // write record
		aSet = this.fxMongoClean(ReconciliationStore.faxNumberifyValues(xWrite));
		aQuery = {};
		aQuery[sSearchKey] = sSearchVal;
		break;

	case 3: // write value
		aSet[sTargetKey] = this.fxMongoClean(ReconciliationStore.fxNumberifyValues(xWrite));
		aQuery = {};
		aQuery[sSearchKey] = sSearchVal;
		break;

	default:
		W("MongoReconciliationStore","fWrite","malformed request",vs);
		return fCallback("malformed request");
	}

	var aUpdate = {$set: aSet};

	var vsIndex;
	if (vs.length === 3){
		vsIndex = [sSearchKey, sTargetKey];
	}
	else{
		// rewrite the whole record, we know xWrite is a record now
		if (!nsTypes.fbIsObject(xWrite)){
			return fCallback("write requires object");
		}
		vsIndex = xWrite.map(function(xVal,sKey){
			return sKey;
		});
	}

	var mrs = this;
	var aEnsureOptions = {unique:true,sparse:true,safe:mrs.bSafeWrites};
	var aUpdateOptions = {upsert:true, safe:mrs.bSafeWrites};

	vsIndex.asynceach(
		function(sIndex,n,fCallbackAsync){
			var aIndexDefinition={};
			aIndexDefinition[sIndex] = 1;

			I("MongoReconciliationStore","fWrite","ensuring index",aIndexDefinition);
			mrs.mongo.fEnsureIndex(mrs.sCollection,	aIndexDefinition,	aEnsureOptions,	fCallbackAsync);
		},
		function(err){
			if (err){return fCallback(err);}

			if (aQuery){
				I("MongoReconciliationStore","fWrite","upserting",aQuery,	aUpdate,aUpdateOptions);
				mrs.mongo.fUpdate(mrs.sCollection,aQuery,aUpdate,aUpdateOptions,fCallback);
			}
			else{
				I("MongoReconciliationStore","fWrite","inserting",aSet,aUpdateOptions);
				mrs.mongo.fInsert(mrs.sCollection,aSet,aUpdateOptions,fCallback);
			}
		}
	);

};


// ---------------------------------------------------------------------------
MongoReconciliationStore.prototype.fDelete = function(vs,fCallback){
	var sSearchKey = this.fxMongoClean(vs[0]);
	var sSearchVal = this.fxMongoClean(ReconciliationStore.fxNumberifyValues(vs[1]));
	var sTargetKey = this.fxMongoClean(vs[2]);

	var aUnset = {};
	var aQuery  = {};

	switch(vs.length){
	case 0: // delete all
		aQuery  = {};
		I("MongoReconciliationStore","fDelete","deleteing all");
		return this.mongo.fRemove(
			this.sCollection, {},	{safe:this.bSafeWrites},fCallback
		);

	case 2:
		aQuery[sSearchKey] = sSearchVal;
		I("MongoReconciliationStore","fDelete","deleteing",aQuery);
		// it appears as though mongo does not report an error if your delete does 
		// not match anything, so in the case of safe writes we first check to see
		// that the desired record exists before deleting
		// There might be a small race condition here if someone else deletes it,
		// but its ok, because we want it delelted, and it will be whether we do it
		// or someone else does
		if (this.bSafeWrites){
			var mrs = this;
			return this.mongo.fFind(
				this.sCollection, aQuery,
				function(err,vax){
					if (err){return fCallback(err);}
					if (vax.length !== 1){return fCallback("not found");}
					return mrs.mongo.fRemove(
						mrs.sCollection, aQuery,	{safe:true},fCallback
					);
				}
			);
		}
		else{
			return this.mongo.fRemove(
				this.sCollection, aQuery,	{safe:this.bSafeWrites},fCallback
			);
		}
		break;

	case 3:
		aUnset[sTargetKey] = 1;
		aUnset = {$unset : aUnset};
		aQuery[sSearchKey]  = sSearchVal;
		var aUpdateOptions = {safe:this.bSafeWrites};
		I("MongoReconciliationStore","fDelete","updating",aQuery,aUnset);
		return this.mongo.fUpdate(this.sCollection, aQuery,	aUnset, aUpdateOptions, fCallback);

	default:
		W("MongoReconciliationStore","fDelete","malformed request",vs);
		return fCallback("malformed request");
	}

};




module.exports = MongoReconciliationStore;
