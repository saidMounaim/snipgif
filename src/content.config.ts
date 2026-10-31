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

export const collections = { landing };
