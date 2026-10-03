'use client';

import dynamic from 'next/dynamic';
import { LoadingState } from '@greenscore/ui';

/** Leaflet touches `window`, so the map is loaded on the client only. */
export const HyderabadMap = dynamic(() => import('./hyderabad-map'), {
  ssr: false,
  loading: () => <LoadingState message="Loading the Hyderabad map…" className="h-full" />,
});
