require("mocha");
var should = require("should");
require("../functional.js");

describe("testing functional array methods", function(){

	it("should support .each", function(){
		var vs = ["a","b","c","d"];
		var sAccumulate = "";
		vs.each(function(s){ sAccumulate += s; });
		sAccumulate.should.equal("abcd");
	});

	it("should support .map", function(){
		var vs = ["a","b","c","d"];
		var vs2 = vs.map(function(s){ return s+ s; });
		vs2.should.eql(["aa","bb","cc","dd"]);
	});


	it("should support .serialfirst", function(fDone){
		var vs = ["a","b","c","d"];
		vs.serialfirst(
			function(s,n,fCallbackAsync){
				fCallbackAsync(null,(s==="c")?"gotta " + s:false);
			},
			function(err,n,s){
				s.should.equal("gotta c");
				fDone();
			}
		);
	});

});



