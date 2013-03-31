require("mocha");
var should = require("should");
var nsClasses = require("../nsClasses.js");
require("../functional.js");

var MongoStore = require("../MongoStore.js");

describe("testing MongoStore class", function(){
	it("should fxMongoClean(x) properly", function(){
		var mongostore = new MongoStore("foo");

		[
			["foobar", "foobar"],
			["word/with/slashes", "word/with/slashes"],
			["$DollarSign", "$DollarSign"],
			["Middle$DollarSign", "Middle$DollarSign"],
			[5, 5],

			[{a: "foobar"},{a: "foobar"}],
			[{a: "word/with/slashes"},{a: "word/with/slashes"}],
			[{a: "$DollarSign"},{a: "$DollarSign"}],
			[{a: "Middle$DollarSign"},{a: "Middle$DollarSign"}],
			[{a: 5},{a: 5}],

			[{"foobar" : 2},{"foobar" : 2}],
			[{"word/with/slashes" : 2},{"word_fwith_fslashes" : 2}],
			[{"$DollarSign" : 2},{"_sDollarSign" : 2}],
			[{"Middle$DollarSign" : 2},{"Middle_sDollarSign" : 2}],
			[{5 : 2},{5 : 2}],

			[
				[ "foobar",	"word/with/slashes",	"$DollarSign",	"Middle$DollarSign" ],
				[ "foobar",	"word/with/slashes",	"$DollarSign",	"Middle$DollarSign" ]
			]

		].each(function(v){
			mongostore.fxMongoClean(v[0]).should.eql(v[1]);
		});


	});


	it("should ensure fxMongoUnClean(fxMongoClean(x)) == x", function(){
		var mongostore = new MongoStore("foo");

		[
			"foobar",
			"word/with/slashes",
			"$DollarSign",
			"Middle$DollarSign",
			5,

			{a: "foobar"},
			{a: "word/with/slashes"},
			{a: "$DollarSign"},
			{a: "Middle$DollarSign"},
			{a: 5},

			{"foobar" : 2},
			{"word/with/slashes" : 2},
			{"$DollarSign" : 2},
			{"Middle$DollarSign" : 2},
			{5 : 2},

			[ "foobar",	"word/with/slashes",	"$DollarSign",	"Middle$DollarSign" ],

			{"$DollarSign" : {"$DollarSign" : ["$DollarSign"]}},

			{"$Dollar_Sign" : {"$Dollar_Sign" : ["$Dollar_Sign"]}}

		].each(function(x){
			var xOrig = nsClasses.fxCopy(x);
			mongostore.fxMongoUnClean(
				mongostore.fxMongoClean(x)
			).should.eql(xOrig);
		});
	});


	// TODO: test the actual storing functionality 

});



