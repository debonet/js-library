require('mocha');
require('should');
var ffMemoize = require('../ffMemoize.js');
var nsPack = require('../nsPack.js');
require('logging.js');

describe("ffMemoize", function(){
	it("should remember a syncronous function", function(){
		var n = 0;
		var f = ffMemoize(function(s){ n++; return s+n;},true);

		f("foo").should.equal("foo1");
		f("foo").should.equal("foo1");

		f("bar").should.equal("bar2");
		f("bar").should.equal("bar2");

		f("baz").should.equal("baz3");
		f("baz").should.equal("baz3");

		f("foo").should.equal("foo1");
		f("foo").should.equal("foo1");

		f("bar").should.equal("bar2");
		f("bar").should.equal("bar2");

		f("baz").should.equal("baz3");
		f("baz").should.equal("baz3");
	});

	it("should remember a syncronous function called with complex args", function(){
		var n = 0;
		var f = ffMemoize(
			function(){ 
				n++; 
				var vs = Array.prototype.slice.call(arguments);
				return  n + ":"+nsPack.fsPack(vs);
			},
			true
		);

		// arrays of 1 or more arguments, followed by expected response
		[
			["foo", "1:['foo']"],
			["foo", "1:['foo']"],
			["foo","bar", "2:['foo', 'bar']"],
			["foo","bar", "2:['foo', 'bar']"],
			[{"foo":"bar"}, "3:[{'foo':'bar'}]"],
			[{"foo":"bar"}, "3:[{'foo':'bar'}]"],
			[{"foo":"bar",a:[1,2,3]}, "4:[{'foo':'bar', 'a':[1, 2, 3]}]"],
			[{"foo":"bar",a:[1,2,3]}, "4:[{'foo':'bar', 'a':[1, 2, 3]}]"],

			["foo", "1:['foo']"],
			["foo", "1:['foo']"],
			["foo","bar", "2:['foo', 'bar']"],
			["foo","bar", "2:['foo', 'bar']"],
			[{"foo":"bar"}, "3:[{'foo':'bar'}]"],
			[{"foo":"bar"}, "3:[{'foo':'bar'}]"],
			[{"foo":"bar",a:[1,2,3]}, "4:[{'foo':'bar', 'a':[1, 2, 3]}]"],
			[{"foo":"bar",a:[1,2,3]}, "4:[{'foo':'bar', 'a':[1, 2, 3]}]"]
		].each(function(vs){
			var sEquals = vs.pop();
				//.should.equal(sEquals);
			f.apply(null,vs).should.equal(sEquals);
		});


	});

	it("should remember an asyncronous function called with complex args", function(fDone){
		var n = 0;
		var f = ffMemoize(function(){ 
			n++; 
			var vs = Array.prototype.slice.call(arguments);
			var fCallback = vs.pop();
			fCallback(null, n + ":"+nsPack.fsPack(vs));
		});

		// arrays of 1 or more arguments, followed by expected response
		[
			["foo", "1:['foo']"],
			["foo", "1:['foo']"],
			["foo","bar", "2:['foo', 'bar']"],
			["foo","bar", "2:['foo', 'bar']"],
			[{"foo":"bar"}, "3:[{'foo':'bar'}]"],
			[{"foo":"bar"}, "3:[{'foo':'bar'}]"],
			[{"foo":"bar",a:[1,2,3]}, "4:[{'foo':'bar', 'a':[1, 2, 3]}]"],
			[{"foo":"bar",a:[1,2,3]}, "4:[{'foo':'bar', 'a':[1, 2, 3]}]"],

			["foo", "1:['foo']"],
			["foo", "1:['foo']"],
			["foo","bar", "2:['foo', 'bar']"],
			["foo","bar", "2:['foo', 'bar']"],
			[{"foo":"bar"}, "3:[{'foo':'bar'}]"],
			[{"foo":"bar"}, "3:[{'foo':'bar'}]"],
			[{"foo":"bar",a:[1,2,3]}, "4:[{'foo':'bar', 'a':[1, 2, 3]}]"],
			[{"foo":"bar",a:[1,2,3]}, "4:[{'foo':'bar', 'a':[1, 2, 3]}]"]
		].serialeach(
			function(vs,s,fCallbackAsync){
				var sEquals = vs.pop();
				vs.push(function(err,sOut){
					sOut.should.equal(sEquals); 
					fCallbackAsync(err);
				});
				f.apply(null,vs);
			},
			fDone
		);
	});


});
