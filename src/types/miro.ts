export type WidgetType = string;
export type ShapeType = string;

export interface Style {
	backgroundColor: string;
	borderColor: string;
	shapeType: string;
}

export interface MetaData {
	[key: string]: any;
}
export interface MiroWidget {
	id: string;
	type: string;
	x: number;
	y: number;
	height: number;
	width: number;
	text: string;
	style: Style;
	metadata?: MetaData;
}
