var nsTypes = require("nsTypes");
var fThrow = require("fThrow");
var ns = {};

//----------------------------------------------------------------------------
// fbIsEmailAddress
//   tests if a string is a valid email address
//
// Params
//   s :=the string to test
//
// Returns
//   true iff the string is roughly a valid email address 
//
// Notes
//   there are some exceptions see:
//   [http://www.regular-expressions.info/email.html]
//   for details
//
ns.fbIsEmailAddress = function(s){
	//  from http://www.regular-expressions.info/email.html
	return s.match(/^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,4}$/i);
};



//----------------------------------------------------------------------------
// frFromS
//  a more rubust conversion of a string to a floating number, without 
//  throwing exceptions or barfing on invalid characters
//
// Params
//   s :=the string to convert
//   rDefault := optional. default 0. value to return if conversion failed
//
// Returns
//   the number, or rDefault if not found.
//
ns.frFromS = function(s, rDefault){
	var r;

	try{
		r=parseFloat((s+"").replace(/[^0-9.\-]/g,''));
	}
	catch(e){
		return ns.fxFirstArg(rDefault, 0);
	}

	if (isNaN(r)){
		return ns.fxFirstArg(rDefault, 0);
	}
	return r;
};

//----------------------------------------------------------------------------
// fsRepeat
//   Repeates the given string the indicated number of times, separated by
//   an optional separation string
//   
// Params 
//   s := the string to repeat
//   c := the number of repeates
//   sSeparator := an optional separating string (default: blank)
//
// Returns 
//   the repeated string
//
ns.fsRepeat = function(s,c,sSeparator){
	var vs=[];
	for (;c>0;c--){
		vs.push(s);
	}
	return vs.join(sSeparator || '');
};

//----------------------------------------------------------------------------
// fbIsWhitespace
//   Determines whether a character is whitespace (space, tab, newline or 
//   carriage return)
//   
// Params 
//   ch := the character to test
//
// Returns 
//   true if it is whitespace
//
ns.fbIsWhitespace = function(ch){
	return ch===' ' || ch==='\t' || ch === '\n' || ch==='\r';
};

//----------------------------------------------------------------------------
// fsTrim
//   Trims whitespace from the left and right of a string
//   
// Params 
//   s := the string to trim
//
// Returns 
//   the trimmed string
//
ns.fsTrim = function(s){
	var c=s.length;

	var nStart = 0;
	while (nStart < c && ns.fbIsWhitespace(s.charAt(nStart)) ){
		nStart++;
	}

	var nEnd = c-1;
	while (nEnd >= 0 && ns.fbIsWhitespace(s.charAt(nEnd)) ){
		nEnd --;
	}
	
	return s.substring(nStart,nEnd+1);
};

//----------------------------------------------------------------------------
// fsLTrim
//   Trims whitespace from the left of a string
//   
// Params 
//   s := the string to trim
//
// Returns 
//   the trimmed string
//
ns.fsLTrim = function(s){
	var c=s.length;

	var nStart = 0;
	while (nStart < c && ns.fbIsWhitespace(s.charAt(nStart)) ){
		nStart++;
	}

	var nEnd = c-1;
	
	return s.substring(nStart,nEnd+1);
};

//----------------------------------------------------------------------------
// fsRTrim
//   Trims whitespace from the right of a string
//   
// Params 
//   s := the string to trim
//
// Returns 
//   the trimmed string
//
ns.fsRTrim = function(s){
	var c=s.length;

	var nStart = 0;
	var nEnd = c-1;
	while (nEnd >= 0 && ns.fbIsWhitespace(s.charAt(nEnd)) ){
		nEnd --;
	}
	
	return s.substring(nStart,nEnd+1);
};




