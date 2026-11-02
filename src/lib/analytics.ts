// Event names and parameters sent to GA4. Values are only setting choices and error keys, never file content.
export type AnalyticsEvent = 'file_rejected' | 'conversion_start' | 'conversion_complete' | 'conversion_error';
export type AnalyticsParams = Record<string, string | number | boolean>;

declare global {
	interface Window {
		gtag?: (...args: unknown[]) => void;
	}
}

// A no-op when the tag is not configured or is blocked; analytics must never interrupt a conversion.
export function track(name: AnalyticsEvent, params: AnalyticsParams): void {
	try {
		if (typeof window.gtag === 'function') window.gtag('event', name, params);
	} catch {
		// Ignore: a failing third-party tag is not the user's problem.
	}
}
