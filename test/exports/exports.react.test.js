import { describe, it } from 'mocha'
import { expect } from 'chai'

import VirtualScroller from '../../react/index.js'

import Library from '../../react/index.cjs'

describe('virtual-scroller/react', function() {
	it('should export', function() {
		expect(VirtualScroller.render).to.be.a('function')
		expect(VirtualScroller.useVirtualScroller).to.be.a('function')
	})

	it('should export (CommonJS)', function() {
		expect(Library.render).to.be.a('function')
		expect(Library.default.render).to.be.a('function')
		expect(Library.useVirtualScroller).to.be.a('function')
	})
})