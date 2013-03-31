var nsTypes = require("nsTypes");

var CookieJar = (function(){
	var D = function(){};

	// ---------------------------------------------------------------------------
	var CookieJar = function(){
		this.acookie = {};
	};

	// ---------------------------------------------------------------------------
	CookieJar.prototype.fParseResponse = function(res, req){
		var sDomain = req["url"].replace(/[^\/]*\/\//,'').replace(/\/.*/,'');

		var xCookie = res["headers"]['set-cookie'];

		if (!xCookie){
			D("NO COOKIES");
			return;
		}

		var vsCookie = (
			nsTypes.fbIsArray(xCookie)
				? xCookie
				: [xCookie]
		);

		var cookiejar = this;

		vsCookie.each(function(sCookie){
			var vsPairs = sCookie.split(/;\s*/);
			var sFirst = vsPairs.shift();

			var aProperties = {};
			vsPairs.each(function(s){
				aProperties[s.replace(/[=].*/,'')] = s.replace(/[^=]*=/,'');
			});

			if (!("domain" in aProperties) || aProperties["domain"] === ""){
				aProperties["domain"] = sDomain;
			}

			var s = sFirst.replace(/[=].*/,'');
			var sValue = sFirst.replace(/[^=]*=/,'');

			cookiejar.fSetCookie(s,sValue,aProperties);
		});
	};


	// ---------------------------------------------------------------------------
	CookieJar.prototype.fSetCookie = function(s,sValue,aProperties){
		aProperties = aProperties || {};

		if (['del','none'].indexOf(sValue) !== -1){
			D("   COOKIE -----: " + s);
			delete this.acookie[s];
		}
		else{
			D("   COOKIE +++++: " + s);

			var cookie = {
				"s"      : s,
				"sValue" : sValue,
				"aProperties" : aProperties
			};

			this.acookie[s] = cookie;
		}
	};

	// ---------------------------------------------------------------------------
	CookieJar.prototype.fDeleteCookie = function(s){
		this.fSetCookie(s,"del");
	};

	// ---------------------------------------------------------------------------
	CookieJar.prototype.fasValueForCookie = function(){
		var asValueForCookie = {};
		this.acookie.each(function(cookie){
			asValueForCookie[cookie.s] = cookie.sValue;
		});

		return asValueForCookie;
	};


	// ---------------------------------------------------------------------------
	CookieJar.prototype.facookieForUrl = function(surl){
		//	D("+++++++++++++++++++++++++++++++++++++++++++++++");
		//	D("GETTING COOKIES FOR",surl);
		var sDomain = surl.replace(/[^\/]*\/\//,'').replace(/\/.*/,'');

		var sPath = surl.replace(/[^\/]*\/\/[^\/]*/,'');
		if (sPath.length === 0){
			sPath = '/';
		}

		var sProtocol = surl.replace(/:\/\/.*/,'');


		var acookieOut = {};
	
		this.acookie.each(function(cookie){
			var a = cookie.aProperties;

			if (a["secure"] && sProtocol !== "https"){
				//			D("NOT SECURE", cookie.s); 
				return false;
			}
	
			if (a["domain"]){
				var sDomainTest = (
					a["domain"].charAt(0) !== '.'
						? sDomain
						:	sDomain.replace(/[^.]*/,'')
				);
			
				if (sDomainTest !== a["domain"]){
					//				D("NOT MATCHED", cookie.s, sDomainTest, a["domain"]); 
					return false;
				}
			}
			else{
				return false;
			}
		
			if (a["path"]){
				if (sPath.indexOf(a["path"]) !== 0){
					//				D("PATHMISMATCH", cookie.s, sPath,a["path"]);
					return false;
				}
			}

			D("   COOKIE >>:",cookie.s);
			acookieOut[cookie.s] = cookie;
		});

		return acookieOut;
	};

	// ---------------------------------------------------------------------------
	CookieJar.prototype.fsCookieHeader = function(surl){
		var vs = [];

		this.facookieForUrl(surl).each(function(cookie){
			vs.push(cookie.s + '=' + cookie.sValue);
		});

		return vs.join('; ');
	};

	// ---------------------------------------------------------------------------
	CookieJar.prototype.fvsApplicableCookies = function(surl){
		return this.facookieForUrl(surl).vmap(function(cookie){
			return cookie.s;
		}).sort();
	};

	// ---------------------------------------------------------------------------
	CookieJar.prototype.toString = function(surl){
		return this.facookieForUrl(surl).vmap(function(cookie){
			return cookie.s + ": " +cookie.sValue;
		}).sort().join('\n');
	};

	// ---------------------------------------------------------------------------
	CookieJar.prototype.fc = function(){
		return this.acookie.count;
	};

	return CookieJar;
})();


module.exports = CookieJar;
