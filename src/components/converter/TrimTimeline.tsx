import { useEffect, useRef, useState, type SyntheticEvent } from 'react';
import { CLIP_LIMITS, formatTime, lastFrameSec, moveEnd, moveStart, type ClipRange } from '../../lib/clip-range';

export type FramePreview = { state: 'loading' } | { state: 'ready'; url: string } | { state: 'error' };

interface TrimTimelineProps {
	mode: 'checking' | 'playable' | 'frames';
	previewUrl: string;
	durationSec: number | null;
	range: ClipRange | null;
	frames: { start: FramePreview; end: FramePreview };
	disabled: boolean;
	onRangeChange: (range: ClipRange) => void;
	onPlayable: (durationSec: number) => void;
	onUnplayable: () => void;
}

const THUMB =
	'[&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-7 [&::-webkit-slider-thumb]:w-7 [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-4 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-violet-600 [&::-webkit-slider-thumb]:shadow ' +
	'[&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:cursor-grab [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-4 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-violet-600 [&::-moz-range-thumb]:shadow';

// Two native range inputs share one track so keyboard and screen-reader support come for free.
const SLIDER = `pointer-events-none absolute inset-0 h-11 w-full appearance-none bg-transparent focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-violet-600 disabled:opacity-60 ${THUMB}`;

function Frame({ label, preview, atSec }: { label: string; preview: FramePreview; atSec: number }) {
	return (
		<figure className="flex flex-1 flex-col gap-1">
			<div className="flex aspect-video items-center justify-center overflow-hidden rounded-lg bg-zinc-100 text-sm text-zinc-600">
				{preview.state === 'ready' ? (
					<img src={preview.url} alt={`Frame at ${formatTime(atSec)}`} className="h-full w-full object-contain" />
				) : preview.state === 'loading' ? (
					'Loading preview...'
				) : (
					'Preview not available'
				)}
			</div>
			<figcaption className="text-xs font-medium text-zinc-600">{label}</figcaption>
		</figure>
	);
}

export default function TrimTimeline({
	mode,
	previewUrl,
	durationSec,
	range,
	frames,
	disabled,
	onRangeChange,
	onPlayable,
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
		const { duration, videoWidth } = player;
		if (videoWidth > 0 && duration === Infinity) {
			// Recordings without a stored duration (e.g. Chrome screen captures) report Infinity
			// until the browser has seen the end.
			measuringRef.current = true;
			player.currentTime = 1e9;
			return;
		}
		if (videoWidth > 0 && Number.isFinite(duration) && duration > 0) onPlayable(duration);
		else onUnplayable();
	}

	function handleDurationChange(event: SyntheticEvent<HTMLVideoElement>) {
		const player = event.currentTarget;
		if (!measuringRef.current || !Number.isFinite(player.duration) || player.duration <= 0) return;
		measuringRef.current = false;
		player.currentTime = 0;
		onPlayable(player.duration);
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

	return (
		<div className="flex flex-col gap-4">
			{showVideo ? (
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
					className={`max-h-72 w-full rounded-lg bg-black ${mode === 'checking' ? 'hidden' : ''}`}
				/>
			) : null}

			{mode === 'frames' && range ? (
				<div className="flex gap-3">
					<Frame label="Start" preview={frames.start} atSec={range.startSec} />
					<Frame label="End" preview={frames.end} atSec={lastFrameSec(range)} />
				</div>
			) : null}

			{ready ? (
				<>
					<div className="relative h-11">
						{/* Inset by half a thumb so the highlight lines up with where native thumbs can travel. */}
						<div className="absolute inset-x-3.5 top-1/2 h-2 -translate-y-1/2 rounded-full bg-zinc-200">
							<div
								className="absolute inset-y-0 rounded-full bg-violet-500"
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
						<p className="text-sm text-zinc-700">
							Selected {formatTime(range.startSec)} to {formatTime(range.endSec)} (
							{(range.endSec - range.startSec).toFixed(1)} s)
						</p>
						{mode === 'playable' ? (
							<button
								type="button"
								onClick={togglePlay}
								disabled={disabled}
								className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-violet-600 disabled:cursor-not-allowed disabled:opacity-60"
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
