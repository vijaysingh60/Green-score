import { Hero } from '@/components/hero';
import { MapSection } from '@/components/map-section';
import { ScoreKinds } from '@/components/score-kinds';
import { getMapBuildings } from '@/lib/api';

// The map must always reflect the latest verified buildings.
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const { buildings, source } = await getMapBuildings();
  return (
    <>
      <Hero />
      <MapSection buildings={buildings} source={source} />
      <ScoreKinds />
    </>
  );
}
