import { useEffect, useRef, useState } from 'react';
import DropZone from './DropZone';
import {
	formatFileSize,
	validateVideoFiles,
	type SourceVideo,
	type VideoFileError,
	type VideoFileWarning,
} from '../../lib/video-file';
import { convertToGif, EngineLoadError, GIF_SETTINGS, loadGifEngine } from '../../lib/gif-engine';

type ConversionState = 'idle' | 'loading-core' | 'converting' | 'done' | 'error';
type ConversionError = 'load' | 'convert';

const ERROR_MESSAGES: Record<VideoFileError, string> = {
	multiple: 'Please drop one video at a time.',
	empty: 'This file is empty. Please choose another video.',
	unsupported:
		"This file type isn't supported. Please choose an MP4, MOV, WebM, or AVI video.",
};

const WARNING_MESSAGES: Record<VideoFileWarning, string> = {
	large:
		'This video is over 200 MB. Large videos can be slow or fail on some devices, especially phones.',
};

const CONVERSION_ERROR_MESSAGES: Record<ConversionError, string> = {
	load: "The converter couldn't load. Check your connection and try again.",
	convert: 'Something went wrong converting this video. Please try another video.',
};

const STATUS_MESSAGES: Partial<Record<ConversionState, string>> = {
	'loading-core': 'Getting the converter ready...',
	converting: 'Converting your video...',
	done: 'Your GIF is ready.',
};

const ERROR_ID = 'video-upload-error';

export default function Converter() {
	const [video, setVideo] = useState<SourceVideo | null>(null);
	const [error, setError] = useState<VideoFileError | null>(null);
	const [warning, setWarning] = useState<VideoFileWarning | null>(null);
	const [conversion, setConversion] = useState<ConversionState>('idle');
	const [conversionError, setConversionError] = useState<ConversionError | null>(null);
	const [gifUrl, setGifUrl] = useState<string | null>(null);
	const dropZoneRef = useRef<HTMLButtonElement>(null);
	const selectedRef = useRef<HTMLHeadingElement>(null);
	const returnFocusRef = useRef<'dropzone' | 'selected' | null>(null);
	const gifUrlRef = useRef<string | null>(null);

	const busy = conversion === 'loading-core' || conversion === 'converting';

	// Without this, a file dropped outside the zone makes the browser navigate to it.
	useEffect(() => {
		const preventFileOpen = (event: DragEvent) => {
			if (event.defaultPrevented || !event.dataTransfer?.types.includes('Files')) return;
			event.preventDefault();
			event.dataTransfer.dropEffect = 'none';
		};
		window.addEventListener('dragover', preventFileOpen);
		window.addEventListener('drop', preventFileOpen);
		return () => {
			window.removeEventListener('dragover', preventFileOpen);
			window.removeEventListener('drop', preventFileOpen);
		};
	}, []);

	useEffect(() => {
		if (returnFocusRef.current === 'selected') selectedRef.current?.focus();
		if (returnFocusRef.current === 'dropzone') dropZoneRef.current?.focus();
		returnFocusRef.current = null;
	}, [video]);

	useEffect(() => () => replaceGifUrl(null), []);

	function replaceGifUrl(url: string | null) {
		if (gifUrlRef.current) URL.revokeObjectURL(gifUrlRef.current);
		gifUrlRef.current = url;
		setGifUrl(url);
	}

	function resetConversion() {
		replaceGifUrl(null);
		setConversion('idle');
		setConversionError(null);
	}

	function handleFiles(files: FileList) {
		const result = validateVideoFiles(files);
		if (!result.ok) {
			setError(result.error);
			return;
		}
		setError(null);
		setWarning(result.warning);
		setVideo(result.video);
		resetConversion();
		returnFocusRef.current = 'selected';
		// Start the ~30 MB core download now so it is likely ready by the time Convert is clicked.
		loadGifEngine().catch(() => {});
	}

	function chooseAnother() {
		setVideo(null);
		setError(null);
		setWarning(null);
		resetConversion();
		returnFocusRef.current = 'dropzone';
	}

	async function convert() {
		if (!video) return;
		replaceGifUrl(null);
		setConversionError(null);
		try {
			setConversion('loading-core');
			await loadGifEngine();
			setConversion('converting');
			const gif = await convertToGif(video);
			replaceGifUrl(URL.createObjectURL(gif));
			setConversion('done');
		} catch (caught) {
			setConversion('error');
			setConversionError(caught instanceof EngineLoadError ? 'load' : 'convert');
		}
	}

	const errorText = error
		? ERROR_MESSAGES[error]
		: conversionError
			? CONVERSION_ERROR_MESSAGES[conversionError]
			: '';

	return (
		<div className="flex flex-col gap-4">
			{video ? (
				<div className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-6">
					<div className="flex flex-col gap-1">
						<h2
							ref={selectedRef}
							tabIndex={-1}
							className="break-all text-lg font-semibold text-zinc-900 focus:outline-none"
						>
							{video.name}
						</h2>
						<p className="text-sm text-zinc-600">
							{formatFileSize(video.sizeBytes)} · {video.format.toUpperCase()}
						</p>
					</div>
					<p className="text-sm text-zinc-600">
						Snipgif uses the first {GIF_SETTINGS.maxSeconds} seconds of your video.
					</p>
					<div className="flex flex-wrap gap-3">
						<button
							type="button"
							onClick={convert}
							disabled={busy}
							className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-violet-600 disabled:cursor-not-allowed disabled:opacity-60"
						>
							Convert to GIF
						</button>
						<button
							type="button"
							onClick={chooseAnother}
							disabled={busy}
							className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-violet-600 disabled:cursor-not-allowed disabled:opacity-60"
						>
							Choose another video
						</button>
					</div>
				</div>
			) : (
				<DropZone onFiles={handleFiles} describedBy={ERROR_ID} buttonRef={dropZoneRef} />
			)}

			<p id={ERROR_ID} role="alert" className="text-sm font-medium text-red-700 empty:hidden">
				{errorText}
			</p>
			<div aria-live="polite" className="flex flex-col gap-1 text-sm font-medium empty:hidden">
				{video && warning ? <p className="text-amber-800">{WARNING_MESSAGES[warning]}</p> : null}
				{video && STATUS_MESSAGES[conversion] ? (
					<p className="text-zinc-700">{STATUS_MESSAGES[conversion]}</p>
				) : null}
			</div>

			{video && gifUrl ? (
				<img
					src={gifUrl}
					alt={`GIF made from ${video.name}`}
					className="h-auto max-w-full self-center rounded-xl border border-zinc-200"
				/>
			) : null}
		</div>
	);
}
