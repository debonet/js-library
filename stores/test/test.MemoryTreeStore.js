require('mocha');
var should = require('should');
var MemoryTreeStore = require('MemoryTreeStore.js');
var ffStoreTester = require('./ffStoreTester');
var nsDate = require("nsDate");


// assumes vvTest = [ [method, args, err?, response-val],* ]
var fTestMatchStore = ffStoreTester(MemoryTreeStore);

describe("MemoryTreeStore, simple", function() {
	it("writes data", function(fDone) {
		fTestMatchStore(
			[
				// method     args                                    response-expected
				["fWrite",   [[ "a","b"     ], {c: 1, d:2} ]                            ]
			],
			fDone
		);
	});

	it("reads data that matches", function(fDone) {
		fTestMatchStore(
			[
				// method     args                                    response      should work?
				["fWrite",   [[ "a","b"     ], {c: 1, d:2} ]                            ],
				["fRead",    [[ "a","b","c" ]],                       1                 ],
				["fRead",    [[ "a", "b" ]],                 {c:1,d:2}                             ],
				["fRead",    [[ "a" ]],                      null, false              ]
			],
			fDone
		);
	});

	it("supports expiry", function(fDone) {
		fTestMatchStore(
			[
				// method     args                                    response      should work?
				["fWrite",   [
					[ "a","b"], {'*state':4, '*expiration':nsDate.ftmNow()-nsDate.dtmDay, c: 1, d:2} ]   
				],
				["fRead",    [[ "a","b","c" ]], {}, false],

				["fWrite",   [
					[ "a","b"], {'*state':4, '*expiration':nsDate.ftmNow()+nsDate.dtmDay, c: 1, d:2} ]   
				],
				["fRead",    [[ "a","b","c" ]],            1                                    ],
				["fRead",    [[ "a", "b" ]],              {c:1,d:2}                             ],

				["fRead",    [[ "a" ]],                   null, false]
			],
			fDone
		);
	});

});


