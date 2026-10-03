import { AdminReview } from '@/components/admin/admin-review';

export default async function AdminBuildingReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminReview id={id} />;
}
