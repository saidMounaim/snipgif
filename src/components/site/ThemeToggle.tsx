import { useEffect, useState } from 'react';
import { Monitor, Moon, Sun, type LucideIcon } from 'lucide-react';
import {
	applyTheme,
	readThemePreference,
	resolveTheme,
	saveThemePreference,
	systemPrefersDark,
	type ThemePreference,
} from '../../lib/theme';

const CHOICES: { value: ThemePreference; label: string; Icon: LucideIcon }[] = [
	{ value: 'system', label: 'System', Icon: Monitor },
	{ value: 'light', label: 'Light', Icon: Sun },
	{ value: 'dark', label: 'Dark', Icon: Moon },
];

// Same visually hidden radio and 44 px label pattern as the tool settings.
const CHOICE =
	'flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-2 text-sm font-medium text-fg-muted hover:bg-surface-muted hover:text-fg ' +
	'has-checked:bg-accent-soft has-checked:text-accent-fg ' +
	'has-focus-visible:outline-4 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent-line';

export default function ThemeToggle() {
	// The server can't know the stored choice, so it renders System and the effect syncs.
	const [preference, setPreference] = useState<ThemePreference>('system');

	useEffect(() => {
		setPreference(readThemePreference());
	}, []);

	// While following the system, switch live when the OS setting changes.
	useEffect(() => {
		if (preference !== 'system') return;
		const query = systemPrefersDark();
		const follow = () => applyTheme(resolveTheme('system'));
		query.addEventListener('change', follow);
		return () => query.removeEventListener('change', follow);
	}, [preference]);

	function choose(next: ThemePreference) {
		setPreference(next);
		saveThemePreference(next);
		applyTheme(resolveTheme(next));
	}

	return (
		<fieldset className="flex items-center gap-1">
			<legend className="sr-only">Theme</legend>
			{CHOICES.map(({ value, label, Icon }) => (
				<label key={value} className={CHOICE}>
					<input
						type="radio"
						name="theme"
						value={value}
						checked={preference === value}
						onChange={() => choose(value)}
						className="sr-only"
					/>
					<Icon aria-hidden="true" className="h-4 w-4" />
					<span className="sr-only sm:not-sr-only">{label}</span>
				</label>
			))}
		</fieldset>
	);
}
