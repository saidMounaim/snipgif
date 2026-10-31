import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { CONTACT_EMAIL } from '@/lib/site';

interface Props {
	// Formspree form URL, built from PUBLIC_FORMSPREE_ID at build time.
	endpoint: string;
}

type Field = 'email' | 'message';
type Errors = Partial<Record<Field, string>>;
type Status = 'idle' | 'submitting' | 'sent' | 'failed';

const MESSAGE_MAX = 5000;
const FIELD = 'h-11 text-base';
const TEXTAREA =
	'min-h-36 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40';

function validateField(field: Field, element: HTMLInputElement | HTMLTextAreaElement): string | undefined {
	if (field === 'email') {
		if (element.value.trim() === '') return 'Enter your email address.';
		if (element.validity.typeMismatch) return 'Enter a valid email address, like name@example.com.';
		return undefined;
	}
	return element.value.trim() === '' ? 'Enter a message.' : undefined;
}

export default function ContactForm({ endpoint }: Props) {
	const emailRef = useRef<HTMLInputElement>(null);
	const messageRef = useRef<HTMLTextAreaElement>(null);
	const [errors, setErrors] = useState<Errors>({});
	const [status, setStatus] = useState<Status>('idle');
	// Before hydration the browser's own validation guards the native POST; afterwards this component takes over.
	const [hydrated, setHydrated] = useState(false);
	useEffect(() => setHydrated(true), []);

	const refs = { email: emailRef, message: messageRef } as const;

	// Re-checks a field that already shows an error so the message clears as soon as it is fixed.
	function revalidate(field: Field) {
		const element = refs[field].current;
		if (!element || !errors[field]) return;
		setErrors((current) => ({ ...current, [field]: validateField(field, element) }));
	}

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		// The button stays focusable while sending, so repeat presses must be ignored here.
		if (status === 'submitting') return;
		const form = event.currentTarget;
		const next: Errors = {};
		for (const field of ['email', 'message'] as const) {
			const element = refs[field].current;
			if (element) next[field] = validateField(field, element);
		}
		setErrors(next);
		const firstInvalid = (['email', 'message'] as const).find((field) => next[field]);
		if (firstInvalid) {
			setStatus('idle');
			refs[firstInvalid].current?.focus();
			return;
		}

		// Read the fields before the submitting state disables them; disabled fields are left out of FormData.
		const body = new FormData(form);
		setStatus('submitting');
		try {
			const response = await fetch(endpoint, {
				method: 'POST',
				body,
				headers: { Accept: 'application/json' },
			});
			if (!response.ok) throw new Error(`Formspree responded ${response.status}`);
			form.reset();
			setStatus('sent');
		} catch {
			// Network failures and rejected submissions get the same friendly message; details stay out of the UI.
			setStatus('failed');
		}
	}

	const submitting = status === 'submitting';

	return (
		<form
			action={endpoint}
			method="POST"
			noValidate={hydrated}
			onSubmit={handleSubmit}
			className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6"
		>
			<h2 className="text-xl font-bold tracking-tight">Send a message</h2>
			<div className="flex flex-col gap-2">
				<Label htmlFor="contact-name">
					Name <span className="font-normal text-muted-foreground">(optional)</span>
				</Label>
				<Input id="contact-name" name="name" autoComplete="name" disabled={submitting} className={FIELD} />
			</div>
			<div className="flex flex-col gap-2">
				<Label htmlFor="contact-email">Email</Label>
				<Input
					ref={emailRef}
					id="contact-email"
					name="email"
					type="email"
					autoComplete="email"
					required
					disabled={submitting}
					aria-invalid={errors.email ? true : undefined}
					aria-describedby={errors.email ? 'contact-email-error' : undefined}
					onChange={() => revalidate('email')}
					className={FIELD}
				/>
				{errors.email && (
					<p id="contact-email-error" className="text-sm text-destructive">
						{errors.email}
					</p>
				)}
			</div>
			<div className="flex flex-col gap-2">
				<Label htmlFor="contact-message">Message</Label>
				<textarea
					ref={messageRef}
					id="contact-message"
					name="message"
					required
					maxLength={MESSAGE_MAX}
					rows={6}
					disabled={submitting}
					aria-invalid={errors.message ? true : undefined}
					aria-describedby={cn('contact-message-hint', errors.message && 'contact-message-error')}
					onChange={() => revalidate('message')}
					className={TEXTAREA}
				/>
				<p id="contact-message-hint" className="text-xs text-muted-foreground">
					Up to {MESSAGE_MAX.toLocaleString('en-US')} characters.
				</p>
				{errors.message && (
					<p id="contact-message-error" className="text-sm text-destructive">
						{errors.message}
					</p>
				)}
			</div>
			{/* Formspree's spam trap: people never see or fill it, bots usually do. */}
			<div aria-hidden="true" className="hidden">
				<input type="text" name="_gotcha" tabIndex={-1} autoComplete="off" />
			</div>
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
				{/* aria-disabled rather than disabled: a disabled button would drop keyboard focus to the page. */}
				<Button
					type="submit"
					variant="brand"
					size="lg"
					aria-disabled={submitting || undefined}
					className="aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
				>
					{submitting ? 'Sending...' : 'Send message'}
				</Button>
				<p role="status" aria-live="polite" className="text-sm">
					{status === 'sent' && <span className="text-foreground">Thanks, your message was sent.</span>}
					{status === 'failed' && (
						<span className="text-destructive">
							Your message could not be sent. Please try again, or email{' '}
							<a href={`mailto:${CONTACT_EMAIL}`} className="font-medium underline underline-offset-4">
								{CONTACT_EMAIL}
							</a>
							.
						</span>
					)}
				</p>
			</div>
		</form>
	);
}
