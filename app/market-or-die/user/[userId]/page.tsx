import { notFound } from "next/navigation";
import { getMarketingUserDetail } from "@/lib/db/leaderboard-detail";
import { UserDetailView, parsePeriod } from "@/components/leaderboards/user-detail-view";

export const dynamic = "force-dynamic";

export default async function MarketUserDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ period?: string }>;
}) {
  const { userId } = await params;
  const sp = await searchParams;
  const detail = await getMarketingUserDetail(userId);
  if (!detail) notFound();
  return <UserDetailView detail={detail} period={parsePeriod(sp.period)} />;
}
