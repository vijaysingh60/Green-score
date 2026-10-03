'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { BuildingType, MapBuilding } from '@greenscore/types';
import { BUILDING_TYPES } from '@greenscore/types';
import {
  BUILDING_TYPE_LABELS,
  distanceKm,
  getScoreBand,
  getScoreDisplay,
  isWithinHyderabad,
  UOH_CAMPUS_BOUNDS,
} from '@greenscore/shared';
import { Badge, Button, Card, Input, SCORE_BAND_COLORS, Select, cn, scoreColors } from '@greenscore/ui';
import { getCurrentLocation, LocationError } from '@/lib/location';
import type { MapSelection, NearestBuilding, RadiusSearch, UserLocation, ViewRequest } from './hyderabad-map';
import { HyderabadMap } from './map-loader';

const BANDS = [
  { id: 'all', label: 'All scores' },
  { id: 'leading', label: '80+ Leading' },
  { id: 'good', label: '60–79 Good' },
  { id: 'developing', label: '40–59 Developing' },
  { id: 'needs-improvement', label: 'Below 40' },
  { id: 'unassessed', label: 'Not scored yet' },
] as const;
type BandFilter = (typeof BANDS)[number]['id'];

const LEGEND = BANDS.filter((band) => band.id !== 'all');
const bandColor = (id: Exclude<BandFilter, 'all'>): string => (id === 'unassessed' ? '#94a3b8' : SCORE_BAND_COLORS[id].solid);

type SortMode = 'greenest' | 'nearest';

const RADIUS_OPTIONS = [
  { value: '', label: 'Any distance' },
  { value: '0.25', label: 'Within 250 m' },
  { value: '0.5', label: 'Within 500 m' },
  { value: '1', label: 'Within 1 km' },
  { value: '2', label: 'Within 2 km' },
  { value: '5', label: 'Within 5 km' },
];

/** Where the radius search is centred, and how to describe it. */
interface RadiusCentre {
  latitude: number;
  longitude: number;
  label: string;
}

const CHIP =
  'rounded-full bg-white px-3 py-1 text-sm font-medium text-slate-700 ring-1 ring-slate-200 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40';

interface Row {
  building: MapBuilding;
  /** Distance from the user, once located. */
  km: number | null;
}

/**
 * The interactive map + list. Client-side only: filters, search, "my location", and a list that is
 * linked to the map (hover highlights a pin, click flies to the building and opens its popup).
 */
