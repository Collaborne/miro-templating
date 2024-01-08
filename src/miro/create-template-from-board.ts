import { Board, MiroApi } from '@mirohq/miro-api';
import {
	FrameData,
	ParentLinksEnvelope,
	StickyNoteData,
} from '@mirohq/miro-api/dist/api';
import { WidgetItem } from '@mirohq/miro-api/dist/highlevel/Item';
// eslint-disable-next-line @typescript-eslint/naming-convention
import TurndownService from 'turndown';

import { Template, TemplateItem } from '../types/types';
import { createIdGenerator } from '../utils/id-mapping';

const MARKER_PLACEHOLDER = '!PLACEHOLDER!';

const turndownService = new TurndownService();

// Prevent error: Only height or width should be passed for widgets with fixed aspect ratio
function fixRemoveDimensionsFromItemWithFixedAspectRatio(item: TemplateItem) {
	if (item.type === 'sticky_note') {
		const data = item.data as StickyNoteData;
		// Somehow Miro considers rectangle to be as well fixed aspect ratio
		if (data.shape === 'square' || data.shape === 'rectangle') {
			if (item.geometry?.height && item.geometry?.width) {
				item.geometry.height = undefined;
			}
		}
	}

	return item;
}

function fixInvalidColor(item: TemplateItem) {
	if (item.style?.color && item.style.color === item.style?.fillColor) {
		item.style.fillColor = undefined;
	}

	return item;
}

function fixInvalidFrameType(item: TemplateItem) {
	if (item.type === 'frame') {
		const data = item.data as FrameData;
		if (data?.type === 'unknown') {
			data.type = undefined;
		}
	}

	return item;
}

function fixItem(item: TemplateItem) {
	return fixRemoveDimensionsFromItemWithFixedAspectRatio(
		fixInvalidColor(fixInvalidFrameType(item)),
	);
}

function extractPlaceholder(item: TemplateItem) {
	if (item.type === 'frame') {
		const data = item.data as FrameData;
		if (data?.title?.includes(MARKER_PLACEHOLDER)) {
			const contentMarkdown = turndownService.turndown(data.title);
			const contentWithoutMarker = contentMarkdown
				.replace(MARKER_PLACEHOLDER, '')
				.replace(/\\_/g, '_');
			try {
				item.placeholder = JSON.parse(contentWithoutMarker);
			} catch (e) {
				console.warn(`Failed to parse placeholder ${contentWithoutMarker}`);
			}

			data.title = '';

			// Clear fill color for placeholder area
			if (item.style?.fillColor) {
				item.style.fillColor = undefined;
			}
		}
	}

	return item;
}

async function loadDetails(
	board: Board,
	item: WidgetItem,
): Promise<
	| {
			style?: unknown;
			parent?: ParentLinksEnvelope;
	  }
	| undefined
> {
	const { id, type } = item;
	switch (type) {
		case 'app_card':
			return board.getAppCardItem(id);
		case 'card':
			return board.getCardItem(id);
		case 'document':
			return board.getDocumentItem(id);
		case 'embed':
			return board.getEmbedItem(id);
		case 'frame':
			return board.getFrameItem(id);
		case 'image':
			return board.getImageItem(id);
		case 'shape':
			return board.getShapeItem(id);
		case 'sticky_note':
			return board.getStickyNoteItem(id);
		case 'text':
			return board.getTextItem(id);
	}

	return undefined;
}

const idGenerator = createIdGenerator();

export async function createTemplateFromBoard(req: {
	miroToken: string;
	boardId: string;
	templateId: string;
}) {
	const api = new MiroApi(req.miroToken);
	const board = await api.getBoard(req.boardId);
	const itemsIt = board.getAllItems({
		accessToken: req.miroToken!,
		boardId: req.boardId!,
	});

	const templateItems: TemplateItem[] = [];
	for await (const item of itemsIt) {
		if (!item.position) {
			// Ignore items that can't be placed afterwards
			continue;
		}

		const details = await loadDetails(board, item);

		const parentId = details?.parent?.id;
		const filteredItem: TemplateItem = {
			id: idGenerator.map(item.id)!,
			type: item.type,
			data: item.data,
			geometry: item.geometry,
			position: item.position,
			parent: parentId ? { id: idGenerator.map(parentId) } : undefined,
			style: details?.style,
		};

		templateItems.push(fixItem(extractPlaceholder(filteredItem)));
	}

	const template: Template = {
		name: `TEMPLATE ${req.templateId}`,
		templateId: req.templateId,

		// Update always items
		items: templateItems,
	};

	return template;
}
