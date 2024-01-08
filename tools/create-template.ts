#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

import mkdirp from 'mkdirp';

import { createTemplateFromBoard, Template } from '../src';

import { TEMPLATES_DIR } from './consts';

/**
 * Tool to create Miro templates based on an existing Miro board.
 * This allows canvas developers to use Miro's UI to design canvases, i.e. no
 * developer required.
 */

const miroToken = process.env.MIRO_TOKEN;
const boardId = process.env.BOARD_ID;
const templateId = process.env.TEMPLATE_ID;

if (!miroToken || !boardId || !templateId) {
	// tslint:disable-next-line no-console
	console.log(
		`Usage: MIRO_TOKEN=<TOKEN> BOARD_ID=<ID> TEMPLATE_ID=<ID> create-miro-template`,
	);

	process.exit(1);
}

async function createTemplate() {
	if (!miroToken || !boardId || !templateId) {
		throw new Error(
			`Requires Miro access token (${miroToken}), board ID (${boardId}), and template ID (${templateId})`,
		);
	}

	mkdirp.sync(TEMPLATES_DIR);
	const templateFile = path.resolve(TEMPLATES_DIR, `${templateId}.json`);

	let existingTemplate: Template | undefined;
	if (fs.existsSync(templateFile)) {
		existingTemplate = JSON.parse(fs.readFileSync(templateFile).toString());
	}

	const template = await createTemplateFromBoard({
		miroToken,
		templateId,
		boardId,
	});

	const combinedTemplate: Template = {
		...template,

		// Keep changes made in existing template file
		...existingTemplate,

		// Update always items
		items: template.items,
	};

	fs.writeFileSync(templateFile, JSON.stringify(combinedTemplate, null, '\t'));

	// tslint:disable-next-line no-console
	console.log(`Template written to ${templateFile}`);
}

void createTemplate();
