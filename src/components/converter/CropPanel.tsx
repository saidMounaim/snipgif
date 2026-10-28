import {
	CROP_ASPECTS,
	centeredCrop,
	cropAxis,
	cropPosition,
	moveCrop,
	type Crop,
	type CropAspect,
	type FrameSize,
} from '../../lib/crop';

interface CropPanelProps {
	crop: Crop | null;
	// null while the frame shape is still unknown.
	frameSize: FrameSize | null;
	unavailable: boolean;
	disabled: boolean;
	onChange: (crop: Crop | null) => void;
}

const FOCUS = 'focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-violet-600';
// Same visually hidden radio and 44 px label as Output settings.
const CHOICE =
	'flex min-h-11 cursor-pointer items-center rounded-lg border border-zinc-300 px-4 text-sm font-medium text-zinc-900 hover:bg-zinc-50 ' +
	'has-checked:border-violet-600 has-checked:bg-violet-50 has-checked:text-violet-800 ' +
	'has-focus-visible:outline-4 has-focus-visible:outline-offset-2 has-focus-visible:outline-violet-600 ' +
	'has-disabled:cursor-not-allowed has-disabled:opacity-60';
const SLIDER = `h-11 w-full cursor-pointer accent-violet-600 disabled:cursor-not-allowed disabled:opacity-60 ${FOCUS}`;
const NOTE_ID = 'crop-note';

export default function CropPanel({ crop, frameSize, unavailable, disabled, onChange }: CropPanelProps) {
	const axis = crop ? cropAxis(crop) : null;
	const note = unavailable
		? "Crop isn't available for this video."
		: crop && !axis
			? `This video is already ${crop.aspect}.`
			: null;

	function choose(aspect: CropAspect | null) {
		if (!aspect) onChange(null);
		else if (frameSize) onChange(centeredCrop(aspect, frameSize));
	}

	return (
		<div className="flex flex-col gap-4 border-t border-zinc-200 pt-4">
			<fieldset
				disabled={disabled || unavailable || !frameSize}
				aria-describedby={note ? NOTE_ID : undefined}
				className="flex flex-col gap-2"
			>
				<legend className="mb-2 text-base font-semibold text-zinc-900">Crop</legend>
				<div className="flex flex-wrap gap-2">
					<label className={CHOICE}>
						<input
							type="radio"
							name="crop-aspect"
							value="original"
							checked={crop === null}
							onChange={() => choose(null)}
							className="sr-only"
						/>
						Original
					</label>
					{(Object.keys(CROP_ASPECTS) as CropAspect[]).map((aspect) => (
						<label key={aspect} className={CHOICE}>
							<input
								type="radio"
								name="crop-aspect"
								value={aspect}
								checked={crop?.aspect === aspect}
								onChange={() => choose(aspect)}
								className="sr-only"
							/>
							{CROP_ASPECTS[aspect].label}
						</label>
					))}
				</div>
				{note ? (
					<p id={NOTE_ID} className="text-xs text-zinc-600">
						{note}
					</p>
				) : null}
			</fieldset>

			{crop && axis ? (
				<div className="flex flex-col gap-1">
					<div className="flex items-center justify-between text-sm">
						<label htmlFor="crop-position" className="font-medium text-zinc-900">
							Crop position
						</label>
						<span className="text-zinc-700">{axis === 'x' ? 'Left to right' : 'Top to bottom'}</span>
					</div>
					<input
						id="crop-position"
						type="range"
						min={0}
						max={100}
						step={1}
						value={Math.round(cropPosition(crop) * 100)}
						aria-valuetext={`${Math.round(cropPosition(crop) * 100)}% from the ${axis === 'x' ? 'left' : 'top'}`}
						disabled={disabled}
						onChange={(event) => onChange(moveCrop(crop, Number(event.currentTarget.value) / 100))}
						className={SLIDER}
					/>
				</div>
			) : null}
		</div>
	);
}
