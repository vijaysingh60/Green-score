'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { BuildingType, QualityLevel } from '@greenscore/types';
import { BUILDING_TYPES, CATEGORY_KEYS } from '@greenscore/types';
import {
  BUILDING_TYPE_LABELS,
  CATEGORY_LABELS,
  HYDERABAD_LOCALITIES,
  SCORING_CONFIG,
  calculatePreliminaryScore,
} from '@greenscore/shared';
import {
  Badge,
  Button,
  Card,
  FileUpload,
  Input,
  ProgressBar,
  ScoreRing,
  SegmentedControl,
  Select,
  Toggle,
  cn,
} from '@greenscore/ui';
import { api, ApiRequestError } from '@/lib/api';
import {
  EMPTY_FORM,
  SAMPLE_FORM,
  buildParameters,
  buildSubmission,
  validateBasics,
  type BasicsErrors,
  type FormState,
} from '@/lib/assessment-form';

const LEVELS: ReadonlyArray<{ value: QualityLevel; label: string }> = [
  { value: 'NONE', label: 'None' },
  { value: 'BASIC', label: 'Basic' },
  { value: 'GOOD', label: 'Good' },
  { value: 'EXCELLENT', label: 'Excellent' },
];

const STEPS = [
  { title: 'Basics', icon: '🏢', blurb: 'Where is the building and how big is it?' },
  { title: 'Energy', icon: '⚡', blurb: 'Electricity, solar and cooling.' },
  { title: 'Water', icon: '💧', blurb: 'How much water is used and reused?' },
  { title: 'Waste & green', icon: '🌳', blurb: 'Waste handling and green cover.' },
  { title: 'Mobility, climate & materials', icon: '🌡️', blurb: 'Transport, heat resilience and materials.' },
  { title: 'Review', icon: '✅', blurb: 'Attach evidence and submit.' },
] as const;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-3">
      <legend className="mb-1 text-sm font-semibold text-ink">{title}</legend>
      {children}
    </fieldset>
  );
}

