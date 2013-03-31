require('mocha');
var should = require('should');
var AtomStore = require('../AtomStore');
var ffStoreTester = require('./ffStoreTester');
var nsDate = require("nsDate");

var nsCryptoUtil = require("nsCryptoUtil");


// assumes vvTest = [ [method, args, err?, response-val],* ]
var fTestAtomStore = ffStoreTester(
	AtomStore, 
	{
		"sCredMaster" : "master",
		"database"    : "test", 
		"collection"  : "js"
	}
);

var fTestEncryptedAtomStore = ffStoreTester(
	AtomStore, 
	{
		"sCredMaster" : "master",
		"database"    : "test", 
		"collection"  : "js",
		fxPreprocess  : nsCryptoUtil.ffbuffEncryptWithPadding("foo"),
		fxPostprocess : nsCryptoUtil.ffbuffDecryptWithPadding("foo")
	}
);


var aPermAll = {"read":true,"write":true,"getaccess":true,"setaccess":true};
var aPermRW  = {"read":true,"write":true};
var aPermR  = {"read":true};
var aPermW  = {"write":true};
var aPermRWG = {"read":true,"write":true,"getaccess":true};

describe("AtomStore, simple", function() {
	it("master can write permissions", function(fDone) {
		fTestAtomStore(
			[
				// method     args                                    response      should work?
				["fWipe",    [ ]                                                        ],

				["fWrite",   ["master", "a",5 ]                              ],
				["fRead",    ["master", "a" ], 5                             ]
			],
			fDone
		);
	});

	it("others can't read or write by default", function(fDone) {
		fTestAtomStore(
			[
				// method     args                                    response      should work?
				["fWipe",    [ ]                                                        ],

				["fWrite",   ["notmaster", "a",5 ], null, false                              ],
				["fRead",    ["notmaster", "a" ], null, false                             ]
			],
			fDone
		);
	});
});


describe("AtomStore granting", function() {
	it("master can grant write permissions", function(fDone) {
		fTestAtomStore(
			[
				// method     args                                    response      should work?
				["fWipe",    [ ]                                                          ],

				["fWrite",   ["master", "a",5 ]                                           ],
				["fSetAccess",   ["master", "notmaster", "a", aPermW ]                    ],
				["fWrite",   ["notmaster", "a",6 ]                                        ],
				["fRead",    ["notmaster", "a" ], null, false                             ],
				["fRead",    ["master", "a" ], 6                                          ]
			],
			fDone
		);
	});


	it("master can grant read permissions", function(fDone) {
		fTestAtomStore(
			[
				// method     args                                    response      should work?
				["fWipe",    [ ]                                                          ],

				["fWrite",   ["master", "a",5 ]                                           ],
				["fSetAccess",   ["master", "notmaster", "a", aPermR ]                    ],
				["fRead",    ["notmaster", "a" ], 5                                       ],
				["fWrite",   ["notmaster", "a",7 ],  null, false                          ],
				["fRead",    ["master", "a" ], 5                                          ]

			],
			fDone
		);
	});

	it("master can grant RW permissions", function(fDone) {
		fTestAtomStore(
			[
				// method     args                                    response      should work?
				["fWipe",    [ ]                                                          ],

				["fWrite",   ["master", "a",5 ]                                           ],
				["fSetAccess",   ["master", "notmaster", "a", aPermRW ]                   ],
				["fWrite",   ["notmaster", "a",7 ]                                        ],
				["fRead",    ["master", "a" ], 7                                          ],
				["fRead",    ["notmaster", "a" ], 7                                       ]
			],
			fDone
		);
	});
});


describe("AtomStore readkeys", function() {
	it("works", function(fDone) {
		fTestAtomStore(
			[
				// method     args                                    response      should work?
				["fWipe",    [ ]                                                          ],

				["fWrite",   ["master", "a",5 ]                                           ],
				["fReadKeys",    ["master", "a" ], []                                     ],

				["fWrite",   ["master", "a",{c:5,b:6} ]                                          ],
				["fReadKeys",    ["master", "a" ], ["b","c"],             function(v){return v.sort();}],

				["fWrite",   ["master", "a",5 ]                                           ],
				["fReadKeys",    ["master", "a" ], []                                     ],

				["fReadKeys",    ["notmaster", "a" ], null, false                                    ]

			],
			fDone
		);
	});

});


