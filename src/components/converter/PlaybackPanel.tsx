import { Gauge } from 'lucide-react';
import { CHOICE, FIELD_LABEL, HINT, PANEL, PANEL_HEADING, PANEL_ICON } from '@/components/ui/form-styles';
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


export default function PlaybackPanel({ playback, range, disabled, onChange }: PlaybackPanelProps) {
	const length = formatTime(outputSec(range, playback));
	const fixes = playback.boomerang
		? 'Shorten the clip, choose a faster speed, or turn off Boomerang.'
		: 'Shorten the clip or choose a faster speed.';

	return (
		<div className={PANEL}>
			<h3 className={PANEL_HEADING}>
				<span aria-hidden="true" className={PANEL_ICON}>
					<Gauge />
				</span>
				Playback
			</h3>

			<fieldset disabled={disabled} className="flex flex-col gap-2">
				<legend className={`mb-2 ${FIELD_LABEL}`}>Speed</legend>
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
				<p id={BOOMERANG_HINT_ID} className={HINT}>
					Boomerang plays forward, then backward.
				</p>
			</fieldset>

			<p className="text-sm text-muted-foreground">
				GIF length: <span className="font-medium tabular-nums text-foreground">{length}</span>
			</p>
			<div aria-live="polite" className="empty:hidden">
				{tooLong(range, playback) ? (
					<p id={PLAYBACK_LIMIT_ID} className="text-sm font-medium text-destructive">
						This GIF would be {length} long. The limit is {formatTime(CLIP_LIMITS.maxSec)}. {fixes}
					</p>
				) : null}
			</div>
		</div>
	);
}
