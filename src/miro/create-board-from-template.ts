import { Board, MiroApi } from '@mirohq/miro-api';
import {
	AppCardCreateRequest,
	CardCreateRequest,
	DocumentCreateRequest,
	EmbedCreateRequest,
	FrameCreateRequest,
	ImageCreateRequest,
	ShapeCreateRequest,
	StickyNoteCreateRequest,
	TextCreateRequest,
} from '@mirohq/miro-api/dist/api';
import { eachLimit } from 'async';

import {
	Placeholder,
	PlaceholderData,
	Template,
	TemplateItem,
} from '../types/types';
import { createIdMapper } from '../utils/id-mapping';

import { getStickyPositions } from './sticky-layout';

const MAX_STICKY_SIZE_PX = 100;
const STICKY_SEPATATION_PX = 5;

const MAX_WORKERS = 10;
// Parallizing speeds up execution but it increases the risk that items are not correctly layed on top of each other
// For example, frames need to be below stickies.
const MAX_WORKERS_POSSIBLE_OVERLAP = 3;

/**
 * The manager provides high-level functionlity to interact with Miro
 */

export interface CreateBoardRequest {
	accessToken: string;
	template: Template;
	getPlaceholderData: (
		placeholder: Pick<Placeholder, 'query' | 'limit'>,
	) => Promise<PlaceholderData[]>;
}
export interface CreateBoardResponse {
	boardId: string;
	viewLink?: string;
}

async function createItem(
	board: Board,
	item: Pick<TemplateItem, 'type' | 'data'>,
): Promise<{ id: string }> {
	const { type, ...data } = item;

	switch (type) {
		case 'app_card':
			return board.createAppCardItem(data as AppCardCreateRequest);
		case 'card':
			return board.createCardItem(data as CardCreateRequest);
		case 'document':
			return board.createDocumentItem(data as DocumentCreateRequest);
		case 'embed':
			return board.createEmbedItem(data as EmbedCreateRequest);
		case 'frame':
			return board.createFrameItem(data as FrameCreateRequest);
		case 'image':
			return board.createImageItem(data as ImageCreateRequest);
		case 'shape':
			return board.createShapeItem(data as ShapeCreateRequest);
		case 'sticky_note':
			return board.createStickyNoteItem(data as StickyNoteCreateRequest);
		case 'text':
			return board.createTextItem(data as TextCreateRequest);
		default:
			throw new Error(`Unsupported item type ${type}`);
	}
}

function toStickyNoteRequests(
	parentId: string,
	item: TemplateItem,
	datas: PlaceholderData[],
): StickyNoteCreateRequest[] {
	if (!item.geometry?.width || !item.geometry?.height) {
		throw new Error(`Can't place stickies in area without geometry`);
	}

	const { positions, stickySize } = getStickyPositions({
		areaWidth: item.geometry.width,
		areaHeight: item.geometry.height,
		maxStickySize: MAX_STICKY_SIZE_PX,
		numStickies: datas.length,
		separation: STICKY_SEPATATION_PX,
	});

	return datas.map((data, index) => {
		return {
			data: {
				content: data.content,
			},
			style: {
				textAlign: 'center',
				textAlignVertical: 'middle',
				...item.placeholder?.style,
			},
			geometry: {
				width: stickySize,
			},
			parent: {
				id: parentId,
			},
			position: positions[index],
		};
	});
}

const idMapper = createIdMapper();

/**
 * Creates a Miro board with widgets
 */
export async function createBoardFromTemplate(
	req: CreateBoardRequest,
): Promise<CreateBoardResponse> {
	const { accessToken } = req;

	const api = new MiroApi(accessToken);
	console.log(`Creating board...`);
	const board = await api.createBoard({
		// Miro API requires the board name to be max 60 characters long
		name: req.template.name.substr(0, 60),
	});

	console.log(`Creating ${req.template.items.length} items...`);

	const itemsWithPlaceholder: TemplateItem[] = [];

	// Ensure that widgets are created in pre-defined order. This is important
	// to have them overlap in the expected way.
	const handleItem = async (item: TemplateItem) => {
		const { id, type, placeholder, ...data } = item;

		const toBeCreatedItem = { type, ...data };
		if (toBeCreatedItem.parent?.id) {
			const mappedParentId = idMapper.get(toBeCreatedItem.parent?.id)!;
			toBeCreatedItem.parent = { id: mappedParentId };
		}

		try {
			const createdItem = await createItem(board, toBeCreatedItem);
			idMapper.set(id, createdItem.id);

			if (placeholder) {
				itemsWithPlaceholder.push(item);
			}
		} catch (e) {
			console.error(
				`Failed to create item ${JSON.stringify(
					toBeCreatedItem,
				)}: ${JSON.stringify(e)}`,
			);
		}
	};

	const itemsWithoutParents = req.template.items.filter(item => !item.parent);
	const itemsWithParent = req.template.items.filter(item => item.parent);
	await eachLimit(
		itemsWithoutParents,
		MAX_WORKERS_POSSIBLE_OVERLAP,
		handleItem,
	);
	await eachLimit(itemsWithParent, MAX_WORKERS_POSSIBLE_OVERLAP, handleItem);

	console.log(`Filling ${itemsWithPlaceholder.length} placeholders...`);

	let nrStickies = 0;
	for (const item of itemsWithPlaceholder) {
		const placeholderDatas = await req.getPlaceholderData({
			query: item.placeholder!.query,
			limit: item.placeholder!.limit,
		});

		const itemMiroId = idMapper.get(item.id);
		const requests = toStickyNoteRequests(itemMiroId!, item, placeholderDatas);

		await eachLimit(requests, MAX_WORKERS, async request => {
			try {
				await board.createStickyNoteItem(request);
			} catch (e) {
				console.error(`Failed to create sticky note: ${JSON.stringify(e)}`);
			}
		});

		nrStickies += requests.length;
	}

	console.log(`Created ${nrStickies} stickies`);

	return {
		boardId: board.id,
		viewLink: board.viewLink,
	};
}
