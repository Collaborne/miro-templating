import { getLogger } from 'log4js';
import * as request from 'request-promise-native';

import { formatMarkdown } from '../templating/markdown';
import { Context, replacePlaceholders } from '../templating/placeholders';
import { MiroWidget } from '../types/miro';

/**
 * The connector provides low level Miro functionality
 */

const MIRO_ENDPOINT = 'https://api.miro.com/v2';

const logger = getLogger('miro-connector');

export class MiroError extends Error {
	constructor(public reason: string, message?: string) {
		super(message);
	}
}

interface MiroRequest {
	accessToken: string;
}
export interface CreateBoardRequest extends MiroRequest {
	name: string;
}
export interface CreateBoardResponse {
	id: string;
	viewLink: string;
}

export interface CreateWidgetRequest extends MiroRequest {
	boardId: string;
	context: Context;
	payload: any;
}
export interface CreateWidgetResponse {
	id: string;
}

export interface CreatePictureRequest extends MiroRequest {
	boardId: string;
	file: Buffer;
	filename: string;
}
export interface CreatePictureResponse {
	id: string;
}

export interface GetWidgetsRequest extends MiroRequest {
	boardId: string;
}

export async function createBoard(options: CreateBoardRequest): Promise<CreateBoardResponse> {
	const response = await miroRequest('/boards', {
		name: options.name,
		sharingPolicy: {
			access: 'private',
			teamAccess: 'edit',
		},
	}, options.accessToken);

	return {
		id: response.id,
		viewLink: response.viewLink,
	};
}

export async function createWidget(options: CreateWidgetRequest): Promise<CreateWidgetResponse> {
	const { payload } = options;

	const formattedText = formatMarkdown(replacePlaceholders(payload.text, options.context));

	// Convert normalizes size information
	const formattedPayload = {
		...options.payload,
		text: formattedText,
	};

	if (payload.metadata) {
		formattedPayload.metadata = Object.keys(payload.metadata).reduce((acc, key) => ({
			...acc,
			[replacePlaceholders(key, options.context)!]: payload.metadata[key],
		}), {});
	}

	const response = await miroRequest(`/boards/${options.boardId}/widgets`, formattedPayload, options.accessToken);

	return {
		id: response.id,
	};
}

export async function createPicture(options: CreatePictureRequest): Promise<CreatePictureResponse> {
	const formData = {
		image: {
			options: {
				filename: options.filename,
			},
			value: options.file,
		},
	};

	const response = await request.post({
		formData,
		headers: {
			'Authorization': `Bearer ${options.accessToken}`,
			'content-type': 'multipart/form-data',
		},
		json: true,
		uri: `${MIRO_ENDPOINT}/boards/${options.boardId}/picture`,
	});

	return {
		id: response.id,
	};
}

export async function getWidgets(options: GetWidgetsRequest): Promise<MiroWidget[]> {
	const uri = `${MIRO_ENDPOINT}/boards/${options.boardId}/widgets`;
	try {
		const response = await request.get({
			headers: {
				'Authorization': `Bearer ${options.accessToken}`,
				'content-type': 'application/json',
			},
			json: true,
			uri,
		});

		// tslint:disable-next-line no-console
		if (response.data.length < response.size) {
			logger.warn(`Received only ${response.data.length} of ${response.size} widgets. Consider implementing: https://developers.miro.com/reference#pagination`);
		}

		return response.data;
	} catch (e) {
		logger.warn(`Miro getWidget request to ${uri} failed: ${e.message}`);
		if (e.error.status === 401 && e.error.code === 'tokenNotProvided') {
			throw new MiroError('invalid-miro-token');
		}
		if (e.error.status === 404) {
			throw new MiroError('board-unknown', `Failed to get widgets for board "${options.boardId}": ${e.message}`);
		}
		throw new MiroError('unknown-error', e.message);
	}
}

async function miroRequest(path: string, payload: object | undefined, accessToken: string) {
	const uri = `${MIRO_ENDPOINT}${path}`;
	try {
		return await request.post({
			body: payload,
			headers: {
				'Authorization': `Bearer ${accessToken}`,
				'content-type': 'application/json',
			},
			json: true,
			uri,
		});
	} catch (e) {
		logger.warn(`Miro request to ${uri} failed: ${e.message}`);
		if (e.error.status === 401 && e.error.code === 'tokenNotProvided') {
			throw new MiroError('invalid-miro-token');
		}
		if (e.error.status === 429 && e.error.code === 'tooManyRequests') {
			throw new MiroError('miro-rate-limit');
		}
		throw new MiroError('unknown-error', e.message);
	}
}
