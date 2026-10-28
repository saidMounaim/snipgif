export type ThemePreference = 'system' | 'light' | 'dark';
export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';

// Blocked storage (private mode, disabled site data) falls back to following the system.
export function readThemePreference(): ThemePreference {
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		return stored === 'light' || stored === 'dark' ? stored : 'system';
	} catch {
		return 'system';
	}
}

export function saveThemePreference(preference: ThemePreference): void {
	try {
		localStorage.setItem(STORAGE_KEY, preference);
	} catch {
		// The choice still applies for this visit.
	}
}

export function systemPrefersDark(): MediaQueryList {
	return matchMedia(DARK_QUERY);
}

// The inline script in Layout.astro repeats this before first paint; keep the two in step.
export function resolveTheme(preference: ThemePreference): Theme {
	if (preference !== 'system') return preference;
	return systemPrefersDark().matches ? 'dark' : 'light';
}

export function applyTheme(theme: Theme): void {
	document.documentElement.dataset.theme = theme;
}
