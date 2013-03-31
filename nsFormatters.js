var nsUtilities = require("nsUtilities");


var nsFormatters = {};

// ---------------------------------------------------------------------------
nsFormatters.fsZeroPrefix = function(z,c){ // c up to 20
	var s = "00000000000000000000" + z;
	return s.substring(s.length-c);
};

// ---------------------------------------------------------------------------
nsFormatters.fsCommaNumber = function(r, cDecimalPlaces){

	if (isNaN(r)){
		r = 0;
	}

	cDecimalPlaces = nsUtilities.fxFirstArg(cDecimalPlaces,2);


	var sSign = "";

	if (r<0){
		sSign = "-";
	}
	r = Math.abs(r);
	var zBase = Math.pow(10,cDecimalPlaces);
	r=Math.round(r*zBase) / zBase;

	var sOut;

	if (r >= 1000 * 1000 * 1000 * 1000){ // any trillionaires using this?
		sOut = (
			"" 
				+ (Math.floor(r/1000/1000/1000/1000)%1000)
				+ "," + nsFormatters.fsZeroPrefix(Math.floor((r/1000/1000/1000))%1000,3)
				+ "," + nsFormatters.fsZeroPrefix(Math.floor((r/1000/1000))%1000,3)
				+ "," + nsFormatters.fsZeroPrefix(Math.floor((r/1000))%1000,3)
				+ "," + nsFormatters.fsZeroPrefix(Math.floor((r))%1000,3)
		);
	}
	else if (r >= 1000 * 1000 * 1000){ // any billionaires?
		sOut = (
			"" 
				+ (Math.floor(r/1000/1000/1000)%1000)
				+ "," + nsFormatters.fsZeroPrefix(Math.floor((r/1000/1000))%1000,3)
				+ "," + nsFormatters.fsZeroPrefix(Math.floor((r/1000))%1000,3)
				+ "," + nsFormatters.fsZeroPrefix(Math.floor((r))%1000,3)
		);
	}
	else if (r >= 1000 * 1000){ // millionaires
		sOut = (
			"" 
				+ (Math.floor(r/1000/1000)%1000)
				+ "," + nsFormatters.fsZeroPrefix(Math.floor((r/1000))%1000,3)
				+ "," + nsFormatters.fsZeroPrefix(Math.floor((r))%1000,3)
		);
	}
	else if (r >= 1000){ // thousandaires
		sOut = (
			"" 
				+ (Math.floor(r/1000)%1000)
				+ "," + nsFormatters.fsZeroPrefix(Math.floor((r))%1000,3)
		);
	}
	else { // po
		sOut = (
			"" 
				+ (Math.floor(r)%1000)
		);
	}


	if (cDecimalPlaces > 0){
		sOut += "." + nsFormatters.fsZeroPrefix(Math.floor(r*100)%100,cDecimalPlaces);
	}

	return sSign + sOut;
};

// ---------------------------------------------------------------------------
nsFormatters.fsCommaInteger = function(r){
	return nsFormatters.fsCommaNumber(r,0);
};


// ---------------------------------------------------------------------------
nsFormatters.fsMoney = function(r){
	return "$" + nsFormatters.fsCommaNumber(r);
};

// ---------------------------------------------------------------------------
nsFormatters.fsMoneyInteger = function(r){
	return "$" + nsFormatters.fsCommaNumber(r,0);
};

// ---------------------------------------------------------------------------
nsFormatters.fsDollars = function(r){
	return "$" + nsFormatters.fsCommaNumber(r,0);
};

// ---------------------------------------------------------------------------
nsFormatters.fsPercentage = function(r,cDecimalPlaces){
	return nsFormatters.fsCommaNumber(r*100,cDecimalPlaces) + "%";
};

// ---------------------------------------------------------------------------
nsFormatters.fsPercentageInteger = function(r){
	return nsFormatters.fsPercentage(r,0);
};

// ---------------------------------------------------------------------------
nsFormatters.fsAbbreviatedNumber = function(r)
{
	if (isNaN(r)){
		r = 0;
	}

	var sSign = "";

	if (r<0){
		sSign = "-";
	}
	r = Math.abs(r);

	var sOut = "";

	if (r >= 1000 * 1000 * 1000 * 1000){ // any trillionaires using this?
		sOut = Math.floor(r/1000/1000/1000/100)/10 + "T";
	}
	else if (r >= 1000 * 1000 * 1000){ // any billionaires?
		sOut = Math.floor(r/1000/1000/100)/10 + "B";
	}
	else if (r >= 1000 * 1000){ // millionaires
		sOut = Math.floor(r/1000/100)/10 + "M";
	}
	else if (r >= 1000){ // thousandaires
		sOut = Math.floor(r/1000) + "K";
	}
	else if (r >= 1) { // po
		sOut = Math.floor(r);
	}
	else if (r===0){
		sOut = 0;
	}
	else {
		// we all have pennies
		sOut = "0." + nsFormatters.fsZeroPrefix(Math.floor(r*100)%100,2);
	}

	return sSign + sOut;
};


// ---------------------------------------------------------------------------
nsFormatters.fsAbbreviatedMoney = function(r){
	return "$" + nsFormatters.fsAbbreviatedNumber(r);
};


