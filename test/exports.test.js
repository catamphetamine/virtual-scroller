import VirtualScroller from '../index'

describe('virtual-scroller', function() {
	it('should export ES6', function() {
		VirtualScroller.should.be.a('function')
	})

	it('should export CommonJS', function() {
		const Library = require('../index.commonjs')
		Library.should.be.a('function')
		Library.default.should.be.a('function')
	})
})