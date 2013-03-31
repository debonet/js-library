var TreeStore  = require("TreeStore");
var nsClasses  = require("nsClasses");
var nsTypes    = require("nsTypes");
require("nsLogging");

// ---------------------------------------------------------------------------
// MemoryTreeStore
//
//   provides fRead,fWrite,fDelete
// ---------------------------------------------------------------------------
var MemoryTreeStore = function(){
	this.a={};
	this.a[TreeStore.sState] = TreeStore.PARTIAL;
};

nsClasses.fInherit(MemoryTreeStore, TreeStore);

MemoryTreeStore.prototype.fRead = function(vs,fCallback){
	vs = this.fvsEnsureArray(vs);
	//I("MemoryTreeStore","fRead","seeking",vs);

	if (vs.length === 0){
		return fCallback(null,this.a);
	}

	var store = this;
	this.fWalkTreeToValue(vs,this.a,function(err,a){
		if (err){return fCallback(err);}
		fCallback(null,store.fxCleanCacheResponse(a));
	});
};



MemoryTreeStore.prototype.fWrite = function(vs,x,fCallback){
	vs = this.fvsEnsureArray(vs);

	if (vs.length === 0){
		if (nsTypes.fbIsObject(x)){
			x[TreeStore.sState] = TreeStore.COMPLETE;
		}

		this.a   = x;
		return fCallback(null);
	}

	var a = this.a;
	/*jshint bitwise:false */
	a[TreeStore.sState] = (a[TreeStore.sState] || 0) | TreeStore.PARTIAL; 

	for (var n=0, c=vs.length-1; n<c; n++){
		if (!(nsTypes.fbIsObject(a) && vs[n] in a)){
			a[vs[n]] = {};
		}
		a = a[vs[n]];

		a[TreeStore.sState] = (a[TreeStore.sState] || 0) | TreeStore.PARTIAL;
	}

	//I("MemoryTreeStore","fWrite","writing",vs,x);

	a[vs[n]] = x;
	fCallback(null);
};


MemoryTreeStore.prototype.fDelete = function(vs,fCallback){
	vs = this.fvsEnsureArray(vs);

	//I("MemoryTreeStore","fDelete","deleting",vs);

	if (vs.length === 0){
		this.a={};
	}
	else{

		var a=this.a;

		for (var n=0, c=vs.length-1; n<c; n++){
			if (nsTypes.fbIsObject(a) && vs[n] in a){
				a = a[vs[n]];
			}
			else {
				return fCallback(null);
			}
		}

		if (!nsTypes.fbIsObject(a) || (!(vs[n] in a))){
			return fCallback(null);
		}

		delete a[vs[n]];

		a=this.a;
		for (n=0, c=vs.length-1; n<c; n++){
			if (nsTypes.fbIsObject(a) && vs[n] in a){
				/*jshint bitwise:false */
				a[TreeStore.sState] = (a[TreeStore.sState] || 0) | TreeStore.PARTIAL; 
			
				a = a[vs[n]];
			}
			/*jshint bitwise:false */
			a[TreeStore.sState] = (a[TreeStore.sState] || 0) | TreeStore.PARTIAL; 
		}
	}

	return fCallback(null);
};



module.exports = MemoryTreeStore;
