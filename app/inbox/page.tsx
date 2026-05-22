import { redirect } from "next/navigation";

export default async function InboxRedirect({
  searchParams,
}: {
  searchParams: Promise<{ channel?: string }>;
}) {
  const sp = await searchParams;
  const qs = sp.channel ? `?channel=${sp.channel}` : "";
  redirect(`/dm${qs}`);
}
