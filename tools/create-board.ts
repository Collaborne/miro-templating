#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

import { Placeholder, PlaceholderData, createBoardFromTemplate } from '../src';

import { TEMPLATES_DIR } from './consts';

const miroToken = process.env.MIRO_TOKEN;
const templateId = process.env.TEMPLATE_ID;

if (!miroToken || !templateId) {
	// tslint:disable-next-line no-console
	console.log(`Usage: MIRO_TOKEN=<TOKEN> TEMPLATE_ID=<ID> create-miro-board`);

	process.exit(1);
}

function readJsonFile(file: string) {
	return JSON.parse(fs.readFileSync(file).toString());
}

async function getPlaceholderData(
	placeholder: Pick<Placeholder, 'query' | 'limit'>,
): Promise<PlaceholderData[]> {
	const data: PlaceholderData[] = [];
	for (let i = 0; i < placeholder.limit; i++) {
		data.push({
			content: `${i} -${placeholder.query}`,
		});
	}

	return data;
}

async function main() {
	const template = readJsonFile(path.join(TEMPLATES_DIR, `${templateId}.json`));

	try {
		const { boardId, viewLink } = await createBoardFromTemplate({
			accessToken: miroToken!,
			template,
			getPlaceholderData,
		});

		// tslint:disable-next-line no-console
		console.log({
			boardId,
			viewLink,
		});
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
	} catch (e: any) {
		console.error(`Failed to create board: ${e.message}`);
		console.error(JSON.stringify(e));
	}
}

void main();
