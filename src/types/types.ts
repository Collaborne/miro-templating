import { WidgetItem } from '@mirohq/miro-api/dist/highlevel/Item';

export interface Placeholder {
	type: 'sticky_note';
	limit: number;
	query: 'highlight';
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	style?: any;
}

export type TemplateItem = Omit<
	WidgetItem,
	| 'modifiedAt'
	| 'modifiedBy'
	| 'createdAt'
	| 'createdBy'
	| 'boardId'
	| '_api'
	| 'links'
	| 'update'
	| 'delete'
> & {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	style?: any;
	parent?: {
		id: string;
	};
	placeholder?: Placeholder;
};

export interface Template {
	name: string;
	templateId: string;

	items: TemplateItem[];
}

export interface PlaceholderData {
	content: string;
}
