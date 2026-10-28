import { useEffect, useRef, useState, type PointerEvent, type ReactNode, type SyntheticEvent } from 'react';
import { CLIP_LIMITS, formatTime, lastFrameSec, moveEnd, moveStart, type ClipRange } from '../../lib/clip-range';
import { cropAxis, cropPosition, moveCrop, type Crop, type FrameSize } from '../../lib/crop';
import { drawCaption, loadCaptionFont, type Caption } from '../../lib/caption';

export type FramePreview = { state: 'loading' } | { state: 'ready'; url: string } | { state: 'error' };

interface TrimTimelineProps {
	mode: 'checking' | 'playable' | 'frames';
	previewUrl: string;
	durationSec: number | null;
	range: ClipRange | null;
	frames: { start: FramePreview; end: FramePreview };
	frameSize: FrameSize | null;
	crop: Crop | null;
	// The text to preview and the GIF's pixel size; null when there is no text.
	caption: { caption: Caption; size: FrameSize } | null;
	disabled: boolean;
	onRangeChange: (range: ClipRange) => void;
	onCropChange: (crop: Crop) => void;
	onPlayable: (durationSec: number, frameSize: FrameSize) => void;
	onFrameSize: (frameSize: FrameSize) => void;
	onUnplayable: () => void;
}

const THUMB =
	'[&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-7 [&::-webkit-slider-thumb]:w-7 [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-4 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:shadow ' +
	'[&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:cursor-grab [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-4 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-accent [&::-moz-range-thumb]:shadow';

// Two native range inputs share one track so keyboard and screen-reader support come for free.
const SLIDER = `pointer-events-none absolute inset-0 h-11 w-full appearance-none bg-transparent focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-accent-line disabled:opacity-60 ${THUMB}`;

// Dims everything outside the kept area; the box can be dragged along the crop's free axis.
function CropOverlay({ crop, disabled, onChange }: { crop: Crop; disabled: boolean; onChange: (crop: Crop) => void }) {
	const drag = useRef<{ start: number; position: number } | null>(null);
	const axis = cropAxis(crop);
	const movable = axis !== null && !disabled;

	function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
		if (!movable) return;
		event.currentTarget.setPointerCapture(event.pointerId);
		drag.current = { start: axis === 'x' ? event.clientX : event.clientY, position: cropPosition(crop) };
	}

	function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
		const frame = event.currentTarget.parentElement?.getBoundingClientRect();
		if (!drag.current || !frame || !axis) return;
		// Pixels the box can travel along its free axis at the current rendered size.
		const travel = axis === 'x' ? frame.width * (1 - crop.w) : frame.height * (1 - crop.h);
		const moved = (axis === 'x' ? event.clientX : event.clientY) - drag.current.start;
		onChange(moveCrop(crop, drag.current.position + moved / travel));
	}

	function endDrag() {
		drag.current = null;
	}

	return (
		<div className="pointer-events-none absolute inset-0 overflow-hidden">
			<div
				aria-hidden="true"
				onPointerDown={handlePointerDown}
				onPointerMove={handlePointerMove}
				onPointerUp={endDrag}
				onPointerCancel={endDrag}
				className={`absolute border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.55)] ${
					movable ? `pointer-events-auto touch-none ${axis === 'x' ? 'cursor-ew-resize' : 'cursor-ns-resize'}` : ''
				}`}
				style={{
					left: `${crop.x * 100}%`,
					top: `${crop.y * 100}%`,
					width: `${crop.w * 100}%`,
					height: `${crop.h * 100}%`,
				}}
			/>
		</div>
	);
}

// The same drawing as the GIF, at the GIF's own pixel size, scaled onto the kept area of the picture.
function CaptionPreview({ caption, size, crop }: { caption: Caption; size: FrameSize; crop: Crop | null }) {
	const canvasRef = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		let cancelled = false;
		const draw = () => {
			const ctx = canvasRef.current?.getContext('2d');
			if (ctx && !cancelled) drawCaption(ctx, caption, size);
		};
		draw();
		// Redraw once the font arrives; until then the fallback font stands in.
		loadCaptionFont(caption.font).then(draw, () => {});
		return () => {
			cancelled = true;
		};
	}, [caption, size.width, size.height]);

	return (
		<canvas
			ref={canvasRef}
			aria-hidden="true"
			width={size.width}
			height={size.height}
			className="pointer-events-none absolute"
			style={{
				left: `${(crop?.x ?? 0) * 100}%`,
				top: `${(crop?.y ?? 0) * 100}%`,
				width: `${(crop?.w ?? 1) * 100}%`,
				height: `${(crop?.h ?? 1) * 100}%`,
			}}
		/>
	);
}

