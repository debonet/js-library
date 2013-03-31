require('mocha');
require('should');
var Mongo = require('../Mongo.js');

describe('Mongo Authorization Tests', function(){

		var mongo = new Mongo({
			database:"testing", 
			host:"ds033797.mongolab.com",
			port:33797,
			username:"test", 
			password:"test"
		});

    var theKey = "is it";
    var theColl = 'acollection';

	it('should insert without error',	function(fCallback){
		mongo.fInsert(
			theColl,
			{that:theKey, createdAt: new Date()},
			function(err){
				if (err){return fCallback(err);}

				mongo.fFind(
					theColl,
					{that:theKey},
					{ _id:0 },
					function(err,va){

						va.length.should.be.above(0); // for now, support aborted tests that inserted other
						va[0].that.should.equal(theKey);

						mongo.fRemove(
							theColl,
							{that:theKey},
							fCallback
						);
					});
			});
	});

});


