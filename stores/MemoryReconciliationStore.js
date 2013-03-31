var ReconciliationStore = require("ReconciliationStore");
var nsClasses           = require("nsClasses");
var nsPack              = require("nsPack");
var nsTypes             = require("nsTypes");

// ---------------------------------------------------------------------------
// MemoryReconciliationStore
// 
// memory based reconciliation store that adheres to the
// MemoryReconciliationStore promise.
// ---------------------------------------------------------------------------
var MemoryReconciliationStore = function(){
	this.aaa = {};
	this.sStateKey = "*state";
};

nsClasses.fInherit(MemoryReconciliationStore,ReconciliationStore);


// ---------------------------------------------------------------------------
MemoryReconciliationStore.prototype.fRead = function(vs,fCallback){
	var sSearchKey = vs[0];
	var sSearchVal = "" + vs[1];
	var sTargetKey = vs[2];

	if (vs.length === 0){
		// read all is really hard to do because there's no global list with the
		// chosen data structure.  Here we do it a a dirty way by walking all
		// indicies and tagging and adding records to a list and tagging the record,
		// then walking the list and removing the tags. Tag conflicts are
		// tricky. Issue alredy exists with TreeStore states.
		var va = [];
		this.aaa.each(function(aa){
			aa.each(function(a){
				if (!a[this.sStateKey]){
					a[this.sStateKey] = true;
					va.push(a);
				}
			});
		});
		va.each(function(a){
			delete a[this.sStateKey];
		});
		va = ReconciliationStore.fvaxNumberifyValues(va);

		return fCallback(null,va);
	}

	if (!(sSearchKey in this.aaa)){
		// the search key doesn't exist at all, return failure
		I("MemoryReconciliationStore","fRead","key not found",vs);
		return fCallback("not found");
	}

	var aa = this.aaa[sSearchKey];

	if (!(sSearchVal in aa)){
		// the key=value pair doesn't exist, return failure
		I("MemoryReconciliationStore","fRead","key=value not found",vs);
		return fCallback("not found");
	}

	// found it
	var a = aa[sSearchVal];

	a = ReconciliationStore.faxNumberifyValues(a);

	if(vs.length===3){
		// return just the target-key
		I("MemoryReconciliationStore","fRead","found target",vs,a[sTargetKey]);
		return fCallback(null,a[sTargetKey]);
	}
	else{
		// return the whole record
		I("MemoryReconciliationStore","fRead","found",vs,a);
		return fCallback(null,a);
	}
};
		

