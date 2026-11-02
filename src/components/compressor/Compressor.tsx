import { useEffect, useRef, useState } from 'react';
import { Image, Minimize2, RefreshCw, SlidersHorizontal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CHOICE, FIELD_LABEL, PANEL, PANEL_HEADING, PANEL_ICON, SLIDER } from '@/components/ui/form-styles';
import DropZone from '../converter/DropZone';
import GifResult, { type ResultFeedback } from '../converter/GifResult';
import {
	COLOR_CHOICES,
	compressedFileName,
	defaultGifSettings,
	FRAME_STEPS,
	GIF_INPUT_ACCEPT,
	MIN_GIF_WIDTH,
	validateGifFiles,
	type FrameStep,
	type GifFileError,
	type GifFileWarning,
	type GifSettings,
	type SourceGif,
} from '../../lib/gif-file';
import { track } from '../../lib/analytics';
import { formatFileSize } from '../../lib/video-file';
import {
	compressGif,
	EngineLoadError,
	type GifResult as GifResultData,
	loadGifEngine,
	MemoryError,
	UnsupportedVideoError,
} from '../../lib/gif-engine';

type CompressionState = 'idle' | 'loading-core' | 'compressing' | 'done' | 'error';
type CompressionError = 'load' | 'memory' | 'unsupported' | 'convert';
type Source = { state: 'reading' } | { state: 'ready'; width: number; height: number } | { state: 'unreadable' };

const ERROR_MESSAGES: Record<GifFileError, string> = {
	multiple: 'Please drop one GIF at a time.',
	empty: 'This file is empty. Please choose another GIF.',
	unsupported: "This file type isn't supported. Please choose a GIF.",
};

const WARNING_MESSAGES: Record<GifFileWarning, string> = {
	large: 'This GIF is over 200 MB. Large GIFs can be slow or fail on some devices, especially phones.',
};

const COMPRESSION_ERROR_MESSAGES: Record<CompressionError, string> = {
	load: "The converter couldn't load. Check your connection and try again.",
	memory: 'Your device ran out of memory compressing this GIF. Try a smaller width or skipping frames.',
	unsupported: "We can't compress this GIF's contents, even though the file type is supported. Try another GIF.",
	convert: 'Something went wrong compressing this GIF. Please try another GIF.',
};

const UNREADABLE_MESSAGE = "We couldn't read this GIF. Please try another GIF.";
const LARGER_NOTE =
	'This GIF was already well compressed, so the result is larger. Try fewer colors, skipping frames, or a smaller width.';

const STATUS_MESSAGES: Partial<Record<CompressionState, string>> = {
	'loading-core': 'Getting the converter ready...',
	compressing: 'Compressing your GIF...',
	done: 'Your GIF is ready.',
};

const ERROR_ID = 'gif-upload-error';
const STATUS_ID = 'compression-status';


function sizeChange(before: number, after: number): string {
	const percent = Math.round((Math.abs(before - after) / before) * 100);
	return `${formatFileSize(before)} → ${formatFileSize(after)} (${percent}% ${after < before ? 'smaller' : 'larger'})`;
}

