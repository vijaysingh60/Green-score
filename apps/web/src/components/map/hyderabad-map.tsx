'use client';

import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import Link from 'next/link';
import { useEffect, useRef, type RefObject } from 'react';
import { Circle, CircleMarker, MapContainer, Marker, Popup, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import type { MapBuilding } from '@greenscore/types';
import {
  BUILDING_TYPE_LABELS,
  CATEGORY_LABELS,
  getCategoryMaxPoints,
  HYDERABAD_BOUNDS,
  HYDERABAD_CENTER,
  computeNeighbourStats,
  getScoreDisplay,
} from '@greenscore/shared';
import { Badge, ScoreRing, cn, scoreColors } from '@greenscore/ui';

/** Score threshold for the highlighted (haloed) pins. */
const TOP_SCORE = 80;

export interface UserLocation {
  latitude: number;
  longitude: number;
  /** Horizontal accuracy in metres. */
  accuracyM: number;
}

/** `list` selections fly the map to the building; `map` selections (a pin click) just highlight it. */
export interface MapSelection {
  id: string;
  /** Changes on every selection, so choosing the same building twice still re-focuses it. */
  n: number;
  source: 'map' | 'list';
}

export interface NearestBuilding {
  id: string;
  name: string;
  km: number;
}

/** The radius-search circle: a centre and a distance. */
export interface RadiusSearch {
  latitude: number;
  longitude: number;
  km: number;
}

/** Ask the map to fly to an area (e.g. the campus). `n` changes on each request. */
export interface ViewRequest {
  n: number;
  bounds: [[number, number], [number, number]];
}

// --- Pins -------------------------------------------------------------------------------

const iconCache = new Map<string, L.DivIcon>();

/** Icons are cached so Leaflet is not asked to swap every marker's icon on each render. */
function pinIcon(building: MapBuilding, selected: boolean): L.DivIcon {
  const score = building.finalVerifiedScore;
  // Anything not yet verified is a small grey pin with no score.
  const unscored = building.status !== 'VERIFIED';
  const key = `${score}|${building.isDemo}|${selected}|${unscored}`;
  const cached = iconCache.get(key);
  if (cached) return cached;
  if (unscored) {
    const icon = L.divIcon({
      className: '',
      html: `<div class="gs-pin gs-pin--registered${selected ? ' gs-pin--selected' : ''}"></div>`,
      iconSize: [22, 22],
      iconAnchor: [11, 11],
      popupAnchor: [0, -12],
    });
    iconCache.set(key, icon);
    return icon;
  }

  const colors = scoreColors(score ?? 0);
  const top = score !== null && score >= TOP_SCORE;
  const classes = ['gs-pin', building.isDemo ? 'gs-pin--demo' : '', top ? 'gs-pin--top' : '', selected ? 'gs-pin--selected' : '']
    .join(' ')
    .trim();
  const size = top ? 46 : 38;
  // Only a number and a hex colour are interpolated into the HTML, never user text.
  const icon = L.divIcon({
    className: '',
    html: `<div class="${classes}" style="background:${colors.solid};--pin-color:${colors.solid}">${
      score === null ? '–' : Math.round(score)
    }</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
  iconCache.set(key, icon);
  return icon;
}

const userIcon = L.divIcon({
  className: '',
  html: '<div class="gs-user"><span class="gs-user__pulse"></span><span class="gs-user__dot"></span></div>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
  popupAnchor: [0, -14],
});

// --- Popups -----------------------------------------------------------------------------

/** Popup for a registered building that has no verified score yet. */
function RegisteredPopup({ building }: { building: MapBuilding }) {
  const note =
    building.status === 'DRAFT'
      ? { badge: <Badge tone="neutral">Not yet assessed</Badge>, text: 'Registered building. It has no sustainability score yet.' }
      : building.status === 'REJECTED'
        ? { badge: <Badge tone="red">Assessment rejected</Badge>, text: 'The last assessment was rejected. You can submit a new one.' }
        : { badge: <Badge tone="amber">Assessment under review</Badge>, text: 'An admin is reviewing this building’s assessment.' };
  return (
    <div className="p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Registered</p>
      <h3 className="mt-0.5 text-sm font-semibold leading-snug text-ink">{building.name}</h3>
      <p className="mt-0.5 text-xs text-slate-500">
        {BUILDING_TYPE_LABELS[building.type]} · {building.locality}
      </p>
      <div className="mt-2.5">{note.badge}</div>
      <p className="mt-2 text-xs leading-relaxed text-slate-600">{note.text}</p>
      <Link
        href={`/buildings/${building.id}`}
        className="mt-3 flex h-9 items-center justify-center rounded-lg bg-brand-600 text-sm font-medium !text-white hover:bg-brand-700"
      >
        View details
      </Link>
    </div>
  );
}

/** Neighbour score: this building against the scored buildings within 500 m. */
function PopupNeighbours({ building, allBuildings }: { building: MapBuilding; allBuildings: MapBuilding[] }) {
  const stats = computeNeighbourStats(building, allBuildings);
  const metres = Math.round(stats.radiusKm * 1000);
  if (stats.count === 0 || stats.average === null) {
    return (
      <p className="mt-3 border-t border-slate-100 pt-3 text-[11px] text-slate-500">
        No scored neighbours within {metres} m.
      </p>
    );
  }
  return (
    <div className="mt-3 border-t border-slate-100 pt-3">
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        Neighbour score · within {metres} m
      </p>
      <div className="flex items-center justify-between gap-2 text-[11px]">
        <span className="text-slate-600">
          Average of {stats.count}: <strong className="tabular-nums text-ink">{stats.average}</strong>
        </span>
        {stats.delta !== null && (
          <span
            className={cn(
              'rounded-full px-2 py-0.5 font-semibold tabular-nums',
              stats.delta >= 0 ? 'bg-brand-50 text-brand-800' : 'bg-amber-50 text-amber-800',
            )}
          >
            {stats.delta >= 0 ? `+${stats.delta} above` : `${stats.delta} below`}
          </span>
        )}
      </div>
      {stats.rank !== null && (
        <p className="mt-1 text-[11px] text-slate-500">
          Rank {stats.rank} of {stats.count + 1} nearby{stats.includesDemo ? ' · includes sample scores' : ''}
        </p>
      )}
    </div>
  );
}

/** Hover card: basic electricity facts plus points per category. */
function HoverSummary({ building }: { building: MapBuilding }) {
  const summary = building.summary;
  if (!summary) return null;
  const max = getCategoryMaxPoints();
  const solar =
    summary.solarInstalled === null
      ? '–'
      : summary.solarInstalled
        ? `Yes${summary.solarKwp ? ` · ${Math.round(summary.solarKwp)} kWp` : ''}`
        : 'No';
  return (
    <div className="w-56 p-3 text-xs">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Summary</p>
      <dl className="mt-1.5 space-y-1">
        <div className="flex justify-between gap-2">
          <dt className="text-slate-500">Electricity</dt>
          <dd className="font-medium tabular-nums text-ink">
            {summary.electricityKwh !== null ? `${Math.round(summary.electricityKwh).toLocaleString('en-IN')} kWh/yr` : '–'}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-slate-500">Solar PV</dt>
          <dd className="font-medium text-ink">{solar}</dd>
        </div>
      </dl>
      {summary.breakdown && (
        <ul className="mt-2 space-y-1 border-t border-slate-100 pt-2">
          {(Object.keys(max) as Array<keyof typeof max>).map((key) => (
            <li key={key} className="flex justify-between gap-2">
              <span className="truncate text-slate-500">{CATEGORY_LABELS[key]}</span>
              <span className="tabular-nums text-ink">
                {summary.breakdown![key]}/{max[key]}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function BuildingPopup({ building, allBuildings }: { building: MapBuilding; allBuildings: MapBuilding[] }) {
  if (building.status !== 'VERIFIED') return <RegisteredPopup building={building} />;
  const display = getScoreDisplay(building);
  const colors = scoreColors(display.score ?? 0);
  return (
    <div className="p-4">
      <div className="flex items-start gap-3">
        <ScoreRing value={display.score} size={64} strokeWidth={7} />
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: colors.text }}>
            {display.kind === 'verified' ? 'Verified Green Score' : display.label}
          </p>
          <h3 className="mt-0.5 text-sm font-semibold leading-snug text-ink">{building.name}</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            {BUILDING_TYPE_LABELS[building.type]} · {building.locality}
          </p>
        </div>
      </div>
      <PopupNeighbours building={building} allBuildings={allBuildings} />
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {display.kind === 'verified' && <Badge tone="green">✓ Verified</Badge>}
        {display.kind === 'demo' && (
          <Badge tone="amber" dashed>
            Demo data
          </Badge>
        )}
        {display.kind === 'unverified' && <Badge tone="neutral">Not verified</Badge>}
      </div>
      <Link
        href={`/buildings/${building.id}`}
        className="mt-3 flex h-9 items-center justify-center rounded-lg bg-brand-600 text-sm font-medium !text-white hover:bg-brand-700"
      >
        View building
      </Link>
    </div>
  );
}

// --- Map behaviour ----------------------------------------------------------------------

/** Let the page scroll normally; mouse-wheel zoom turns on after the map is clicked. */
function WheelZoomOnClick({ onMapClick }: { onMapClick?: (latitude: number, longitude: number) => void }) {
  const map = useMapEvents({
    // A click on empty map (pins handle their own clicks) also moves the radius-search centre.
    click: (event) => {
      map.scrollWheelZoom.enable();
      onMapClick?.(event.latlng.lat, event.latlng.lng);
    },
    mouseout: () => map.scrollWheelZoom.disable(),
  });
  return null;
}

interface ControllerProps {
  buildings: MapBuilding[];
  selection: MapSelection | null;
  hoveredId: string | null;
  userLocation: UserLocation | null;
  resetToken: number;
  viewRequest: ViewRequest | null;
  radius: RadiusSearch | null;
  markers: RefObject<Map<string, L.Marker>>;
}

/** Everything that moves the camera or highlights a pin lives here. */
function MapController({ buildings, selection, hoveredId, userLocation, resetToken, viewRequest, radius, markers }: ControllerProps) {
  const map = useMap();

  // Always read the latest list without re-running the selection effect when filters change.
  const buildingsRef = useRef(buildings);
  useEffect(() => {
    buildingsRef.current = buildings;
  });

  // Fit the view to the visible buildings (on load, when filters change, and on "Fit all").
  useEffect(() => {
    if (buildings.length === 0) return;
    if (buildings.length === 1) {
      const only = buildings[0]!;
      map.flyTo([only.latitude, only.longitude], 14, { duration: 0.7 });
      return;
    }
    const bounds = L.latLngBounds(buildings.map((b) => [b.latitude, b.longitude] as [number, number]));
    map.flyToBounds(bounds, { padding: [70, 70], maxZoom: 14, duration: 0.7 });
  }, [map, buildings, resetToken]);

  // A building picked from the list: fly to it and open its popup.
  useEffect(() => {
    if (!selection || selection.source !== 'list') return;
    const building = buildingsRef.current.find((b) => b.id === selection.id);
    const marker = markers.current.get(selection.id);
    if (!building || !marker) return;
    map.flyTo([building.latitude, building.longitude], Math.max(map.getZoom(), 14), { duration: 0.8 });
    const timer = window.setTimeout(() => marker.openPopup(), 850);
    return () => window.clearTimeout(timer);
  }, [map, selection, markers]);

  // Fly to a requested area (the "UoH campus" button).
  useEffect(() => {
    if (viewRequest) map.flyToBounds(viewRequest.bounds, { padding: [30, 30], duration: 0.9 });
  }, [map, viewRequest]);

  // Radius search: show the whole circle. Declared after the fit effect so it wins when both run.
  useEffect(() => {
    if (!radius) return;
    const circle = L.latLng(radius.latitude, radius.longitude).toBounds(radius.km * 2000);
    map.flyToBounds(circle, { padding: [40, 40], duration: 0.7 });
  }, [map, radius]);

  // The user's location: centre on it, close enough to see which building they are beside.
  useEffect(() => {
    if (userLocation) map.flyTo([userLocation.latitude, userLocation.longitude], 16, { duration: 0.9 });
  }, [map, userLocation]);

  // Hovering a list row highlights its pin.
  useEffect(() => {
    if (!hoveredId) return;
    const element = markers.current.get(hoveredId)?.getElement();
    element?.classList.add('gs-hover');
    return () => element?.classList.remove('gs-hover');
  }, [hoveredId, markers]);

  return null;
}

// --- The map ----------------------------------------------------------------------------

export interface HyderabadMapProps {
  buildings: MapBuilding[];
  selection: MapSelection | null;
  hoveredId: string | null;
  onSelect: (id: string, source: MapSelection['source']) => void;
  userLocation: UserLocation | null;
  nearest: NearestBuilding | null;
  /** Bump to re-fit the view to the visible buildings. */
  resetToken: number;
  viewRequest: ViewRequest | null;
  /** Every building on the map (not just the filtered ones), for neighbour scores. */
  allBuildings: MapBuilding[];
  /** The radius-search circle to draw, if a radius filter is active. */
  radius: RadiusSearch | null;
  /** A click on empty map, used to move the radius-search centre. */
  onMapClick?: (latitude: number, longitude: number) => void;
}

export default function HyderabadMap({
  buildings,
  selection,
  hoveredId,
  onSelect,
  userLocation,
  nearest,
  resetToken,
  viewRequest,
  allBuildings,
  radius,
  onMapClick,
}: HyderabadMapProps) {
  const markers = useRef(new Map<string, L.Marker>());
  const bounds = L.latLngBounds(
    [HYDERABAD_BOUNDS.south - 0.15, HYDERABAD_BOUNDS.west - 0.15],
    [HYDERABAD_BOUNDS.north + 0.15, HYDERABAD_BOUNDS.east + 0.15],
  );

  return (
    <MapContainer
      center={[HYDERABAD_CENTER.latitude, HYDERABAD_CENTER.longitude]}
      zoom={11}
      minZoom={10}
      maxBounds={bounds}
      scrollWheelZoom={false}
      className="h-full w-full"
    >
      {/* Keyless OSM tiles (fine for a hackathon demo; swap for a hosted provider in production).
          globals.css desaturates them so the score pins stay the focus. */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />
      <WheelZoomOnClick onMapClick={onMapClick} />
      <MapController
        buildings={buildings}
        selection={selection}
        hoveredId={hoveredId}
        userLocation={userLocation}
        resetToken={resetToken}
        viewRequest={viewRequest}
        radius={radius}
        markers={markers}
      />

      {buildings.map((building) => (
        <Marker
          key={building.id}
          ref={(marker) => {
            if (marker) markers.current.set(building.id, marker);
            else markers.current.delete(building.id);
          }}
          position={[building.latitude, building.longitude]}
          icon={pinIcon(building, selection?.id === building.id)}
          title={building.name}
          // Real verified buildings draw above demo pins; within each group, higher scores on top.
          zIndexOffset={(building.status !== 'VERIFIED' ? -500 : building.isDemo ? 0 : 1000) + Math.round((building.finalVerifiedScore ?? 0) * 10)}
          eventHandlers={{ click: () => onSelect(building.id, 'map') }}
        >
          {building.status === 'VERIFIED' && building.summary && (
            <Tooltip direction="right" offset={[16, 0]} opacity={1}>
              <HoverSummary building={building} />
            </Tooltip>
          )}
          <Popup closeButton={false} minWidth={300}>
            <BuildingPopup building={building} allBuildings={allBuildings} />
          </Popup>
        </Marker>
      ))}

      {radius && (
        <>
          <Circle
            center={[radius.latitude, radius.longitude]}
            radius={radius.km * 1000}
            pathOptions={{ color: '#1f7f4d', weight: 2, dashArray: '6 6', fillColor: '#1f7f4d', fillOpacity: 0.06 }}
            interactive={false}
          />
          <CircleMarker
            center={[radius.latitude, radius.longitude]}
            radius={5}
            pathOptions={{ color: '#ffffff', weight: 2, fillColor: '#1f7f4d', fillOpacity: 1 }}
            interactive={false}
          />
        </>
      )}

      {userLocation && (
        <>
          <Circle
            center={[userLocation.latitude, userLocation.longitude]}
            radius={Math.min(Math.max(userLocation.accuracyM, 30), 800)}
            pathOptions={{ color: '#2582ea', weight: 1, fillColor: '#2582ea', fillOpacity: 0.12 }}
            interactive={false}
          />
          <Marker
            position={[userLocation.latitude, userLocation.longitude]}
            icon={userIcon}
            title="You are here"
            zIndexOffset={5000}
            keyboard={false}
          >
            <Popup closeButton={false}>
              <div className="p-4 text-sm">
                <p className="font-semibold text-ink">📍 You are here</p>
                <p className="mt-0.5 text-xs text-slate-500">Accuracy ±{Math.round(userLocation.accuracyM)} m</p>
                {nearest && (
                  <button
                    type="button"
                    onClick={() => onSelect(nearest.id, 'list')}
                    className="mt-3 w-full rounded-lg bg-ocean-50 px-3 py-2 text-left text-xs text-ocean-900 ring-1 ring-ocean-200 hover:bg-ocean-100"
                  >
                    <span className="block text-[11px] uppercase tracking-wide text-ocean-700">Nearest building</span>
                    <span className="block font-medium">
                      {nearest.name} · {nearest.km} km
                    </span>
                  </button>
                )}
              </div>
            </Popup>
          </Marker>
        </>
      )}
    </MapContainer>
  );
}
