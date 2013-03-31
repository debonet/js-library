require("functional");
require("logging");
var CookieJar = require("CookieJar");
var nsTypes   = require("nsTypes");
var fRequest  = require("request");
var Scraper   = require("Scraper");


// ---------------------------------------------------------------------------
var fsBaseForUrl = function(surl){
	return surl.replace(/([^\/]*:\/\/[^\/]*)\/.*/,'$1');
};

// ---------------------------------------------------------------------------
var fsPathForUrl = function(surl){
	return surl.replace(new RegExp("([^/]*^"),'');
};

// ---------------------------------------------------------------------------
// Browser
//   a simple browser class
//
var Browser = function(){
	this.cookiejar              = new CookieJar();
	this.aframe                 = {};
	this.sFrameActive           = "main";

	this.aRequestDefault = {};
};

// ---------------------------------------------------------------------------
// Browser.fSetDefaultHeaders
//   set headers which are used as defaults for each request
//
// Params 
//   array of headers
Browser.prototype.fSetRequestDefault = function(aRequest){
	this.aRequestDefault = aRequest;
};

// ---------------------------------------------------------------------------
// Browser.fOpen
//  open a new url
//
// Forms:
//   function(url, aRequest, fCallback);
//   function(aRequest, fCallback);
//   function(aRequest, aRequestMore, fCallback);
//
// Params
//   surl         := the url to visit
//   aRequest     := an array of request options
//   aRequestMore := an array of request options, which take precidence over 
//                   those in aRequest
//   fCallback    := `function(err)` called back when done, with `this` set to 
//                   the current browser
//
Browser.prototype.fOpen = function(req, aOptions, fCallback){
	if (nsTypes.fbIsFunction(aOptions)){
		fCallback= aOptions;
		aOptions = {};
	}
	
	if (nsTypes.fbIsString(req)){
		req = {"url" : req};
	}

	// deal with frames
	var sFrame = req["frame"] || this.sFrameActive;
	if (!this.aframe[sFrame]){
		this.aframe[sFrame] = {};
	}

	// headers
	req = req.foMerge(aOptions);
	req.headers = req.headers || {};
	req.headers = {
		"Referer" : this.aframe[sFrame].surlReferer
	}.mergeIn(req.header);
	req.headers = this.aRequestDefault.foMerge(req.headers);

	// ensure complete URL
	if (req["url"].indexOf("://") === -1){
		if (req["url"].charAt(0) === '/'){
			req["url"] = fsBaseForUrl(this.aframe[sFrame].surlReferer) + req["url"];
		}
		else{
			req["url"] = fsPathForUrl(this.aframe[sFrame].surlReferer) + req["url"];
		}
	}
	I("Browser","fOpen","Opening url", req["url"]);
 
	// setup cookies
	if (this.cookiejar.fc()){
		if (req["headers"]["Cookie"]){
			req["headers"]["Cookie"] += "; ";
		}
		else{
			req["headers"]["Cookie"] = "";
		}
		req["headers"]["Cookie"] += this.cookiejar.fsCookieHeader(req["url"]||req["uri"]);
	}

//	D("COOKIES",this.cookiejar.toString(req["url"]));
//	D("REQ.HEADERS",req.headers);

	req.followRedirect = false;
	req.jar = false;

	var browser = this;
	fRequest(req, function(err, res, buf){
		if(err){D("GOT ERROR",err); return fCallback(err);}

		browser.cookiejar.fParseResponse(res, req);

		if ([300,301,302,303,304,307].indexOf(res.statusCode) !== -1){
			req["url"] = res["headers"]["location"] || res["headers"]["Location"];
			I("Browser","fOpen","Redirection to", req["url"]);
			browser.fOpen(req, fCallback);
		}
		else{
			browser.aframe[sFrame] = {
				sBody        : buf ? buf.toString() : "",
				aResponse    : res["headers"], // TODO: do we want to keep more than just the headers?
				aRequest     : req,
				surlReferer  : req["url"] || req["uri"],
				scraper      : undefined // filled on demand
			};
			fCallback.call(browser);
		}
	});
};


// ---------------------------------------------------------------------------
// Frame functions 
// TODO: document these
Browser.prototype.fCloseFrame = function(sFrame){
	sFrame = sFrame || this.sFrameActive;
	delete this.aframe[sFrame];
};

Browser.prototype.fsBody = function(sFrame){
	sFrame = sFrame || this.sFrameActive;
	return this.aframe[sFrame].sBody;
};

