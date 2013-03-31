var nsCrypto = require("crypto");
var nsTypes = require("nsTypes");

var ns = {};


// ---------------------------------------------------------------------
// ffbuffEncryptWithPadding
//   generate a one shot (not streaming) encryption function which 
//   randomly pads the message to prevent codebook attacks
//
// Params
//   sPassword := the password to be used for encryption
//   sCipher   := optional. name of the cipher (default 'aes256')
//   cPadding  := optional. number of bytes of random padding (default: 16)
//
// Returns
//   `function(x)` - that encrypts the message x with the password and padding
//                   requested
//
ns.ffbuffEncryptWithPadding = function(sPassword, sCipher, cPadding){
	sCipher = sCipher || "aes256";
	cPadding = typeof(cPadding)==="undefined" ? 16 : cPadding;

	return function(x){
		var chType;
		var s;

		if (nsTypes.fbIsUndefinedOrNull(x)){
			chType = '_';
			s="";
		}
		else{
			// Somehow this doesn't work: 
			//    var chType = ((typeof(x).toString()).charAt(0));
			// so we need to break it into little steps, which does work!
			chType = typeof(x);
			chType = chType.toString();
			chType = chType.charAt(0);
			s = chType + x.toString();
		}


		var cipher = nsCrypto.createCipher(sCipher,sPassword);
		return cipher.update(
			Buffer.concat(
				[nsCrypto.randomBytes(cPadding), new Buffer(s)]
			)
		) + cipher.final();
	};
};


// ---------------------------------------------------------------------
// ffbuffDecryptWithPadding
//   generate a one shot (not streaming) encryption function which 
//   randomly pads the message to prevent codebook attacks
//
// Params
//   sPassword := the password to be used for encryption
//   sCipher   := optional. name of the cipher (default 'aes256')
//   cPadding  := optional. number of bytes of random padding (default: 16)
//
// Returns
//   `function(x)` - that decrypts the message x with the password and padding
//                   requested
//
ns.ffbuffDecryptWithPadding = function(sPassword, sCipher, cPadding){
	sCipher = sCipher || "aes256";
	cPadding = typeof(cPadding)==="undefined" ? 16 : cPadding;

	return function(x){
		if (!x){
			return undefined;
		}

		var decipher = nsCrypto.createDecipher(sCipher,sPassword);
		var xOut =  (decipher.update(x) + decipher.final()).slice(cPadding);

		var chType = xOut.charAt(0);

		var sOut = xOut.substr(1);
		switch(chType){
		case '_':	return null;
		case 'n':	return parseFloat(sOut);
		case 'b':	return (sOut === "true") ? true : false;
		case 's': return sOut;
		case 'u': return undefined;
		case 'd': return new Date(sOut);
		default: return "";
		}

	};
};


module.exports = ns;
