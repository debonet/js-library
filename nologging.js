// nologging.js
//  require this file to override the logging functions D,I,W,E so that they
//  do nothing during all execution after the require(). Particularly useful
//  when writing tests
//
require('logging');

// WANRING THESE ARE CREATED AS A GLOBALS
D = function(){};
I = function(){};

//W = function(){};
//E = function(){};


