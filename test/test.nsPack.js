var nsPack = require("nsPack");

describe("nsPack constants", function(){
	it("should work", function(){
		nsPack.fsPack("a").should.eql("'a'");
		nsPack.fsPack(1).should.eql(1);
		nsPack.fsPack(function(){ return 1; }).should.eql("function (){ return 1; }");
		nsPack.fsPack(1.0).should.eql(1.0);
	});
});

		
describe("nsPack object", function(){
	it("should work", function(){
		nsPack.fsPack({a:1,b:2}).should.eql("{'a':1, 'b':2}");
		nsPack.fsPack({a:1,b:{c:3}}).should.eql("{'a':1, 'b':{'c':3}}");
	});
});

describe("nsPack recursive object", function(){
	it("should work", function(){
		
		var a = {a: 1};
		a.b = a;

		nsPack.fsPack(a).should.eql("{'a':1, 'b':[RECURSIVE]}");



	});
});

		

