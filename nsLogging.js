var nsTypes = require('nsTypes');
var nsUtil = require('util');

var nsLogging = {};

// TODO: Add documentation! At least parameter descriptions!

(function(){

	var asLevelLabels = {
		"print"   : "",
		"debug"   : "[debug]   ",
		"info"    : "[Info]    ",
		"warning" : "[WARNING] ",
		"error"   : "[ERROR]   "
	};

	nsLogging.fLogMessage = function(sLevel, sfl, sf, sCause, xParam/*...*/){
		var s;
		if (arguments.length < 4){
			E("logging","fLogMessage","old style message",nsUtil.inspect(arguments,false,null));
		}
		else{
			var vxParam = Array.prototype.splice.call(arguments,0).splice(4);

			s = [
				asLevelLabels[sLevel],
				sfl, ".",
				sf, "(): ", 
				sCause,
				//				vxParam.length ? " : " + nsPack.fsPack(vxParam) : ""
				vxParam.length ? " : " + JSON.stringify(vxParam) : ""
			].join('');
		}

		console.log(s);
	};


	nsLogging.D = function(){
		var s=asLevelLabels["debug"];

		for(var n in arguments){
			if (nsTypes.fbIsString(arguments[n])){
				s+=arguments[n] + " " ;
			}
			else{
				s+=nsUtil.inspect(arguments[n],false,null)+" ";
			}
		}
 
		process.stderr.write(s + '\n');
	};

	nsLogging.I = function(){
		var vxParam = Array.prototype.splice.call(arguments,0);
		vxParam.unshift("info");
		nsLogging.fLogMessage.apply(null,vxParam);
	};

	nsLogging.W = function(){
		var vxParam = Array.prototype.splice.call(arguments,0);
		vxParam.unshift("warning");
		nsLogging.fLogMessage.apply(null,vxParam);
	};

	nsLogging.E = function(){
		var vxParam = Array.prototype.splice.call(arguments,0);
		vxParam.unshift("error");
		nsLogging.fLogMessage.apply(null,vxParam);
	};

})();

module.exports = nsLogging;
