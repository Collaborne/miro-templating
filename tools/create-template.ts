#!/usr/bin/env node

import fs from 'fs';
import _ from 'lodash';
import mkdirp from 'mkdirp';
import path from 'path';
import TurndownService from 'turndown';

import { getWidgets } from '../src/miro/miro-connector';
import { TEMPLATES_DIR } from './consts';

/**
 * Tool to create Miro templates based on an existing Miro board.
 * This allows canvas developers to use Miro's UI to design canvases, i.e. no
 * developer required.
 */

/**
 * Instance-specific fields that should be filtered.
 */
const FILTER_FIELDS = [
	'id',
	'modifiedAt',
	'modifiedBy',
	'createdAt',
	'createdBy',
	'scale',
];

const miroToken = process.env.MIRO_TOKEN;
const boardId = process.env.BOARD_ID;
const templateId = process.env.TEMPLATE_ID;

if (!miroToken || !boardId || !templateId) {
	// tslint:disable-next-line no-console
	console.log(`Usage: MIRO_TOKEN=<TOKEN> BOARD_ID=<ID> TEMPLATE_ID=<ID> npm run create-template`);

	process.exit(1);
}

const turndownService = new TurndownService();

// Workaround for invalid https://help.miro.com/hc/en-us/requests/142777
function fixInvalidColor(value: string | undefined) {
	return value && value !== '#ffffffff' ? value : undefined;
}

async function createTemplate() {
	mkdirp.sync(TEMPLATES_DIR);
	const templateFile = path.resolve(TEMPLATES_DIR, `${templateId}.json`);

	let existingTemplate;
	if (fs.existsSync(templateFile)) {
		existingTemplate = JSON.parse(fs.readFileSync(templateFile).toString());
	}

	const widgets = await getWidgets({
			accessToken: miroToken!,
			boardId: boardId!,
		})
		.catch(e => {
			// tslint:disable-next-line no-console
			console.error(`Failed to get widgets: ${JSON.stringify(e)}`);
			process.exit(1);
		});

	const filteredWidgets = widgets.map(widget => {
		return {
			// Remove instance specific fields
			..._.omit(widget, ...FILTER_FIELDS),
			style: {
				...widget.style,

				backgroundColor: fixInvalidColor(widget.style.backgroundColor),
				borderColor: fixInvalidColor(widget.style.borderColor),
			},
			// Use markdown instead of HTML in templates (this will ease translations)
			text: widget.text ? turndownService.turndown(widget.text).replace(/\\_/g, '_') : undefined,
		};
	});

	const template = {
		name: `TEMPLATE ${templateId}`,
		templateId,

		// Keep changes made in existing template file
		...existingTemplate,

		// Update always widgets
		widgets: filteredWidgets,
	};

	fs.writeFileSync(templateFile, JSON.stringify(template, null, '\t'));

	// tslint:disable-next-line no-console
	console.log(`Template written to ${templateFile}`);
}

createTemplate();