// ---------------------------------------------------------------------------
MemoryReconciliationStore.prototype.fWrite = function(vs,xWrite,fCallback){
	var sSearchKey = vs[0];
	var sSearchVal = "" + vs[1];
	var sTargetKey = vs[2];

	var aToWrite;
	var aRecord;
	var sKey, sValKey;

	// if given, look up the search record
	if (vs.length !== 0 && (sSearchKey in this.aaa) && (sSearchVal in this.aaa[sSearchKey])){
		aRecord = this.aaa[sSearchKey][sSearchVal];
	}

	// determine the object we want to insert
	if (vs.length === 3){
		// if a partial write, its the existing record, if any, augmented by the write
		aToWrite = aRecord ? aRecord.foCopy() : {};
		aToWrite[sSearchKey] = sSearchVal;
		aToWrite[sTargetKey] = "" + xWrite;
	}
	else{
		// if 0 or 2 args, then xWrite had better be a compelete record
		if (!nsTypes.fbIsObject(xWrite)){
			return fCallback("write requires object");
		}

		// xWrite is the entire record we're writing, converted to string values
		aToWrite = xWrite.map(function(x){return x.toString();});
	}

	// if the search didn't find anything, find the first record that matches any key
	if (!aRecord){
		var mrs = this;
		aRecord = aToWrite.fxFirst(function(sValKey,sKey){
			if ((sKey in mrs.aaa) && (sValKey in mrs.aaa[sKey])){
				return mrs.aaa[sKey][sValKey];
			}
		});
	}

	// a blind entry had better be completely unique and have no matches
	if (vs.length === 0 && aRecord){
		I("MemoryReconciliationStore","fWrite","blind insert has a conflict",aRecord);
		return fCallback("blind conflict");
	}

	// if any of the key-values point to a record, then make sure that all 
	// key-values point to the same record
	if(aRecord){
		for (sKey in aToWrite){
			if (aToWrite.hasOwnProperty(sKey)){
				sValKey = aToWrite[sKey];
				if ((sKey in this.aaa) && (sValKey in this.aaa[sKey])){
					if (!nsTypes.fbEqual(this.aaa[sKey][sValKey], aRecord)) {
						I("MemoryReconciliationStore","fWrite","conflict on key",vs,sKey,sValKey);
						return fCallback("conflict");
					}
				}
			}
		}
	}

	// if we've found a record, it had better match our search
	if (aRecord && vs.length !== 0 && (sSearchKey in aRecord) && aRecord[sSearchKey] !== sSearchVal){
		I("MemoryReconciliationStore","fWrite","insert would conflict",sSearchKey,sSearchVal,aRecord);
		return fCallback("conflict");
	}


	// delete the old key, in case we're changing it. We're rewriting the new key below
	if (vs.length !== 0){
		if ((sSearchKey in this.aaa) && (sSearchVal in this.aaa[sSearchKey])){
			delete this.aaa[sSearchKey][sSearchVal];
		}
	}

	// store the replacement record in all keys
	for (sKey in aToWrite){
		if (aToWrite.hasOwnProperty(sKey)){
			sValKey = aToWrite[sKey]; // TODO: consider pack
			if (!this.aaa[sKey]){
				this.aaa[sKey] = {};
			}
			this.aaa[sKey][sValKey] = aToWrite;
		}
	}

	I("MemoryReconciliationStore","fWrite","successful record write",vs,xWrite);
	return fCallback(null);
};



// ---------------------------------------------------------------------------
MemoryReconciliationStore.prototype.fDelete = function(vs,fCallback){
	var sSearchKey = vs[0];
	var sSearchVal = "" + vs[1];
	var sTargetKey = vs[2];

	if (vs.length !== 0 && vs.length !== 2 && vs.length !== 3){
		W("MemoryReconciliationStore","fDelete","malformed request",vs);
		return fCallback("malformed request");
	}

	// delete-all request
	if (vs.length === 0){
		W("MemoryReconciliationStore","fDelete","delete all");
		this.aaa={};
		return fCallback(null);
	}

	if (!(sSearchKey in this.aaa)){
		// the search key doesn't exist at all, return failure
		I("MemoryReconciliationStore","fDelete","key not found",vs);
		return fCallback("not found");
	}

	var aa = this.aaa[sSearchKey];

	if (!(sSearchVal in aa)){
		// the key=value pair doesn't exist, return failure
		I("MemoryReconciliationStore","fDelete","key=value not found",vs);
		return fCallback("not found");
	}

	// found it
	var a = aa[sSearchVal];
	var sValKey;

	if (vs.length === 3){
		// delete just the target-key
		sValKey = nsPack.fsPack(a[sTargetKey]);

		// delete it from the index
		delete this.aaa[sTargetKey][sValKey];

		// delete it from the record
		delete a[sTargetKey];

		I("MemoryReconciliationStore","fDelete","deleted target",vs,a[sTargetKey]);
		return fCallback(null);
	}

	// delete the whole record
	I("MemoryReconciliationStore","fDelete","deleted",vs,a);

	// delete it from all indicies
	for (var sKey in a){
		if (a.hasOwnProperty(sKey)){
			delete this.aaa[sKey][a[sKey]];
		}
	}
	// delete it from the record
	delete a[sTargetKey];
	return fCallback(null);
};




module.exports = MemoryReconciliationStore;
