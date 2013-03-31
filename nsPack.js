var nsPack = {};

// ---------------------------------------------------------------------------
// if bStringExact then make sure that the outputted string will not only be
// correct but will always be the same for this object
// otherwise objects might have their keys in different orders when packed

nsPack.fsPack = function(x,bStringExact){

	if(typeof(x) === "object"){
		if (x["__pack__"]){
			return "[RECURSIVE]";
		}

		x["__pack__"]=true;
	}

	var s = nsPack.fsPackInternal(x,bStringExact);

	if(typeof(x) === "object"){
		delete x["__pack__"];
	}

	return s;
};


nsPack.fsPackInternal = function(x,bStringExact){
	var sKey,vs,n,c;
	if (x === undefined){
		return "undefined";
	}
	if (x === null){
		return "null";
	}

	switch(x.constructor.name){
	case 'Number':
		return x+0;

	case 'String':
		return ["'", x.replace(/'/,"\\'").replace("\n","\\n"), "'"].join('');

	case 'Date':
		return "new Date(" + x.getTime() + ")";

	case 'Function':
		return x.toString();

	case 'Boolean':
		return x?"true":"false";

	case 'Array':
		vs = [];
		for (n=0, c=x.length; n<c; n++){
			vs.push(nsPack.fsPack(x[n],bStringExact));
		}

		return ['[', vs.join(', '), ']'].join('');

	default:
		vs = [];

		if (bStringExact){
			var vsKey = [];
			for (sKey in x){
				if (x.hasOwnProperty(sKey)){
					vsKey.push(sKey);
				}
			}

			vsKey.sort();

			for (n=0, c=vsKey.length; n<c; n++){
				sKey = vsKey[n];
				if (sKey !== "__pack__"){
					vs.push(
						[ nsPack.fsPack(sKey,bStringExact), ':', nsPack.fsPack(x[sKey],bStringExact) ].join('')
					);
				}
			}
		}
		else{
			for (sKey in x){
				if (x.hasOwnProperty(sKey)){
					if (sKey !== "__pack__"){
						vs.push(
							[ nsPack.fsPack(sKey,bStringExact), ':', nsPack.fsPack(x[sKey],bStringExact) ].join('')
						);
					}
				}
			}
		}

		return ['{',vs.join(', '),'}'].join('');
	}
};
	

nsPack.fxUnpackF = function(sf){
	var xRet;
	/*jshint evil:true */
	eval(["xRet = (", sf, ")()"].join(''));
	return xRet;
};


nsPack.fxUnpack = function(s){
	var xRet;
	/*jshint evil:true */
	eval(["xRet = (function(){", s, "})()"].join(''));
	return xRet;
};

//----------------------------------------------------------------------------
// EXPORTS
//----------------------------------------------------------------------------
module.exports = nsPack;

