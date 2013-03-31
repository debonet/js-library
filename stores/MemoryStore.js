var Store   = require("Store");
var nsClasses = require("nsClasses");
var nsTypes = require("nsTypes");

// ---------------------------------------------------------------------------
// MemoryStore
//
//   provides fRead,fWrite,fDelete
// ---------------------------------------------------------------------------
var MemoryStore = function(){
	this.a={};
};

nsClasses.fInherit(MemoryStore, Store);

MemoryStore.prototype.fRead = function(s,fCallback){
	if (nsTypes.fbIsArray(s)){
		s = s.join('/');
	}

	if (s in this.a){
		return fCallback(null,this.a[s]);
	}
	return fCallback(true);
};


MemoryStore.prototype.fWrite = function(s,x,fCallback){
	if (nsTypes.fbIsArray(s)){
		s = s.join('/');
	}

	this.a[s]=x;
	fCallback(null);
};

MemoryStore.prototype.fDelete = function(s,fCallback){
	if (nsTypes.fbIsArray(s)){
		s = s.join('/');
	}

	delete this.a[s];
	fCallback(null);
};



module.exports = MemoryStore;
