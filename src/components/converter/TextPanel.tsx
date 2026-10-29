import { useEffect } from 'react';
import { Type } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CHOICE, FIELD_LABEL, HINT, PANEL, PANEL_HEADING, PANEL_ICON } from '@/components/ui/form-styles';
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

const NOTE_ID = 'text-note';

export default function TextPanel({ caption, unavailable, disabled, onChange }: TextPanelProps) {
	// Each Font choice is drawn in its own font; a failed load just leaves the fallback font.
	useEffect(() => {
		for (const font of Object.keys(CAPTION_FONTS) as CaptionFont[]) loadCaptionFont(font).catch(() => {});
	}, []);

	return (
		<div className={PANEL}>
			<h3 className={PANEL_HEADING}>
				<span aria-hidden="true" className={PANEL_ICON}>
					<Type />
				</span>
				Text
			</h3>
			{unavailable ? (
				<p id={NOTE_ID} className={HINT}>
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
						<div key={edge} className="flex flex-col gap-2">
							<Label htmlFor={`caption-${edge}`}>
								{edge === 'top' ? 'Top text' : 'Bottom text'}
							</Label>
							<Input
								id={`caption-${edge}`}
								type="text"
								value={caption[edge]}
								onChange={(event) => onChange({ ...caption, [edge]: event.currentTarget.value })}
								className="h-11 rounded-xl bg-card px-3.5"
							/>
						</div>
					))}
				</div>

				<fieldset className="flex flex-col gap-2">
					<legend className={`mb-2 ${FIELD_LABEL}`}>Font</legend>
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
					<legend className={`mb-2 ${FIELD_LABEL}`}>Color</legend>
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
									className="size-4 rounded-full border border-input"
									style={{ backgroundColor: CAPTION_COLORS[color].fill }}
								/>
								{CAPTION_COLORS[color].label}
							</label>
						))}
					</div>
				</fieldset>

				<fieldset className="flex flex-col gap-2">
					<legend className={`mb-2 ${FIELD_LABEL}`}>Size</legend>
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
