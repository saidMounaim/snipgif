import { LARGE_FILE_BYTES } from './video-file';

export type SourceGif = { file: File; name: string; sizeBytes: number };

export type GifFileError = 'multiple' | 'empty' | 'unsupported';
export type GifFileWarning = 'large';

export type GifFileResult =
	| { ok: true; gif: SourceGif; warning: GifFileWarning | null }
	| { ok: false; error: GifFileError };

export type GifColors = 256 | 128 | 64 | 32;
export type FrameStep = 1 | 2 | 3;

export type GifSettings = { colors: GifColors; frameStep: FrameStep; width: number };

export const GIF_INPUT_ACCEPT = '.gif,image/gif';

export const COLOR_CHOICES: GifColors[] = [256, 128, 64, 32];

export const FRAME_STEPS: Record<FrameStep, string> = { 1: 'Keep all', 2: 'Every 2nd', 3: 'Every 3rd' };

export const MIN_GIF_WIDTH = 160;

export function defaultGifSettings(sourceWidth: number): GifSettings {
	return { colors: 128, frameStep: 1, width: sourceWidth };
}

// Extension wins, as for videos; the MIME type only counts when there is no extension.
function isGif(name: string, mimeType: string): boolean {
	const dot = name.lastIndexOf('.');
	if (dot !== -1) return name.slice(dot + 1).toLowerCase() === 'gif';
	return mimeType.toLowerCase() === 'image/gif';
}

export function validateGifFiles(files: ArrayLike<File>): GifFileResult {
	if (files.length !== 1) return { ok: false, error: 'multiple' };

	const file = files[0];
	if (file.size === 0) return { ok: false, error: 'empty' };
	if (!isGif(file.name, file.type)) return { ok: false, error: 'unsupported' };

	return {
		ok: true,
		gif: { file, name: file.name, sizeBytes: file.size },
		warning: file.size > LARGE_FILE_BYTES ? 'large' : null,
	};
}

export function compressedFileName(name: string): string {
	const dot = name.lastIndexOf('.');
	const base = (dot === -1 ? name : name.slice(0, dot)).trim();
	return `${base || 'snipgif'}-compressed.gif`;
}
