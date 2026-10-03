import Link from 'next/link';
import { buttonStyles } from '@greenscore/ui';
import { ContourBackdrop } from './contour-backdrop';

const STEPS = [
  {
    n: '01',
    title: 'Measure',
    text: 'Enter your building’s energy, water, waste and climate data and get an instant preliminary score.',
    tone: 'bg-brand-50 text-brand-700',
  },
  {
    n: '02',
    title: 'Verify',
    text: 'A person reviews the evidence and publishes the final score. AI advises, humans decide.',
    tone: 'bg-ocean-50 text-ocean-700',
  },
  {
    n: '03',
    title: 'Improve',
    text: 'See the changes that raise your score most, and simulate them before you spend a rupee.',
    tone: 'bg-brand-50 text-brand-700',
  },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-slate-200/60">
      <ContourBackdrop className="pointer-events-none absolute -right-24 -top-28 size-[640px] opacity-80" />
      <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:py-20">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-3 py-1 text-xs font-medium text-brand-800">
            <span className="size-1.5 rounded-full bg-brand-500" />
            Climate action · Hyderabad
          </p>
          <h1 className="mt-5 text-5xl font-semibold tracking-tight text-ink sm:text-6xl">
            GREEN<span className="text-brand-600">Score</span>
            <span className="block text-3xl font-medium text-slate-500 sm:text-4xl">Hyderabad</span>
          </h1>
          <p className="mt-5 text-xl font-medium text-brand-800">Measure. Verify. Improve.</p>
          <p className="mt-3 max-w-xl text-lg leading-relaxed text-slate-600">
            Understand how sustainable your building is and discover practical ways to improve it.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/buildings/new" className={buttonStyles({ size: 'lg' })}>
              Add Your Building
            </Link>
            <Link href="#map" className={buttonStyles({ size: 'lg', variant: 'secondary' })}>
              Explore the map
            </Link>
          </div>
        </div>

        <ol className="grid gap-3">
          {STEPS.map((step) => (
            <li
              key={step.n}
              className="flex gap-4 rounded-card border border-slate-200/80 bg-white/90 p-5 shadow-soft backdrop-blur"
            >
              <span className={`grid size-11 shrink-0 place-items-center rounded-xl text-sm font-semibold ${step.tone}`}>
                {step.n}
              </span>
              <div>
                <h2 className="text-base font-semibold text-ink">{step.title}</h2>
                <p className="mt-0.5 text-sm leading-relaxed text-slate-600">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
