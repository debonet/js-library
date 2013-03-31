require('functional');
require('logging');

// ---------------------------------------------------------------------------
// Store
// 
// base class for stores, provides non-functioning required members
//   fRead(sKey,fCallback), fWrite(sKey,x,fCallback), fDelete(sKey,fCallback)
//
// ---------------------------------------------------------------------------
var Store = function(){};

Store.prototype.fRead = function(sKey,fCallback){
	E("Store","fRead","not implemented");
	fCallback("not implemented");
};

Store.prototype.fWrite = function(sKey,x,fCallback){
	E("Store","fWrite","not implemented");
	fCallback("not implemented");
};

Store.prototype.fDelete = function(sKey,fCallback){
	E("Store","fDelete","not implemented");
	fCallback("not implemented");
};


module.exports = Store;
