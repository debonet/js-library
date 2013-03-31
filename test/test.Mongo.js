require("should");
require('mocha');
require('should');
var Mongo = require('Mongo.js');

var fDB = require('mongodb').Db;
var fServer = require('mongodb').Server;


// TODO: switch more gracefully between local and remote

describe('Traxx Mongo package Tests', function(){


  var bTestRemote = false;
  var aMongoSpec  = bTestRemote 
		? {
			database:"prices",
			host:"ds031587.mongolab.com",
			port:31587,
			username:"traxxops",
			password:"quux2db"
		}
	: {
		database:"db_test",
		host:"127.0.0.1",
		port:27017,
		username:"",
		password:""
	};

  var mongo = new Mongo(aMongoSpec);
  var sColl = 'acollection';
  var testObj = { ticker: "QCOM", price : 72};

  var ldb = new fDB(aMongoSpec.database, 
                    new fServer(aMongoSpec.host,
                                aMongoSpec.port,{auto_reconnect:true}), {});
  
  // start the database off with known state: a single item. Use
  // underlying driver for this
  before(function(done) {
    ldb.open(function(err,db) {
      if(err) {return done(err); }
      db.authenticate(aMongoSpec.username, aMongoSpec.password,function(err,result) {
        db.collection(sColl,function(err,collection) {
          if(err) {return done(err);}
          // clear out the collection
          collection.remove(
            function(err,result) {
              if(err) { return done(err); }
              // insert the test object
              collection.insert(
								testObj,
                function(err, result) {
                  db.close();
                  done();
                });
            });
        });
      });
    });
  });

  after(function(done) {
    ldb.open(function(err,db) {
      if(err) { return done(err); }
      db.collection(sColl,function(err,collection) {
        if(err) { return done(err); }
        // remove the test object, keep others around
        collection.remove(testObj,
                          function(err, result) {
                            db.close();
                            done();
                          });
      });
    });
  });

  it('should find the one pre-loaded test Object', function(done) {
    mongo.fFind(sColl, {ticker:"QCOM"}, {},
                function(err,va){
                  va.length.should.be.equal(1);
                  va[0].ticker.should.equal('QCOM');
                  done();
                });
  });

      
	it('should insert an object',	function(fCallback){
		mongo.fInsert(
			sColl,
			{ticker:"GDX", value: 42},
			function(err){
				if (err){return fCallback(err);}
				mongo.fFind(
					sColl, 
					{ticker:"GDX"},
					{},
					function(err,va){
						va.length.should.be.equal(1);
						va[0].value.should.equal(42);
						fCallback();
					});
			});
	});

	it('should update an object',	function(fCallback){
		mongo.fUpdate(
			sColl,{ticker:"GDX"},
      { $set: {value: 43}},
			function(err){
				if (err){return fCallback(err);}
				mongo.fFind(
					sColl, 
					{ticker:"GDX"},{},
					function(err,va){
						va.length.should.be.equal(1);
						va[0].value.should.equal(43);
						fCallback();
					});
			});
	});

	it('should remove an object',	function(fCallback){
    // ensure that there was one from the update test before
		mongo.fFind(
			sColl, 
			{ticker:"GDX"},
			{},
			function(err,va){
				va.length.should.be.equal(1);
				mongo.fRemove(
					sColl,
					{ticker:"GDX"},
					function(err) {
						if (err){return fCallback(err);}
						mongo.fFind(
							sColl, 
							{ticker:"GDX"},
							{},
							function(err,va){
								va.length.should.be.equal(0);
								fCallback();
							});
					});
			});
	});


});




