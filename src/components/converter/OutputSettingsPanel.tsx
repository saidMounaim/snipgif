import { SlidersHorizontal } from 'lucide-react';
import { CHOICE, FIELD_LABEL, HINT, PANEL, PANEL_HEADING, PANEL_ICON, SLIDER } from '@/components/ui/form-styles';
import {
	changeSetting,
	presetSettings,
	PRESETS,
	SETTING_LIMITS,
	type OutputSettings,
	type PresetId,
	type Quality,
} from '../../lib/output-settings';

interface OutputSettingsPanelProps {
	settings: OutputSettings;
	disabled: boolean;
	onChange: (settings: OutputSettings) => void;
}

const QUALITY_LABELS: Record<Quality, string> = { low: 'Low', medium: 'Medium', high: 'High' };
const WIDTH_HINT_ID = 'output-width-hint';


export default function OutputSettingsPanel({ settings, disabled, onChange }: OutputSettingsPanelProps) {
	const { fps, width } = SETTING_LIMITS;

	return (
		<div className={PANEL}>
			<h3 className={PANEL_HEADING}>
				<span aria-hidden="true" className={PANEL_ICON}>
					<SlidersHorizontal />
				</span>
				Output settings
			</h3>

			<fieldset disabled={disabled} className="flex flex-col gap-2">
				<legend className={`mb-2 ${FIELD_LABEL}`}>
					Preset
					{settings.preset === null ? <span className="ml-2 font-normal text-muted-foreground">Custom</span> : null}
				</legend>
				<div className="flex flex-wrap gap-2">
					{(Object.keys(PRESETS) as PresetId[]).map((id) => (
						<label key={id} className={CHOICE}>
							<input
								type="radio"
								name="output-preset"
								value={id}
								checked={settings.preset === id}
								onChange={() => onChange(presetSettings(id))}
								className="sr-only"
							/>
							{PRESETS[id].label}
						</label>
					))}
				</div>
			</fieldset>

			<div className="flex flex-col gap-1">
				<div className="flex items-center justify-between text-sm">
					<label htmlFor="output-fps" className="font-medium text-foreground">
						Frames per second
					</label>
					<span className="tabular-nums text-muted-foreground">{settings.fps} fps</span>
				</div>
				<input
					id="output-fps"
					type="range"
					min={fps.min}
					max={fps.max}
					step={fps.step}
					value={settings.fps}
					aria-valuetext={`${settings.fps} frames per second`}
					disabled={disabled}
					onChange={(event) => onChange(changeSetting(settings, { fps: Number(event.currentTarget.value) }))}
					className={SLIDER}
				/>
			</div>

			<div className="flex flex-col gap-1">
				<div className="flex items-center justify-between text-sm">
					<label htmlFor="output-width" className="font-medium text-foreground">
						Max width
					</label>
					<span className="tabular-nums text-muted-foreground">{settings.width} px</span>
				</div>
				<input
					id="output-width"
					type="range"
					min={width.min}
					max={width.max}
					step={width.step}
					value={settings.width}
					aria-valuetext={`${settings.width} pixels`}
					aria-describedby={WIDTH_HINT_ID}
					disabled={disabled}
					onChange={(event) => onChange(changeSetting(settings, { width: Number(event.currentTarget.value) }))}
					className={SLIDER}
				/>
				<p id={WIDTH_HINT_ID} className={HINT}>
					Smaller videos keep their own size.
				</p>
			</div>

			<fieldset disabled={disabled} className="flex flex-col gap-2">
				<legend className={`mb-2 ${FIELD_LABEL}`}>Quality</legend>
				<div className="flex flex-wrap gap-2">
					{(Object.keys(QUALITY_LABELS) as Quality[]).map((quality) => (
						<label key={quality} className={CHOICE}>
							<input
								type="radio"
								name="output-quality"
								value={quality}
								checked={settings.quality === quality}
								onChange={() => onChange(changeSetting(settings, { quality }))}
								className="sr-only"
							/>
							{QUALITY_LABELS[quality]}
						</label>
					))}
				</div>
			</fieldset>
		</div>
	);
}
