import { useEffect, useRef, useState } from 'react';
import { FileVideo, RefreshCw, RotateCcw, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import CropPanel from './CropPanel';
import DropZone from './DropZone';
import GifResult, { type ResultFeedback } from './GifResult';
import OutputSettingsPanel from './OutputSettingsPanel';
import PlaybackPanel, { PLAYBACK_LIMIT_ID } from './PlaybackPanel';
import TextPanel from './TextPanel';
import TrimTimeline, { type FramePreview } from './TrimTimeline';
import {
	formatFileSize,
	gifFileName,
	validateVideoFiles,
	VIDEO_INPUT_ACCEPT,
	type SourceVideo,
	type VideoFileError,
	type VideoFileWarning,
} from '../../lib/video-file';
import { defaultRange, lastFrameSec, type ClipRange } from '../../lib/clip-range';
import type { Crop, FrameSize } from '../../lib/crop';
import { DEFAULT_PRESET, presetSettings, type OutputSettings } from '../../lib/output-settings';
import { DEFAULT_PLAYBACK, tooLong, type Playback } from '../../lib/playback';
import {
	CaptionFontError,
	DEFAULT_CAPTION,
	hasText,
	outputSize,
	renderCaptionPng,
	type Caption,
} from '../../lib/caption';
import {
	convertToGif,
	EngineLoadError,
	extractFrame,
	type GifResult as GifResultData,
	loadGifEngine,
	MemoryError,
	prepareInput,
	probeDuration,
	releaseInput,
	UnsupportedVideoError,
} from '../../lib/gif-engine';

type ConversionState = 'idle' | 'loading-core' | 'converting' | 'done' | 'error';
type ConversionError = 'load' | 'memory' | 'unsupported' | 'font' | 'convert';
type MediaState =
	| { kind: 'checking' }
	| { kind: 'probing' }
	| { kind: 'playable'; durationSec: number }
	| { kind: 'frames'; durationSec: number }
	| { kind: 'unreadable'; reason: 'load' | 'memory' | 'read' };

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
	memory:
		'Your device ran out of memory making this GIF. Try a shorter clip, a smaller width, or the Small for chat preset.',
	unsupported: "We can't convert this video's contents, even though the file type is supported. Try another video.",
	font: "The text font couldn't load. Check your connection and try again.",
	convert: 'Something went wrong converting this video. Please try another video.',
};

const READ_ERROR_MESSAGE = "We couldn't read this video. Please try another video.";
const READ_MEMORY_MESSAGE = "This video is too large for your device's memory. Try a shorter or smaller video.";

const STATUS_MESSAGES: Partial<Record<ConversionState, string>> = {
	'loading-core': 'Getting the converter ready...',
	converting: 'Converting your video...',
	done: 'Your GIF is ready.',
};

const FRAME_DEBOUNCE_MS = 300;
const ERROR_ID = 'video-upload-error';
const STATUS_ID = 'conversion-status';
const LOADING_FRAMES = { start: { state: 'loading' }, end: { state: 'loading' } } as const;

