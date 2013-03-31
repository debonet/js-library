require("functional");
require("logging");
var MongoDB     = require('mongodb');
var ffRunOnce   = require("ffRunOnce");
var nsTypes     = require("nsTypes");

module.exports = (
	function(){

		// -----------------------------------------------------------------------
		// Mongo.constructor
		//  set up a new Mongo object
		//
		// Params
		//  xOptions := either the name of the database or a options object.
		//              If an options object:
		//
		//   => database := name of database (required)
		//
		//      host     := name of host (default: MONGO_NODE_DRIVER_HOST env, 
		//                  then 'localhost')
		//
		//      port     := port (default: MONGO_NODE_DRIVER_PORT env, then 
		//                  the mongodb DEFAULT_PORT field)
		//
    //      username := if provided, authentication with username and password
		//                  will be attempted
		//
    //      password := if provided, authentication with username and password
		//                  will be attempted
		//
		var Mongo = ffRunOnce(
			function(xOptions){
        var aOptions;
        var sDB;
				if (nsTypes.fbIsObject(xOptions)) {
					aOptions = xOptions;
					sDB = aOptions.database;
				}
        else { 
          sDB = xOptions;
          aOptions = {};
        }

				this.aOptions = {
					database : sDB,
					host     : process.env['MONGO_NODE_DRIVER_HOST'] || 'localhost',
					port     : process.env['MONGO_NODE_DRIVER_PORT'] || MongoDB.Connection.DEFAULT_PORT
				}.mergeIn(aOptions);
			},
			true
		);

		

		// -----------------------------------------------------------------------
		// ffCleanMongoCallback
		// 
		//   This is a workaround for a bug in the mongodb driver. It fixes mongo
		//   callbacks by converting returned non-errors with a error value of 
		//   undefined to have the correct error value of null
		//
		// Params
		//   fCallback := `function(err,...)` intended callback 
		//
		// Returns
		//   a `function(err,...) which calls the given callback with its 
		//   identical arguments, unless err is undefined, in which case it
		//   sets err to null and then calls the callback.
		//
		// Scope => private
		var ffCleanMongoCallback = function(fCallback){
			return function(/*...*/){
				var vxArg = Array.prototype.slice.call(arguments,0);
				var err = vxArg.shift();
				if (err){return fCallback(err);}
				vxArg.unshift(null);
				fCallback.apply(null,vxArg);
			};
		};

		// -----------------------------------------------------------------------
		// Mongo.fConnect
		//
		//   Get an underliying connection the database.
		//   Not usually needed as all Mongo.* functions use this function to
		//   internally establish a connection to the database if it has not 
		//   already been established
		//
		// Params
		//   fCallback   := `function(err,mc)` called with collection
		//
		Mongo.prototype.fConnect = ffRunOnce(function(fCallback){
			fCallback = ffCleanMongoCallback(fCallback);

			this.mserver=new MongoDB.Server(this.aOptions.host, this.aOptions.port,this.aOptions);
			this.mdb = new MongoDB.Db(this.aOptions.database,this.mserver,{});

			var mongo = this;
			this.mdb.open(function(err){
				if (err){return fCallback(err); }

				// once connected check if authentication was specified, and if so use it
				if (mongo.aOptions.username && mongo.aOptions.password){
					return mongo.mdb.authenticate(
						mongo.aOptions.username, mongo.aOptions.password, fCallback
					);
				}
				else{
					return fCallback(null);
				}

			});
		});


		// -----------------------------------------------------------------------
		// Mongo.fmcGetCollection
		//
		//   Get an underliying connection to a collection in the database.  Not
		//   usually needed as all Mongo.* functions take collection as an
		//   argument and use this function to internally establish a connection
		//   to the collection if one does not already exist.
		//
		// Params
		//   sCollection := name of collection to connect to 
		// 
		//   fCallback   := `function(err,mc)` called with collection
		//
		Mongo.prototype.fmcGetCollection = ffRunOnce(function(sCollection,fCallback){
			fCallback = ffCleanMongoCallback(fCallback);

			var mongo=this;

			sCollection = sCollection
				.replace(/_/g,'_u')
				.replace(/\//g,'_f')
				.replace(/\\/g,'_b')
				.replace(/\./g,'_p')
				.replace(/\$/g,'_s');

			this.fConnect(function(err){
				if (err){return fCallback(err);}
				mongo.mdb.collection(
					sCollection,
					function(err,mc){
						if (err){ return fCallback(err);}
						fCallback(null,mc);
					}
				);
			});
		});


		// -----------------------------------------------------------------------
		// fDoOnDatabase
		//   Private function used to construct database-based function calls.
		//   Calls the function on the database and calls back with the result.
		//
		// Params
		//   mongo := the Mongo object on which the function should be called
		//
		//   sf    := name of the function to call
		//
		//     [0] to [n-2]  := vxArg - arguments to `sf`
		// 
		//     [n-1]         : = `function(err,response...)` called with result of 
		//                        call to `sf`
		//
		// Scope => private
		var fDoOnDatabase = function(mongo,sf,vxArg){
			var fCallback = ffCleanMongoCallback(vxArg.pop());
			vxArg.push(fCallback);

			mongo.fConnect(function(err){
				if (err){return fCallback(err);}
				mongo.mdb[sf].apply(mongo.mdb,vxArg);
			});
		};

		// -----------------------------------------------------------------------
		// asfsfDatabaseBased 
		//   array of database-level functions to be mapped to the Mongo class
		// Scope => private
		var asfsfDatabaseBased = {
			fDropDatabase       : "dropDatabase",
			fGetCollectionNames : "collectionNames"

			// Not implemented in mongodb, we write our own below
			//			fGetName            : "getName"
		};

		// create implementation for each of the above
		asfsfDatabaseBased.each(function(sfMongoDB, sfMongo){
			Mongo.prototype[sfMongo] = function(){
				var vxArg = Array.prototype.slice.call(arguments);
				fDoOnDatabase(this,sfMongoDB,vxArg);
			};
		});


		// -----------------------------------------------------------------------
		// fDoOnCollection
		//   Private function used to construct database-based function calls.
		//   Calls the function on the database and calls back with the result.
		//
		// Params
		//   mongo := the Mongo object on which the function should be called
		//
		//   sf    := name of the function to call
		//
		//   vxArg : = arguments to pass to `sf`
		//     
		//     [0]           := sCollection - collection on which function is to be applied
		//
		//     [1] to [n-2]  := vxArg - arguments to `sf`
		// 
		//     [n-1]         : = `function(err,response...)` called with result of 
		//                        call to `sf`
		//
		// Scope => private
		var fDoOnCollection = function(mongo,sf,/*sCollection,*/vxArg){
			var sCollection = vxArg.shift();
			var fCallback = ffCleanMongoCallback(vxArg.pop());
			vxArg.push(fCallback);

			mongo.fmcGetCollection(
				sCollection,
				function(err,mc){
					if (err){return fCallback(err);}
					mc[sf].apply(mc,vxArg);
				}
			);
		};

		// -----------------------------------------------------------------------
		// asfsfDatabaseBased 
		//   array of collection-level functions to be mapped to the Mongo class
		// Scope => private
		var asfsfCollectionBased = {
			fFindAndModify : "findAndModify",
			fUpdate        : "update",
			fInsert        : "insert",
			fRemove        : "remove",
			fDrop          : "drop",
			fFindStream    : "find",
			fEnsureIndex   : "ensureIndex"
		};

		// create implementation for each of the above
		asfsfCollectionBased.each(
			function(sfMongoDB, sfMongo){
				Mongo.prototype[sfMongo] = function(){
					var vxArg = Array.prototype.slice.call(arguments);
					fDoOnCollection(this,sfMongoDB,vxArg);
				};
			}
		);

		
		// -----------------------------------------------------------------------
		// fGetName
		//   calls back with the name of the database
		// 
		//   NOTE: ideally this would use the mongodb function, but none exists
		//
		// Params
		//   fCallback := `function(err, sName)` called with name of db
		//
		Mongo.prototype.fGetName = ffRunOnce(function(fCallback){
			fCallback = ffCleanMongoCallback(fCallback);
			var mongo = this;
			this.fConnect(function(err){
				if(err){return fCallback(err);}
				fCallback(null, mongo.mdb.databaseName);
			});
		});


		// -----------------------------------------------------------------------
		// fFind
		//   convenience function which eliminates the cursor nature of the 
		//   mongodb database. The cursor based implementation is still accessible
		//   through `Mongo.fFindStream`
		//  
		// Params
		//   sCollection := collection on which to operate
		//
		//   ...         := see Mongo for other parameters to find
		//
		//   fCallback   := `function(err, va)` called back with array of found 
		//                 documents
		//
		Mongo.prototype.fFind = function(/*..., fCallback*/){
			var vxArg = Array.prototype.slice.call(arguments);
			var fCallback = ffCleanMongoCallback(vxArg.pop());
			
			vxArg.push(function(err,mcursor){
				if (err){return fCallback(err);}
				mcursor.toArray(fCallback);
			});

			this.fFindStream.apply(this,vxArg);
		};



		// renamings
		Mongo.fidUnique = MongoDB.ObjectID;

		return Mongo;
	}
)();

