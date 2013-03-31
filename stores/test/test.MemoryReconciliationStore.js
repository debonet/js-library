require('mocha');
var should = require('should');
var MemoryReconciliationStore = require('MemoryReconciliationStore.js');


// assumes vvTest = [ [method, args, err?, response-val],* ]
var fTestReconciliationStore = function(vvTest,fCallback){
	var mrs = new MemoryReconciliationStore();

	vvTest.serialeach(
		function(vTest,n,fCallbackAsync){
			var sf                = vTest[0];
			var vxArg             = vTest[1];
			var bShouldNotErr     = vTest[2];
			var bResponseExpected = vTest.length === 4;
			var xResponseExpected = vTest[3];

			vxArg.push(function(err,xResponse){
				if (bShouldNotErr){
					should.not.exist(err);
				}
				else{
					should.exist(err);
				}

				if (bResponseExpected){
					if (typeof xResponseExpected === "undefined" || xResponseExpected === null){
						should.not.exist(xResponse);
					}
					else{
						xResponse.should.eql(xResponseExpected);
					}
				}
				fCallbackAsync(null);
			});

			mrs[sf].apply(mrs, vxArg);
		},
		function(err){
			should.not.exist(err);						
			fCallback(null);
		}
	);
};

describe("MemoryReconciliationStore", function() {
/*jshint laxcomma:true */
	it("allow multiple writes of identical data, but stringified", function(fDone) {
		fTestReconciliationStore(
			[
				// method     args                               works?     response-expected
				["fWrite",   [ ["a","2"], {a:2,b:3,c:3} ],       true                         ],
				["fWrite",   [ ["a","2"], {a:2,b:3} ],           true                         ]
			],
			fDone
		);
	});

	it("should fWrite and fRead back the same thing, in the simple case", function(fDone) {
		fTestReconciliationStore(
			[
				// method     args                             works?     response-expected
				["fWrite",   [ ["a",1], {a:1,b:2,c:3} ],       true                         ],
				["fRead",    [ ["a",1] ],                      true,     {a:1,b:2,c:3}      ],

				["fWrite",   [ ["b",1], {a:7,b:1,c:8} ],       true                         ],
				["fRead",    [ ["b",1] ],                      true,     {a:7,b:1,c:8}      ],

				["fWrite",   [ ["c",5], {a:2,b:3,c:5} ],       true                         ],
				["fRead",    [ ["c",5] ],                      true,     {a:2,b:3,c:5}      ]
			],
			fDone
		);
	});

	it("should fWrite and fRead back the same thing, using different keys", function(fDone) {
		fTestReconciliationStore(
			[
				// method     args                             works?     response-expected
				["fWrite",   [ ["a",1], {a:1,b:2,c:3} ],       true                         ],
				["fWrite",   [ ["b",1], {a:7,b:1,c:8} ],       true                         ],
				["fWrite",   [ ["c",5], {a:2,b:3,c:5} ],       true                         ],

				["fRead",    [ ["a",1] ],                      true,     {a:1,b:2,c:3}      ],
				["fRead",    [ ["b",2] ],                      true,     {a:1,b:2,c:3}      ],
				["fRead",    [ ["c",3] ],                      true,     {a:1,b:2,c:3}      ],

				["fRead",    [ ["a",7] ],                      true,     {a:7,b:1,c:8}      ],
				["fRead",    [ ["b",1] ],                      true,     {a:7,b:1,c:8}      ],
				["fRead",    [ ["c",8] ],                      true,     {a:7,b:1,c:8}      ],

				["fRead",    [ ["a",2] ],                      true,     {a:2,b:3,c:5}      ],
				["fRead",    [ ["b",3] ],                      true,     {a:2,b:3,c:5}      ],
				["fRead",    [ ["c",5] ],                      true,     {a:2,b:3,c:5}      ]
			],
			fDone
		);
	});

	it("should not return things it doesn't have", function(fDone) {
		fTestReconciliationStore(
			[
				// method     args                             works?     response-expected
				["fWrite",   [ ["a",1], {a:1,b:2,c:3} ],       true                         ],
				["fWrite",   [ ["b",1], {a:7,b:1,c:8} ],       true                         ],
				["fWrite",   [ ["c",5], {a:2,b:3,c:5} ],       true                         ],

				["fRead",    [ ["a",3] ],                      false                        ],
				["fRead",    [ ["b",4] ],                      false                        ],
				["fRead",    [ ["c",1] ],                      false                        ]
			],
			fDone
		);
	});


	it("should fWrite and fRead back different things in the key change case", function(fDone) {
		fTestReconciliationStore(
			[
				// method     args                             works?     response-expected
				["fWrite",   [ ["a",1], {a:1,b:2,c:3} ],       true                         ],
				["fWrite",   [ ["a",1], {a:2,b:2,c:3} ],       true                         ],
				["fRead",    [ ["a",2] ],                      true,     {a:2,b:2,c:3}      ],
				["fRead",    [ ["b",2] ],                      true,     {a:2,b:2,c:3}      ],
				["fRead",    [ ["a",1] ],                      false                        ]
			],
			fDone
		);
	});


	it("should fail to fWrite if there are conflicts", function(fDone) {
		fTestReconciliationStore(
			[
				// method     args                             works?     response-expected
				["fWrite",   [ ["a",1], {a:1,b:2,c:3} ],       true                         ],
				["fWrite",   [ ["a",2], {a:2,b:2,c:4} ],       false                        ],
				["fWrite",   [ ["b",2], {a:2,b:2,c:3} ],       true                         ]
			],
			fDone
		);
	});

	it("should allow non conflicting fWrites", function(fDone) {
		fTestReconciliationStore(
			[
				// method     args                             works?     response-expected
				["fWrite",   [ ["a",1], {a:1,b:1,c:1} ],       true                         ],
				["fWrite",   [ ["a",1], {a:2,b:1,c:1} ],       true                         ],
				["fWrite",   [ ["a",2], {a:2,b:2,c:1} ],       true                         ],
				["fWrite",   [ ["b",2], {a:1,b:2,c:2} ],       true                         ],
				["fRead",    [ ["a",1] ],                      true,      {a:1,b:2,c:2}     ],
				["fRead",    [ ["b",2] ],                      true,      {a:1,b:2,c:2}     ],
				["fRead",    [ ["c",2] ],                      true,      {a:1,b:2,c:2}     ]
			],
			fDone
		);
	});

			
	it("should allow partial reads", function(fDone) {
		fTestReconciliationStore(
			[
				// method     args                             works?     response-expected
				["fWrite",   [ ["a",1], {a:1,b:2,c:3} ],       true                         ],
				["fRead",    [ ["a",1,"a"] ],                  true,       1                ],
				["fRead",    [ ["a",1,"b"] ],                  true,       2                ],
				["fRead",    [ ["a",1,"c"] ],                  true,       3                ]
			],
			fDone
		);
	});
			
	it("should not allow partial reads of records that don't exist", function(fDone) {
		fTestReconciliationStore(
			[
				// method     args                             works?     response-expected
				["fWrite",   [ ["a",1], {a:1,b:2,c:3} ],       true                         ],
				["fRead",    [ ["a",2,"a"] ],                  false                        ],
				["fRead",    [ ["b",3,"b"] ],                  false                        ],
				["fRead",    [ ["c",4,"c"] ],                  false                        ]
			],
			fDone
		);
	});
			
	it("should allow partial reads of missing data from records that do exist", function(fDone) {
		fTestReconciliationStore(
			[
				// method     args                             works?     response-expected
				["fWrite",   [ ["a",1], {a:1,b:2,c:3} ],       true                         ],
				["fRead",    [ ["a",1,"d"] ],                  true,      undefined         ]
			],
			fDone
		);
	});

			
	it("should allow partial writes", function(fDone) {
		fTestReconciliationStore(
			[
				// method     args                             works?     response-expected
				["fWrite",   [ ["a",1], {a:1,b:2,c:3} ],       true                         ],
				["fWrite",   [ ["a",1,"b"], 3 ],               true                         ],
				["fRead",    [ ["a",1] ],                      true,      {a:1,b:3,c:3}     ],
				["fRead",    [ ["a",1,"b"] ],                  true,      3                 ]
			],
			fDone
		);
	});
			
	it("should allow double partial writes", function(fDone) {
		fTestReconciliationStore(
			[
				// method     args                             works?     response-expected
				["fWrite",   [ ["a",1,"b"], 3 ],               true                         ],
				["fRead",    [ ["a",1] ],                      true,      {a:1,b:3}         ],
				["fRead",    [ ["b",3] ],                      true,      {a:1,b:3}         ]
			],
			fDone
		);
	});
			
	it("should allow blind writes", function(fDone) {
		fTestReconciliationStore(
			[
				// method     args                             works?     response-expected
				["fWrite",   [ [], {a:1,b:2,c:3} ],            true                         ],
				["fRead",    [ ["a",1] ],                      true,     {a:1,b:2,c:3}      ]
			],
			fDone
		);
	});

	it("should not allow conflicting blind writes", function(fDone) {
		fTestReconciliationStore(
			[
				// method     args                             works?     response-expected
				["fWrite",   [ [], {a:1,b:1,c:1} ],            true                         ],
				["fWrite",   [ [], {a:2,b:2,c:1} ],            false                        ]
			],
			fDone
		);
	});

	it("should not allow conflicting partial writes", function(fDone) {
		fTestReconciliationStore(
			[
				// method     args                             works?     response-expected
				["fWrite",   [ [], {a:1,b:1,c:1} ],            true                         ],
				["fWrite",   [ ["a",2,"b"], 1 ],               false                        ],
				["fWrite",   [ ["a",2,"b"], 1 ],               false                        ]
			],
			fDone
		);
	});

	it("should not have things it doesn't", function(fDone) {
		fTestReconciliationStore(
			[
				["fRead",    [ ["a",1] ],                      false                        ]
			],
			fDone
		);
	});

	it("should support delete", function(fDone) {
		fTestReconciliationStore(
			[
				// method     args                             works?     response-expected
				["fWrite",   [ [], {a:1,b:1,c:1} ],            true                         ],
				["fDelete",  [ ["a",2] ],                      false                        ],
				["fRead",    [ ["a",1] ],                      true,     {a:1,b:1,c:1}      ],
				["fDelete",  [ ["a",1] ],                      true                         ],
				["fRead",    [ ["a",1] ],                      false                        ]
			],
			fDone
		);
	});

	it("should support delete all", function(fDone) {
		fTestReconciliationStore(
			[
				// method     args                             works?     response-expected
				["fWrite",   [ [], {a:1,b:1,c:1} ],            true                         ],
				["fWrite",   [ [], {a:2,b:2,c:2} ],            true                         ],
				["fDelete",  [ [] ],                           true                         ],
				["fRead",    [ ["a",1] ],                      false                        ],
				["fRead",    [ ["a",2] ],                      false                        ]
			],
			fDone
		);
	});
			
	it("should support read all", function(fDone) {
		fTestReconciliationStore(
			[
				// method     args                             works?     response-expected
				["fWrite",   [ [], {a:1,b:1,c:1} ],            true                         ],
				["fWrite",   [ [], {a:2,b:2,c:2} ],            true                         ],
				// this test is risky because there's no guarantee of the order of the vector
				["fRead",    [ [] ],                           true, [{a:1,b:1,c:1}, {a:2,b:2,c:2}] ]
			],
			fDone
		);
	});
			
});