//----------------------------------------------------------------------------
// modified from:
// https://github.com/mwaylabs/The-M-Project/blob/master/modules/core/utility/date.js
/**
* The following list defines the special characters that can be used in the 'format' property
* to format the given date:
*
* d        Day of the month as digits; no leading zero for single-digit days.
* dd      Day of the month as digits; leading zero for single-digit days.
* ddd      Day of the week as a three-letter abbreviation.
* dddd  Day of the week as its full name.
* D      Day of the week as number.
* m      Month as digits; no leading zero for single-digit months.
* mm      Month as digits; leading zero for single-digit months.
* mmm      Month as a three-letter abbreviation.
* mmmm  Month as its full name.
* yy      Year as last two digits; leading zero for years less than 10.
* yyyy  Year represented by four digits.
* h      Hours; no leading zero for single-digit hours (12-hour clock).
* hh      Hours; leading zero for single-digit hours (12-hour clock).
* H      Hours; no leading zero for single-digit hours (24-hour clock).
* HH      Hours; leading zero for single-digit hours (24-hour clock).
* M      Minutes; no leading zero for single-digit minutes.
* MM      Minutes; leading zero for single-digit minutes.
* s      Seconds; no leading zero for single-digit seconds.
* ss      Seconds; leading zero for single-digit seconds.
* l or L  Milliseconds. l gives 3 digits. L gives 2 digits.
* t      Lowercase, single-character time marker string: a or p.
* tt    Lowercase, two-character time marker string: am or pm.
* T      Uppercase, single-character time marker string: A or P.
* TT      Uppercase, two-character time marker string: AM or PM.
* Z      US timezone abbreviation, e.g. EST or MDT. With non-US timezones or in the Opera browser, the GMT/UTC offset is returned, e.g. GMT-0500
* o      GMT/UTC timezone offset, e.g. -0500 or +0230.
* S      The date's ordinal suffix (st, nd, rd, or th). Works well with d.
*
*/
nsFormatters.fsFormatDate = function(format, tm) {
	var M={};
	M.MILLISECONDS = 'milliseconds';
	M.SECONDS = 'seconds';
	M.MINUTES = 'minutes';
	M.HOURS = 'hours';
	M.DAYS = 'days';
	M.DAY_NAMES = [
		"Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat",
		"Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
	];
	M.MONTH_NAMES = [
		"Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
		"January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"
	];


	var	token = /d{1,4}|D{1}|m{1,4}|yy(?:yy)?|([HhMsTt])\1?|[LloSZ]|"[^"]*"|'[^']*'/g;
	var	timezone = /\b(?:[PMCEA][SDP]T|(?:Pacific|Mountain|Central|Eastern|Atlantic) (?:Standard|Daylight|Prevailing) Time|(?:GMT|UTC)(?:[-+]\d{4})?)\b/g;
	var	timezoneClip = /[^+\dA-Z\-]/g;
	var	pad = function (val, len) {
		val = String(val);
		len = len || 2;
		while (val.length < len) {val = "0" + val;}
		return val;
	};

	var date=new Date(tm);
	var utc = false;

	var	_ = utc ? "getUTC" : "get";
	var	d = date[_ + "Date"]();
	var	D = date[_ + "Day"]();
	var	m = date[_ + "Month"]();
	var	y = date[_ + "FullYear"]();
	var	H = date[_ + "Hours"]();
	var	Min = date[_ + "Minutes"]();
	var	s = date[_ + "Seconds"]();
	var	L = date[_ + "Milliseconds"]();
	var	o = utc ? 0 : date.getTimezoneOffset();
	var	flags = {
		d:    d,
		dd:   pad(d),
		ddd:  M.DAY_NAMES[D],
		dddd: M.DAY_NAMES[D + 7],
		D:    D,
		m:    m + 1,
		mm:   pad(m + 1),
		mmm:  M.MONTH_NAMES[m],
		mmmm: M.MONTH_NAMES[m + 12],
		yy:   String(y).slice(2),
		yyyy: y,
		h:    H % 12 || 12,
		hh:   pad(H % 12 || 12),
		H:    H,
		HH:   pad(H),
		M:    Min,
		MM:   pad(Min),
		s:    s,
		ss:   pad(s),
		l:    pad(L, 3),
		L:    pad(L > 99 ? Math.round(L / 10) : L),
		t:    H < 12 ? "a"  : "p",
		tt:   H < 12 ? "am" : "pm",
		T:    H < 12 ? "A"  : "P",
		TT:   H < 12 ? "AM" : "PM",
		Z:    utc ? "UTC" : (String(date).match(timezone) || [""]).pop().replace(timezoneClip, ""),
		o:    (o > 0 ? "-" : "+") + pad(Math.floor(Math.abs(o) / 60) * 100 + Math.abs(o) % 60, 4),
		S:    ["th", "st", "nd", "rd"][d % 10 > 3 ? 0 : (d % 100 - d % 10 !== 10) * d % 10]
	};

	return format.replace(token, function ($0) {
		return $0 in flags ? flags[$0] : $0.slice(1, $0.length - 1);
	});
};




module.exports = nsFormatters;
