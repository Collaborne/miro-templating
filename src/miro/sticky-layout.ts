type Position = {
	x: number;
	y: number;
};

function calculateSeparationOffset(params: GetStickyPositionsParams): number {
	return params.separation * (Math.ceil(params.numStickies / 2) - 1);
}

function calculateEffectiveAreaDimension(
	dimension: number,
	separationOffset: number,
): number {
	return dimension - separationOffset;
}

function calculateCenterMargin(
	totalDimension: number,
	totalSize: number,
): number {
	return (totalDimension - totalSize) / 2;
}

function calculatePosition(
	index: number,
	margin: number,
	size: number,
	separation: number,
): number {
	return margin + index * (size + separation) + size / 2;
}

function calculateLayout(
	params: GetStickyPositionsParams,
): [number, number, number] {
	const separationOffset = calculateSeparationOffset(params);
	const effectiveWidth = calculateEffectiveAreaDimension(
		params.areaWidth,
		separationOffset,
	);
	const effectiveHeight = calculateEffectiveAreaDimension(
		params.areaHeight,
		separationOffset,
	);
	const maxStickySizeWithSeparation = Math.min(
		params.maxStickySize,
		effectiveWidth,
		effectiveHeight,
	);

	for (let size = maxStickySizeWithSeparation; size > 0; size--) {
		for (let rows = 1; rows <= params.numStickies; rows++) {
			const cols = Math.ceil(params.numStickies / rows);
			if (
				(size + params.separation) * (rows - 1) + size <= params.areaHeight &&
				(size + params.separation) * (cols - 1) + size <= params.areaWidth
			) {
				return [size, rows, cols];
			}
		}
	}
	return [0, 0, 0]; // No suitable layout found
}

function calculatePositions(
	params: GetStickyPositionsParams & {
		stickySize: number;
		rows: number;
		cols: number;
	},
): Position[] {
	const horizontalMargin = calculateCenterMargin(
		params.areaWidth,
		params.cols * params.stickySize + (params.cols - 1) * params.separation,
	);
	const verticalMargin = calculateCenterMargin(
		params.areaHeight,
		params.rows * params.stickySize + (params.rows - 1) * params.separation,
	);
	const positions: Position[] = [];

	for (let row = 0; row < params.rows; row++) {
		for (let col = 0; col < params.cols; col++) {
			if (positions.length === params.numStickies) {
				break;
			}
			const x = calculatePosition(
				col,
				horizontalMargin,
				params.stickySize,
				params.separation,
			);
			const y = calculatePosition(
				row,
				verticalMargin,
				params.stickySize,
				params.separation,
			);
			positions.push({ x, y });
		}
		if (positions.length === params.numStickies) {
			break;
		}
	}
	return positions;
}

export interface GetStickyPositionsParams {
	areaWidth: number;
	areaHeight: number;
	maxStickySize: number;
	numStickies: number;
	separation: number;
}

/**
 * Distributes stickies in a given area
 */
export function getStickyPositions(params: GetStickyPositionsParams) {
	const [stickySize, rows, cols] = calculateLayout(params);
	const positions = calculatePositions({ ...params, stickySize, rows, cols });

	return {
		stickySize,
		positions,
	};
}
