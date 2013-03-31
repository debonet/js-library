require('mocha');
var should = require('should');
var MemoryMatchStore = require('MemoryMatchStore.js');
var ffStoreTester = require('./ffStoreTester');


// assumes vvTest = [ [method, args, err?, response-val],* ]
var fTestMatchStore = ffStoreTester(MemoryMatchStore);

describe("MemoryMatchStore, simple", function() {
	it("writes data", function(fDone) {
		fTestMatchStore(
			[
				// method     args                                    response-expected
				["fWrite",   [[ "apple"     ], "APPLE"     ] ],
				["fWrite",   [[ "applause"  ], "APPLAUSE"  ] ],
				["fWrite",   [[ "appeal"    ], "APPEAL"    ] ],
				["fWrite",   [[ "slaphappy" ], "SLAPHAPPY" ] ]
			],
			fDone
		);
	});

	it("reads data that matches", function(fDone) {
		fTestMatchStore(
			[
				// method     args                                    response-expected
				["fWrite",   [[ "apple bob"     ], "APPLE"     ] ],
				["fWrite",   [[ "applause bob"  ], "APPLAUSE"  ] ],
				["fWrite",   [[ "appeal joe"    ], "APPEAL"    ] ],
				["fWrite",   [[ "slaphappy joe" ], "SLAPHAPPY" ] ],

/*
				["fRead",    [[ "p" ]],                               ["APPLE", "APPLAUSE", "APPEAL", "SLAPHAPPY"] ],
				["fRead",    [[ "p" ]],                               ["APPLE", "APPLAUSE", "APPEAL", "SLAPHAPPY"] ],
				["fRead",    [[ "pp" ]],                              ["APPLE", "APPLAUSE", "APPEAL", "SLAPHAPPY"] ],
				["fRead",    [[ "pp" ]],                              ["APPLE", "APPLAUSE", "APPEAL", "SLAPHAPPY"] ],
				["fRead",    [[ "ppl" ]],                             ["APPLE", "APPLAUSE"] ],
				["fRead",    [[ "ppl" ]],                             ["APPLE", "APPLAUSE"] ],
				["fRead",    [[ "p" ]],                               ["APPLE", "APPLAUSE", "APPEAL", "SLAPHAPPY"] ],
				["fRead",    [[ "pp" ]],                              ["APPLE", "APPLAUSE", "APPEAL", "SLAPHAPPY"] ],
				["fRead",    [[ "ppla" ]],                            ["APPLAUSE"] ],
				["fRead",    [[ "pple" ]],                            ["APPLE"] ]
*/
				["fRead",    [[ "app" ]],                               ["APPLE", "APPLAUSE", "APPEAL"] ],
				["fRead",    [[ "b" ]],                                 ["APPLE", "APPLAUSE"] ]

			],
			fDone
		);
	});


	it("doesn't reads data that doesn't match", function(fDone) {
		fTestMatchStore(
			[
				// method     args                                    response-expected
				["fWrite",   [[ "apple"     ], "APPLE"     ] ],
				["fWrite",   [[ "applause"  ], "APPLAUSE"  ] ],
				["fWrite",   [[ "appeal"    ], "APPEAL"    ] ],
				["fWrite",   [[ "slaphappy" ], "SLAPHAPPY" ] ],
				["fRead",    [[ "appleX" ]],                      [] ],
				["fRead",    [[ "Xapp" ]],                        [] ]
			],
			fDone
		);
	});

	it("can do non-progressive searches", function(fDone) {
		fTestMatchStore(
			[
				// method     args                              response-expected
				["fWrite",   [[ "apple"     ], "APPLE"     ] ],
				["fWrite",   [[ "applause"  ], "APPLAUSE"  ] ],
				["fWrite",   [[ "appeal"    ], "APPEAL"    ] ],
				["fWrite",   [[ "slaphappy" ], "SLAPHAPPY" ] ],
				["fRead",    [[ "app" ]],                      ["APPLE","APPLAUSE","APPEAL"] ],
				["fRead",    [[ "sla" ]],                     ["SLAPHAPPY"] ]
			],
			fDone
		);
	});


	it("deletes properly", function(fDone) {
		fTestMatchStore(
			[
				// method     args                                    response-expected
				["fWrite",   [[ "apple"     ], "APPLE"     ] ],
				["fWrite",   [[ "applause"  ], "APPLAUSE"  ] ],
				["fWrite",   [[ "appeal"    ], "APPEAL"    ] ],
				["fWrite",   [[ "slaphappy" ], "SLAPHAPPY" ] ],
				["fRead",    [[ "app" ]],                            ["APPLE","APPLAUSE","APPEAL"] ],
				["fDelete",  [[ "appl" ]] ],
				["fRead",    [[ "app" ]],                            ["APPEAL"] ],
				["fRead",    [[ "sl" ]],                             ["SLAPHAPPY"] ]
			],
			fDone
		);
	});
});


describe("MemoryMatchStore, field modification", function() {
	it("writes partial data properly", function(fDone) {
		fTestMatchStore(
			[
				// method     args                                    response-expected
				["fWrite",   [[ "apple"     ], {a: 1,   b:2} ] ],
				["fRead",    [[ "apple" ] ],                       [{a: 1, b:2}] ],
				["fWrite",   [[ "apple","b" ], {a: 99, b:99} ] ],
				["fRead",    [[ "apple" ] ],                       [{a: 1, b:99}] ],
				["fRead",    [[ "apple","a" ] ],                   [{a: 1}] ],
				["fRead",    [[ "apple","b" ] ],                   [{b: 99}] ]
			],
			fDone
		);
	});


	it("writes partial data properly across mutiples", function(fDone) {
		fTestMatchStore(
			[
				// method     args                                    response-expected
				["fWrite",   [[ "apple"     ], {a: 1,   b:2} ] ],
				["fWrite",   [[ "apple2"    ], {a: 3,   b:4} ] ],
				["fRead",    [[ "apple" ] ],                       [{a: 1, b:2}, {a:3, b:4}] ],
				["fWrite",   [[ "apple","b" ], {a: 99, b:99} ] ],
				["fRead",    [[ "apple" ] ],                       [{a: 1, b:99},{a: 3, b:99}] ],
				["fRead",    [[ "apple","a" ] ],                   [{a: 1},{a:3}] ],
				["fRead",    [[ "apple","b" ] ],                   [{b: 99},{b:99}] ]
			],
			fDone
		);
	});
});