function Frame({
	label,
	preview,
	atSec,
	frameSize,
	onFrameSize,
	overlay,
}: {
	label: string;
	preview: FramePreview;
	atSec: number;
	frameSize?: FrameSize | null;
	onFrameSize?: (frameSize: FrameSize) => void;
	overlay?: ReactNode;
}) {
	return (
		<figure className="flex flex-1 flex-col gap-1">
			<div className="flex aspect-video items-center justify-center overflow-hidden rounded-lg bg-surface-muted text-sm text-fg-muted">
				{preview.state === 'ready' ? (
					// Sized to the picture's own shape inside the 16:9 box, so an overlay lines up with it.
					<div
						className={frameSize ? 'relative' : 'relative h-full w-full'}
						style={
							frameSize
								? {
										aspectRatio: `${frameSize.width} / ${frameSize.height}`,
										width: `min(100%, ${(56.25 * frameSize.width) / frameSize.height}%)`,
									}
								: undefined
						}
					>
						<img
							src={preview.url}
							alt={`Frame at ${formatTime(atSec)}`}
							onLoad={(event) => {
								const { naturalWidth, naturalHeight } = event.currentTarget;
								if (naturalWidth > 0 && naturalHeight > 0) onFrameSize?.({ width: naturalWidth, height: naturalHeight });
							}}
							className="absolute inset-0 h-full w-full object-contain"
						/>
						{frameSize ? overlay : null}
					</div>
				) : preview.state === 'loading' ? (
					'Loading preview...'
				) : (
					'Preview not available'
				)}
			</div>
			<figcaption className="text-xs font-medium text-fg-muted">{label}</figcaption>
		</figure>
	);
}