export default function Compressor() {
	const [gif, setGif] = useState<SourceGif | null>(null);
	const [error, setError] = useState<GifFileError | null>(null);
	const [warning, setWarning] = useState<GifFileWarning | null>(null);
	const [originalUrl, setOriginalUrl] = useState<string | null>(null);
	const [source, setSource] = useState<Source>({ state: 'reading' });
	const [settings, setSettings] = useState<GifSettings | null>(null);
	const [compression, setCompression] = useState<CompressionState>('idle');
	const [compressionError, setCompressionError] = useState<CompressionError | null>(null);
	const [result, setResult] = useState<GifResultData | null>(null);
	const [feedback, setFeedback] = useState<ResultFeedback | null>(null);
	const dropZoneRef = useRef<HTMLButtonElement>(null);
	const selectedRef = useRef<HTMLHeadingElement>(null);
	const returnFocusRef = useRef<'dropzone' | 'selected' | null>(null);
	const originalUrlRef = useRef<string | null>(null);
	const resultRef = useRef<GifResultData | null>(null);

	const busy = compression === 'loading-core' || compression === 'compressing';

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
	}, [gif]);

	useEffect(
		() => () => {
			replaceOriginalUrl(null);
			replaceResult(null);
		},
		[],
	);

	function replaceOriginalUrl(url: string | null) {
		if (originalUrlRef.current) URL.revokeObjectURL(originalUrlRef.current);
		originalUrlRef.current = url;
		setOriginalUrl(url);
	}

	function replaceResult(next: GifResultData | null) {
		if (resultRef.current) URL.revokeObjectURL(resultRef.current.objectUrl);
		resultRef.current = next;
		setResult(next);
		setFeedback(null);
	}

	function resetSelection(next: SourceGif | null) {
		replaceOriginalUrl(next ? URL.createObjectURL(next.file) : null);
		setSource({ state: 'reading' });
		setSettings(null);
		replaceResult(null);
		setCompression('idle');
		setCompressionError(null);
	}

	function handleFiles(files: FileList) {
		const validated = validateGifFiles(files);
		if (!validated.ok) {
			setError(validated.error);
			track('file_rejected', { tool: 'compressor', error: validated.error });
			return;
		}
		setError(null);
		setWarning(validated.warning);
		setGif(validated.gif);
		resetSelection(validated.gif);
		returnFocusRef.current = 'selected';
		// Start the ~30 MB core download now so it is likely ready by the time Compress is clicked.
		loadGifEngine().catch(() => {});
	}

	function chooseAnother() {
		setGif(null);
		setError(null);
		setWarning(null);
		resetSelection(null);
		returnFocusRef.current = 'dropzone';
	}

	function handleLoad(width: number, height: number) {
		if (width === 0 || height === 0) {
			setSource({ state: 'unreadable' });
			return;
		}
		setSource({ state: 'ready', width, height });
		setSettings(defaultGifSettings(width));
	}

	async function compress() {
		if (!gif || !settings || source.state !== 'ready') return;
		replaceResult(null);
		setCompressionError(null);
		const details = {
			tool: 'compressor',
			colors: settings.colors,
			frame_step: settings.frameStep,
			resized: settings.width < source.width,
		};
		try {
			track('conversion_start', details);
			setCompression('loading-core');
			await loadGifEngine();
			setCompression('compressing');
			const blob = await compressGif(gif.file, settings, source.width);
			replaceResult({ blob, objectUrl: URL.createObjectURL(blob), sizeBytes: blob.size });
			setCompression('done');
			track('conversion_complete', details);
		} catch (caught) {
			const reason: CompressionError =
				caught instanceof EngineLoadError
					? 'load'
					: caught instanceof MemoryError
						? 'memory'
						: caught instanceof UnsupportedVideoError
							? 'unsupported'
							: 'convert';
			setCompression('error');
			setCompressionError(reason);
			track('conversion_error', { tool: 'compressor', error: reason });
		}
	}

	const errorText = error
		? ERROR_MESSAGES[error]
		: source.state === 'unreadable' && gif
			? UNREADABLE_MESSAGE
			: compressionError
				? COMPRESSION_ERROR_MESSAGES[compressionError]
				: feedback?.tone === 'error'
					? feedback.text
					: '';
	const statusText = STATUS_MESSAGES[compression];

	return (
		<div className="flex flex-col gap-4">
			{gif && originalUrl ? (
				<Card className="gap-6 rounded-3xl p-6 shadow-xl shadow-primary/5 sm:p-8">
					<div className="flex items-start gap-3">
						<span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand text-brand-foreground shadow-md shadow-primary/25">
							<Image className="size-5" />
						</span>
						<div className="flex min-w-0 flex-col gap-1.5">
							<h2
								ref={selectedRef}
								tabIndex={-1}
								className="break-all text-lg font-semibold text-foreground focus:outline-none"
							>
								{gif.name}
							</h2>
							<div className="flex flex-wrap gap-1.5">
								<Badge variant="secondary">{formatFileSize(gif.sizeBytes)}</Badge>
								{source.state === 'ready' ? (
									<Badge variant="outline">
										{source.width} × {source.height}
									</Badge>
								) : null}
							</div>
						</div>
					</div>
					{source.state !== 'unreadable' ? (
						<img
							src={originalUrl}
							alt={`Original GIF: ${gif.name}`}
							onLoad={(event) => handleLoad(event.currentTarget.naturalWidth, event.currentTarget.naturalHeight)}
							onError={() => setSource({ state: 'unreadable' })}
							className="h-auto max-h-72 max-w-full self-center rounded-2xl shadow-lg ring-1 ring-foreground/10"
						/>
					) : null}

					{settings && source.state === 'ready' ? (
						<div className={PANEL}>
							<h3 className={PANEL_HEADING}>
								<span aria-hidden="true" className={PANEL_ICON}>
									<SlidersHorizontal />
								</span>
								Compression settings
							</h3>

							<fieldset disabled={busy} className="flex flex-col gap-2">
								<legend className={`mb-2 ${FIELD_LABEL}`}>Colors</legend>
								<div className="flex flex-wrap gap-2">
									{COLOR_CHOICES.map((colors) => (
										<label key={colors} className={CHOICE}>
											<input
												type="radio"
												name="gif-colors"
												value={colors}
												checked={settings.colors === colors}
												onChange={() => setSettings({ ...settings, colors })}
												className="sr-only"
											/>
											{colors}
										</label>
									))}
								</div>
							</fieldset>

							<fieldset disabled={busy} className="flex flex-col gap-2">
								<legend className={`mb-2 ${FIELD_LABEL}`}>Frames</legend>
								<div className="flex flex-wrap gap-2">
									{(Object.keys(FRAME_STEPS).map(Number) as FrameStep[]).map((frameStep) => (
										<label key={frameStep} className={CHOICE}>
											<input
												type="radio"
												name="gif-frames"
												value={frameStep}
												checked={settings.frameStep === frameStep}
												onChange={() => setSettings({ ...settings, frameStep })}
												className="sr-only"
											/>
											{FRAME_STEPS[frameStep]}
										</label>
									))}
								</div>
							</fieldset>

							<div className="flex flex-col gap-1">
								<div className="flex items-center justify-between text-sm">
									<label htmlFor="gif-width" className="font-medium text-foreground">
										Max width
									</label>
									<span className="tabular-nums text-muted-foreground">
										{settings.width === source.width ? `Original (${source.width} px)` : `${settings.width} px`}
									</span>
								</div>
								<input
									id="gif-width"
									type="range"
									min={Math.min(MIN_GIF_WIDTH, source.width)}
									max={source.width}
									step={1}
									value={settings.width}
									aria-valuetext={`${settings.width} pixels`}
									disabled={busy}
									onChange={(event) => setSettings({ ...settings, width: Number(event.currentTarget.value) })}
									className={SLIDER}
								/>
							</div>
						</div>
					) : null}

					<div className="flex flex-wrap gap-3 border-t border-border pt-6">
						{source.state !== 'unreadable' ? (
							<Button type="button" variant="brand" size="lg" onClick={compress} disabled={busy || !settings}>
								<Minimize2 aria-hidden="true" />
								Compress GIF
							</Button>
						) : null}
						<Button type="button" variant="outline" size="lg" onClick={chooseAnother} disabled={busy}>
							<RefreshCw aria-hidden="true" />
							Choose another GIF
						</Button>
					</div>
				</Card>
			) : (
				<DropZone
					title="Drop a GIF here or click to choose"
					hint="GIF files"
					accept={GIF_INPUT_ACCEPT}
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
				{gif && warning ? <p className="text-warning">{WARNING_MESSAGES[warning]}</p> : null}
				{gif && statusText ? (
					<p id={STATUS_ID} className="text-muted-foreground">
						{statusText}
					</p>
				) : null}
				{gif && feedback?.tone === 'status' ? <p className="text-muted-foreground">{feedback.text}</p> : null}
			</div>
			{busy ? <Progress aria-labelledby={STATUS_ID} value={null} /> : null}

			{gif && result ? (
				<GifResult
					result={result}
					fileName={compressedFileName(gif.name)}
					alt={`Compressed GIF: ${gif.name}`}
					onFeedback={setFeedback}
				>
					<p
						className={`text-sm font-semibold ${result.sizeBytes < gif.sizeBytes ? 'text-success' : 'text-foreground'}`}
					>
						{sizeChange(gif.sizeBytes, result.sizeBytes)}
					</p>
					{result.sizeBytes >= gif.sizeBytes ? <p className="text-sm text-warning">{LARGER_NOTE}</p> : null}
				</GifResult>
			) : null}
		</div>
	);
}
