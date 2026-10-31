export type FaqItem = { question: string; answer: string };

// Google requires FAQPage text to match the visible FAQ, so both come from the same items.
export function faqPageSchema(items: FaqItem[]) {
	return {
		'@context': 'https://schema.org',
		'@type': 'FAQPage',
		mainEntity: items.map(({ question, answer }) => ({
			'@type': 'Question',
			name: question,
			acceptedAnswer: { '@type': 'Answer', text: answer },
		})),
	};
}