export default function TrimTimeline({
	mode,
	previewUrl,
	durationSec,
	range,
	frames,
	frameSize,
	crop,
	caption,
	disabled,
	onRangeChange,
	onCropChange,
	onPlayable,
	onFrameSize,
	onUnplayable,
}: TrimTimelineProps) {
	const videoRef = useRef<HTMLVideoElement>(null);
	// True while seeking past the end to make the browser measure a duration the file doesn't store.
	const measuringRef = useRef(false);
	const [playing, setPlaying] = useState(false);

	useEffect(() => {
		if (disabled) videoRef.current?.pause();
	}, [disabled]);

	function handleMetadata(event: SyntheticEvent<HTMLVideoElement>) {
		const player = event.currentTarget;
		const { duration, videoWidth, videoHeight } = player;
		if (videoWidth > 0 && duration === Infinity) {
			// Recordings without a stored duration (e.g. Chrome screen captures) report Infinity
			// until the browser has seen the end.
			measuringRef.current = true;
			player.currentTime = 1e9;
			return;
		}
		if (videoWidth > 0 && videoHeight > 0 && Number.isFinite(duration) && duration > 0) {
			onPlayable(duration, { width: videoWidth, height: videoHeight });
		} else onUnplayable();
	}

	function handleDurationChange(event: SyntheticEvent<HTMLVideoElement>) {
		const player = event.currentTarget;
		if (!measuringRef.current || !Number.isFinite(player.duration) || player.duration <= 0) return;
		measuringRef.current = false;
		player.currentTime = 0;
		onPlayable(player.duration, { width: player.videoWidth, height: player.videoHeight });
	}

	function handleSeeked() {
		// The seek finished without the browser finding an end; let ffmpeg try instead.
		if (!measuringRef.current) return;
		measuringRef.current = false;
		onUnplayable();
	}

	function seek(sec: number) {
		const player = videoRef.current;
		if (!player) return;
		player.pause();
		player.currentTime = sec;
	}

	function togglePlay() {
		const player = videoRef.current;
		if (!player || !range) return;
		if (playing) {
			player.pause();
			return;
		}
		player.currentTime = range.startSec;
		player.play().catch(() => setPlaying(false));
	}

	function handleTimeUpdate(event: SyntheticEvent<HTMLVideoElement>) {
		const player = event.currentTarget;
		if (range && !player.paused && player.currentTime >= range.endSec) {
			player.pause();
			player.currentTime = range.endSec;
		}
	}

	const showVideo = mode === 'checking' || mode === 'playable';
	const ready = range !== null && durationSec !== null;
	const percent = (sec: number) => (durationSec ? (sec / durationSec) * 100 : 0);
	const overlay =
		crop || caption ? (
			<>
				{caption ? <CaptionPreview caption={caption.caption} size={caption.size} crop={crop} /> : null}
				{crop ? <CropOverlay crop={crop} disabled={disabled} onChange={onCropChange} /> : null}
			</>
		) : null;

	return (
		<div className="flex flex-col gap-4">
			{showVideo ? (
				<div className={`flex justify-center overflow-hidden rounded-lg bg-black ${mode === 'checking' ? 'hidden' : ''}`}>
					{/* Once the shape is known, the box matches the picture (max 18rem tall) so the overlay lines up. */}
					<div
						className={frameSize ? 'relative' : 'relative w-full'}
						style={
							frameSize
								? {
										aspectRatio: `${frameSize.width} / ${frameSize.height}`,
										width: `min(100%, calc(18rem * ${frameSize.width} / ${frameSize.height}))`,
									}
								: undefined
						}
					>
						<video
							ref={videoRef}
							src={previewUrl}
							preload="metadata"
							playsInline
							onLoadedMetadata={handleMetadata}
							onDurationChange={handleDurationChange}
							onSeeked={handleSeeked}
							onError={onUnplayable}
							onTimeUpdate={handleTimeUpdate}
							onPlay={() => setPlaying(true)}
							onPause={() => setPlaying(false)}
							className={frameSize ? 'absolute inset-0 h-full w-full' : 'max-h-72 w-full'}
						/>
						{frameSize ? overlay : null}
					</div>
				</div>
			) : null}

			{mode === 'frames' && range ? (
				<div className="flex gap-3">
					<Frame
						label="Start"
						preview={frames.start}
						atSec={range.startSec}
						frameSize={frameSize}
						onFrameSize={onFrameSize}
						overlay={overlay}
					/>
					<Frame label="End" preview={frames.end} atSec={lastFrameSec(range)} />
				</div>
			) : null}

			{ready ? (
				<>
					<div className="relative h-11">
						{/* Inset by half a thumb so the highlight lines up with where native thumbs can travel. */}
						<div className="absolute inset-x-3.5 top-1/2 h-2 -translate-y-1/2 rounded-full bg-line">
							<div
								className="absolute inset-y-0 rounded-full bg-accent"
								style={{ left: `${percent(range.startSec)}%`, width: `${percent(range.endSec - range.startSec)}%` }}
							/>
						</div>
						<input
							type="range"
							aria-label="Start time"
							aria-valuetext={formatTime(range.startSec)}
							min={0}
							max={durationSec}
							step={CLIP_LIMITS.stepSec}
							value={range.startSec}
							disabled={disabled}
							onChange={(event) => {
								const next = moveStart(range, Number(event.currentTarget.value), durationSec);
								onRangeChange(next);
								if (mode === 'playable') seek(next.startSec);
							}}
							className={SLIDER}
						/>
						<input
							type="range"
							aria-label="End time"
							aria-valuetext={formatTime(range.endSec)}
							min={0}
							max={durationSec}
							step={CLIP_LIMITS.stepSec}
							value={range.endSec}
							disabled={disabled}
							onChange={(event) => {
								const next = moveEnd(range, Number(event.currentTarget.value), durationSec);
								onRangeChange(next);
								if (mode === 'playable') seek(next.endSec);
							}}
							className={SLIDER}
						/>
					</div>

					<div className="flex flex-wrap items-center justify-between gap-3">
						<p className="text-sm text-fg-muted">
							Selected {formatTime(range.startSec)} to {formatTime(range.endSec)} (
							{(range.endSec - range.startSec).toFixed(1)} s)
						</p>
						{mode === 'playable' ? (
							<button
								type="button"
								onClick={togglePlay}
								disabled={disabled}
								className="rounded-lg border border-line-strong px-4 py-2 text-sm font-medium text-fg hover:bg-surface-muted focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-accent-line disabled:cursor-not-allowed disabled:opacity-60"
							>
								{playing ? 'Pause' : 'Play selection'}
							</button>
						) : null}
					</div>
				</>
			) : null}
		</div>
	);
}
