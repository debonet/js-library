var Mongo       = require("Mongo");
var MongoStore  = require("MongoStore");
var nsClasses   = require("nsClasses");
var nsDate      = require("nsDate");
require("logging");


// ---------------------------------------------------------------------------
// AccessControlStore
//   Access Control Store
//   See [/doc/storgeapi.js] for an explanation
// 
// Params
//   aConfig := options
//     fxPreprocess := function applied prior to storing data
//     fxPostprocess := function applied to stored data prior to retrieval
//     options foro Mogo := See also [Mongo.js]
//
// ---------------------------------------------------------------------------
var AccessControlStore = function(aConfig){
	aConfig = {
		"collection"      : "accesscontrol",
		sCredMaster       : "master",
		aPermissionMaster : {"read":true,"write":true,"getaccess":true,"setaccess":true},
		bArmor            : true,
		fxPreprocess      : function(x){return x;},
		fxPostprocess     : function(x){return x;}
	}.mergeIn(aConfig);

	this.aConfig = aConfig;

	this.fSuper("constructor",aConfig);
};

nsClasses.fInherit(AccessControlStore, MongoStore);


// ---------------------------------------------------------------------------
// AccessControlStore.fRead
//   retrieves the latest value from a journal store. 
// 
// Params
//   sCredAuth := the credentials authorizing the retrieval of this access
//   sCred := the credentials we want to check
//   s := the path to retrieve
//
// Returns
//   an array or [] if the input isn't a string or array
//
// See Also
//   [AccessControlStore.fReadJournal]
//
AccessControlStore.prototype.fRead = function(sCredAuth,sCred,s,fCallback){

	if (sCred === this.aConfig.sCredMaster){
		return fCallback(null,this.aConfig.aPermissionMaster);
	}

	var fxPostprocess = this.aConfig.fxPostprocess;
	var bArmor        = this.aConfig.bArmor;
	var mongo         = this.mongo;
	var sCollection   = this.sCollection;

	this.fRead(this.aConfig.sCredMaster,sCredAuth,s,function(err, aPermission){
		if (err){return fCallback(err);}
		if (!aPermission["getaccess"]){
			return fCallback("not authorized to retrieve permissions");
		}

		var vs = s.split('.');
		var vsKeys = [sCred];

		for (var sKeyBuild = sCred, n=0, c=vs.length; n<c; n++){
			sKeyBuild = sKeyBuild + '.' + vs[n];
			vsKeys.push(sKeyBuild);
		}

		mongo.fFind(
			sCollection,
			{"key" : {"$in": vsKeys}, "value" : {"$ne" : null}},
			{"key" : 1, "value" : 1, "_id" : 0},
			function(err,va){
				if (err){ return fCallback(err); }

				var asPermission = {};
				va.each(function(a){
					asPermission[a["key"]]=a["value"];
				});

				var sKeyPermission = "";
				var sPermission = null;
				for (var sKeyBuild = sCred, n=0, c=vs.length; n<c; n++){
					sKeyBuild = sKeyBuild + '.' + vs[n];
					if (asPermission[sKeyBuild]){
						sKeyPermission = sKeyBuild;
						sPermission = asPermission[sKeyBuild];
					}
				}

				if (!sPermission){
					return fCallback(null,{});
				}

				sPermission = fxPostprocess(sPermission);

				if (bArmor){
					if (!sPermission || sPermission.substring(0,sKeyPermission.length) !== sKeyPermission){
						return fCallback("Illegal permission:"+sPermission);
					}
					sPermission = sPermission.substring(sKeyPermission.length+1);
				}

				var aPermission;
				try{
					aPermission = JSON.parse(sPermission);
				}
				catch (e){
					return fCallback("Invalid permission");
				}

				return fCallback(null,aPermission);
			}
		);
	});

};


