import type { Crop, FrameSize } from './crop';
import type { OutputSettings } from './output-settings';

export type CaptionFont = 'meme' | 'clean' | 'marker';
export type CaptionColor = 'white' | 'black' | 'yellow' | 'red' | 'blue' | 'green';
export type CaptionSize = 'small' | 'medium' | 'large';

export type Caption = { top: string; bottom: string; font: CaptionFont; color: CaptionColor; size: CaptionSize };

// Self-hosted files in public/fonts, added to the page by loadCaptionFont.
export const CAPTION_FONTS: Record<
	CaptionFont,
	{ label: string; family: string; weight: number; fallback: string; url: string }
> = {
	meme: { label: 'Meme', family: 'Anton', weight: 400, fallback: 'sans-serif', url: '/fonts/anton-latin-400.woff2' },
	clean: { label: 'Clean', family: 'Inter', weight: 700, fallback: 'sans-serif', url: '/fonts/inter-latin-700.woff2' },
	marker: {
		label: 'Marker',
		family: 'Permanent Marker',
		weight: 400,
		fallback: 'cursive',
		url: '/fonts/permanent-marker-latin-400.woff2',
	},
};

export const CAPTION_COLORS: Record<CaptionColor, { label: string; fill: string }> = {
	white: { label: 'White', fill: '#ffffff' },
	black: { label: 'Black', fill: '#000000' },
	yellow: { label: 'Yellow', fill: '#ffe600' },
	red: { label: 'Red', fill: '#ff3b30' },
	blue: { label: 'Blue', fill: '#2f80ed' },
	green: { label: 'Green', fill: '#34c759' },
};

// Font size as a fraction of the frame height.
export const CAPTION_SIZES: Record<CaptionSize, { label: string; scale: number }> = {
	small: { label: 'Small', scale: 0.08 },
	medium: { label: 'Medium', scale: 0.12 },
	large: { label: 'Large', scale: 0.16 },
};

export const DEFAULT_CAPTION: Caption = { top: '', bottom: '', font: 'meme', color: 'white', size: 'medium' };

export class CaptionFontError extends Error {}

const MARGIN = 0.04;
const MAX_WIDTH = 0.9;
const MAX_BLOCK_HEIGHT = 0.4;
const MIN_FONT_PX = 10;
const SHRINK = 0.95;
const LINE_HEIGHT = 1.15;
const OUTLINE = 0.15;

export function hasText({ top, bottom }: Caption): boolean {
	return top.trim() !== '' || bottom.trim() !== '';
}

export function fontSpec(font: CaptionFont, px: number): string {
	const { family, weight, fallback } = CAPTION_FONTS[font];
	return `${weight} ${px}px "${family}", ${fallback}`;
}

// The GIF's pixel size: the kept area, capped at Max width. ffmpeg may round 1 px differently.
export function outputSize(frameSize: FrameSize, crop: Crop | null, settings: OutputSettings): FrameSize {
	const keptWidth = frameSize.width * (crop?.w ?? 1);
	const keptHeight = frameSize.height * (crop?.h ?? 1);
	const width = Math.max(1, Math.round(Math.min(settings.width, keptWidth)));
	return { width, height: Math.max(1, Math.round((width * keptHeight) / keptWidth)) };
}

const fontLoads = new Map<CaptionFont, Promise<void>>();

// Resolves once the font is usable for canvas drawing; a missing or blocked file rejects.
// Uses FontFace rather than CSS @font-face, which stays failed for the page's lifetime,
// so "try again" after a dropped connection can still succeed.
export function loadCaptionFont(font: CaptionFont): Promise<void> {
	let load = fontLoads.get(font);
	if (!load) {
		const { family, weight, url } = CAPTION_FONTS[font];
		load = new FontFace(family, `url(${url}) format('woff2')`, { weight: String(weight) })
			.load()
			.then((face) => {
				document.fonts.add(face);
			})
			.catch((reason: unknown) => {
				fontLoads.delete(font);
				throw new CaptionFontError(`caption font ${family} failed to load`, { cause: reason });
			});
		fontLoads.set(font, load);
	}
	return load;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): { lines: string[]; fits: boolean } {
	const lines: string[] = [];
	let fits = true;
	for (const word of text.split(/\s+/)) {
		if (ctx.measureText(word).width > maxWidth) fits = false;
		const last = lines.at(-1);
		if (last !== undefined && ctx.measureText(`${last} ${word}`).width <= maxWidth) lines[lines.length - 1] = `${last} ${word}`;
		else lines.push(word);
	}
	return { lines, fits };
}

// Largest size up to the chosen one at which every word fits the width and the block fits the height.
function layout(ctx: CanvasRenderingContext2D, text: string, caption: Caption, { width, height }: FrameSize) {
	let px = Math.max(MIN_FONT_PX, CAPTION_SIZES[caption.size].scale * height);
	for (;;) {
		ctx.font = fontSpec(caption.font, px);
		const { lines, fits } = wrap(ctx, text, width * MAX_WIDTH);
		const blockHeight = lines.length * px * LINE_HEIGHT;
		if ((fits && blockHeight <= height * MAX_BLOCK_HEIGHT) || px <= MIN_FONT_PX) return { px, lines, blockHeight };
		px = Math.max(MIN_FONT_PX, px * SHRINK);
	}
}

// The only text-rendering code: draws on a context already sized to `size`, for both preview and GIF.
export function drawCaption(ctx: CanvasRenderingContext2D, caption: Caption, size: FrameSize): void {
	ctx.clearRect(0, 0, size.width, size.height);
	ctx.textAlign = 'center';
	ctx.textBaseline = 'top';
	ctx.lineJoin = 'round';
	ctx.fillStyle = CAPTION_COLORS[caption.color].fill;
	ctx.strokeStyle = caption.color === 'black' ? '#ffffff' : '#000000';
	const margin = size.height * MARGIN;

	for (const [edge, raw] of [['top', caption.top], ['bottom', caption.bottom]] as const) {
		const text = raw.trim();
		if (!text) continue;
		const { px, lines, blockHeight } = layout(ctx, text, caption, size);
		ctx.lineWidth = px * OUTLINE;
		let y = edge === 'top' ? margin : size.height - margin - blockHeight;
		for (const line of lines) {
			ctx.strokeText(line, size.width / 2, y);
			ctx.fillText(line, size.width / 2, y);
			y += px * LINE_HEIGHT;
		}
	}
}

export async function renderCaptionPng(caption: Caption, size: FrameSize): Promise<Blob> {
	await loadCaptionFont(caption.font);
	const canvas = document.createElement('canvas');
	canvas.width = size.width;
	canvas.height = size.height;
	const ctx = canvas.getContext('2d');
	if (!ctx) throw new Error('canvas 2d context unavailable');
	drawCaption(ctx, caption, size);
	const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
	if (!blob) throw new Error('caption image could not be created');
	return blob;
}
