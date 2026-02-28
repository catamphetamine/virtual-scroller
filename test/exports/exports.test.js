import { describe, it } from 'mocha'
import { expect } from 'chai'

import VirtualScroller from '../../index.js'

import Library from '../../index.cjs'

describe('virtual-scroller', function() {
	it('should export', function() {
		expect(VirtualScroller).to.be.a('function')
	})

	it('should export (CommonJS)', function() {
		expect(Library).to.be.a('function')
		expect(Library.default).to.be.a('function')
	})
})