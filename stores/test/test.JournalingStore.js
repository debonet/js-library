require('mocha');
var should = require('should');
var JournalingStore = require('../JournalingStore');
var ffStoreTester = require('./ffStoreTester');
var nsDate = require("nsDate");

var nsCryptoUtil = require("nsCryptoUtil");


// assumes vvTest = [ [method, args, err?, response-val],* ]
var fTestJournalingStore = ffStoreTester(JournalingStore, {"database":"test", "collection":"js"});

var fTestEncryptedJournalingStore = ffStoreTester(
	JournalingStore, 
	{
		"database"    : "test", 
		"collection"  : "js",
		fxPreprocess  : nsCryptoUtil.ffbuffEncryptWithPadding("foo"),
		fxPostprocess  : nsCryptoUtil.ffbuffDecryptWithPadding("foo")
	}
);


describe("JournalingStore, simple", function() {
	it("writes data to singleton keys", function(fDone) {
		fTestJournalingStore(
			[
				// method     args                                    response      should work?
				["fWipe",    [ ]                                                        ],

				["fWrite",   ["a", {b:1} ]                                              ]
			],
			fDone
		);
	});


	it("writes data to singleton keys", function(fDone) {
		fTestJournalingStore(
			[
				// method     args                                    response      should work?
				["fWipe",    [ ]                                                        ],

				["fWrite",   ["a", 1 ]                                                  ],
				["fRead",    ["a" ],                                      1             ],

				["fWrite",   ["b", 2 ]                                                  ],
				["fRead",    ["b" ],                                      2             ]
			],
			fDone
		);
	});

	it("writes and retrieves data to deeper keys", function(fDone) {
		fTestJournalingStore(
			[
				// method     args                                    response      should work?
				["fWipe",    [ ]                                                          ],

				["fWrite",   ["x.a", 1 ]                                                  ],
				["fRead",    ["x.a" ],                                      1             ],

				["fWrite",   ["x.b", 2 ]                                                  ],
				["fRead",    ["x.b" ],                                      2             ],

				["fRead",    ["x" ],                                    {a:1, b:2}        ]
			],
			fDone
		);
	});


	it("updates values when rewritten", function(fDone) {
		fTestJournalingStore(
			[
				// method     args                                    response      should work?
				["fWipe",    [ ]                                                          ],

				["fWrite",   ["x.a", 1 ]                                                  ],
				["fRead",    ["x.a" ],                                      1             ],

				["fWrite",   ["x.a", 2 ]                                                  ],
				["fRead",    ["x.a" ],                                      2             ],

				["fRead",    ["x" ],                                    {a:2}             ]
			],
			fDone
		);
	});


	it("clobbers values when pruned", function(fDone) {
		fTestJournalingStore(
			[
				// method     args                                    response      should work?
				["fWipe",    [ ]                                                          ],

				["fWrite",   ["x.a", 1 ]                                                  ],
				["fRead",    ["x.a" ],                                      1             ],

				["fWrite",   ["x", 2 ]                                                    ],
				["fRead",    ["x" ],                                        2             ],

				["fRead",    ["x.a" ],                                    undefined       ],
				["fRead",    ["x.b" ],                                    undefined       ]
			],
			fDone
		);
	});

	it("clobbered values stay clobbered", function(fDone) {
		fTestJournalingStore(
			[
				// method     args                                    response      should work?
				["fWipe",    [ ]                                                          ],

				["fWrite",   ["x.a", 1 ]                                                  ],
				["fWrite",   ["x", 2 ]                                                    ],
				["fRead",    ["x.a" ],                                    undefined       ],
				["fWrite",   ["x.b", 3 ]                                                  ],

				["fRead",    ["x.a" ],                                    undefined       ],
				["fRead",    ["x.b" ],                                      3             ],
				["fRead",    ["x" ],                                      {b:3}           ]
			],
			fDone
		);
	});


	it("structures are decomposed", function(fDone) {
		fTestJournalingStore(
			[
				// method     args                                    response      should work?
				["fWipe",    [ ]                                                          ],

				["fWrite",   ["x", {a:1} ]                                                ],
				["fRead",    ["x.a" ],                                    1               ],
				["fRead",    ["x" ],                                      {a:1}           ]
			],
			fDone
		);
	});

	it("structures are properly combined", function(fDone) {
		fTestJournalingStore(
			[
				// method     args                                    response      should work?
				["fWipe",    [ ]                                                          ],

				["fWrite",   ["x", {a:1} ]                                                ],
				["fWrite",   ["x.b", {c:2} ]                                              ],

				["fRead",    ["x" ],                                      {a:1,b:{c:2}}   ]
			],
			fDone
		);
	});

});


var fvxValueField = function(va){
	return va.map(function(a){return a["value"];});
};
	