//----------------------------------------------------------------------------
// fbTreeHasPath
//
//   Checks if a tree, represented as a multilevel associative array,
//   contains an extended/multidimensional key
//   
// Params 
//
//   a      := a multilevel associative array / tree    
//
//   sPath  := a representing the search key
//
// Returns 
//
//   true if path exists, false otherwise
//   
// Examples
//
//   * fbTreeHasPath( {a:{b:{c:1}}}, "a") 
//   => true
//
//   * fbTreeHasPath( {a:{b:{c:1}}}, "a.b")
//   => true
//
//   * fbTreeHasPath( {a:{b:{c:[0,1,2,3]}}}, "a.b.c[3]")
//   => true
//
//   * fbTreeHasPath( {a:{b:{c:1}}}, "x")
//   => false
//
//   * fbTreeHasPath( {a:{b:{c:1}}}, "a.x")
//   => false
//
//----------------------------------------------------------------------------
ns.fbTreeHasPath = function(a,sPath){
	var vs = sPath.replace(']','').split(/([.\[])/);

	for (var n=0, c=vs.length; n<c-1; n+=2){
		if (a[vs[n]] === undefined){
			return false;
		}
		a=a[vs[n]];
	}
	return true;
};

//----------------------------------------------------------------------------
// fSetTreePath
//
//   Sets a value within a tree, represented as a multilevel associative array,
//   addressed by a path (extended/multidimensional key). If the lineage along
//   a path does not exist, it is created.
//   
// Params 
//
//   a      := a multilevel associative array / tree    
//
//   sPath  := a representing the search key
//
//   xValue := value to store
//
//
// Examples
//
//   * a={}; fSetTreePath( a, "b.c[3].d", 5); 
//   => a == {b:{c:[,,,{d:5}]}}
//
//----------------------------------------------------------------------------
ns.fSetTreePath = function(a,sPath,xValue){
	var vs = sPath.replace(']','').split(/([.\[])/);

	if (vs.length === 1 && vs[0] === ""){
		fThrow("bad path " + sPath);
	}

	for (var n=0, c=vs.length; n<c-1; n+=2){
		if (a[vs[n]] === undefined){
			a[vs[n]] = vs[n+1]==='.' ? {} : [];
		}
		a=a[vs[n]];
	}
	a[vs[n]] = xValue;
};


//----------------------------------------------------------------------------
// fxGetTreePath
//
//   Gets a value within a tree, represented as a multilevel associative array,
//   addressed by a path (extended/multidimensional key). If the lineage along
//   a path does not exist, the supplied default is returned.
//   
// Params 
//
//   a     := a multilevel associative array / tree    
//
//   sPath  := a representing the search key
//
//   xDefault := value to return if not found (Default: null)
//
// Returns
//   the value at that point in the tree, or null if the value does not exist
//
// Examples
//
//   * fxGetTreePath( {b:{c:{d:5}}} , "b.c.d"); 
//   => 5
//
//   * fxGetTreePath( {b:{c:{d:5}}} , "b.c.d.e"); 
//   => null
//
//   * fxGetTreePath( {b:{c:{d:5}}} , "b.c"); 
//   => {d: 5}
//
//----------------------------------------------------------------------------
ns.fxGetTreePath = function(a,sPath,xDefault){
	var vs = sPath.replace(']','').split(/([.\[])/);

	if (vs.length === 1 && vs[0] === ""){
		fThrow("bad path " + sPath);
	}

	for (var n=0, c=vs.length; n<c; n+=2){
		if (
			!((nsTypes.fbIsObject(a)) || (nsTypes.fbIsArray(a))) 
				|| a[vs[n]] === undefined
		){
			return xDefault;
		}
		a=a[vs[n]];
	}
	return a;
};


//----------------------------------------------------------------------------
// fxFirstArg
//
//   Returns first non null/undefined argument
//   
// Params 
//
//   ... := any number of arguments of any type
//
// Returns 
//
//   Returns first non null/undefined argument
//   
// Examples
//
//   * fxFirstArg(null,undefined,0,"a")
//   => 0
//
//----------------------------------------------------------------------------
ns.fxFirstArg = function(){
  var vx = Array.prototype.slice.call(arguments);  
  
  for (var n=0, c=vx.length; n<c; n++){
    if (typeof (vx[n]) !== 'undefined' && vx[n] !== null && !isNaN(vx[n])){
      return vx[n];
    }
  }
  return undefined;
};


//----------------------------------------------------------------------------
// ffxLogTime
//
//   Returns first non null/undefined argument
//   
// Params 
//
//   ... := any number of arguments of any type
//
// Returns 
//
//   Returns first non null/undefined argument
//   
// Examples
//
//   * fxFirstArg(null,undefined,0,"a")
//   => 0
//
//----------------------------------------------------------------------------
ns.ffxLogTime = function(f){
	var fxLogTime = function fxLogTime(){
		var tm=new Date().getTime();
		var x= f.apply(this,arguments);
		function fsfShort(f){ 
			return f.name || f.toString().substring(0,250).replace(/[\n\r\s\t ]+/g," ").substring(0,50);
		}
		I(
			fsfShort(fxLogTime.caller),
			fsfShort(f),
			"logtime",
			new Date().getTime()-tm
		);
		return x;
	};
	return fxLogTime;
};


module.exports = ns;

