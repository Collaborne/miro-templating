import { createIdGenerator, createIdMapper } from '../id-mapping';

describe('id-mapping', () => {
	describe('id-generator', () => {
		it('create new template IDs', async () => {
			const gen = createIdGenerator();
			expect(gen.map('id-1')).toBe('{{ID:0}}');
			expect(gen.map('id-2')).toBe('{{ID:1}}');
		});

		it('return same template ID for same miro ID', async () => {
			const gen = createIdGenerator();
			expect(gen.map('id-1')).toBe('{{ID:0}}');
			expect(gen.map('id-1')).toBe('{{ID:0}}');
		});
	});

	describe('id-mapper', () => {
		it('create new template IDs', async () => {
			const mapper = createIdMapper();
			mapper.set('{{ID:0}}', 'id-1');
			expect(mapper.get('{{ID:0}}')).toBe('id-1');
		});
	});
});