export default function Converter() {
	const [video, setVideo] = useState<SourceVideo | null>(null);
	const [error, setError] = useState<VideoFileError | null>(null);
	const [warning, setWarning] = useState<VideoFileWarning | null>(null);
	const [conversion, setConversion] = useState<ConversionState>('idle');
	const [conversionError, setConversionError] = useState<ConversionError | null>(null);
	const [progress, setProgress] = useState(0);
	const [gif, setGif] = useState<GifResultData | null>(null);
	const [feedback, setFeedback] = useState<ResultFeedback | null>(null);
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);
	const [media, setMedia] = useState<MediaState>({ kind: 'checking' });
	const [range, setRange] = useState<ClipRange | null>(null);
	const [settings, setSettings] = useState<OutputSettings>(() => presetSettings(DEFAULT_PRESET));
	const [frames, setFrames] = useState<{ start: FramePreview; end: FramePreview }>(LOADING_FRAMES);
	const [frameSize, setFrameSize] = useState<FrameSize | null>(null);
	const [crop, setCrop] = useState<Crop | null>(null);
	const [playback, setPlayback] = useState<Playback>(DEFAULT_PLAYBACK);
	const [caption, setCaption] = useState<Caption>(DEFAULT_CAPTION);
	const dropZoneRef = useRef<HTMLButtonElement>(null);
	const selectedRef = useRef<HTMLHeadingElement>(null);
	const returnFocusRef = useRef<'dropzone' | 'selected' | null>(null);
	const gifRef = useRef<GifResultData | null>(null);
	const previewUrlRef = useRef<string | null>(null);
	const frameUrlsRef = useRef<{ start: string | null; end: string | null }>({ start: null, end: null });
	const framesShownRef = useRef<{ start: number | null; end: number | null }>({ start: null, end: null });
	// Bumped on every new selection so late async results for an old video are ignored.
	const selectionRef = useRef(0);

	const busy = conversion === 'loading-core' || conversion === 'converting';
	const durationSec = media.kind === 'playable' || media.kind === 'frames' ? media.durationSec : null;
	const gifTooLong = range !== null && tooLong(range, playback);
	// The GIF's pixel size, once the frame shape is known; text is drawn at exactly this size.
	const gifSize = frameSize ? outputSize(frameSize, crop, settings) : null;
	const frameUnavailable = !frameSize && media.kind === 'frames' && frames.start.state === 'error';

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
			replaceGif(null);
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

	function replaceGif(next: GifResultData | null) {
		if (gifRef.current) URL.revokeObjectURL(gifRef.current.objectUrl);
		gifRef.current = next;
		setGif(next);
		setFeedback(null);
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
		setSettings(presetSettings(DEFAULT_PRESET));
		setFrames(LOADING_FRAMES);
		setFrameSize(null);
		setCrop(null);
		setPlayback(DEFAULT_PLAYBACK);
		setCaption(DEFAULT_CAPTION);
		replaceGif(null);
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

	function handlePlayable(seconds: number, size: FrameSize) {
		setFrameSize(size);
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
			const reason = caught instanceof EngineLoadError ? 'load' : caught instanceof MemoryError ? 'memory' : 'read';
			setMedia({ kind: 'unreadable', reason });
		}
	}

	async function convert() {
		if (!video || !range || gifTooLong) return;
		replaceGif(null);
		setConversionError(null);
		setProgress(0);
		try {
			setConversion('loading-core');
			const textImage = gifSize && hasText(caption) ? await renderCaptionPng(caption, gifSize) : null;
			await loadGifEngine();
			setConversion('converting');
			const blob = await convertToGif(video, range, settings, crop, playback, textImage, (fraction) =>
				setProgress((current) => Math.max(current, fraction)),
			);
			replaceGif({ blob, objectUrl: URL.createObjectURL(blob), sizeBytes: blob.size });
			setConversion('done');
		} catch (caught) {
			setConversion('error');
			setConversionError(
				caught instanceof EngineLoadError
					? 'load'
					: caught instanceof MemoryError
						? 'memory'
						: caught instanceof UnsupportedVideoError
							? 'unsupported'
							: caught instanceof CaptionFontError
								? 'font'
								: 'convert',
			);
		}
	}

	const reading = media.kind === 'checking' || media.kind === 'probing';
	const errorText = error
		? ERROR_MESSAGES[error]
		: media.kind === 'unreadable'
			? media.reason === 'load'
				? CONVERSION_ERROR_MESSAGES.load
				: media.reason === 'memory'
					? READ_MEMORY_MESSAGE
					: READ_ERROR_MESSAGE
			: conversionError
				? CONVERSION_ERROR_MESSAGES[conversionError]
				: feedback?.tone === 'error'
					? feedback.text
					: '';
	const statusText = reading ? 'Reading your video...' : STATUS_MESSAGES[conversion];

	return (
		<div className="flex flex-col gap-4">
			{video && previewUrl ? (
				<Card className="gap-6 rounded-3xl p-6 shadow-xl shadow-primary/5 sm:p-8">
					<div className="flex items-start gap-3">
						<span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand text-white shadow-md shadow-primary/25">
							<FileVideo className="size-5" />
						</span>
						<div className="flex min-w-0 flex-col gap-1.5">
							<h2
								ref={selectedRef}
								tabIndex={-1}
								className="break-all text-lg font-semibold text-foreground focus:outline-none"
							>
								{video.name}
							</h2>
							<div className="flex flex-wrap gap-1.5">
								<Badge variant="secondary">{formatFileSize(video.sizeBytes)}</Badge>
								<Badge variant="outline">{video.format.toUpperCase()}</Badge>
							</div>
						</div>
					</div>
					{media.kind !== 'unreadable' && media.kind !== 'probing' ? (
						<TrimTimeline
							mode={media.kind === 'checking' ? 'checking' : media.kind}
							previewUrl={previewUrl}
							durationSec={durationSec}
							range={range}
							frames={frames}
							frameSize={frameSize}
							crop={crop}
							caption={gifSize && hasText(caption) ? { caption, size: gifSize } : null}
							disabled={busy}
							onRangeChange={setRange}
							onCropChange={setCrop}
							onPlayable={handlePlayable}
							onFrameSize={setFrameSize}
							onUnplayable={readWithFfmpeg}
						/>
					) : null}
					{range ? (
						<CropPanel
							crop={crop}
							frameSize={frameSize}
							unavailable={frameUnavailable}
							disabled={busy}
							onChange={setCrop}
						/>
					) : null}
					{range ? (
						<PlaybackPanel playback={playback} range={range} disabled={busy} onChange={setPlayback} />
					) : null}
					{range ? (
						<TextPanel
							caption={caption}
							unavailable={frameUnavailable}
							disabled={busy || !frameSize}
							onChange={setCaption}
						/>
					) : null}
					{range ? <OutputSettingsPanel settings={settings} disabled={busy} onChange={setSettings} /> : null}
					<div className="flex flex-wrap gap-3 border-t border-border pt-6">
						{media.kind === 'unreadable' && media.reason === 'load' ? (
							<Button type="button" variant="brand" size="lg" onClick={readWithFfmpeg}>
								<RotateCcw aria-hidden="true" />
								Try again
							</Button>
						) : (
							<Button
								type="button"
								variant="brand"
								size="lg"
								onClick={convert}
								disabled={busy || !range || gifTooLong}
								aria-describedby={gifTooLong ? PLAYBACK_LIMIT_ID : undefined}
							>
								<Sparkles aria-hidden="true" />
								Convert to GIF
							</Button>
						)}
						<Button type="button" variant="outline" size="lg" onClick={chooseAnother} disabled={busy}>
							<RefreshCw aria-hidden="true" />
							Choose another video
						</Button>
					</div>
				</Card>
			) : (
				<DropZone
					title="Drop a video here or click to choose"
					hint="MP4, MOV, WebM, or AVI"
					accept={VIDEO_INPUT_ACCEPT}
					onFiles={handleFiles}
					describedBy={ERROR_ID}
					buttonRef={dropZoneRef}
				/>
			)}

			<p
				id={ERROR_ID}
				role="alert"
				className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive empty:hidden"
			>
				{errorText}
			</p>
			<div aria-live="polite" className="flex flex-col gap-1 text-sm font-medium empty:hidden">
				{video && warning ? <p className="text-warning">{WARNING_MESSAGES[warning]}</p> : null}
				{video && statusText ? (
					<p id={STATUS_ID} className="text-muted-foreground">
						{statusText}
					</p>
				) : null}
				{video && feedback?.tone === 'status' ? <p className="text-muted-foreground">{feedback.text}</p> : null}
			</div>
			{busy ? (
				// Outside the live region so screen readers hear the status once, not every percent.
				<div className="flex items-center gap-3">
					<Progress
						aria-labelledby={STATUS_ID}
						value={conversion === 'converting' ? Math.round(progress * 100) : null}
					/>
					{conversion === 'converting' ? (
						<span className="w-10 text-right text-sm font-medium tabular-nums text-muted-foreground">
							{Math.round(progress * 100)}%
						</span>
					) : null}
				</div>
			) : null}

			{video && gif ? (
				<GifResult
					result={gif}
					fileName={gifFileName(video.name)}
					alt={`GIF made from ${video.name}`}
					onFeedback={setFeedback}
				/>
			) : null}
		</div>
	);
}
