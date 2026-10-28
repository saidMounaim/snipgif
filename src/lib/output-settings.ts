export type Quality = 'low' | 'medium' | 'high';
export type PresetId = 'chat' | 'balanced' | 'high';

export type OutputSettings = {
	fps: number;
	width: number;
	quality: Quality;
	// null when the values match no preset ("Custom").
	preset: PresetId | null;
};

type SettingValues = Pick<OutputSettings, 'fps' | 'width' | 'quality'>;

export const SETTING_LIMITS = {
	fps: { min: 5, max: 30, step: 1 },
	width: { min: 160, max: 800, step: 10 },
} as const;

export const QUALITY_COLORS: Record<Quality, number> = { low: 64, medium: 128, high: 256 };

export const PRESETS: Record<PresetId, { label: string } & SettingValues> = {
	chat: { label: 'Small for chat', fps: 10, width: 320, quality: 'low' },
	balanced: { label: 'Balanced', fps: 12, width: 480, quality: 'medium' },
	high: { label: 'High quality', fps: 20, width: 720, quality: 'high' },
};

export const DEFAULT_PRESET: PresetId = 'balanced';

const PRESET_IDS = Object.keys(PRESETS) as PresetId[];

function snap(value: number, { min, max, step }: { min: number; max: number; step: number }): number {
	const snapped = Math.round(value / step) * step;
	return Math.min(Math.max(snapped, min), max);
}

export function matchPreset(values: SettingValues): PresetId | null {
	return (
		PRESET_IDS.find((id) => {
			const preset = PRESETS[id];
			return preset.fps === values.fps && preset.width === values.width && preset.quality === values.quality;
		}) ?? null
	);
}

export function presetSettings(id: PresetId): OutputSettings {
	const { fps, width, quality } = PRESETS[id];
	return { fps, width, quality, preset: id };
}

export function changeSetting(settings: OutputSettings, change: Partial<SettingValues>): OutputSettings {
	const values: SettingValues = {
		fps: snap(change.fps ?? settings.fps, SETTING_LIMITS.fps),
		width: snap(change.width ?? settings.width, SETTING_LIMITS.width),
		quality: change.quality ?? settings.quality,
	};
	return { ...values, preset: matchPreset(values) };
}
