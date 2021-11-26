import px from './px'

describe('utility/px', function() {
	it('should truncate px values', function() {
		px(0).should.equal('0px')
		px(1).should.equal('1px')
		px(1.2345).should.equal('1.23px')
	})
})