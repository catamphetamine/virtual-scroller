import VirtualScroller from '../react/index.js'

import Library from '../react/index.cjs'

describe('virtual-scroller/react', function() {
	it('should export', function() {
		VirtualScroller.render.should.be.a('function')
		VirtualScroller.useVirtualScroller.should.be.a('function')
	})

	it('should export (CommonJS)', function() {
		Library.render.should.be.a('function')
		Library.default.render.should.be.a('function')
		Library.useVirtualScroller.should.be.a('function')
	})
})