import * as fs from 'fs';
import { getLogger } from 'log4js';
import { mapSeries } from 'p-iteration';
import TurndownService from 'turndown';

import { MiroWidget, ShapeType, WidgetType } from '../types/miro';

import { Context, replacePlaceholders } from '../templating/placeholders';
import { createBoard, createPicture, createWidget, getWidgets } from './miro-connector';

const logger = getLogger('miro-manager');
const turndownService = new TurndownService();

/**
 * The manager provides high-level functionlity to interact with Miro
 */

type Widget = any;
interface CreateCanvasRequest {
	accessToken: string;
	name: string;
	logoFilename: string;
	logoPath: string;
	context: Context;
	miroAppId: string;
	widgets: Widget[];
}
export interface CreateCanvasResponse {
	boardId: string;
	viewLink: string;
}

interface QueryWidgetsRequest {
	accessToken: string;
	boardId: string;
	legacyQueries?: Query[];
	miroAppId: string;
}
interface Hit {
	type: string;
	value: string;
}
export interface QueryWidgetsResponse {
	hits: Hit[];
}

export interface Query {
	parent: {
		type: WidgetType;
		shapeType?: ShapeType;
		text: string;
	};
	type: string;
}
/**
 * Creates a Miro board with widgets
 */
export async function createCanvas(req: CreateCanvasRequest): Promise<CreateCanvasResponse> {
	const { accessToken, context } = req;

	const name = replacePlaceholders(req.name, context) || 'unknown';

	const { id: boardId, viewLink } = await createBoard({
		accessToken,
		// Miro API requires the board name to be max 60 characters long
		name: name.substr(0, 60),
	});

	const file = fs.readFileSync(req.logoPath);
	await createPicture({
		accessToken,
		boardId,
		file,
		filename: req.logoFilename,
	});

	// Ensure that widgets are created in pre-defined order. This is important
	// to have them overlap in the expected way.
	await mapSeries(req.widgets, widget => createWidget({
		accessToken,
		boardId,
		context: {
			...context,
			APP_ID: req.miroAppId,
		},
		payload: widget,
	}));

	return {
		boardId,
		viewLink,
	};
}

interface ParentEntry {
	parent: MiroWidget;
	type: string;
}
export async function queryWidgets(req: QueryWidgetsRequest): Promise<QueryWidgetsResponse> {
	// Load all widgets
	const widgets = await getWidgets({
		accessToken: req.accessToken,
		boardId: req.boardId,
	});

	let parentEntries = widgets
		.filter(widget => widget.metadata && widget.metadata[req.miroAppId] && widget.metadata[req.miroAppId].import_type)
		.map(widget => ({
			parent: widget,
			type: widget.metadata![req.miroAppId].import_type,
		}));

	// Legacy support
	if (parentEntries.length === 0) {
		parentEntries = (req.legacyQueries || [])
			.map(query => {
				// Find parent (legacy)
				const parent = widgets.find(widget =>
						widget.type === query.parent.type &&
						turndownService.turndown(widget.text).startsWith(query.parent.text) &&
						widget.style.shapeType === query.parent.shapeType);
				if (!parent) {
					logger.warn(`Miro board ${req.boardId} doesn't have parent for type="${query.parent.type}", shapeType="${query.parent.shapeType}", text="${query.parent.text}")`);
					logger.warn(`Miro widgets: ${JSON.stringify(widgets, null, '\t')}`);
					return undefined;
				}

				return {
					parent,
					type: query.type,
				};
			})
			.filter(parent => parent) as ParentEntry[];
	}

	const hits = parentEntries
		.map(parentEntry => {
			const { parent, type } = parentEntry;

			// Find widget that we are within the widget
			const minX = parent.x - (parent.width / 2);
			const maxX = parent.x + (parent.width / 2);
			const minY = parent.y - (parent.height / 2);
			const maxY = parent.y + (parent.height / 2);

			const matchingWidgets = widgets.filter(widget =>
				widget.x >= minX && widget.x <= maxX &&
				widget.y >= minY && widget.y <= maxY &&
				// Don't return parent
				widget.id !== parent.id);

			return matchingWidgets
				.map(widget => ({
					type,
					value: turndownService.turndown(widget.text).trim(),
				}))
				.filter(hit => hit.value.length > 0);
		})
		.reduce((acc, queryHits) => acc.concat(...queryHits), []);

	return {
		hits,
	};
}
