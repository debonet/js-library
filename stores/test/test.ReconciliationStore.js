require('mocha');
var should = require('should');
var ReconciliationStore = require('ReconciliationStore.js');


should.eql = function(x1,x2){
	if (x1===null || typeof(x1) === "undefined"){
		return should.not.exist(x2);
	}

	return x1.should.eql(x2);
};


should.strictNotEqual = function(x1,x2){
	if (x1===null || typeof(x1) === "undefined"){
		return should.exist(x2);
	}

	return x1.should.not.eql(x2);
};



describe("ReconciliationStore", function() {

	it("fasStringifyValues should work", function() {
		[
			[ {a:1,b:"2",c:"happy",d:"5happy"},        {a:"1",b:"2",c:"happy",d:"5happy"}      ],
			[ {a:-1,b:"2.0",c:"ha5ppy",d:"-5happy"},   {a:"-1",b:"2.0",c:"ha5ppy",d:"-5happy"} ],
			[ {},                                      {}                                      ],
			[ {"55":22},                               {"55":"22"}                             ]
		].each(function(va){
			ReconciliationStore.fasStringifyValues(va[0]).should.eql(va[1]);
		});
	});


	it("fxNumberifyValues should make these equal", function() {
		[
			[ "happy",  "happy" ],
			[ "joy",    "joy"   ],
			[ "1",      1       ],
			[ "1.0",    1       ],
			[ "-1",     -1      ],
			[ "0",      0       ],
			[ " happy",  " happy" ],
			[ " joy",    " joy"   ],
			[ " 1",      1       ],
			[ " 1.0",    1       ],
			[ " -1",     -1      ],
			[ " 0",      0       ],
			[ "happy ",  "happy " ],
			[ "joy ",    "joy "   ],
			[ "1 ",      1       ],
			[ "1.0 ",    1       ],
			[ "-1 ",     -1      ],
			[ "0 ",      0       ],
			[ "",       ""      ]
		].each(function(vx){
			should.strictEqual(
				ReconciliationStore.fxNumberifyValues(vx[0]),
				vx[1]
			);
		});
	});


	it("fxNumberifyValues should ensure these are not equal", function() {
		[
			[ "1.0 2",      1     ],
			[ "1.0 apple",  1     ],
			[ "apple 1.0",  1     ],
			[ "1.0apple",   1     ],
			[ "apple1.0",   1     ],
			[ "",           0     ],
			[ " ",          0     ],
			[ null,         0     ],
			[ undefined,    0     ]
		].each(function(vx){
			should.strictNotEqual(
				ReconciliationStore.fxNumberifyValues(vx[0]),
				vx[1]
			);
		});
	});

	it("faxNumberifyValues should work", function() {
		[
			[ {a:"happy", b:"joy"},                {a:"happy", b:"joy"}                        ],
			[ {a:"happy2", b:"4joy"},              {a:"happy2", b:"4joy"}                      ],
			[ {a:"5", b:"-1"},                     {a:5, b:-1}                                 ],
			[ {a:3, b:1.2},                        {a:3, b:1.2}                                ],
			[ {a:"0", b:""},                       {a:0, b:""}                                 ]
		].each(function(ax){
			should.eql(
				ReconciliationStore.faxNumberifyValues(ax[0]),
				ax[1]
			);
		});
	});

	it("fvaxNumberifyValues should work", function() {
		[
			[ 
				[{a:"happy", b:"joy"}, {a:"happy2", b:"4joy"}, {a:"5", b:"-1"}, {a:3, b:1.2}, {a:"0", b:""}  ],
				[{a:"happy", b:"joy"}, {a:"happy2", b:"4joy"}, {a:5,   b:-1},   {a:3, b:1.2}, {a:0,   b:""}  ]
			]
		].each(function(vax){
			should.eql(
				ReconciliationStore.fvaxNumberifyValues(vax[0]),
				vax[1]
			);
		});
	});


});
