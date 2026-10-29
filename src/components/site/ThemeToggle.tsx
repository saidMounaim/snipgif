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

// Same visually hidden radio pattern as the tool settings, styled as a segmented control.
const CHOICE =
	'flex min-h-9 min-w-9 cursor-pointer items-center justify-center gap-1.5 rounded-full px-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground ' +
	'has-checked:bg-card has-checked:text-foreground has-checked:shadow-sm ' +
	'has-focus-visible:ring-3 has-focus-visible:ring-ring/50';

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
		<fieldset className="flex items-center gap-0.5 rounded-full border border-border bg-muted/60 p-1">
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
					<span className="sr-only">{label}</span>
				</label>
			))}
		</fieldset>
	);
}
