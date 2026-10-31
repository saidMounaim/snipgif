import type { APIRoute } from 'astro';

// Globbing the pages folder keeps the sitemap in step as pages are added.
const pages = Object.keys(import.meta.glob('./**/*.astro'));

function toRoute(file: string): string | null {
	const path = file.replace(/^\.\//, '').replace(/\.astro$/, '');
	if (path.includes('[') || path.split('/').some((part) => part.startsWith('_'))) return null;
	// `blog/index` becomes `/blog`, matching the slash-less URL shape.
	return ('/' + path.replace(/(^|\/)index$/, '')).replace(/(.)\/$/, '$1');
}

const escapeXml = (value: string) =>
	value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

export const GET: APIRoute = ({ site }) => {
	const urls = pages
		.map(toRoute)
		.filter((route) => route !== null)
		.sort()
		.map((route) => `\t<url><loc>${escapeXml(new URL(route, site).href)}</loc></url>`);
	const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
	return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
