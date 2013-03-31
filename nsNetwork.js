var fRequest   = require("request");
var nsTypes    = require("nsTypes");
var StringSet  = require("StringSet");
var nsXML2Json = require('xml2json');
// TODO: put this in a generic nsNetwork group

var fRequest            = require("request");
var nsNetwork= {};


//----------------------------------------------------------------------------
// nsNetwork.ffValidatedResponse
//   function generator which wraps a network callback funciton to convert
//   http-errors into callback errors
//  
// Params
//   aOptions := Options structure. All fields are optional:
//
//     setStatusCodes  := Optional. A set of reponse codes which are valid
//                        (Default: {200} )
//
//     setContentType  := Optional. Return headers tested for membership
//                        (Default: undefined, meaning all accepted)
//
//     fxParser        := `function(s)`, convert response into javascript object
//                        Should throw an error on failure (default,
//                        identity).
//
//     bReturnHeader   := Whether or not the header itself should be
//                       passed along (default true)
//
//   fCallback := `function(err,aHeader,xBody)`, or `function(err,xBody)` 
//                 the function to call with the updated err value, header 
//                 (if bReturnHeader option is true) and parsed body
//
// Returns
//   `function(err,resp,buffBody)` 
//      http callback function that updates the err value as directed by
//      options and then calls fCallback with the updated err value and its
//      arguments.
//    
//   Params
//     err      := the error returned from a prior call
// 
//     resp  := the http response header to be validated
//
//     buffBody := the http body to be validated
//
var setDefaultStatusCode  = new StringSet(200);
var setDefaultContentType = null;

nsNetwork.ffValidatedResponse = function(aOptions,fCallback){
	aOptions = {
		setStatusCode  : setDefaultStatusCode,
    setContentType : setDefaultContentType
	}.mergeIn(aOptions || {});

	return function(err,resp,buffBody){
		// test the original error, and fail if it exists
		if (err){return fCallback(err,resp,buffBody);}

		// test the status code against our array, if given
		if (aOptions.setStatusCode){
			if (!aOptions.setStatusCode.fbHas(resp.statusCode)){
				return fCallback("bad status code: " + resp.statusCode, resp, buffBody);
			}
		}

		// test content type against our array, if given
		if (aOptions.setContentType){
			var sContentType = resp.headers["content-type"].replace(/;.*/,'');
			if (!aOptions.setContentType.fbHas(sContentType)){
				return fCallback("invalid content type: " + resp.headers["content-type"]);
			}
		}

		// parse the body if parser given
		var xBody;
		if (aOptions.fxParser){
			try{
				xBody = aOptions.fxParser(buffBody.toString());
			}
			catch(e){
				return fCallback("parse failure " + e, resp, buffBody);
			}
		}
		else{
			xBody = buffBody;
		}

		// TODO: might posts need their responses?
		if (aOptions.bReturnHeader){
			fCallback(null,resp,xBody);
		}
		else{
			fCallback(null,xBody);
		}
	};
};


//----------------------------------------------------------------------------
// fHTTPRequest
//   a wrapper for request.js that does additional type checking and 
//   adjustable type conversions
//
// Params
//   aOptions := Options structure. All fields are optional:
//
//     fsSerializer := Optional. `function(x)`, convert object to string for 
//                     transmission. Should throw an exception on error
//                     (default: undefined === identity)
//
//     sContentType := Optional. (Default: "text/html")
//
//     All request.js arguments. See [https://github.com/mikeal/request]
//
//     All response validation aruments. See [nsNetwork.ffValidatedResponse]
//
//   fCallback := `function(err,resp,xBody)`, or `function(err,xBody)` 
//                 the function to call with the updated err value, header 
//                 (if bReturnHeader option is true) and parsed body
//
nsNetwork.fHTTPRequest = function(aOptions,fCallback){
	aOptions = {
		fsSerializer : undefined,
		sContentType : "text/html",
		fxParser     : undefined
	}.mergeIn(aOptions || {});

	aOptions = {
		"headers" : {}
	}.mergeIn(aOptions);

	// serialize the body if parser given
	if (aOptions.fsSerializer){
		try{
			aOptions.body = aOptions.fsSerializer(aOptions.body);
		}
		catch(e){
			return fCallback("serialization failure " + e);
		}
	}


	if (aOptions.sContentType){
		aOptions["headers"].mergeIn({"Content-type" : aOptions.sContentType});
	}

	if (aOptions.setContentType){
		aOptions["headers"].mergeIn({"Accept" : aOptions.setContentType.fsJoin(';')});
	}

	fRequest(
		aOptions, 
		nsNetwork.ffValidatedResponse(aOptions,fCallback)
	);
};

