require("mocha");
var should = require("should");
var StringSet = require("../StringSet.js");
require("../functional.js");

// jsl can't handle ["true"] and ["false"]

describe("testing Set class", function(){
	/*jshint expr:true */
	it("should not say it has things it doesnt", function(){
		var set = new StringSet();
		set.fbHas("foo").should.be["false"];
	});

	it("should take things in the constructor", function(){
		var set = new StringSet("foo");
		set.fbHas("foo").should.be["true"];
	});

	it("should take things, and then report them as being there", function(){
		var set = new StringSet();
		set.fAdd("foo");
		set.fbHas("foo").should.be["true"];
	});

	it("should take multiple things from the constructor, and then report them as being there", function(){
		var set = new StringSet("foo","bar","baz");
		set.fbHas("foo").should.be["true"];
		set.fbHas("bar").should.be["true"];
		set.fbHas("baz").should.be["true"];
	});

	it("should take multiple things add, and then report them as being there", function(){
		var set = new StringSet();
		set.fAdd("foo","bar","baz");
		set.fbHas("foo").should.be["true"];
		set.fbHas("bar").should.be["true"];
		set.fbHas("baz").should.be["true"];
	});

	it("should check that all of arguments request are present", function(){
		var set = new StringSet();
		set.fAdd("foo","bar","baz");
		set.fbHas("foo","bar","baz").should.be["true"];
	});

	it("should not say that missing arguments request are not present", function(){
		var set = new StringSet();
		set.fAdd("foo","bar","baz");
		set.fbHas("bing").should.be["false"];
	});

	it("should not say that missing arguments request are not present", function(){
		var set = new StringSet();
		set.fAdd("foo","bar","baz");
		set.fbHas("foo","bing").should.be["false"];
	});

	it("should say that is hasany if it has at least one of them", function(){
		var set = new StringSet();
		set.fAdd("foo","bar","baz");
		set.fbHasAny("foo","bing").should.be["true"];
		set.fbHasAny("bing").should.be["false"];
	});

	it("should say that nothing is always present", function(){
		var set = new StringSet();
		set.fAdd("foo","bar","baz");
		set.fbHas().should.be["true"];
	});

	it("should union properly", function(){
		var set1 = new StringSet("a","b","c","d");
		var set2 = new StringSet("d","e","f");
		var set3 = set1.fUnion(set2);
		set3.fbHas("a","b","c","d","e","f").should.be["true"];
	});

	it("should intersect properly", function(){
		var set1 = new StringSet("a","b","c","d");
		var set2 = new StringSet("d","e","f");
		var set3 = set1.fIntersection(set2);
		set3.fbHasAny("a","b","c","e","f").should.be["false"];
		set3.fbHas("d").should.be["true"];
	});

	it("should difference properly", function(){
		var set1 = new StringSet("a","b","c","d");
		var set2 = new StringSet("d","e","f");
		var set3 = set1.fDifference(set2);
		set3.fbHas("a","b","c").should.be["true"];
		set3.fbHasAny("d","e","f").should.be["false"];
	});

	it("should know its count properly", function(){
		var set1 = new StringSet("a","b","c","d");
		set1.count.should.be.equal(4);
	});

	it("should support mapping from set to set", function(){
		var set1 = new StringSet("a","b","c","d");
		var set2 = set1.map(function(s){ return s+s; });
		set2.fbHas("aa","bb","cc","dd").should.be["true"];
		set2.fbHasAny("a","b","c","d").should.be["false"];
	});

	it("should support mapping from set to assoc array", function(){
		var set1 = new StringSet("a","b","c","d");
		var a = set1.amap(function(s){ return s+s; });
		a.should.eql({a:"aa",b:"bb",c:"cc",d:"dd"});
	});

	it("should support .each", function(){
		var set1 = new StringSet("a","b","c","d");
		var sAccumulate = "";
		set1.each(function(s){ sAccumulate += s; });
		sAccumulate.should.equal("abcd");
	});

	it("should support .asynceach", function(fDone){
		var set1 = new StringSet("a","b","c","d");
		var adtmSleep = {a:100,b:1,c:20,d:120};

		var sAccumulate = "";
		set1.asynceach(
			function(s,fCallback){ 
				setTimeout(
					function(){
						sAccumulate += s; 
						fCallback(null);
					},
					adtmSleep[s]
				);
			},
			function(err){
				should.not.exist(err);
				sAccumulate.should.equal("bcad");
				fDone();
			}
		);
	});


	it("should support .fsFirst", function(){
		var set1 = new StringSet("a","b","c","d");

		var sAccumulate = "";
		set1.fsFirst(	function(s){ return s==="b"?"GOT A B":false;}).should.equal("GOT A B");
	});


	it("should support adding keys", function(){
		var set1 = new StringSet();
		set1.fAdd({a:1,b:1},{c:1,d:1});
		var a = set1.amap(function(s){ return s+s; });
		a.should.eql({a:"aa",b:"bb",c:"cc",d:"dd"});
	});


	it("should support adding vectors", function(){
		var set1 = new StringSet();
		set1.fAdd(["a","b","c","d"]);
		var a = set1.amap(function(s){ return s+s; });
		a.should.eql({a:"aa",b:"bb",c:"cc",d:"dd"});
	});


});


