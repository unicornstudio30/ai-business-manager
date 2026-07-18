import { notFound } from "next/navigation";
import { getSalesUserDetail } from "@/lib/db/leaderboard-detail";
import { UserDetailView, parsePeriod } from "@/components/leaderboards/user-detail-view";

export const dynamic = "force-dynamic";

export default async function SellUserDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ period?: string }>;
}) {
  const { userId } = await params;
  const sp = await searchParams;
  const detail = await getSalesUserDetail(userId);
  if (!detail) notFound();
  return <UserDetailView detail={detail} period={parsePeriod(sp.period)} />;
}
