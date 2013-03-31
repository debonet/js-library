require('mocha');
var should = require('should');
var nsCryptoUtil = require('../nsCryptoUtil');
var nsDate = require("nsDate");

describe("nsCryptoUtil encryption", function() {
	it("can do it", function() {
		var fbuffEncrypt = nsCryptoUtil.ffbuffEncryptWithPadding("foo");

		var s="secret";

		var buffEncrypt = fbuffEncrypt(s);
		buffEncrypt.toString().should.not.eql(s);
	});

});


describe("nsCryptoUtil decryption", function() {
	it("should be able to decrypt messages", function() {
		var fbuffEncrypt = nsCryptoUtil.ffbuffEncryptWithPadding("foo");
		var fbuffDecrypt = nsCryptoUtil.ffbuffDecryptWithPadding("foo");

		var s="secret";

		var buffEncrypt = fbuffEncrypt(s);
		var sDecrypt = fbuffDecrypt(buffEncrypt).toString();
		sDecrypt.should.eql(s);
	});
});


describe("nsCryptoUtil multivalued", function() {
	it("returns an encryptor", function(fDone) {
		var fbuffEncrypt = nsCryptoUtil.ffbuffEncryptWithPadding("foo");

		var s="secret";

		var buffEncrypt = fbuffEncrypt(s);
		var buffEncrypt2 = fbuffEncrypt(s);
		buffEncrypt2.should.not.eql(buffEncrypt);

		fDone();
	});
});