// ---------------------------------------------------------------------------
// AccessControlStore.fReadJournal
//   retrieves the latest value from a journal store
// 
// Params
//   sCredAuth := the credentials authorizing the retrieval of this access
//   sCred := the credentials we want to check
//   s := the path to retrieve
//
// Returns
//   an array or [] if the input isn't a string or array
//
// See Also
//   [AccessControlStore.fReadJournal]
//
AccessControlStore.prototype.fReadJournal = function(sCredAuth, sCred,s,fCallback){
	var sCollection = this.sCollection;
	var fxPostprocess = this.aConfig.fxPostprocess;
	var mongo = this.mongo;
	var bArmor = this.aConfig.bArmor;

	this.fRead(this.aConfig.sCredMaster,sCredAuth,s,function(err, aPermission){
		if (err){return fCallback(err);}
		if (!aPermission["getaccess"]){
			return fCallback("not authorized to see permission changes");
		}

		var vs = s.split('.');
		var vsKeys = [sCred];
		
		for (var sKeyBuild = sCred, n=0, c=vs.length; n<c; n++){
			sKeyBuild = sKeyBuild + '.' + vs[n];
			vsKeys.push(sKeyBuild);
		}
		
		mongo.fFind(
			sCollection,
			{"key" : {"$in": vsKeys}},
			{"key" : 1, "journal" : 1, "_id" : 0},
			function(err,va){
				if (err){ return fCallback(err); }
				
				var vaJournal = [];


				va.each(function(aEntry){
					var vsKey = aEntry["key"].split('.');
					var cSpecificity = vsKey.length;

					aEntry["journal"].each(function(aJournal){
						vaJournal.push({
							sKey :  aEntry["key"],
							cSpecificity : cSpecificity,
							xVal : aJournal["value"],
							tm: aJournal["timestamp"]
						});
					});
				});

				vaJournal.sort(function(aJournal1,aJournal2){
					return aJournal1["timestamp"]-aJournal2["timestamp"];
				});

				var vaJournalRelevant = [];
				var cMaxSpecificity = 0;

				vaJournal.each(function(aJournal){
					if (aJournal.cSpecificity >= cMaxSpecificity){
						var xVal = fxPostprocess(aJournal.xVal);
						if (bArmor){
							// TODO: what if the value is not valid/armored??
							xVal = xVal.replace(aJournal.sKey + ":","");
						}

						try{
							xVal = JSON.parse(xVal);
						}
						catch (e){
							return fCallback("illegal permission in journal");
						}

						vaJournalRelevant.push({
							"value" : xVal,
							"timestamp" : aJournal.tm
						});
						cMaxSpecificity = aJournal.cSpecificity;
					}
				});

				return fCallback(null,vaJournalRelevant);
			}
		);
	});
};




// ---------------------------------------------------------------------------
// AccessControlStore.fWrite
//   sets the access control for a given credential on a given item
// 
// Params
//   sCredAuth := the credentials being used to make this change
//   sCred := the credentials to set
//   s := the path to set
//   x := the credential value to store
//
// Returns
//   an array or [] if the input isn't a string or array
//
// See Also
//   [AccessControlStore.fReadJournal]
//
AccessControlStore.prototype.fWrite = function(sCredAuth,sCred,s,x,fCallback){
	var mongo = this.mongo;
	var fxPreprocess = this.aConfig.fxPreprocess;
	var sCollection = this.sCollection;
	var bArmor = this.aConfig.bArmor;

	this.fRead(this.aConfig.sCredMaster,sCredAuth,s,function(err, aPermission){
		if (err){return fCallback(err);}
		if (!aPermission["setaccess"]){
			return fCallback("not authorized to change permissions");
		}

		var tm = nsDate.ftmNow();

		var sKey = sCred + '.' + s;

		// modify the value so that it includes the key for which it is being stored. 
		// that way the encrypted value cant be simply copied
		var sPermission = JSON.stringify(x);
		if (bArmor){
			sPermission = sKey + ":" + sPermission;
		}

		mongo.fUpdate(
			sCollection,
			{"key" : sKey},
			{
				"$set" : {"key" : sKey},
				"$pull" : {"journal" : {"timestamp" : tm, "value" : sPermission}}
			},
			{"safe":true, "upsert" : true},
			function(err){
				if (err){ return fCallback(err); }
				sPermission = fxPreprocess(sPermission);
				mongo.fUpdate(
					sCollection,
					{"key" : sKey, "value" : {"$ne" : sPermission}},
					{
						"$set" : {"value" : sPermission}, 
						"$push" : {"journal" : {"value" : sPermission, "timestamp" : tm}}
						//							"$push" : {"journal" : x}
					},
					{"safe":true},
					function(err){return fCallback(err);} // don't return a value
				);
			}
		);
	});
};




// ---------------------------------------------------------------------------
// AccessControlStore.fDelete
//  you cannot delete from a journal store. Instead store null
//
AccessControlStore.prototype.fDelete = function(vs,fCallback){
	E("Store","fDelete","you cannot delete from an access store. Instead store null or ''");
	fCallback("not implemented");
};

// ---------------------------------------------------------------------------
// AccessControlStore.fWipe
//  DANGER!! DANGER!! DANGER!! DANGER!! DANGER!! DANGER!! DANGER!! DANGER!! 
//  this permanently wipes the entire store 
//  DANGER!! DANGER!! DANGER!! DANGER!! DANGER!! DANGER!! DANGER!! DANGER!! 
//
AccessControlStore.prototype.fWipe = function(fCallback){
	this.mongo.fRemove(this.sCollection, {}, fCallback);
};


// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
module.exports = AccessControlStore;

