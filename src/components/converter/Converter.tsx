import { useEffect, useRef, useState } from 'react';
import DropZone from './DropZone';
import TrimTimeline, { type FramePreview } from './TrimTimeline';
import {
	formatFileSize,
	validateVideoFiles,
	type SourceVideo,
	type VideoFileError,
	type VideoFileWarning,
} from '../../lib/video-file';
import { defaultRange, lastFrameSec, type ClipRange } from '../../lib/clip-range';
import {
	convertToGif,
	EngineLoadError,
	extractFrame,
	loadGifEngine,
	prepareInput,
	probeDuration,
	releaseInput,
} from '../../lib/gif-engine';

type ConversionState = 'idle' | 'loading-core' | 'converting' | 'done' | 'error';
type ConversionError = 'load' | 'convert';
type MediaState =
	| { kind: 'checking' }
	| { kind: 'probing' }
	| { kind: 'playable'; durationSec: number }
	| { kind: 'frames'; durationSec: number }
	| { kind: 'unreadable'; reason: 'load' | 'read' };

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

const READ_ERROR_MESSAGE = "We couldn't read this video. Please try another video.";

const STATUS_MESSAGES: Partial<Record<ConversionState, string>> = {
	'loading-core': 'Getting the converter ready...',
	converting: 'Converting your video...',
	done: 'Your GIF is ready.',
};

const FRAME_DEBOUNCE_MS = 300;
const ERROR_ID = 'video-upload-error';
const LOADING_FRAMES = { start: { state: 'loading' }, end: { state: 'loading' } } as const;

