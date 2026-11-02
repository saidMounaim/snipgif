// Frontmatter dates are midnight UTC, so format in UTC or the built date can shift by a day.
export function formatGuideDate(date: Date): string {
	return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}

export function isoDate(date: Date): string {
	return date.toISOString().slice(0, 10);
}
