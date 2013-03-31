// ---------------------------------------------------------------------------
// nsConfig
//  replacement library which mimics the older require('nsConfig') behavior
//  but allowing for nsConfig.fSetFromFile() which sets the parameters which
//  are actually retrieved by subsequent files using require('nsConfig');

var nsConfig = {};

// ---------------------------------------------------------------------------
// fSet
//   add parameters from the specified file array to the config object
//
// Returns
//   nsConfig, for chaining purposes
//
// Example
//   In one file:
//     `var nsConfig = require("nsConfig").fSet({"foo":"bar"});
//
//   In subsequent files:
//     ~~~js
//       var nsConfig = require("nsConfig");
//       nsConfig["foo"] === "bar";
//     ~~~
//
nsConfig.fSet = function(a){
	var nsConfig = this;
	a.each(function(x,s){
		nsConfig[s] = x;
	});
	return this;
};


// ---------------------------------------------------------------------------
// fSetFromFile
//   add parameters from the specified file to the nsConfig object
//
// Returns
//   nsConfig, for chaining purposes
//
// Example
//   In one file:
//     `var nsConfig = require("nsConfig").fSetFromFile("../config/nsConfig");`
//
//   In subsequent files:
//     `var nsConfig = require("nsConfig");`
//
nsConfig.fSetFromFile = function(sfl){
	return this.fSet(require(sfl));
};


module.exports = nsConfig;