export default function Converter() {
	const [video, setVideo] = useState<SourceVideo | null>(null);
	const [error, setError] = useState<VideoFileError | null>(null);
	const [warning, setWarning] = useState<VideoFileWarning | null>(null);
	const [conversion, setConversion] = useState<ConversionState>('idle');
	const [conversionError, setConversionError] = useState<ConversionError | null>(null);
	const [gifUrl, setGifUrl] = useState<string | null>(null);
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);
	const [media, setMedia] = useState<MediaState>({ kind: 'checking' });
	const [range, setRange] = useState<ClipRange | null>(null);
	const [frames, setFrames] = useState<{ start: FramePreview; end: FramePreview }>(LOADING_FRAMES);
	const dropZoneRef = useRef<HTMLButtonElement>(null);
	const selectedRef = useRef<HTMLHeadingElement>(null);
	const returnFocusRef = useRef<'dropzone' | 'selected' | null>(null);
	const gifUrlRef = useRef<string | null>(null);
	const previewUrlRef = useRef<string | null>(null);
	const frameUrlsRef = useRef<{ start: string | null; end: string | null }>({ start: null, end: null });
	const framesShownRef = useRef<{ start: number | null; end: number | null }>({ start: null, end: null });
	// Bumped on every new selection so late async results for an old video are ignored.
	const selectionRef = useRef(0);

	const busy = conversion === 'loading-core' || conversion === 'converting';
	const durationSec = media.kind === 'playable' || media.kind === 'frames' ? media.durationSec : null;

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

	useEffect(
		() => () => {
			clearSelectionResources();
			replaceGifUrl(null);
		},
		[],
	);

	// Still frames for videos the browser can't play, refreshed shortly after a handle stops moving.
	useEffect(() => {
		if (media.kind !== 'frames' || !range || busy) return;
		let cancelled = false;
		const timer = window.setTimeout(async () => {
			for (const edge of ['start', 'end'] as const) {
				const atSec = edge === 'start' ? range.startSec : lastFrameSec(range);
				if (framesShownRef.current[edge] === atSec) continue;
				setFrames((current) => ({ ...current, [edge]: { state: 'loading' } }));
				let next: FramePreview;
				try {
					next = { state: 'ready', url: URL.createObjectURL(await extractFrame(atSec)) };
				} catch {
					next = { state: 'error' };
				}
				// A newer handle position or selection superseded this request.
				if (cancelled) {
					if (next.state === 'ready') URL.revokeObjectURL(next.url);
					return;
				}
				replaceFrameUrl(edge, next.state === 'ready' ? next.url : null);
				framesShownRef.current[edge] = atSec;
				setFrames((current) => ({ ...current, [edge]: next }));
			}
		}, FRAME_DEBOUNCE_MS);
		return () => {
			cancelled = true;
			window.clearTimeout(timer);
		};
	}, [media.kind, range, busy]);

	function replaceGifUrl(url: string | null) {
		if (gifUrlRef.current) URL.revokeObjectURL(gifUrlRef.current);
		gifUrlRef.current = url;
		setGifUrl(url);
	}

	function replaceFrameUrl(edge: 'start' | 'end', url: string | null) {
		const previous = frameUrlsRef.current[edge];
		if (previous) URL.revokeObjectURL(previous);
		frameUrlsRef.current[edge] = url;
	}

	function clearSelectionResources() {
		selectionRef.current++;
		if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
		previewUrlRef.current = null;
		replaceFrameUrl('start', null);
		replaceFrameUrl('end', null);
		framesShownRef.current = { start: null, end: null };
		releaseInput().catch(() => {});
	}

	function resetSelection(next: SourceVideo | null) {
		clearSelectionResources();
		const url = next ? URL.createObjectURL(next.file) : null;
		previewUrlRef.current = url;
		setPreviewUrl(url);
		setMedia({ kind: 'checking' });
		setRange(null);
		setFrames(LOADING_FRAMES);
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
		resetSelection(result.video);
		returnFocusRef.current = 'selected';
		// Start the ~30 MB core download now so it is likely ready by the time Convert is clicked.
		loadGifEngine().catch(() => {});
	}

	function chooseAnother() {
		setVideo(null);
		setError(null);
		setWarning(null);
		resetSelection(null);
		returnFocusRef.current = 'dropzone';
	}

	function handlePlayable(seconds: number) {
		setMedia({ kind: 'playable', durationSec: seconds });
		setRange(defaultRange(seconds));
	}

	async function readWithFfmpeg() {
		if (!video) return;
		const selection = selectionRef.current;
		setMedia({ kind: 'probing' });
		try {
			await prepareInput(video);
			const seconds = await probeDuration();
			if (selection !== selectionRef.current) return;
			setMedia({ kind: 'frames', durationSec: seconds });
			setRange(defaultRange(seconds));
		} catch (caught) {
			if (selection !== selectionRef.current) return;
			setMedia({ kind: 'unreadable', reason: caught instanceof EngineLoadError ? 'load' : 'read' });
		}
	}

	async function convert() {
		if (!video || !range) return;
		replaceGifUrl(null);
		setConversionError(null);
		try {
			setConversion('loading-core');
			await loadGifEngine();
			setConversion('converting');
			const gif = await convertToGif(video, range);
			replaceGifUrl(URL.createObjectURL(gif));
			setConversion('done');
		} catch (caught) {
			setConversion('error');
			setConversionError(caught instanceof EngineLoadError ? 'load' : 'convert');
		}
	}

	const reading = media.kind === 'checking' || media.kind === 'probing';
	const errorText = error
		? ERROR_MESSAGES[error]
		: media.kind === 'unreadable'
			? media.reason === 'load'
				? CONVERSION_ERROR_MESSAGES.load
				: READ_ERROR_MESSAGE
			: conversionError
				? CONVERSION_ERROR_MESSAGES[conversionError]
				: '';
	const statusText = reading ? 'Reading your video...' : STATUS_MESSAGES[conversion];

	return (
		<div className="flex flex-col gap-4">
			{video && previewUrl ? (
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
					{media.kind !== 'unreadable' && media.kind !== 'probing' ? (
						<TrimTimeline
							mode={media.kind === 'checking' ? 'checking' : media.kind}
							previewUrl={previewUrl}
							durationSec={durationSec}
							range={range}
							frames={frames}
							disabled={busy}
							onRangeChange={setRange}
							onPlayable={handlePlayable}
							onUnplayable={readWithFfmpeg}
						/>
					) : null}
					<div className="flex flex-wrap gap-3">
						{media.kind === 'unreadable' && media.reason === 'load' ? (
							<button
								type="button"
								onClick={readWithFfmpeg}
								className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-violet-600"
							>
								Try again
							</button>
						) : (
							<button
								type="button"
								onClick={convert}
								disabled={busy || !range}
								className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-violet-600 disabled:cursor-not-allowed disabled:opacity-60"
							>
								Convert to GIF
							</button>
						)}
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
				{video && statusText ? <p className="text-zinc-700">{statusText}</p> : null}
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