// TEST JOURNALLING
describe("JournalingStore, journal", function() {

	it("changes are properly journaled", function(fDone) {
		fTestJournalingStore(
			[
				// method     args                                    response      should work?
				["fWipe",    [ ]                                                          ],

				["fWrite",   ["a", 1 ]                                                    ],
				["fWrite",   ["a", {b:2, c:3} ]                                           ],
				["fWrite",   ["a", 4 ]                                                  ],

				["fReadJournal",    ["a" ],    [1, {b:2,c:3}, 4], fvxValueField],
				["fReadJournal",    ["a.b" ],  [2, null], fvxValueField]
			],
			fDone
		);
	});

	it("deep changes are properly journaled", function(fDone) {
		fTestJournalingStore(
			[
				// method     args                                    response      should work?
				["fWipe",    [ ]                                                          ],

				["fWrite",   ["a", 1 ]                                                    ],
				["fWrite",   ["a", {b:2, c:3} ]                                           ],
				["fWrite",   ["a.d", 4 ]                                                  ],
				["fWrite",   ["a", {e:5} ]                                                ],
				["fWrite",   ["a", 4 ]                                                    ],

				["fReadJournal",    ["a" ],    [1, {b:2,c:3}, {b:2,c:3,d:4}, {e:5}, 4], fvxValueField],
				["fReadJournal",    ["a.b" ],  [2, null], fvxValueField],
				["fReadJournal",    ["a.e" ],  [5, null], fvxValueField]
			],
			fDone
		);
	});
});



describe("JournalingStore, encryption", function() {
	// Test Encryption
	it("Encryption Works", function(fDone) {
		fTestEncryptedJournalingStore(
			[
				// method     args                                    response      should work?
				["fWipe",    [ ]                                                          ],

				["fWrite",   ["a", "secret" ]                                             ],
				["fRead",    ["a" ],                        "secret"                      ]
			],
			fDone
		);
	});



	it("Encryption Jornaling Works", function(fDone) {
		fTestEncryptedJournalingStore(
			[
				// method     args                                    response      should work?
				["fWipe",    [ ]                                                                    ],

				["fWrite",   ["a", "secret" ]                                                       ],
				["fWrite",   ["a.b", "secret2" ]                                                    ],
				["fWrite",   ["a.c", "secret3" ]                                                    ],
				["fReadJournal",    ["a" ],  ["secret",{b:"secret2"},{b:"secret2", c:"secret3"}],    fvxValueField]
			],
			fDone
		);
	});

});



describe("JournalingStore, range limits", function() {
	// Test Encryption
	it("limits work", function(fDone) {
		fTestJournalingStore(
			[
				// method     args                                    response      should work?
				["fWipe",    [ ]                                                     ],

				["fWrite",   ["a", 1 ]                                               ],
				["fWrite",   ["a.b", 2 ]                                             ],
				["fWrite",   ["a.c", 3 ]                                             ],
				["fReadJournal",    ["a",1 ],  [{b:2, c:3}],            fvxValueField],
				["fReadJournal",    ["a",2 ],  [{b:2},{b:2, c:3}],      fvxValueField],

				["fReadJournal",    ["a",3 ],  [1,{b:2},{b:2, c:3}],    fvxValueField],
				["fReadJournal",    ["a",4 ],  [1,{b:2},{b:2, c:3}],    fvxValueField],
				["fReadJournal",    ["a",5 ],  [1,{b:2},{b:2, c:3}],    fvxValueField],

				["fReadJournal",    ["a",0 ],  [1,{b:2},{b:2, c:3}],    fvxValueField],

				["fReadJournal",    ["a",-1 ],  [1],                    fvxValueField],
				["fReadJournal",    ["a",-2 ],  [1,{b:2}],              fvxValueField],
				["fReadJournal",    ["a",-3 ],  [1,{b:2},{b:2, c:3}],   fvxValueField],
				["fReadJournal",    ["a",-4 ],  [1,{b:2},{b:2, c:3}],   fvxValueField],
				["fReadJournal",    ["a",-5 ],  [1,{b:2},{b:2, c:3}],   fvxValueField]
			],
			fDone
		);
	});

	it("ranges work", function(fDone) {
		var tm = nsDate.ftmNow();

		fTestJournalingStore(
			[
				// method     args                                    response      should work?
				["fWipe",    [ ]                                                     ],

				["fWrite",   ["a", 1 ]                                               ],
				["fWrite",   ["a.b", 2 ]                                             ],
				["fWrite",   ["a.c", 3 ]                                             ],
				["fReadJournal",    ["a",[0, 1]],  [],            fvxValueField],
				["fReadJournal",    ["a",[tm, tm+10000]],  [1,{b:2},{b:2, c:3}],    fvxValueField]


			],
			fDone
		);
	});



});



describe("JournalingStore, readkeys", function() {
	// Test Encryption
	it("work", function(fDone) {
		fTestEncryptedJournalingStore(
			[
				// method     args                                    response      should work?
				["fWipe",    [ ]                                                     ],

				["fWrite",   ["a", 1 ]                                               ],
				["fReadKeys",    ["a"],                         []            ],

				["fWrite",   ["a.b", 2 ]                                             ],
				["fWrite",   ["a.c", 3 ]                                             ],
				["fReadKeys",    ["a"],                 ["b","c"],            function(v){return v.sort();}],

				["fWrite",   ["a", 1 ]                                               ],
				["fReadKeys",    ["a"],                         []            ]

			],
			fDone
		);
	});

});


