export type CropAspect = '1:1' | '16:9' | '9:16';

// Fractions (0 to 1) of the frame as displayed, after any rotation the browser and ffmpeg apply.
export type Crop = { aspect: CropAspect; x: number; y: number; w: number; h: number };

export type FrameSize = { width: number; height: number };

export const CROP_ASPECTS: Record<CropAspect, { label: string; ratio: number }> = {
	'1:1': { label: 'Square 1:1', ratio: 1 },
	'16:9': { label: 'Landscape 16:9', ratio: 16 / 9 },
	'9:16': { label: 'Portrait 9:16', ratio: 9 / 16 },
};

// Within this, a ratio counts as the source's own shape and the crop keeps the whole frame.
const SAME_SHAPE = 0.01;

const clamp = (value: number, low: number, high: number) => Math.min(Math.max(value, low), high);

// The largest crop of a ratio always spans the full width or the full height.
export function centeredCrop(aspect: CropAspect, { width, height }: FrameSize): Crop {
	const ratio = CROP_ASPECTS[aspect].ratio;
	const source = width / height;
	if (Math.abs(ratio / source - 1) <= SAME_SHAPE) return { aspect, x: 0, y: 0, w: 1, h: 1 };
	const [w, h] = ratio < source ? [ratio / source, 1] : [1, source / ratio];
	return { aspect, x: (1 - w) / 2, y: (1 - h) / 2, w, h };
}

export function cropAxis(crop: Crop): 'x' | 'y' | null {
	if (crop.w < 1) return 'x';
	if (crop.h < 1) return 'y';
	return null;
}

// Position along the free axis: 0 is the left or top edge, 1 the right or bottom edge.
export function cropPosition(crop: Crop): number {
	const axis = cropAxis(crop);
	if (axis === 'x') return crop.x / (1 - crop.w);
	if (axis === 'y') return crop.y / (1 - crop.h);
	return 0.5;
}

export function moveCrop(crop: Crop, position: number): Crop {
	const p = clamp(position, 0, 1);
	const axis = cropAxis(crop);
	if (axis === 'x') return { ...crop, x: p * (1 - crop.w) };
	if (axis === 'y') return { ...crop, y: p * (1 - crop.h) };
	return crop;
}

export function cropFilter({ x, y, w, h }: Crop): string {
	const f = (n: number) => n.toFixed(4);
	return `crop=iw*${f(w)}:ih*${f(h)}:iw*${f(x)}:ih*${f(y)}`;
}
