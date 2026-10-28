import { useEffect } from 'react';
import {
	CAPTION_COLORS,
	CAPTION_FONTS,
	CAPTION_SIZES,
	fontSpec,
	loadCaptionFont,
	type Caption,
	type CaptionColor,
	type CaptionFont,
	type CaptionSize,
} from '../../lib/caption';

interface TextPanelProps {
	caption: Caption;
	unavailable: boolean;
	disabled: boolean;
	onChange: (caption: Caption) => void;
}

const FOCUS = 'focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-accent-line';
// Same visually hidden radio and 44 px label as Output settings.
const CHOICE =
	'flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-line-strong px-4 text-sm font-medium text-fg hover:bg-surface-muted ' +
	'has-checked:border-accent-line has-checked:bg-accent-soft has-checked:text-accent-fg ' +
	'has-focus-visible:outline-4 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent-line ' +
	'has-disabled:cursor-not-allowed has-disabled:opacity-60';
const INPUT = `min-h-11 w-full rounded-lg border border-line-strong px-3 text-sm text-fg disabled:cursor-not-allowed disabled:opacity-60 ${FOCUS}`;
const NOTE_ID = 'text-note';

export default function TextPanel({ caption, unavailable, disabled, onChange }: TextPanelProps) {
	// Each Font choice is drawn in its own font; a failed load just leaves the fallback font.
	useEffect(() => {
		for (const font of Object.keys(CAPTION_FONTS) as CaptionFont[]) loadCaptionFont(font).catch(() => {});
	}, []);

	return (
		<div className="flex flex-col gap-4 border-t border-line pt-4">
			<h3 className="text-base font-semibold text-fg">Text</h3>
			{unavailable ? (
				<p id={NOTE_ID} className="text-xs text-fg-muted">
					Text isn't available for this video.
				</p>
			) : null}

			<fieldset
				disabled={disabled || unavailable}
				aria-describedby={unavailable ? NOTE_ID : undefined}
				className="flex flex-col gap-4"
			>
				<div className="grid gap-3 sm:grid-cols-2">
					{(['top', 'bottom'] as const).map((edge) => (
						<div key={edge} className="flex flex-col gap-1">
							<label htmlFor={`caption-${edge}`} className="text-sm font-medium text-fg">
								{edge === 'top' ? 'Top text' : 'Bottom text'}
							</label>
							<input
								id={`caption-${edge}`}
								type="text"
								value={caption[edge]}
								onChange={(event) => onChange({ ...caption, [edge]: event.currentTarget.value })}
								className={INPUT}
							/>
						</div>
					))}
				</div>

				<fieldset className="flex flex-col gap-2">
					<legend className="mb-2 text-sm font-medium text-fg">Font</legend>
					<div className="flex flex-wrap gap-2">
						{(Object.keys(CAPTION_FONTS) as CaptionFont[]).map((font) => (
							<label key={font} className={CHOICE} style={{ font: fontSpec(font, 14) }}>
								<input
									type="radio"
									name="caption-font"
									value={font}
									checked={caption.font === font}
									onChange={() => onChange({ ...caption, font })}
									className="sr-only"
								/>
								{CAPTION_FONTS[font].label}
							</label>
						))}
					</div>
				</fieldset>

				<fieldset className="flex flex-col gap-2">
					<legend className="mb-2 text-sm font-medium text-fg">Color</legend>
					<div className="flex flex-wrap gap-2">
						{(Object.keys(CAPTION_COLORS) as CaptionColor[]).map((color) => (
							<label key={color} className={CHOICE}>
								<input
									type="radio"
									name="caption-color"
									value={color}
									checked={caption.color === color}
									onChange={() => onChange({ ...caption, color })}
									className="sr-only"
								/>
								<span
									aria-hidden="true"
									className="h-4 w-4 rounded-full border border-line-strong"
									style={{ backgroundColor: CAPTION_COLORS[color].fill }}
								/>
								{CAPTION_COLORS[color].label}
							</label>
						))}
					</div>
				</fieldset>

				<fieldset className="flex flex-col gap-2">
					<legend className="mb-2 text-sm font-medium text-fg">Size</legend>
					<div className="flex flex-wrap gap-2">
						{(Object.keys(CAPTION_SIZES) as CaptionSize[]).map((size) => (
							<label key={size} className={CHOICE}>
								<input
									type="radio"
									name="caption-size"
									value={size}
									checked={caption.size === size}
									onChange={() => onChange({ ...caption, size })}
									className="sr-only"
								/>
								{CAPTION_SIZES[size].label}
							</label>
						))}
					</div>
				</fieldset>
			</fieldset>
		</div>
	);
}
