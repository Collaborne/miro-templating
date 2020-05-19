import { expect } from 'chai';
import 'mocha';

import { replacePlaceholders } from '../../src/templating/placeholders';

describe('templating', () => {
	describe('replacePlaceholders behavior', () => {
		it('replaces placeholder', () => {
			const context = {
				USER: 'Joe',
			};
			expect(replacePlaceholders('Hi ${USER}', context)).to.be.equals('Hi Joe');
		});
	});
});
