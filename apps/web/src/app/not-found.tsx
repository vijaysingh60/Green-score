import Link from 'next/link';
import { buttonStyles, EmptyState } from '@greenscore/ui';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-20">
      <EmptyState
        icon="🧭"
        title="We couldn’t find that page"
        description="The building or page you’re looking for doesn’t exist."
        action={
          <Link href="/" className={buttonStyles()}>
            Back to the map
          </Link>
        }
      />
    </div>
  );
}
