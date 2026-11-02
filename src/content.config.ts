import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// One entry per search-intent page; the filename is the URL slug.
const landing = defineCollection({
	loader: glob({ pattern: '*.md', base: './src/content/landing' }),
	schema: z.object({
		title: z.string(),
		description: z.string(),
		appName: z.string(),
		hero: z.object({
			lead: z.string(),
			highlight: z.string(),
			description: z.string(),
		}),
		faq: z.array(z.object({ question: z.string(), answer: z.string() })).min(3),
	}),
});

// About and legal copy; the filename is the URL slug.
const pages = defineCollection({
	loader: glob({ pattern: '*.md', base: './src/content/pages' }),
	schema: z.object({
		title: z.string(),
		description: z.string(),
		heading: z.string(),
		// Shown as "Last updated" on the policy pages.
		updated: z.coerce.date().optional(),
	}),
});

// How-to guides at /blog/<slug>; the filename is the URL slug.
const blog = defineCollection({
	loader: glob({ pattern: '*.md', base: './src/content/blog' }),
	schema: z.object({
		title: z.string(),
		description: z.string(),
		heading: z.string(),
		published: z.coerce.date(),
		updated: z.coerce.date().optional(),
		// The tool the closing call-to-action links to.
		tool: z.enum(['/', '/mp4-to-gif', '/mov-to-gif', '/webm-to-gif', '/gif-compressor']),
	}),
});

export const collections = { landing, pages, blog };
