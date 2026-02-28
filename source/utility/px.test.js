import { describe, it } from 'mocha'
import { expect } from 'chai'

import px from './px.js'

describe('utility/px', function() {
	it('should truncate px values', function() {
		expect(px(0)).to.equal('0px')
		expect(px(1)).to.equal('1px')
		expect(px(1.2345)).to.equal('1.23px')
	})
})