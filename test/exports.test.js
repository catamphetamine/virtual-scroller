import VirtualScroller from '../index.js'

import Library from '../index.cjs'

describe('virtual-scroller', function() {
	it('should export ES6', function() {
		VirtualScroller.should.be.a('function')
	})

	it('should export CommonJS', function() {
		Library.should.be.a('function')
		Library.default.should.be.a('function')
	})
})