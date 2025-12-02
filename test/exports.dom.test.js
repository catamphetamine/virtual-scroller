import VirtualScroller from '../dom/index.js'

import Library from '../dom/index.cjs'

describe('virtual-scroller/dom', function() {
	it('should export', function() {
		VirtualScroller.should.be.a('function')
	})

	it('should export (CommonJS)', function() {
		Library.should.be.a('function')
		Library.default.should.be.a('function')
	})
})