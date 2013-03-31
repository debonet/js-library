module.exports = (function(){
	var nsTypes = require("nsTypes");

	// ---------------------------------------------------------------------------
	var fLabelElements = (function(){
		var id = 0;
		return function(ve){
			ve.each(function(e){
				e.id=id;
				id++;
				if ("children" in e){
					fLabelElements(e["children"]);
				}
			});
		};
	})();

	var fUnlabelElements = function(ve){
		ve.each(function(e){
			delete e.id;
			if ("children" in e){
				fUnlabelElements(e["children"]);
			}
		});
	};

	var fSortElements = function(ve){
		ve.sort(function(e1, e2){
			return e1.id - e2.id;
		});
		ve.each(function(e){
			if ("children" in e){
				fSortElements(e["children"]);
			}
		});
	};

	var ns = {};

	// ---------------------------------------------------------------------------
	ns.fEnsureLineage = function(
		ve, vsChildren, vsParent, veParent, s
	){
		var veCandidate = veParent;


		s = s || "window";
		for (var n=0, c=ve.length; n<c; n++){
			if (veCandidate !== ve){
				if (vsChildren.indexOf(ve[n]["name"])!==-1){
					if (!veCandidate){
						veCandidate = [];
						ve.splice(n,0,{
							"type"     : "tag",
							"name"     : vsParent[0],
							"children" : veCandidate
						});
						n++;
						c++;
					}

					veCandidate.push(ve[n]);
					ve.splice(n,1);
					n--;
					c--;
				}
				else if (!veParent && vsParent.indexOf(ve[n]["name"])!==-1){
					if (!("children" in ve[n])){
						ve[n]["children"] = [];
					}
					veCandidate = ve[n]["children"];
				}
				else if (!veParent){
					veCandidate = undefined;
				}
			}

			if (n>=0 && ("children" in ve[n])){
				var sNew = s + ":" + ve[n]["name"];

				if (vsParent.indexOf(ve[n]["name"])!==-1){
					ns.fEnsureLineage(ve[n]["children"], vsChildren, vsParent, ve[n]["children"], sNew);
				}
				else{
					ns.fEnsureLineage(ve[n]["children"], vsChildren, vsParent, veCandidate, sNew);
				}
			}
		}
	};


	// ---------------------------------------------------------------------------
	ns.fEnsureTableLineage = function(ve){
		
		fLabelElements(ve);
		
		ns.fEnsureLineage(ve, ["td","th"], ["tr"]);
		ns.fEnsureLineage(ve, ["tr","tbody","thead"], ["table","tbody","thead"]);
		ns.fEnsureLineage(ve, ["tbody","thead"], ["table"]);
		
		fSortElements(ve);
		//	fUnlabelElements(ve);
	};


	// ---------------------------------------------------------------------------
	ns.fEnsureCase = function(ve){
		ve.each(function(e){
			if (nsTypes.fbIsString(e["name"])){
				e["name"] = e["name"].toLowerCase();
			}
			if ("children" in e){
				ns.fEnsureCase(e["children"]);
			}
		});
	};



	// ---------------------------------------------------------------------------
	var StringSet = require("StringSet");

	ns.fveSanatize = function(ve, aOptions){
		if (!ve){
			return;
		}

		if(!nsTypes.fbIsArray(aOptions.setTags)){
			aOptions.setTags=new StringSet(aOptions.setTags);
		}

		if(!nsTypes.fbIsArray(aOptions.setAttrs)){
			aOptions.setAttrs=new StringSet(aOptions.setAttrs);
		}

		if(!nsTypes.fbIsArray(aOptions.setTypes)){
			aOptions.setTypes=new StringSet(aOptions.setTypes);
		}

		return ve.accumulate(function(e){
			if (aOptions.bTypesAllow !== aOptions.setTypes.fbHas(e["type"])){
				return [];
			}

			if (e["type"] === "tag"){
				if (aOptions.bTagsAllow !== aOptions.setTags.fbHas(e["name"])){
					return [];
				}
			}

			if (e["attribs"]){
				var aAttribs = {};
				e["attribs"].each(function(sVal, sAttr){
					if (aOptions.bAttrsAllow === aOptions.setAttrs.fbHas(sAttr)){
						aAttribs[sAttr] = sVal;
					}
				});
				e["attribs"]=aAttribs;
			}

			if (e["children"]){
				e["children"] = fveSanatizeXml(e["children"], aOptions);
			}
			return [e];

		});
	};



	return ns;
})();






	