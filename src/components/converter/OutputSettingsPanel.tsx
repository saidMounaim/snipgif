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

const FOCUS = 'focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-accent-line';
// The native input is visually hidden; its label is the visible, 44 px tall touch target.
const CHOICE =
	'flex min-h-11 cursor-pointer items-center rounded-lg border border-line-strong px-4 text-sm font-medium text-fg hover:bg-surface-muted ' +
	'has-checked:border-accent-line has-checked:bg-accent-soft has-checked:text-accent-fg ' +
	'has-focus-visible:outline-4 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent-line ' +
	'has-disabled:cursor-not-allowed has-disabled:opacity-60';
const SLIDER = `h-11 w-full cursor-pointer accent-accent disabled:cursor-not-allowed disabled:opacity-60 ${FOCUS}`;

export default function OutputSettingsPanel({ settings, disabled, onChange }: OutputSettingsPanelProps) {
	const { fps, width } = SETTING_LIMITS;

	return (
		<div className="flex flex-col gap-4 border-t border-line pt-4">
			<h3 className="text-base font-semibold text-fg">Output settings</h3>

			<fieldset disabled={disabled} className="flex flex-col gap-2">
				<legend className="mb-2 text-sm font-medium text-fg">
					Preset
					{settings.preset === null ? <span className="ml-2 font-normal text-fg-muted">Custom</span> : null}
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
					<label htmlFor="output-fps" className="font-medium text-fg">
						Frames per second
					</label>
					<span className="text-fg-muted">{settings.fps} fps</span>
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
					<label htmlFor="output-width" className="font-medium text-fg">
						Max width
					</label>
					<span className="text-fg-muted">{settings.width} px</span>
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
				<p id={WIDTH_HINT_ID} className="text-xs text-fg-muted">
					Smaller videos keep their own size.
				</p>
			</div>

			<fieldset disabled={disabled} className="flex flex-col gap-2">
				<legend className="mb-2 text-sm font-medium text-fg">Quality</legend>
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
