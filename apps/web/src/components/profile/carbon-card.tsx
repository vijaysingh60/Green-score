import type { CarbonEstimate } from '@greenscore/types';
import { Card, CardHeader } from '@greenscore/ui';

const fmt = (n: number) => n.toLocaleString('en-IN', { maximumFractionDigits: 1 });

export function CarbonCard({ carbon }: { carbon: CarbonEstimate | null }) {
  return (
    <Card padding="lg">
      <CardHeader title="Carbon estimate" description="Operational emissions from grid electricity" />
      {carbon ? (
        <>
          <p className="text-5xl font-semibold tracking-tight text-ink">
            {fmt(carbon.annualTonnesCO2e)}
            <span className="ml-2 text-base font-medium text-slate-500">tCO₂e / year</span>
          </p>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-slate-50 px-3 py-2.5">
              <dt className="text-xs text-slate-500">Per m² of floor area</dt>
              <dd className="mt-0.5 font-semibold text-ink">{fmt(carbon.kgCO2ePerSqm)} kg</dd>
            </div>
            <div className="rounded-xl bg-slate-50 px-3 py-2.5">
              <dt className="text-xs text-slate-500">Electricity used</dt>
              <dd className="mt-0.5 font-semibold text-ink">{carbon.annualElectricityKwh.toLocaleString('en-IN')} kWh</dd>
            </div>
            {carbon.solarAvoidedTonnesCO2e !== null && (
              <div className="col-span-2 rounded-xl bg-brand-50 px-3 py-2.5">
                <dt className="text-xs text-brand-800">Avoided by on-site solar</dt>
                <dd className="mt-0.5 font-semibold text-brand-800">
                  ≈ {fmt(carbon.solarAvoidedTonnesCO2e)} tCO₂e / year
                </dd>
              </div>
            )}
          </dl>
          <p className="mt-3 text-xs text-slate-500">
            {carbon.note} Factor: {carbon.emissionFactor} kg CO₂e/kWh.
          </p>
        </>
      ) : (
        <p className="rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
          No electricity data was provided, so a carbon estimate isn’t available.
        </p>
      )}
    </Card>
  );
}
