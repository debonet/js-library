var assert = require('should');

var nsDate = require('../nsDate.js');



describe('dateutils.js', function() {
  describe('nsDate.fcDaysInMonth1Based()', function() {
    it('Should know that 2012 is a leap year', function() {
      nsDate.fcDaysInMonth1Based(2012,2).should.equal(29);
    });
    it('Should know that 2011 is not a leap year', function() {
      nsDate.fcDaysInMonth1Based(2011,2).should.equal(28);
    });
    it('Should know about months that are not February', function() {
      nsDate.fcDaysInMonth1Based(2012,1).should.equal(31);
      nsDate.fcDaysInMonth1Based(2012,3).should.equal(31);
      nsDate.fcDaysInMonth1Based(2012,4).should.equal(30);
      nsDate.fcDaysInMonth1Based(2012,5).should.equal(31);
      nsDate.fcDaysInMonth1Based(2012,6).should.equal(30);
      nsDate.fcDaysInMonth1Based(2012,7).should.equal(31);
      nsDate.fcDaysInMonth1Based(2012,8).should.equal(31);
      nsDate.fcDaysInMonth1Based(2012,9).should.equal(30);
      nsDate.fcDaysInMonth1Based(2012,10).should.equal(31);
      nsDate.fcDaysInMonth1Based(2012,11).should.equal(30);
      nsDate.fcDaysInMonth1Based(2012,12).should.equal(31);
    });
    
  });
});


