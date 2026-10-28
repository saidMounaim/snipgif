export type VideoFormat = 'mp4' | 'mov' | 'webm' | 'avi';

export type SourceVideo = {
	file: File;
	name: string;
	mimeType: string;
	sizeBytes: number;
	format: VideoFormat;
};

export type VideoFileError = 'multiple' | 'empty' | 'unsupported';
export type VideoFileWarning = 'large';

export type VideoFileResult =
	| { ok: true; video: SourceVideo; warning: VideoFileWarning | null }
	| { ok: false; error: VideoFileError };

export const LARGE_FILE_BYTES = 200 * 1024 * 1024;

export const VIDEO_INPUT_ACCEPT =
	'.mp4,.mov,.webm,.avi,video/mp4,video/quicktime,video/webm,video/x-msvideo';

const FORMAT_BY_EXTENSION: Record<string, VideoFormat> = {
	mp4: 'mp4',
	mov: 'mov',
	webm: 'webm',
	avi: 'avi',
};

const FORMAT_BY_MIME: Record<string, VideoFormat> = {
	'video/mp4': 'mp4',
	'video/quicktime': 'mov',
	'video/webm': 'webm',
	'video/x-msvideo': 'avi',
	'video/avi': 'avi',
	'video/msvideo': 'avi',
};

// Extension wins: many systems report AVI and MOV with an empty or generic MIME type.
function detectFormat(name: string, mimeType: string): VideoFormat | null {
	const dot = name.lastIndexOf('.');
	const extension = dot === -1 ? '' : name.slice(dot + 1).toLowerCase();
	if (extension in FORMAT_BY_EXTENSION) return FORMAT_BY_EXTENSION[extension];
	return FORMAT_BY_MIME[mimeType.toLowerCase()] ?? null;
}

export function validateVideoFiles(files: ArrayLike<File>): VideoFileResult {
	if (files.length !== 1) return { ok: false, error: 'multiple' };

	const file = files[0];
	if (file.size === 0) return { ok: false, error: 'empty' };

	const format = detectFormat(file.name, file.type);
	if (!format) return { ok: false, error: 'unsupported' };

	return {
		ok: true,
		video: {
			file,
			name: file.name,
			mimeType: file.type,
			sizeBytes: file.size,
			format,
		},
		warning: file.size > LARGE_FILE_BYTES ? 'large' : null,
	};
}

export function formatFileSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	const units = ['KB', 'MB', 'GB'];
	let value = bytes / 1024;
	let unit = 0;
	while (value >= 1024 && unit < units.length - 1) {
		value /= 1024;
		unit++;
	}
	return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unit]}`;
}

export function gifFileName(videoName: string): string {
	const dot = videoName.lastIndexOf('.');
	const base = (dot === -1 ? videoName : videoName.slice(0, dot)).trim();
	return `${base || 'snipgif'}.gif`;
}
