'use client';

import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import Link from 'next/link';
import { MapContainer, Marker, Popup, TileLayer, useMapEvents } from 'react-leaflet';
import type { MapBuilding } from '@greenscore/types';
import { BUILDING_TYPE_LABELS, HYDERABAD_BOUNDS, HYDERABAD_CENTER, getScoreDisplay } from '@greenscore/shared';
import { Badge, ScoreRing, scoreColors } from '@greenscore/ui';

/** Score threshold for the highlighted (haloed) pins. */
const TOP_SCORE = 80;

function pinIcon(building: MapBuilding): L.DivIcon {
  const score = building.finalVerifiedScore;
  const colors = scoreColors(score ?? 0);
  const top = score !== null && score >= TOP_SCORE;
  const classes = ['gs-pin', building.isDemo ? 'gs-pin--demo' : '', top ? 'gs-pin--top' : ''].join(' ').trim();
  const size = top ? 46 : 38;
  // Only a number and a hex colour are interpolated into the HTML, never user text.
  return L.divIcon({
    className: '',
    html: `<div class="${classes}" style="background:${colors.solid};--pin-color:${colors.solid}">${
      score === null ? '–' : Math.round(score)
    }</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

/** Let the page scroll normally; mouse-wheel zoom turns on after the map is clicked. */
function WheelZoomOnClick() {
  const map = useMapEvents({
    click: () => map.scrollWheelZoom.enable(),
    mouseout: () => map.scrollWheelZoom.disable(),
  });
  return null;
}

function BuildingPopup({ building }: { building: MapBuilding }) {
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

export default function HyderabadMap({ buildings }: { buildings: MapBuilding[] }) {
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
      <WheelZoomOnClick />
      {buildings.map((building) => (
        <Marker
          key={building.id}
          position={[building.latitude, building.longitude]}
          icon={pinIcon(building)}
          title={building.name}
          // Real verified buildings draw above demo pins; within each group, higher scores on top.
          zIndexOffset={(building.isDemo ? 0 : 1000) + Math.round((building.finalVerifiedScore ?? 0) * 10)}
        >
          <Popup closeButton={false}>
            <BuildingPopup building={building} />
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
