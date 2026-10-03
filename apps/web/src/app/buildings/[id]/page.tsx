import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { BuildingProfile } from '@greenscore/types';
import { buttonStyles, EmptyState } from '@greenscore/ui';
import { BuildingProfileView } from '@/components/profile/building-profile';
import { api, ApiRequestError } from '@/lib/api';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Building' };

export default async function BuildingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ submitted?: string }>;
}) {
  const [{ id }, { submitted }] = await Promise.all([params, searchParams]);

  let profile: BuildingProfile;
  try {
    profile = await api.building(id);
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) notFound();
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <EmptyState
          icon="📡"
          title="Couldn’t load this building"
          description={error instanceof Error ? error.message : 'Unknown error'}
          action={
            <Link href="/" className={buttonStyles({ variant: 'secondary' })}>
              Back to the map
            </Link>
          }
        />
      </div>
    );
  }

  return <BuildingProfileView profile={profile} submitted={submitted === '1'} />;
}
