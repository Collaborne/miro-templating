import fs from 'fs';
import path from 'path';

import { createCanvas } from '../src/miro/miro-manager';
import { TEMPLATES_DIR } from './consts';

const miroClientId = process.env.MIRO_CLIENT_ID;
const miroToken = process.env.MIRO_TOKEN;
const templateId = process.env.TEMPLATE_ID;

const SAMPLE_DIR = 'sample';
const LOGO_FILENAME = 'logo.png';
const CONTEXT_FILENAME = 'context.json';

if (!miroClientId || !miroToken || !templateId) {
	// tslint:disable-next-line no-console
	console.log(`Usage: MIRO_TOKEN=<TOKEN> MIRO_CLIENT_ID=<ID> TEMPLATE_ID=<ID> npm run create-board`);

	process.exit(1);
}

function readJsonFile(file: string) {
	return JSON.parse(fs.readFileSync(file).toString());
}

async function createBoard() {
	const template = readJsonFile(path.join(TEMPLATES_DIR, `${templateId}.json`));

	const context = readJsonFile(path.join(SAMPLE_DIR, CONTEXT_FILENAME));

	const { boardId, viewLink } = await createCanvas({
		accessToken: miroToken!,
		context,
		logoFilename: LOGO_FILENAME,
		logoPath: path.resolve(SAMPLE_DIR, LOGO_FILENAME),
		miroAppId: miroClientId!,
		name: template.name,
		widgets: template.widgets,
	});

	// tslint:disable-next-line no-console
	console.log({
		boardId,
		viewLink,
	});
}

createBoard();
