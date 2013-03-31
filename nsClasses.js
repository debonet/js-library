var nsTypes = require('nsTypes');


var nsClasses = {};

// ---------------------------------------------------------------------------
nsClasses.fInherit = function(classChild,classParent){

	for (var sMember in classParent.prototype){
		if (classParent.prototype.hasOwnProperty(sMember)){
			if (sMember !== "constructor" && sMember !== "classSuper" && sMember!=="fSuper"){
				classChild.prototype[sMember] = classParent.prototype[sMember];
			}
		}
	}

	classChild.prototype.classSuper = classParent;

	// call a superclass function with me.fSuper('superFunction',args)
	classChild.prototype.fSuper = function(/*method,args...*/){
		var vx            = Array.prototype.slice.call(arguments);  
		var sMethod       = vx.shift();
		var classSuperOld = this.classSuper;
		this.classSuper   = classSuperOld.prototype.classSuper;
		var xOut          = classSuperOld.prototype[sMethod].apply(this,vx);
		this.classSuper   = classSuperOld;
		return xOut;
	};
	
};

// ---------------------------------------------------------------------------
nsClasses.fclassNew = function(classParent, fConstructor) {
	if (fConstructor){
		var classChild = fConstructor;
		nsClasses.fInherit(classChild,classParent);
		return classChild;
	}
	else {
		return classParent; 
	}

};

//----------------------------------------------------------------------------
nsClasses.foInsantiate = function (x){
	return new ((Object.getPrototypeOf(x)).constructor)();
};

//----------------------------------------------------------------------------

nsClasses.fxCopy = function(x){
	var sCopyMarker = "###__COPY__###";
	var vxCopyTable = [];

	// -----------------------------
	var fxCopyInner = function(x, axCopyTable){
		if (typeof x !== "object" || x === null || x instanceof RegExp){
			return x;
		}

		if (x[sCopyMarker]){
			return vxCopyTable[x[sCopyMarker]];
		}

		if (nsTypes.fbIsArray(x)){
			var v=[];
			x[sCopyMarker] = vxCopyTable.length;
			vxCopyTable.push(v);

			var c=x.length;
			for (var n=0; n<c; n++){
				v[n] = fxCopyInner(x[n], axCopyTable);
			}

			return v;
		}
		else{
			try {
				var oCopy = nsClasses.foInsantiate(x);
				x[sCopyMarker] = vxCopyTable.length;
				vxCopyTable.push(oCopy);
				for (var s in x) {
					if(x.hasOwnProperty(s) && s !== sCopyMarker){
						oCopy[s] = fxCopyInner(x[s], axCopyTable);
					}
				} 
				return oCopy;
			}
			catch(e){
				// uncopyable
				return {};
			}
		}
	};

	// -----------------------------
	var fStripCopyMarker = function(x){
		if (typeof (x) !== "object" || x === null) {
			return;
		}

		if (!x.hasOwnProperty(sCopyMarker)){
			return;
		}

		delete x[sCopyMarker];

		if (nsTypes.fbIsArray(x)){
			for (var n=0, c=x.length; n<c; n++){
				fStripCopyMarker(x[n]);
			}
		}
		else{
			for (var s in x) {
				if(x.hasOwnProperty(s)){
					fStripCopyMarker(x[s]);
				}
			} 
		}
	};


	var xCopy = fxCopyInner(x,{});
	fStripCopyMarker(x);

	return xCopy;
};

	
	



//----------------------------------------------------------------------------
// EXPORTS
//----------------------------------------------------------------------------
module.exports = nsClasses;
