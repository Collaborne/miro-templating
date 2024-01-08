type MiroId = string;
type TemplateId = string;

/** Generates new IDs */
export function createIdGenerator() {
	const idMapping = new Map<MiroId, TemplateId>();

	let nextId = 0;

	return {
		map: (miroId: MiroId) => {
			let templateId = idMapping.get(miroId);
			if (!templateId) {
				templateId = `{{ID:${nextId++}}}`;
				idMapping.set(miroId, templateId);
			}
			return templateId;
		},
	};
}

/** Maps existing IDs */
export function createIdMapper() {
	const idMapping = new Map<TemplateId, MiroId>();

	return {
		set: (templateId: TemplateId, miroId: MiroId) => {
			idMapping.set(templateId, miroId);
		},
		get: (templateId: TemplateId) => {
			return idMapping.get(templateId);
		},
	};
}