Browser.prototype.faResponse = function(sFrame){
	sFrame = sFrame || this.sFrameActive;
	return this.aframe[sFrame].aResponse;
};

Browser.prototype.faRequest = function(sFrame){
	sFrame = sFrame || this.sFrameActive;
	return this.aframe[sFrame].aRequest;
};


Browser.prototype.fsurlReferer = function(sFrame){
	sFrame = sFrame || this.sFrameActive;
	return this.aframe[sFrame].surlReferer;
};


// ---------------------------------------------------------------------------
Browser.prototype.fSetCookie = function(s,sValue,aProperties){
	this.cookiejar.fSetCookie(s,sValue,aProperties);
};


					 


// ---------------------------------------------------------------------------
// Browser.fDoActions
//   run a series of actions on a browser
//
// Forms:
// Params:
//   xActions* := one or more actions of the form:
//      surl        := a string url to open
//      aRequest    := a request object to open
//   
//      function(scraper, fCallback) := async function to execute on the parsed scraper
//      function(fCallback)       := async function to execute without parsing
//      function()                := sync function to execute without parsing
//
//      Note: all functions called with this bound to the browser
//
//   fCallback := `function(err)` - called when done
//
Browser.prototype.fDoActions = function(){
	var vxArg = Array.prototype.slice.call(arguments);
	var fCallback = vxArg.pop();

	var browser = this;
	vxArg.serialeach(
		function(xArg, n, fCallbackAsync){
			if (nsTypes.fbIsFunction(xArg)){
				switch(xArg.length){
				case 2:  // we've been given a function(scraper, fCallback)
					browser.fScrape(function(err, scraper){
						if (err){return fCallbackAsync(err);}
						xArg.call(browser, scraper, fCallbackAsync);
					});
					break;
				case 1:	// we've been given a function(fCallback)
					xArg.call(browser, fCallbackAsync);
					break;
				case 0: // we've been given a simple syncronous function
					xArg.call(browser);
					fCallbackAsync(null);
					break;
				default:
					E("Browser", "fSerializeRequests", "unknown function type", xArg);
				}
			}
			else{
				browser.fOpen(xArg, fCallbackAsync);
			}
		},
		fCallback
	);
};


// ---------------------------------------------------------------------------
// Browser.fNewBrowserForEach
//   open a new browser and run the given function for each element in the
//   in the given array
//
// Params
//   vx        := array over which to enumerate
//   f         := `function(x, n, fCallback)[this=browser]` called on each 
//                element
//   fCallback := `function(err)` - called when done
//
Browser.prototype.fNewBrowserForEach = function(vx, f, fCallback){
	var browser = this;
	vx.asynceach(
		function(x,n,fCallbackAsync){
			D("OPENING FOR NEW BROWSER");
			var browserNew = browser.clone();
			f.call(browserNew, x, n, fCallbackAsync);
		},
		fCallback
	);
};


// ---------------------------------------------------------------------------
// fbrowserFork
//   "forks" the browser to create an identical browser, which can evolve
//   separately from the original
//
Browser.prototype.fbrowserFork = function(){
	var browser             = new Browser();
	browser.cookiejar       = this.cookiejar.foCopy();
	browser.aframe          = {}.mergeIn(this.aframe); // shallow copy
	browser.sFrameActive    = this.sFrameActive;
	browser.aRequestDefault = browser.aRequestDefault.foCopy();
	return browser;
};


// ---------------------------------------------------------------------------
// Browser.fScrape
//   parse the scraper and compute a DOM if not already done for this scraper, then 
//   run over the contents of the scraper
//
// Params
//   sFrame    := optional. the frame on which the function should be run
//   fCallback := `function(err, scraper)` called with the parsed scraper object
//
// See Also: [Scraper]
//
Browser.prototype.fScrape = function(sFrame, fCallback){
	if (!fCallback){
		fCallback = sFrame;
		sFrame  = this.sFrameActive;
	}

	var browser = this;

	if (browser.aframe[sFrame].scraper){
		fCallback.call(browser, null, browser.aframe[sFrame].scraper);
	}
	else{
		Scraper.fMakeScraper(
			this.aframe[this.sFrameActive].sBody,
			function(err, scraper){
				browser.aframe[sFrame].scraper = scraper;
				fCallback.call(browser, err, browser.aframe[sFrame].scraper);
			}
		);
	}
};



module.exports = Browser;



