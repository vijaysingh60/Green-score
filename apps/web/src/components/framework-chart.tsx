'use client';

import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CATEGORY_KEYS } from '@greenscore/types';
import { CATEGORY_LABELS, SCORING_CONFIG, getCategoryMaxPoints } from '@greenscore/shared';

interface Row {
  label: string;
  points: number;
}

const maxPoints = getCategoryMaxPoints();
const DATA: Row[] = CATEGORY_KEYS.map((key) => ({ label: CATEGORY_LABELS[key], points: maxPoints[key] }));

function FrameworkTooltip({ active, payload }: { active?: boolean; payload?: ReadonlyArray<{ payload?: Row }> }) {
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-soft">
      <p className="font-semibold text-ink">{row.points} points</p>
      <p className="text-slate-500">{row.label}</p>
    </div>
  );
}

/**
 * The 100-point framework as one-hue horizontal bars (a magnitude comparison). Single series,
 * so there is no legend; each bar is labelled at its tip.
 */
export function FrameworkChart() {
  return (
    <figure>
      <div className="h-[330px] w-full" role="img" aria-label="Points available per category in the 100-point framework">
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 560, height: 330 }}>
          <BarChart data={DATA} layout="vertical" margin={{ top: 4, right: 36, bottom: 4, left: 0 }} barCategoryGap={10}>
            <XAxis type="number" hide domain={[0, 30]} />
            <YAxis
              type="category"
              dataKey="label"
              width={158}
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#475569', fontSize: 13 }}
            />
            <Tooltip cursor={{ fill: 'rgba(31,127,77,0.06)' }} content={(props) => <FrameworkTooltip {...props} />} />
            <Bar dataKey="points" fill="#2c9e61" barSize={18} radius={[0, 4, 4, 0]} isAnimationActive={false}>
              <LabelList dataKey="points" position="right" fill="#0f2a1e" fontSize={13} fontWeight={600} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="sr-only">
        <table>
          <caption>Points per category</caption>
          <tbody>
            {DATA.map((row) => (
              <tr key={row.label}>
                <th scope="row">{row.label}</th>
                <td>{row.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {SCORING_CONFIG.disclaimer}
      </figcaption>
    </figure>
  );
}
