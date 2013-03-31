var fAddNonEnumerable = require('fAddNonEnumerable');
var nsTypes = require("nsTypes");

require("functional");

// we use a recursive set (ie. this.a[s] = s) so that the
// functionals will work without rewrite

var StringSet = function(){ // set
	this.a = {};
	var set = this;
	var vx = Array.prototype.slice.call(arguments);  
	this.fAdd.apply(this,vx);
};

StringSet.prototype.fAdd = function(){
	var set = this;
	var vx = Array.prototype.slice.call(arguments);  
	vx.each(function(x){ 
		switch(nsTypes.fsTypeOf(x)){
		case 'array':
			set.fAdd.apply(set,x);
			break;
		case 'object':
			x.each(function(xSub,s){
				set.a[s] = true;	
			});
			break;
		default:
			set.a[x] = true;	
			break;
		}
	});
};

StringSet.prototype.fRemove = function(){
	var set = this;
	var vs = Array.prototype.slice.call(arguments);  
	vs.each(function(s){ delete set.a[s];	});
};

StringSet.prototype.fbHas = function(){
	var set = this;
	var vs  = Array.prototype.slice.call(arguments);  
	return vs.reduce(function(b,s){ return b && set.a.hasOwnProperty(s);	}, true);
};

StringSet.prototype.fbHasAny = function(){
	var set = this;
	var vs  = Array.prototype.slice.call(arguments);  
	return vs.reduce(function(b,s){ return b || set.a.hasOwnProperty(s);	}, false);
};

StringSet.prototype.fUnion = function(set){
	var setOut = new StringSet();
	this.a.each(
		function(b,s){ setOut.a[s] = true; }
	);
	set.a.each(
		function(b,s){ setOut.a[s] = true; }
	);
	return setOut;
};

StringSet.prototype.fIntersection = function(set){
	var setThis = this;
	var setOut = new StringSet();
	this.a.each(
		function(b,s){ if (set.a.hasOwnProperty(s)){setOut.a[s] = true;} }
	);
	set.a.each(
		function(b,s){ if (setThis.a.hasOwnProperty(s)){setOut.a[s] = true;} }
	);
	return setOut;
};


StringSet.prototype.fsJoin = function(sSeparator){
	var vs = new Array(this.count);
	var n=0;
	this.each(function(s){
		vs[n] = s;
		n++;
	});

	return vs.join(sSeparator);
};


StringSet.prototype.fDifference = function(set){
	var setThis = this;
	var setOut = new StringSet();
	this.a.each(
		function(b,s){ if (!set.a.hasOwnProperty(s)){setOut.a[s] = true;} }
	);
	return setOut;
};


StringSet.prototype.fvConvert = function(){
	var vs = [];
	this.a.each(
		function(b,s){ vs.push(s); }
	);
	return vs;
};


Object.defineProperty(
	StringSet.prototype,
	'count',
	{
		enumerable: false,
		"get":function (){
			var c=0;
			for (var sKey in this.a){
				if (this.a.hasOwnProperty(sKey)){
					c++;
				}
			}
			return c;
		}
	}
);

fAddNonEnumerable(
	StringSet.prototype,
	"map",
	function(f){
		var set = new StringSet();
		this.a.each(
			function(b,s){
				set.fAdd(f(s));
			}
		);
		return set;
	}
);

fAddNonEnumerable(
	StringSet.prototype,
	"each",
	function(f){
		this.a.each(
			function(b,s){
				f(s);
			}
		);
	}
);


fAddNonEnumerable(
	StringSet.prototype,
	"amap",
	function(f){
		var a = {};
		this.a.each(
			function(b,s){
				a[s] = f(s);
			}
		);
		return a;
	}
);

fAddNonEnumerable(
	StringSet.prototype,
	"vmap",
	function(f){
		var v = [];
		this.a.each(
			function(b,s){
				v.push(f(s));
			}
		);
		return v;
	}
);

fAddNonEnumerable(
	StringSet.prototype,
	"asynceach",
	function(f,fCallback){
		this.a.asynceach(
			function(b,s,fCallbackAsync){
				f(s,fCallbackAsync);
			},
			fCallback
		);
	}
);

fAddNonEnumerable(
	StringSet.prototype,
	"fsFirst",
	function(f){
		return this.a.fxFirst(
			function(b,s){
				return f(s);
			}
		);
	}
);



module.exports = StringSet;