export function MapExplorer({ buildings }: { buildings: MapBuilding[] }) {
  const [query, setQuery] = useState('');
  const [type, setType] = useState<BuildingType | 'all'>('all');
  const [band, setBand] = useState<BandFilter>('all');
  const [sort, setSort] = useState<SortMode>('greenest');

  const [selection, setSelection] = useState<MapSelection | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState(0);
  const [viewRequest, setViewRequest] = useState<ViewRequest | null>(null);

  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationNote, setLocationNote] = useState<string | null>(null);

  // Radius search: a distance, and the point it is measured from.
  const [radiusKm, setRadiusKm] = useState<number | null>(null);
  const [centre, setCentre] = useState<RadiusCentre | null>(null);

  const select = (id: string, source: MapSelection['source']) =>
    setSelection((current) => ({ id, source, n: (current?.n ?? 0) + 1 }));

  // Only building types that actually appear on the map are offered.
  const typeOptions = useMemo(() => {
    const present = new Set(buildings.map((b) => b.type));
    return [
      { value: 'all', label: 'All types' },
      ...BUILDING_TYPES.filter((t) => present.has(t)).map((t) => ({ value: t, label: BUILDING_TYPE_LABELS[t] })),
    ];
  }, [buildings]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return buildings.filter((b) => {
      if (type !== 'all' && b.type !== type) return false;
      if (band === 'unassessed') {
        if (b.status === 'VERIFIED') return false;
      } else if (band !== 'all' && (b.finalVerifiedScore === null || getScoreBand(b.finalVerifiedScore).id !== band)) {
        return false;
      }
      if (needle && !`${b.name} ${b.locality}`.toLowerCase().includes(needle)) return false;
      if (radiusKm !== null && centre && distanceKm(centre.latitude, centre.longitude, b.latitude, b.longitude) > radiusKm) {
        return false;
      }
      return true;
    });
  }, [buildings, query, type, band, radiusKm, centre]);

  const rows: Row[] = useMemo(() => {
    const withDistance = filtered.map((building) => ({
      building,
      km: userLocation
        ? Math.round(distanceKm(userLocation.latitude, userLocation.longitude, building.latitude, building.longitude) * 10) / 10
        : null,
    }));
    if (sort === 'nearest' && userLocation) {
      return withDistance.sort((a, b) => (a.km ?? Infinity) - (b.km ?? Infinity));
    }
    return withDistance.sort((a, b) => (b.building.finalVerifiedScore ?? 0) - (a.building.finalVerifiedScore ?? 0));
  }, [filtered, sort, userLocation]);

  /** Nearest building among ALL of them (not just the filtered ones), for the "you are here" popup. */
  const nearest: NearestBuilding | null = useMemo(() => {
    if (!userLocation) return null;
    let best: NearestBuilding | null = null;
    for (const b of buildings) {
      const km = distanceKm(userLocation.latitude, userLocation.longitude, b.latitude, b.longitude);
      if (!best || km < best.km) best = { id: b.id, name: b.name, km };
    }
    return best ? { ...best, km: Math.round(best.km * 10) / 10 } : null;
  }, [buildings, userLocation]);

  const selectedBuilding = useMemo(
    () => buildings.find((b) => b.id === selection?.id) ?? null,
    [buildings, selection],
  );

  /** The circle to draw on the map. */
  const radius: RadiusSearch | null = useMemo(
    () => (radiusKm !== null && centre ? { latitude: centre.latitude, longitude: centre.longitude, km: radiusKm } : null),
    [radiusKm, centre],
  );

  /** "Area score": the average of the scored buildings inside the circle. */
  const areaScore = useMemo(() => {
    if (!radius) return null;
    const scored = filtered.filter((b) => b.finalVerifiedScore !== null);
    if (scored.length === 0) return null;
    const sum = scored.reduce((total, b) => total + (b.finalVerifiedScore ?? 0), 0);
    return {
      average: Math.round((sum / scored.length) * 10) / 10,
      count: scored.length,
      includesDemo: scored.some((b) => b.isDemo),
    };
  }, [radius, filtered]);

  const locate = async (): Promise<UserLocation | null> => {
    setLocating(true);
    setLocationNote(null);
    try {
      const here = await getCurrentLocation();
      if (!isWithinHyderabad(here.latitude, here.longitude)) {
        setLocationNote('You appear to be outside Hyderabad, so your location isn’t shown on this map.');
        return null;
      }
      setUserLocation(here);
      setSort('nearest');
      return here;
    } catch (error) {
      setLocationNote(error instanceof LocationError ? error.message : 'Could not get your location.');
      return null;
    } finally {
      setLocating(false);
    }
  };

  const changeRadius = (value: string) => {
    const km = value ? Number(value) : null;
    setRadiusKm(km);
    // First time: centre on you, else on the selected building. Otherwise wait for a click on the map.
    if (km !== null && !centre) {
      if (userLocation) {
        setCentre({ latitude: userLocation.latitude, longitude: userLocation.longitude, label: 'your location' });
      } else if (selectedBuilding) {
        setCentre({ latitude: selectedBuilding.latitude, longitude: selectedBuilding.longitude, label: selectedBuilding.name });
      }
    }
  };
  const centreOnMe = async () => {
    const here = userLocation ?? (await locate());
    if (here) setCentre({ latitude: here.latitude, longitude: here.longitude, label: 'your location' });
  };
  const centreOnSelected = () => {
    if (selectedBuilding) {
      setCentre({ latitude: selectedBuilding.latitude, longitude: selectedBuilding.longitude, label: selectedBuilding.name });
    }
  };
  /** Clicking empty map moves the search centre (only while a radius is chosen). */
  const onMapClick = (latitude: number, longitude: number) => {
    if (radiusKm !== null) setCentre({ latitude, longitude, label: 'the point you picked' });
  };

  const filtersActive = query.trim() !== '' || type !== 'all' || band !== 'all' || radiusKm !== null;
  const resetFilters = () => {
    setQuery('');
    setType('all');
    setBand('all');
    setRadiusKm(null);
  };

  return (
    <div className="mt-5">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          className="w-full sm:w-64"
          type="search"
          placeholder="Search building or locality"
          aria-label="Search buildings"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <Select
          className="w-full sm:w-44"
          aria-label="Building type"
          value={type}
          options={typeOptions}
          onChange={(event) => setType(event.target.value as BuildingType | 'all')}
        />
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="md"
            onClick={() =>
              setViewRequest((current) => ({
                n: (current?.n ?? 0) + 1,
                bounds: [
                  [UOH_CAMPUS_BOUNDS.south, UOH_CAMPUS_BOUNDS.west],
                  [UOH_CAMPUS_BOUNDS.north, UOH_CAMPUS_BOUNDS.east],
                ],
              }))
            }
          >
            🎓 UoH campus
          </Button>
          <Button variant="secondary" size="md" onClick={() => setResetToken((n) => n + 1)}>
            ⤢ Fit all
          </Button>
          <Button variant={userLocation ? 'secondary' : 'primary'} size="md" onClick={locate} loading={locating}>
            <span aria-hidden>📍</span> {userLocation ? 'Update my location' : 'View yourself'}
          </Button>
        </div>
      </div>

      {/* Radius search */}
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
        <span className="text-sm font-semibold text-ink">Radius search</span>
        <Select
          className="w-44"
          aria-label="Search radius"
          value={radiusKm === null ? '' : String(radiusKm)}
          options={RADIUS_OPTIONS}
          onChange={(event) => changeRadius(event.target.value)}
        />
        <span className="text-sm text-slate-500">of</span>
        <button type="button" onClick={centreOnMe} className={CHIP}>
          📍 Me
        </button>
        <button
          type="button"
          onClick={centreOnSelected}
          disabled={!selectedBuilding}
          title={selectedBuilding ? `Centre on ${selectedBuilding.name}` : 'Select a building first'}
          className={CHIP}
        >
          🏢 Selected building
        </button>
        <span className="text-sm text-slate-500">or click the map</span>
        <p className="ml-auto text-sm text-slate-600" role="status">
          {radiusKm === null ? (
            'Choose a distance to search around a point.'
          ) : !centre ? (
            <span className="font-medium text-amber-700">Now click the map, or choose Me or a building, to set the centre.</span>
          ) : (
            <>
              <strong className="text-ink">{filtered.length}</strong> building{filtered.length === 1 ? '' : 's'} around {centre.label}
              {areaScore ? (
                <>
                  {' · area score '}
                  <strong className="tabular-nums text-ink">{areaScore.average}</strong>
                  {areaScore.includesDemo && <span className="text-slate-500"> (sample scores)</span>}
                </>
              ) : (
                ' · no scored buildings here'
              )}
            </>
          )}
        </p>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2" role="group" aria-label="Filter by score">
        {BANDS.map((item) => {
          const active = band === item.id;
          const color = item.id === 'all' ? null : bandColor(item.id);
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={active}
              onClick={() => setBand(item.id)}
              className={cn(
                'inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
                active ? 'bg-ink text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50',
              )}
            >
              {color && <span className="size-2.5 rounded-full" style={{ backgroundColor: color }} />}
              {item.label}
            </button>
          );
        })}
        <span className="ml-auto text-sm text-slate-500" aria-live="polite">
          Showing {filtered.length} of {buildings.length}
          {filtersActive && (
            <button type="button" onClick={resetFilters} className="ml-2 font-medium text-brand-700 hover:underline">
              Clear filters
            </button>
          )}
        </span>
      </div>

      {(locationNote || userLocation) && (
        <p
          role="status"
          className={cn('mt-3 text-sm', locationNote ? 'text-rose-700' : 'text-ocean-800')}
        >
          {locationNote ??
            (nearest
              ? `📍 Located (±${Math.round(userLocation!.accuracyM)} m). The nearest building is ${nearest.name}, ${nearest.km} km away.`
              : '📍 Located.')}
          {userLocation && !locationNote && (
            <button
              type="button"
              onClick={() => {
                setUserLocation(null);
                setSort('greenest');
              }}
              className="ml-2 font-medium text-slate-500 hover:text-ink hover:underline"
            >
              Hide my location
            </button>
          )}
        </p>
      )}

      <div className="mt-4 grid gap-5 lg:grid-cols-[1fr_340px]">
        {/* Map */}
        <div className="relative h-[520px] overflow-hidden rounded-card border border-slate-200 bg-white shadow-soft lg:h-[640px]">
          <HyderabadMap
            buildings={filtered}
            selection={selection}
            hoveredId={hoveredId}
            onSelect={select}
            userLocation={userLocation}
            nearest={nearest}
            resetToken={resetToken}
            viewRequest={viewRequest}
            allBuildings={buildings}
            radius={radius}
            onMapClick={onMapClick}
          />

          {/* With a radius active, an empty circle must not cover the map: the user clicks it to move the centre. */}
          {filtered.length === 0 && radius && (
            <div className="pointer-events-none absolute inset-x-0 top-4 z-[1000] flex justify-center px-4">
              <p className="rounded-full bg-white/95 px-4 py-2 text-sm font-medium text-slate-700 shadow-soft ring-1 ring-slate-200">
                No buildings in this circle. Click elsewhere or widen the radius.
              </p>
            </div>
          )}
          {filtered.length === 0 && !radius && (
            <div className="absolute inset-0 z-[1000] grid place-items-center bg-white/70 p-6 backdrop-blur-[1px]">
              <Card padding="lg" className="max-w-sm text-center">
                <p className="text-base font-semibold text-ink">No buildings match</p>
                <p className="mt-1 text-sm text-slate-500">Try a different search, type or score range.</p>
                <Button className="mt-4" onClick={resetFilters}>
                  Clear filters
                </Button>
              </Card>
            </div>
          )}

          <div className="pointer-events-none absolute bottom-3 left-3 z-[1000] rounded-xl bg-white/95 px-3 py-2 text-xs shadow-soft ring-1 ring-slate-200">
            <ul className="space-y-1">
              {LEGEND.map((item) => (
                <li key={item.id} className="flex items-center gap-2 text-slate-700">
                  <span className="size-3 rounded-full" style={{ backgroundColor: bandColor(item.id) }} />
                  {item.label}
                </li>
              ))}
              <li className="flex items-center gap-2 border-t border-slate-100 pt-1 text-slate-500">
                <span className="size-3 rounded-full border-2 border-dashed border-slate-400" />
                Dashed ring = demo data
              </li>
              {userLocation && (
                <li className="flex items-center gap-2 text-slate-700">
                  <span className="size-3 rounded-full bg-ocean-600 ring-2 ring-white" />
                  You are here
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* List */}
        <Card padding="none" className="flex max-h-[640px] flex-col overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base font-semibold text-ink">{sort === 'nearest' ? 'Nearest to you' : 'Greenest buildings'}</h3>
              <div role="group" aria-label="Sort" className="flex rounded-lg bg-slate-100 p-0.5 text-xs font-medium">
                {(['greenest', 'nearest'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    aria-pressed={sort === mode}
                    disabled={mode === 'nearest' && !userLocation}
                    title={mode === 'nearest' && !userLocation ? 'Show your location first' : undefined}
                    onClick={() => setSort(mode)}
                    className={cn(
                      'rounded-md px-2.5 py-1 capitalize transition-colors disabled:cursor-not-allowed disabled:opacity-40',
                      sort === mode ? 'bg-white text-ink shadow-sm' : 'text-slate-500 hover:text-ink',
                    )}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
            <p className="mt-0.5 text-sm text-slate-500">Hover to highlight, click to fly to it</p>
          </div>

          <ol className="flex-1 divide-y divide-slate-100 overflow-y-auto">
            {rows.map(({ building, km }, index) => {
              const display = getScoreDisplay(building);
              const colors = scoreColors(display.score ?? 0);
              const active = selection?.id === building.id;
              return (
                <li key={building.id}>
                  <button
                    type="button"
                    onClick={() => select(building.id, 'list')}
                    onMouseEnter={() => setHoveredId(building.id)}
                    onMouseLeave={() => setHoveredId((current) => (current === building.id ? null : current))}
                    onFocus={() => setHoveredId(building.id)}
                    onBlur={() => setHoveredId((current) => (current === building.id ? null : current))}
                    className={cn(
                      'flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-brand-50/60',
                      active && 'bg-ocean-50/70',
                    )}
                  >
                    <span className="w-5 text-sm font-medium tabular-nums text-slate-400">{index + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-medium text-ink">{building.name}</span>
                        {building.isDemo && (
                          <Badge tone="amber" dashed className="shrink-0 !px-1.5 !py-0 text-[10px]">
                            Demo
                          </Badge>
                        )}
                      </span>
                      <span className="block truncate text-xs text-slate-500">
                        {BUILDING_TYPE_LABELS[building.type]} · {building.locality}
                        {km !== null && <span className="font-medium text-ocean-700"> · {km} km away</span>}
                      </span>
                    </span>
                    {building.status === 'VERIFIED' ? (
                      <span
                        className="rounded-lg px-2 py-1 text-sm font-semibold tabular-nums"
                        style={{ backgroundColor: colors.soft, color: colors.text }}
                      >
                        {display.score}
                      </span>
                    ) : (
                      <span className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-500">
                        {building.status === 'DRAFT' ? 'Not scored' : building.status === 'REJECTED' ? 'Rejected' : 'In review'}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
            {rows.length === 0 && (
              <li className="px-5 py-10 text-center text-sm text-slate-500">No buildings match your filters.</li>
            )}
          </ol>

          <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-5 py-3 text-xs text-slate-500">
            <span>Want to be on the map? An admin verifies every submission.</span>
            <Link href="/buildings/new" className="shrink-0 font-medium text-brand-700 hover:underline">
              Add yours
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
