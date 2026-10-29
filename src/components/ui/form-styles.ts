// The native radio or checkbox is visually hidden; its label is the visible, 44 px tall touch target.
export const CHOICE =
	'inline-flex min-h-11 cursor-pointer select-none items-center gap-2 rounded-full border border-input bg-card px-4 text-sm font-medium text-foreground transition-all hover:border-primary hover:bg-accent ' +
	'has-checked:border-transparent has-checked:bg-primary has-checked:text-primary-foreground has-checked:shadow-md has-checked:shadow-primary/25 ' +
	'has-focus-visible:ring-3 has-focus-visible:ring-ring/50 has-focus-visible:ring-offset-2 has-focus-visible:ring-offset-card ' +
	'has-disabled:cursor-not-allowed has-disabled:opacity-50 has-disabled:hover:border-input has-disabled:hover:bg-card';

export const SLIDER =
	'h-11 w-full cursor-pointer accent-primary disabled:cursor-not-allowed disabled:opacity-50 ' +
	'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

export const FIELD_LABEL = 'text-sm font-medium text-foreground';
export const HINT = 'text-xs text-muted-foreground';

// A settings section inside a tool card, divided from the one above it.
export const PANEL = 'flex flex-col gap-4 border-t border-border pt-6';
export const PANEL_HEADING = 'flex items-center gap-2.5 text-base font-semibold text-foreground';
export const PANEL_ICON =
	'flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground [&>svg]:size-4';
