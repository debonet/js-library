var fThrow = require("fThrow");

var nsDate = {};

//----------------------------------------------------------------------------
// Internal: determine the number of days in a month in a particular year.
// 
// No error checking. Negative years, or months outside of 1-12 are processed, possibly incorrectly.
// 
//
// nYear  - the year
// nMonth - the month, 1-based.
// 
// Examples
//
//   nsDate.fcDaysInMonth1Based(2012, 2)
//    > 29
// 
// Returns the number of days in a month
//
// Raises custom object { f: function name, message: error message } if month is outside of 1-12.
// 
// Note: if leap years didn't exist, this would not be
// required. 
nsDate.fcDaysInMonth1Based = function(nYear, nMonth)	{
	switch (parseInt(nMonth,10)) {
	case 1:  
	case 3: 
	case 5: 
	case 7: 
	case 8: 
	case 10: 
	case 12:
		return 31;
	case 4:
	case 6:
	case 9:
	case 11:
		return 30;

	case 2:
		// Courtesy of dzone: http://snippets.dzone.com/posts/show/2099
		return 32 - new Date(nYear, 1, 32).getDate();

	default:
		fThrow("dateutils","fcDaysInMonth1Based","illegal month",nMonth);
		break;
	}
};



//----------------------------------------------------------------------------
// Internal: convert a pure day text string into an EST market-close time (5PM)
// 
// No error checking. Does not deal with Daylight Savings Time properly.
// For now, assumes that input dates are days, with no hours. Deal
// 
//
// sDate  - a string parseable by Date(), without any time information (only year/month/day)
// 
// Examples
//
//   nsDate.fdateConvertDateStringToEasternTime("2011/02/21")
//    > Date("2011/02/21 17:00 GMT -0500")
// 
// Returns a date object referring to 5PM on that date in the Eastern time zone. 
//
// TODO: very fragile function. If timezone is already specified,
// should do nothing. If hours are specified, should behave correctly;
// should deal with cases when GMT-5 is not the same as Eastern Time.
nsDate.fdateConvertDateStringToEasternTime = function(sDate){
	var sAdjustment = " 17:00 GMT -0500";
	
	var tm          = Date.parse(sDate + sAdjustment);
	var date        = new Date();
	
	date.setTime(tm);
	return date;
};


//----------------------------------------------------------------------------
// nsDate.ftmNow
//
// Returns
//  the current time, in the current timezone. Guaranteed to be increasing
//  on each subsequent call. We do this by adding 1ms if the time has 
//  not changed. 
//
//  Theoretically, if used in a tight loop, the time could drift forward, 
//  so don't do that! In practice the call to getTime() might take longer
//  than 1ms anyway.
//
nsDate.ftmNow = (function(){
	var tmLast = 0;

	return function(){
		var tm = (new Date()).getTime();
		if (tm === tmLast){
			tm++;
		}
		tmLast = tm;
		return tm;
	};
})();

//----------------------------------------------------------------------------
// truncates given time to day. does not look at timezone info
// returns a time of 00:00 (mignight at the beginning of the day)
nsDate.ftmDayOfTime = function(tm){
	return Math.floor(tm /nsDate.dtmDay) * nsDate.dtmDay;
};

	
//----------------------------------------------------------------------------
// returns day of time of now
nsDate.ftmToday = function(){
	return nsDate.ftmDayOfTime(nsDate.ftmNow());
};

	
//----------------------------------------------------------------------------
nsDate.ftmYesterday = function(){
	return nsDate.ftmNow() - nsDate.dtmDay;
};

	
//----------------------------------------------------------------------------
nsDate.ftmTomorrow = function(){
	return nsDate.ftmNow() + nsDate.dtmDay;
};

//----------------------------------------------------------------------------
// ftmFromParts 
//
// NOTE:
//   month is 1-indexed
nsDate.ftmFromParts = function(nYear,nMonth,nDay,nHour,nMinute,nSecond){
	nMonth = nMonth || 1;
	nDay = nDay || 1;
	nHour = nHour || 0;
	nMinute = nMinute || 0;
	nSecond = nSecond || 0;
	return new Date(Date.UTC(nYear,nMonth-1,nDay,nHour,nMinute,nSecond)).getTime();
};

	
//----------------------------------------------------------------------------
// standard values
//----------------------------------------------------------------------------
nsDate.dtmSecond = 1000;
nsDate.dtmMinute = 60 * 1000;
nsDate.dtmHour   = 60 * 60 * 1000;
nsDate.dtmDay    = 24 * 60 * 60 * 1000;
nsDate.dtmWeek   = 7 * 24 * 60 * 60 * 1000;


//----------------------------------------------------------------------------
// EXPORTS
//----------------------------------------------------------------------------
module.exports = nsDate;

