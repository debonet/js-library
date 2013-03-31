var nsPack = require('nsPack');
require("logging");

var fThrow = function(sfl, sf, sCause, xParam/*...*/){
	var s;
	if (arguments.length < 3){
		s= nsPack.fsPack(arguments);
		W("fThrow","fThrow","old style message", s);
	}
	else{
		var vxParam = Array.prototype.splice.call(arguments,0).splice(3);

		s = [
			sfl, ".",
			sf, "(): ", 
			sCause,
			vxParam.length ? " : " + nsPack.fsPack(vxParam) : ""
		].join('');
	}

	console.log(s);
	throw(s);
};


module.exports = fThrow;
