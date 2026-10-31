import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

// 'edit' marks both Trim and Adjust as current: they share one screen.
export type FlowStep = 'upload' | 'edit' | 'convert' | 'download';

const STEPS = [
	{ label: 'Upload', stage: 0 },
	{ label: 'Trim', stage: 1 },
	{ label: 'Adjust', stage: 1 },
	{ label: 'Convert', stage: 2 },
	{ label: 'Download', stage: 3 },
] as const;

const STAGE: Record<FlowStep, number> = { upload: 0, edit: 1, convert: 2, download: 3 };

export default function StepIndicator({ step }: { step: FlowStep }) {
	const current = STAGE[step];

	return (
		<nav aria-label="Steps">
			<ol className="flex items-start justify-between gap-1">
				{STEPS.map(({ label, stage }, index) => {
					const done = stage < current;
					const active = stage === current;
					return (
						<li
							key={label}
							aria-current={active ? 'step' : undefined}
							className="flex min-w-0 flex-1 flex-col items-center gap-1.5 text-center"
						>
							<span
								aria-hidden="true"
								className={cn(
									'flex size-7 items-center justify-center rounded-full text-xs font-semibold transition-colors',
									done && 'bg-primary text-primary-foreground',
									active && 'bg-linear-to-r from-brand-from to-brand-via text-brand-foreground shadow-md shadow-primary/30',
									!done && !active && 'border border-input bg-card text-muted-foreground',
								)}
							>
								{done ? <Check className="size-3.5" /> : index + 1}
							</span>
							<span
								className={cn(
									'text-xs font-medium sm:text-sm',
									active ? 'text-foreground' : 'text-muted-foreground',
								)}
							>
								{label}
								{done ? <span className="sr-only"> (done)</span> : null}
							</span>
						</li>
					);
				})}
			</ol>
		</nav>
	);
}