export function AddBuildingForm() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<BasicsErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    if (errors[key]) setErrors((current) => ({ ...current, [key]: undefined }));
  };

  // Live preview: the same shared scoring engine the API uses.
  const preview = useMemo(
    () =>
      calculatePreliminaryScore(buildParameters(form), {
        builtUpArea: Number(form.builtUpArea) || undefined,
        occupants: Number(form.occupants) || undefined,
      }),
    [form],
  );

  const pickLocality = (name: string) => {
    const locality = HYDERABAD_LOCALITIES.find((l) => l.name === name);
    if (!locality) return;
    // A little jitter so several buildings in one locality do not sit on the same pin.
    const jitter = () => (Math.random() - 0.5) * 0.008;
    setForm((current) => ({
      ...current,
      locality: locality.name,
      pincode: locality.pincode,
      latitude: (locality.latitude + jitter()).toFixed(4),
      longitude: (locality.longitude + jitter()).toFixed(4),
    }));
    setErrors((current) => ({ ...current, locality: undefined, pincode: undefined, latitude: undefined }));
  };

  const goTo = (next: number) => {
    setStep(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const next = () => {
    if (step === 0) {
      const found = validateBasics(form);
      setErrors(found);
      if (Object.keys(found).length > 0) return;
    }
    goTo(Math.min(step + 1, STEPS.length - 1));
  };

  const submit = async () => {
    const found = validateBasics(form);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      goTo(0);
      return;
    }
    setSubmitting(true);
    setApiError(null);
    try {
      const profile = await api.submitBuilding(buildSubmission(form));
      router.push(`/buildings/${profile.building.id}?submitted=1`);
    } catch (error) {
      setApiError(error instanceof ApiRequestError ? error.message : 'Something went wrong. Please try again.');
      setSubmitting(false);
    }
  };

  const last = step === STEPS.length - 1;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-ink">Add your building</h1>
          <p className="mt-1 text-slate-600">Answer a few questions and get your preliminary Green Score instantly.</p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            setForm(SAMPLE_FORM);
            setErrors({});
          }}
        >
          Fill with sample data
        </Button>
      </div>

      {/* Stepper */}
      <ol className="mt-6 hidden grid-cols-6 gap-2 md:grid">
        {STEPS.map((s, index) => (
          <li key={s.title}>
            <button
              type="button"
              onClick={() => index <= step && goTo(index)}
              disabled={index > step}
              className={cn(
                'flex w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors',
                index === step && 'border-brand-400 bg-brand-50 text-brand-900',
                index < step && 'border-brand-200 bg-white text-brand-800 hover:bg-brand-50',
                index > step && 'border-slate-200 bg-white/60 text-slate-400',
              )}
            >
              <span aria-hidden>{index < step ? '✓' : s.icon}</span>
              <span className="truncate font-medium">{s.title}</span>
            </button>
          </li>
        ))}
      </ol>
      <div className="mt-5 md:hidden">
        <ProgressBar value={step + 1} max={STEPS.length} label={`Step ${step + 1} of ${STEPS.length}: ${STEPS[step]!.title}`} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card padding="lg">
          <div className="mb-6 flex items-center gap-3">
            <span aria-hidden className="grid size-11 place-items-center rounded-xl bg-brand-50 text-2xl">
              {STEPS[step]!.icon}
            </span>
            <div>
              <h2 className="text-xl font-semibold text-ink">{STEPS[step]!.title}</h2>
              <p className="text-sm text-slate-500">{STEPS[step]!.blurb}</p>
            </div>
          </div>

          {step === 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                className="sm:col-span-2"
                label="Building name"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                error={errors.name}
                placeholder="e.g. Lotus Residency"
              />
              <Select
                label="Type"
                value={form.type}
                placeholder="Choose a type"
                onChange={(e) => set('type', e.target.value as BuildingType)}
                options={BUILDING_TYPES.map((t) => ({ value: t, label: BUILDING_TYPE_LABELS[t] }))}
                error={errors.type}
              />
              <Select
                label="Locality"
                value={form.locality}
                placeholder="Choose a locality"
                onChange={(e) => pickLocality(e.target.value)}
                options={HYDERABAD_LOCALITIES.map((l) => ({ value: l.name, label: l.name }))}
                error={errors.locality}
              />
              <Input
                className="sm:col-span-2"
                label="Address"
                value={form.address}
                onChange={(e) => set('address', e.target.value)}
                error={errors.address}
                placeholder="Street, landmark"
              />
              <Input
                label="Pincode"
                inputMode="numeric"
                maxLength={6}
                value={form.pincode}
                onChange={(e) => set('pincode', e.target.value)}
                error={errors.pincode}
              />
              <Input
                label="Year constructed"
                inputMode="numeric"
                value={form.yearConstructed}
                onChange={(e) => set('yearConstructed', e.target.value)}
                error={errors.yearConstructed}
                placeholder="2015"
              />
              <Input
                label="Built-up area"
                unit="m²"
                inputMode="decimal"
                value={form.builtUpArea}
                onChange={(e) => set('builtUpArea', e.target.value)}
                error={errors.builtUpArea}
              />
              <Input
                label="Number of floors"
                inputMode="numeric"
                value={form.numberOfFloors}
                onChange={(e) => set('numberOfFloors', e.target.value)}
                error={errors.numberOfFloors}
              />
              <Input
                label="Occupants"
                inputMode="numeric"
                value={form.occupants}
                onChange={(e) => set('occupants', e.target.value)}
                error={errors.occupants}
                hint="Residents, staff and regular users"
              />
              <div className="grid grid-cols-2 gap-3 sm:col-span-2">
                <Input
                  label="Latitude"
                  inputMode="decimal"
                  value={form.latitude}
                  onChange={(e) => set('latitude', e.target.value)}
                  error={errors.latitude}
                  hint="Set from the locality; fine-tune if you like"
                />
                <Input
                  label="Longitude"
                  inputMode="decimal"
                  value={form.longitude}
                  onChange={(e) => set('longitude', e.target.value)}
                />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <Input
                label="Annual electricity usage"
                unit="kWh/year"
                inputMode="decimal"
                value={form.electricity}
                onChange={(e) => set('electricity', e.target.value)}
                hint="Add up 12 months of electricity bills"
              />
              <Section title="Solar">
                <Toggle label="Solar panels installed" checked={form.solarInstalled} onChange={(v) => set('solarInstalled', v)} />
                {form.solarInstalled && (
                  <Input
                    label="Solar capacity"
                    unit="kWp"
                    inputMode="decimal"
                    value={form.solarCapacity}
                    onChange={(e) => set('solarCapacity', e.target.value)}
                  />
                )}
              </Section>
              <Input
                label="Energy-efficient lighting"
                unit="% of lights"
                inputMode="numeric"
                value={form.lighting}
                onChange={(e) => set('lighting', e.target.value)}
                hint="Share of fixtures that are LED or equivalent"
              />
              <SegmentedControl label="HVAC efficiency" value={form.hvac} options={LEVELS} onChange={(v) => set('hvac', v)} />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <Input
                label="Annual water usage"
                unit="kL/year"
                inputMode="decimal"
                value={form.waterUsage}
                onChange={(e) => set('waterUsage', e.target.value)}
                hint="Municipal, tanker and borewell water combined (1 kL = 1,000 litres)"
              />
              <Section title="Water practices">
                <Toggle label="Rainwater harvesting" description="Roof runoff is captured or recharged" checked={form.rainwater} onChange={(v) => set('rainwater', v)} />
                <Toggle label="Greywater reuse" description="Treated greywater is reused" checked={form.greywater} onChange={(v) => set('greywater', v)} />
              </Section>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <Section title="Waste">
                <Toggle label="Waste segregation at source" checked={form.segregation} onChange={(v) => set('segregation', v)} />
                <Toggle label="Recycling" checked={form.recycling} onChange={(v) => set('recycling', v)} />
                <Toggle label="Composting" checked={form.composting} onChange={(v) => set('composting', v)} />
              </Section>
              <Section title="Green cover">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input label="Green area" unit="% of plot" inputMode="numeric" value={form.greenArea} onChange={(e) => set('greenArea', e.target.value)} />
                  <Input label="Number of trees" inputMode="numeric" value={form.trees} onChange={(e) => set('trees', e.target.value)} />
                </div>
                <Toggle label="Green roof / rooftop garden" checked={form.greenRoof} onChange={(v) => set('greenRoof', v)} />
              </Section>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <Section title="Mobility">
                <Toggle label="EV charging" checked={form.evCharging} onChange={(v) => set('evCharging', v)} />
                <Toggle label="Bicycle parking" checked={form.bicycleParking} onChange={(v) => set('bicycleParking', v)} />
              </Section>
              <Section title="Climate resilience">
                <SegmentedControl label="Natural ventilation" value={form.naturalVentilation} options={LEVELS} onChange={(v) => set('naturalVentilation', v)} />
                <SegmentedControl label="Heat reduction measures" value={form.heatReduction} options={LEVELS} onChange={(v) => set('heatReduction', v)} />
                <Toggle label="Cool roof" checked={form.coolRoof} onChange={(v) => set('coolRoof', v)} />
              </Section>
              <Section title="Materials">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input label="Sustainable materials" unit="%" inputMode="numeric" value={form.sustainableMaterials} onChange={(e) => set('sustainableMaterials', e.target.value)} />
                  <Input label="Recycled materials" unit="%" inputMode="numeric" value={form.recycledMaterials} onChange={(e) => set('recycledMaterials', e.target.value)} />
                </div>
              </Section>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-6">
              <div className="rounded-xl bg-slate-50 p-4 text-sm">
                <p className="font-semibold text-ink">{form.name || 'Your building'}</p>
                <p className="mt-0.5 text-slate-600">
                  {form.type && BUILDING_TYPE_LABELS[form.type as BuildingType]} · {form.locality} ·{' '}
                  {Number(form.builtUpArea).toLocaleString('en-IN')} m² · {form.numberOfFloors} floors
                </p>
              </div>
              <div>
                <FileUpload
                  label="Evidence documents (optional)"
                  hint="Bills, photos, certificates. Demo only: file names are recorded, nothing is uploaded."
                  onFilesChange={(files) => set('documents', files.map((f) => f.name))}
                />
                {form.documents.length > 0 && (
                  <p className="mt-2 text-xs text-slate-500">{form.documents.length} document(s) will be attached for the admin to review.</p>
                )}
              </div>
              <div className="rounded-xl border border-ocean-200 bg-ocean-50/60 p-4 text-sm text-ocean-900">
                <p className="font-semibold">What happens next</p>
                <p className="mt-1">
                  You’ll instantly see a preliminary score, an advisory ML prediction and recommendations. A GREENScore
                  admin then reviews the evidence and publishes the final Verified Green Score.
                </p>
              </div>
              {apiError && (
                <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                  {apiError}
                </p>
              )}
            </div>
          )}

          <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-5">
            <Button variant="ghost" onClick={() => goTo(Math.max(step - 1, 0))} disabled={step === 0 || submitting}>
              ← Back
            </Button>
            {last ? (
              <Button size="lg" onClick={submit} loading={submitting}>
                Submit for verification
              </Button>
            ) : (
              <Button onClick={next}>Continue →</Button>
            )}
          </div>
        </Card>

        {/* Live preview */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Card padding="lg">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-ink">Live preview</h3>
              <Badge tone="amber">Preliminary</Badge>
            </div>
            <div className="mt-4 flex justify-center">
              <ScoreRing value={preview.totalScore} size={128} strokeWidth={11} />
            </div>
            <ul className="mt-5 space-y-2.5">
              {CATEGORY_KEYS.map((key) => (
                <li key={key}>
                  <ProgressBar
                    size="sm"
                    value={preview.breakdown[key]}
                    max={SCORING_CONFIG.categories[key].maxPoints}
                    label={<span className="text-xs">{CATEGORY_LABELS[key]}</span>}
                  />
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs leading-relaxed text-slate-500">
              Updates as you answer. This is an estimate until an admin verifies it.
            </p>
          </Card>
        </aside>
      </div>
    </div>
  );
}