describe("JournalingStore, readtimestamp", function() {
	// Test Encryption
	it("work", function(fDone) {
		var tmFirst;
		fTestEncryptedJournalingStore(
			[
				// method     args                                    response      should work?
				["fWipe",    [ ]                                                                 ],

				["fWrite",   ["a", 1 ]                                                           ],
				["fReadTimestamp",  ["a"],     true, function(tm){tmFirst = tm; return true;}     ],
				["fReadTimestamp",  ["a"],     true, function(tm){return tmFirst === tm;}        ],
				["fWrite",   ["a", 2 ]                                                           ],
				["fReadTimestamp",  ["a"],     true, function(tm){return ((tmFirst < tm) && (tmFirst = tm))?true:false;}  ],
				["fWrite",   ["a.b", 1 ]                                               ],
				["fReadTimestamp",  ["a"],     true, function(tm){return ((tmFirst < tm) && (tmFirst = tm))?true:false;}  ],
				["fWrite",   ["a", 2 ]                                               ],
				["fReadTimestamp",  ["a"],     true, function(tm){return ((tmFirst < tm) && (tmFirst = tm))?true:false;}  ]
			],
			fDone
		);
	});

});




describe("JournalingStore, expunge", function() {
	// Test Encryption
	it("works", function(fDone) {
		fTestEncryptedJournalingStore(
			[
				// method     args                                    response      should work?
				["fWipe",    [ ]                                                     ],

				["fWrite",   ["a", 1 ]                                               ],
				["fWrite",   ["a.b", 2 ]                                             ],
				["fWrite",   ["a.c", 3 ]                                             ],
				["fWrite",   ["aa", 3 ]                                              ],

				["fExpunge",   ["a"]                                                 ],
				["fReadKeys",    [""],                         ["aa"]            ]

			],
			fDone
		);
	});

});





describe("JournalingStore arrays", function() {
	it("writes and retrieves data to arrays", function(fDone) {
		fTestJournalingStore(
			[
				// method     args                                    response      should work?
				["fWipe",    [ ]                                                          ],

				["fWrite",   ["x[0]", 1 ]                                                  ],
				["fRead",    ["x" ],                                    [1]    ]
			],
			fDone
		);
	});

	it("writes and retrieves data to arrays", function(fDone) {
		fTestJournalingStore(
			[
				// method     args                                    response      should work?
				["fWipe",    [ ]                                                          ],

				["fWrite",   ["x[0]", 1 ]                                                  ],
				["fRead",    ["x[0]" ],                                      1             ],

				["fWrite",   ["x[1]", 2 ]                                                  ],
				["fRead",    ["x[1]" ],                                      2             ],

				["fRead",    ["x" ],                                    [1, 2]    ]
			],
			fDone
		);
	});

	it("writes and retrieves data to arrays and deeper keys", function(fDone) {
		fTestJournalingStore(
			[
				// method     args                                    response      should work?
				["fWipe",    [ ]                                                          ],

				["fWrite",   ["x[0].a", 1 ]                                                  ],
				["fRead",    ["x[0].a" ],                                      1             ],

				["fWrite",   ["x[0].b", 2 ]                                                  ],
				["fRead",    ["x[0].b" ],                                      2             ],

				["fRead",    ["x" ],                                    [ {a:1, b:2}]    ]
			],
			fDone
		);
	});


	it("writes and retrieves data to encrypted arrays", function(fDone) {
		fTestEncryptedJournalingStore(
			[
				// method     args                                    response      should work?
				["fWipe",    [ ]                                                          ],

				["fWrite",   ["x[0]", 1 ]                                                  ],
				["fRead",    ["x" ],                                    [ 1]    ]
			],
			fDone
		);
	});

	it("writes and retrieves data to encrypted arrays", function(fDone) {
		fTestEncryptedJournalingStore(
			[
				// method     args                                    response      should work?
				["fWipe",    [ ]                                                          ],

				["fWrite",   ["x[0]", 1 ]                                                  ],
				["fRead",    ["x[0]" ],                                      1             ],

				["fWrite",   ["x[1]", 2 ]                                                  ],
				["fRead",    ["x[1]" ],                                      2             ],

				["fRead",    ["x" ],                                    [ 1, 2]    ]
			],
			fDone
		);
	});

	it("writes and retrieves data to encrypted arrays and deeper keys", function(fDone) {
		fTestEncryptedJournalingStore(
			[
				// method     args                                    response      should work?
				["fWipe",    [ ]                                                          ],

				["fWrite",   ["x[0].a", 1 ]                                                  ],
				["fRead",    ["x[0].a" ],                                      1             ],

				["fWrite",   ["x[0].b", 2 ]                                                  ],
				["fRead",    ["x[0].b" ],                                      2             ],

				["fRead",    ["x" ],                                    [ {a:1, b:2}]    ]
			],
			fDone
		);
	});

});