//----------------------------------------------------------------------------
// fPost
//
// Params
//   sUrl         := url to which to post
//
//   x            := data to post
//
//   aOptions := Optional options structure. 
//
//			fxParser      := Optional. (default: return as string)
//
//			sContentType  := Optional. (default: "application/x-www-form-urlencoded")
//
//      bReturnHeader := Optional. (default: false)
//
//      All [fHTTPRequest] options
//
//   fCallback := `function(err,xBody)`, the function to called with 
//                 the returned body
//
nsNetwork.fPost = function(sUrl,x,aOptions,fCallback){
	if (!fCallback){
		fCallback = aOptions;
		aOptions = {};
	}

	nsNetwork.fHTTPRequest(
		{
			url           : sUrl,
			method        : "POST",
			sContentType  : "application/x-www-form-urlencoded",
			bReturnHeader : false,
			body          : x,
			fxParser      : function(x){return x.toString();}
		}.mergeIn(aOptions),
		fCallback
	);
};

//----------------------------------------------------------------------------
// fGet
//
// Params
//   sUrl         := url to which to get
//
//   aOptions := Optional options structure. 
//
//			fxParser      := Optional. (default: return as string)
//
//			sContentType  := Optional. (default: "text/html")
//
//      bReturnHeader := Optional. (default: false)
//
//      All [fHTTPRequest] options
//
//   fCallback := `function(err,xBody)`, the function to called with 
//                 the returned content
//
nsNetwork.fGet = function(sUrl,aOptions, fCallback){
	if (!fCallback){
		fCallback = aOptions;
		aOptions = {};
	}

	nsNetwork.fHTTPRequest(
		{
			url           : sUrl,
			method        : "GET",
			sContentType  : "text/html",
			bReturnHeader : false,
			fxParser      : function(x){return x.toString();}
		}.mergeIn(aOptions),
		fCallback
	);
};

//----------------------------------------------------------------------------
// fPostJson
//   posts data via JSON and expects a JSON response
//
// Params
//   sUrl      := url to which to post
//   x         := data to post as JSON
//   aOptions  := Optional. All [fHTTPRequest] options
//   fCallback := `function(err, xBody)` - called back with any errors
//
var setContentTypeJSON = new StringSet("application/json","text/json","text/x-json");
var sContentTypeJSON = "application/json";

nsNetwork.fPostJson = function(sUrl,x,aOptions,fCallback){
	if (!fCallback){
		fCallback = aOptions;
		aOptions = {};
	}

	nsNetwork.fPost(
		sUrl,
		x,
		{
			fsSerializer   : JSON.stringify,
			sContentType   : sContentTypeJSON,
			fxParser       : JSON.parse,
			setContentType : setContentTypeJSON
		},
		fCallback
	);
};

//----------------------------------------------------------------------------
// fPostXML
//   posts data via XML and expects a XML response
//
// Params
//   sUrl      := url to which to post
//   x         := data to post as XML
//   aOptions  := Optional. All [fHTTPRequest] options
//   fCallback := `function(err)` - called back with any errors
//
// TODO: implement
/*

var setContentTypeXML = new StringSet("application/xml","text/xml","text/x-xml");
nsNetwork.fPostXML = function(sUrl,x,fCallback){
	if (!fCallback){
		fCallback = aOptions;
		aOptions = {};
	}
	nsNetwork.fPost(
		sUrl,
		x,
		{
			fsSerializer : XML.stringify,
			sContentType : "application/xml",
			fxParser     : XML.parser,
			setContentType : setContentTypeXML
		},
		fCallback
	);
};
*/



