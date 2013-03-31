require('mocha');
var should = require('should');
var AccessControlStore = require('../AccessControlStore');
var ffStoreTester = require('./ffStoreTester');
var nsDate = require("nsDate");

var nsCryptoUtil = require("nsCryptoUtil");


// assumes vvTest = [ [method, args, err?, response-val],* ]
var fTestAccessControlStore = ffStoreTester(
	AccessControlStore, 
	{
		"sCredMaster" : "master",
		"database"    : "test", 
		"collection"  : "js"
	}
);

var fTestEncryptedAccessControlStore = ffStoreTester(
	AccessControlStore, 
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
var aPermRWG = {"read":true,"write":true,"getaccess":true};

describe("AccessControlStore, simple", function() {
	it("master can write permissions", function(fDone) {
		fTestAccessControlStore(
			[
				// method     args                                    response      should work?
				["fWipe",    [ ]                                                        ],

				["fWrite",   ["master", "user123","someloc",aPermAll ]                              ]
			],
			fDone
		);
	});


	it("master can write permissions", function(fDone) {
		fTestAccessControlStore(
			[
				// method     args                                    response      should work?
				["fWipe",    [ ]                                                        ],

				["fWrite",   ["master", "user123","someloc",aPermAll ]                              ],
				["fRead",    ["master", "user123","someloc" ], aPermAll                         ]

			],
			fDone
		);
	});


	it("others can't write permissions", function(fDone) {
		fTestAccessControlStore(
			[
				// method     args                                    response      should work?
				["fWipe",    [ ]                                                        ],

				["fWrite",   ["notmaster", "user123","someloc",aPermAll ],          null, false                    ]

			],
			fDone
		);
	});

	it("others can write permissions once allowed", function(fDone) {
		fTestAccessControlStore(
			[
				// method     args                                    response      should work?
				["fWipe",    [ ]                                                        ],

				// user123 can't write permissions for userABC
				["fWrite",   ["user123", "userABC","someloc",aPermAll ], null, false             ],

				// rw doesn't allow user123 to change permissions
				["fWrite",   ["master", "user123","someloc",aPermRW ]                            ],
				["fWrite",   ["user123", "userABC","someloc",aPermAll ], null, false             ],

				// chaning userXYZ doens't affect user123 but does allow userXYZ to set permissions
				["fWrite",   ["master", "userXYZ","someloc",aPermAll ]                           ],
				["fWrite",   ["user123", "userABC","someloc",aPermAll ], null, false             ],
				["fWrite",   ["userABC", "userABC","someloc",aPermAll ], null, false             ],
				["fWrite",   ["userXYZ", "userPDQ","someloc",aPermAll ]                          ],

				["fWrite",   ["master", "user123","someloc",aPermAll ]                           ],
				["fWrite",   ["user123", "userABC","someloc",aPermAll ]                          ],
				["fWrite",   ["userABC", "userABC","someloc",aPermAll ]                          ]
			],
			fDone
		);
	});
});



describe("AccessControlStore, subtree protection", function() {
	it("others can write permissions on subtrees if given permission to a parent", function(fDone) {
		fTestAccessControlStore(
			[
				// method     args                                    response      should work?
				["fWipe",    [ ]                                                        ],

				["fWrite",   ["master", "user","someloc.x",aPermAll ]                      ],
				["fWrite",   ["user", "userABC","someloc",aPermAll ], null, false          ],
				["fWrite",   ["user", "userABC","someloc.z",aPermAll ], null, false        ],
				["fWrite",   ["user", "userABC","someloc.x",aPermAll ]                     ],
				["fWrite",   ["user", "userABC","someloc.x.y",aPermAll ]                   ]
			],
			fDone
		);
	});

	it("others can't write permissions on subtrees if given denied on a parent", function(fDone) {
		fTestAccessControlStore(
			[
				// method     args                                    response      should work?
				["fWipe",    [ ]                                                        ],

				["fWrite",   ["master", "user","someloc",aPermAll ]                        ],
				["fWrite",   ["user", "userABC","someloc",aPermAll ]                       ],
				["fWrite",   ["master", "user","someloc.x","" ]                            ],
				["fWrite",   ["user", "userABC","someloc.a",aPermAll ]                     ],
				["fWrite",   ["user", "userABC","someloc.a.b",aPermAll ]                   ],
				["fWrite",   ["user", "userABC","someloc.x",aPermAll ],  null, false       ],
				["fWrite",   ["user", "userABC","someloc.x.y",aPermAll ], null, false      ]
			],
			fDone
		);
	});
});



var fvxValueField = function(va){
	return va.map(function(a){return a["value"];});
};
	

describe("AccessControlStore, journal", function() {
	it("all events show up in the journal", function(fDone) {
		fTestAccessControlStore(
			[
				// method     args                                    response      should work?
				["fWipe",    [ ]                                                        ],

				["fWrite",   ["master", "user123","someloc",aPermRW ]                               ],
				["fWrite",   ["master", "user123","someloc",aPermAll ]                              ],
				["fWrite",   ["master", "user123","someloc",aPermRWG ]                              ],

				["fReadJournal",   ["master", "user123", "someloc" ],[aPermRW,aPermAll,aPermRWG], fvxValueField   ]

			],
			fDone
		);
	});

	it("journal reading requires a (access) permissions", function(fDone) {
		fTestAccessControlStore(
			[
				// method     args                                    response      should work?
				["fWipe",    [ ]                                                                            ],

				["fWrite",   ["master", "user123","someloc",aPermRW ]                                       ],
				["fReadJournal",   ["user123", "user123", "someloc" ],  null, false                         ],
				["fWrite",   ["master", "user123","someloc",aPermAll ]                                      ],
				["fReadJournal",   ["user123", "user123", "someloc" ],[aPermRW,aPermAll], fvxValueField     ],
				["fWrite",   ["user123", "user123","someloc",aPermRWG ]                                     ],
				["fReadJournal",   ["user123", "user123", "someloc" ],[aPermRW,aPermAll,aPermRWG], fvxValueField ],
				["fWrite",   ["master", "user123","someloc",aPermRW ]                                       ],
				["fReadJournal",   ["user123", "user123", "someloc" ],  null, false                         ]
			],
			fDone
		);
	});
});


