import { Crop as CropIcon } from 'lucide-react';
import { CHOICE, HINT, PANEL, PANEL_HEADING, PANEL_ICON, SLIDER } from '@/components/ui/form-styles';
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
		<div className={PANEL}>
			<fieldset
				disabled={disabled || unavailable || !frameSize}
				aria-describedby={note ? NOTE_ID : undefined}
				className="flex flex-col gap-2"
			>
				<legend className={`mb-3 ${PANEL_HEADING}`}>
					<span aria-hidden="true" className={PANEL_ICON}>
						<CropIcon />
					</span>
					Crop
				</legend>
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
					<p id={NOTE_ID} className={HINT}>
						{note}
					</p>
				) : null}
			</fieldset>

			{crop && axis ? (
				<div className="flex flex-col gap-1">
					<div className="flex items-center justify-between text-sm">
						<label htmlFor="crop-position" className="font-medium text-foreground">
							Crop position
						</label>
						<span className="text-muted-foreground">{axis === 'x' ? 'Left to right' : 'Top to bottom'}</span>
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