//----------------------------------------------------------------------------
// fGetXML
//   posts data via XML and expects a XML response
//
// Params
//   sUrl      := url to which to post
//   aOptions  := Optional. All [fHTTPRequest] options
//   fCallback := `function(err)` - called back with any errors
//
// TODO: implement
var setContentTypeXML = new StringSet("application/xml","text/xml");
nsNetwork.fGetXML = function(sUrl,aOptions,fCallback){
	if (!fCallback){
		fCallback = aOptions;
		aOptions = {};
	}
	nsNetwork.fGet(
		sUrl,
		{
			fxParser       : function(x){return nsXML2Json.toJson(x, {object: true});},
			setContentType : setContentTypeXML
		},
		fCallback
	);
};


//----------------------------------------------------------------------------
// fGetJson
//   gets data and requrires a JSON response
//
// Params
//   sUrl      := url to which to get
//   aOptions  := Optional. All [fHTTPRequest] options
//   fCallback := `function(err, xBody)` - called back with any errors
//
nsNetwork.fGetJson = function(sUrl,aOptions,fCallback){
	if (!fCallback){
		fCallback = aOptions;
		aOptions = {};
	}
	nsNetwork.fGet(
		sUrl,
		{
			fxParser       : JSON.parse,
			setContentType : setContentTypeJSON
		},
		fCallback
	);
};



//----------------------------------------------------------------------------
// fAsyncEachFromGetObject
//   function to retrieve a vector or array from a JSON returning URL and 
//   and asynchronously evaluate the given function on them
//
// Params
//   sUrl      := url from which the list should be retrieved
//
//   fEvaluate := `function(x, fCallback)` called on each
//
//   aOptions  := Optional. All [fHTTPRequest] options
//
//   fCallback := `function(err)` called when done
//
nsNetwork.fAsyncEachFromGet = function(sUrl, fEvaluate, aOptions, fCallback){
	if (!fCallback){
		fCallback = aOptions;
		aOptions = {};
	}
	nsNetwork.fGet(sUrl, aOptions, function(err,x){
		if (err){return fCallback(err);}

		if (!x.asynceach){
			return fCallback("bad content type",x);
		}

		x.asynceach(fEvaluate,	fCallback);
	});
};


//----------------------------------------------------------------------------
// fAsyncEachFromGetJson
//   function to retrieve a vector or array from a JSON returning URL and 
//   and asynchronously evaluate the given function on them
//
// Params
//   sUrl      := url from which the list should be retrieved
//   fEvaluate := `function(x, fCallback)` called on each
//   aOptions  := Optional. All [fHTTPRequest] options
//   fCallback := `function(err)` called when done
//
nsNetwork.fAsyncEachFromGetJson = function(sUrl, fEvaluate, aOptions, fCallback){
	if (!fCallback){
		fCallback = aOptions;
		aOptions = {};
	}
	nsNetwork.fAsyncEachFromGet(
		sUrl,
		fEvaluate,
		{
			fxParser       : JSON.parse,
			setContentType : setContentTypeJSON
		},
		fCallback
	);
};

//----------------------------------------------------------------------------
// fAsyncEachPostUrl
//   function to asynchronously post each object in a list to a given URL
//
// Params
//   sUrl      := url to which the list should be posted
//   vx        := list of things to post
//   aOptions  := Optional. All [fHTTPRequest] options
//   fCallback := `function(err)` called when done
//
nsNetwork.fAsyncEachPostUrl = function(sUrl,vx,aOptions, fCallback){
	if (!fCallback){
		fCallback = aOptions;
		aOptions = {};
	}
	vx.asynceach(
		function(x,n,fCallbackAsync){
			nsNetwork.fPost(sUrl, x,aOptions,fCallbackAsync);
		},
		fCallback
	);

};

//----------------------------------------------------------------------------
// fAsyncEachJsonPostUrl
//   function to asynchronously post each object in a list as json to a given URL
//
// Params
//   sUrl      := url to which the list should be posted
//   vx        := list of things to post
//   aOptions  := Optional. All [fHTTPRequest] options
//   fCallback := `function(err)` called when done
//
nsNetwork.fAsyncEachJsonPostUrl = function(sUrl,vx, aOptions,fCallback){
	if (!fCallback){
		fCallback = aOptions;
		aOptions = {};
	}
	nsNetwork.fAsyncEachPostUrl(
		sUrl,
		vx,
		{
			fsSerializer   : JSON.stringify,
			sContentType   : sContentTypeJSON,
			fxParser       : JSON.parse,
			setContentType : setContentTypeJSON
		},
		fCallback
	);
};

module.exports = nsNetwork;
