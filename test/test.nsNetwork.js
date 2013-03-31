require('mocha');
var StringSet = require('StringSet');

var should = require('should');
var nsNetwork = require('../nsNetwork');
var nsHttp = require('http');


var nPort = 9876;
var sUrl = "http://localhost:" + nPort;

var fserverMake = function (nStatusCode, sContentType, sContent,fCallback){
	return nsHttp.createServer(function (req, res) {
		res.writeHead(nStatusCode, {'Content-Type': sContentType});
		res.end(sContent);
	}).listen(nPort, '127.0.0.1', fCallback);
};



var fRunServerTest = function(
	bShouldWork,
	nStatusCode,sContentType, sContent, aOptions,  
	fDone
){
	var server = fserverMake(
		nStatusCode, 
		sContentType, 
		sContent,
		function(errConnect){
			nsNetwork.fHTTPRequest(
				{
					url : sUrl
				}.mergeIn(aOptions),
				function(err){
					if (bShouldWork){
						should.not.exist(err);
					}
					else{
						should.exist(err);
					}
					server.close();
					fDone();
				}
			);
		}
	);
};


describe("nsNetwork", function() {

	var SHOULD_PASS = true;
	var SHOULD_FAIL = false;

	it("should succeed on 200's status codes", function(fDone) {
		fRunServerTest(
			SHOULD_PASS,
			200,
			"foo/bar",
			"hello world",
			{},
			fDone
		);
	});


	it("should fail on non-200's status codes", function(fDone) {
		fRunServerTest(
			SHOULD_FAIL,
			300,
			"foo/bar",
			"hello world",
			{},
			fDone
		);
	});


	it("should succeed on valid content-types", function(fDone) {
		fRunServerTest(
			SHOULD_PASS,
			200,
			"foo/bar",
			"hello world",
			{
				setContentType : new StringSet("foo/bar","bing/baz")
			},
			fDone
		);
	});


	it("should fail on invalid content-types", function(fDone) {
		fRunServerTest(
			SHOULD_FAIL,
			200,
			"foo/bar",
			"hello world",
			{
				setContentType : new StringSet("XXX/YYY","bing/baz")
			},
			fDone
		);
	});


	it("should succeed on parseable content", function(fDone) {
		fRunServerTest(
			SHOULD_PASS,
			200,
			"foo/bar",
			"[1,2,3]",
			{
				fxParser : JSON.parse
			},
			fDone
		);
	});

	it("should fail on unparseable content", function(fDone) {
		fRunServerTest(
			SHOULD_FAIL,
			200,
			"foo/bar",
			"[1,2,3xxx]",
			{
				fxParser : JSON.parse
			},
			fDone
		);
	});


	it("should succeed on posts", function(fDone) {
		fRunServerTest(
			SHOULD_PASS,
			200,
			"foo/bar",
			"hello world",
			{
				method : "POST",
				body : "howdy doody"
			},
			fDone
		);
	});

	it("should succeed on serializable posts", function(fDone) {
		fRunServerTest(
			SHOULD_PASS,
			200,
			"foo/bar",
			"hello world",
			{
				method : "POST",
				body : "howdy doody",
				fsSerializer : function(x){return "XXX"+x+"XXX";}
			},
			fDone
		);
	});


	it("should fail on not serializable posts", function(fDone) {
		fRunServerTest(
			SHOULD_FAIL,
			200,
			"foo/bar",
			"hello world",
			{
				method : "POST",
				body : "howdy doody",
				fsSerializer : function(x){throw("yuck, I don't like this input");}
			},
			fDone
		);
	});


});





