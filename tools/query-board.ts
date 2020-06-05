#!/usr/bin/env node

import { queryWidgets } from '../src/miro/miro-manager';

const miroClientId = process.env.MIRO_CLIENT_ID;
const miroToken = process.env.MIRO_TOKEN;
const boardId = process.env.BOARD_ID;

if (!miroClientId || !miroToken || !boardId) {
	// tslint:disable-next-line no-console
	console.log(`Usage: MIRO_TOKEN=<TOKEN> MIRO_CLIENT_ID=<ID> BOARD_ID=<ID> query-miro-board`);

	process.exit(1);
}

async function queryBoard() {
	const result = await queryWidgets({
		accessToken: miroToken!,
		boardId: boardId!,
		miroAppId: miroClientId!,
	});

	// tslint:disable-next-line no-console
	console.log({hits: result.hits});
}

queryBoard();
