import { CLIP_LIMITS, formatTime, type ClipRange } from '../../lib/clip-range';
import { outputSec, SPEEDS, tooLong, type Playback } from '../../lib/playback';

interface PlaybackPanelProps {
	playback: Playback;
	range: ClipRange;
	disabled: boolean;
	onChange: (playback: Playback) => void;
}

// Convert to GIF points here while the GIF would be too long.
export const PLAYBACK_LIMIT_ID = 'playback-limit';
const BOOMERANG_HINT_ID = 'boomerang-hint';

// Same visually hidden input and 44 px label as Output settings.
const CHOICE =
	'flex min-h-11 cursor-pointer items-center rounded-lg border border-line-strong px-4 text-sm font-medium text-fg hover:bg-surface-muted ' +
	'has-checked:border-accent-line has-checked:bg-accent-soft has-checked:text-accent-fg ' +
	'has-focus-visible:outline-4 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent-line ' +
	'has-disabled:cursor-not-allowed has-disabled:opacity-60';

export default function PlaybackPanel({ playback, range, disabled, onChange }: PlaybackPanelProps) {
	const length = formatTime(outputSec(range, playback));
	const fixes = playback.boomerang
		? 'Shorten the clip, choose a faster speed, or turn off Boomerang.'
		: 'Shorten the clip or choose a faster speed.';

	return (
		<div className="flex flex-col gap-4 border-t border-line pt-4">
			<h3 className="text-base font-semibold text-fg">Playback</h3>

			<fieldset disabled={disabled} className="flex flex-col gap-2">
				<legend className="mb-2 text-sm font-medium text-fg">Speed</legend>
				<div className="flex flex-wrap gap-2">
					{SPEEDS.map((speed) => (
						<label key={speed} className={CHOICE}>
							<input
								type="radio"
								name="playback-speed"
								value={speed}
								checked={playback.speed === speed}
								onChange={() => onChange({ ...playback, speed })}
								className="sr-only"
							/>
							{speed}x
						</label>
					))}
				</div>
			</fieldset>

			<fieldset disabled={disabled} className="flex flex-col gap-2">
				<legend className="sr-only">Direction</legend>
				<div className="flex flex-wrap gap-2">
					<label className={CHOICE}>
						<input
							type="checkbox"
							checked={playback.reverse}
							onChange={(event) => onChange({ ...playback, reverse: event.currentTarget.checked })}
							className="sr-only"
						/>
						Reverse
					</label>
					<label className={CHOICE}>
						<input
							type="checkbox"
							checked={playback.boomerang}
							aria-describedby={BOOMERANG_HINT_ID}
							onChange={(event) => onChange({ ...playback, boomerang: event.currentTarget.checked })}
							className="sr-only"
						/>
						Boomerang
					</label>
				</div>
				<p id={BOOMERANG_HINT_ID} className="text-xs text-fg-muted">
					Boomerang plays forward, then backward.
				</p>
			</fieldset>

			<p className="text-sm text-fg-muted">GIF length: {length}</p>
			<div aria-live="polite" className="empty:hidden">
				{tooLong(range, playback) ? (
					<p id={PLAYBACK_LIMIT_ID} className="text-sm font-medium text-danger-fg">
						This GIF would be {length} long. The limit is {formatTime(CLIP_LIMITS.maxSec)}. {fixes}
					</p>
				) : null}
			</div>
		</div>
	);
}
