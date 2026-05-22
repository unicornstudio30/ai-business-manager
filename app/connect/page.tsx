// /connect — connection-request workflow hub.
//
// Two sections:
//   1. ConnectReminders        — today's per-platform connect + InMail targets
//                               with daily + hourly pacing (ban-risk control)
//   2. ConnectQueuePlatform    — prospects waiting for first outreach, grouped
//                               by platform, with profile + Notion links
//
// "Connect" here covers any first-touch initiated by us:
//   - LinkedIn connection request (and InMail for non-connections, separate cap)
//   - Facebook friend request
//   - Instagram / X follow
// Once a connection request is accepted (or an InMail is sent), move the
// contact's Status to "1st message" / "In-mail" in Notion CRM.

import { UserPlus } from "lucide-react";
import { getNotionDerivedKpis } from "@/lib/db/notion-derived-kpis";
import { getConnectQueueByPlatform } from "@/lib/db/connect-queue";
import { getEffectiveOutreachLimits } from "@/lib/outreach-config";
import { ConnectReminders } from "@/components/connect/connect-reminders";
import { ConnectQueuePlatform } from "@/components/connect/connect-queue-platform";

export const dynamic = "force-dynamic";

export default async function ConnectPage() {
  const today = new Date();
  const [kpis, queue, effective] = await Promise.all([
    getNotionDerivedKpis(today),
    getConnectQueueByPlatform(),
    getEffectiveOutreachLimits(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="text-xs font-medium uppercase tracking-wider text-stone-500 mb-1">
          Connection requests · InMail · first touches
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-stone-900 flex items-center gap-2">
          <UserPlus className="size-7 text-stone-400" /> Connect
        </h1>
        <p className="text-sm text-stone-500 mt-1">
          Send connection requests within safe daily + hourly limits. DMs to already-connected people
          live under <a href="/dm" className="text-violet-700 hover:underline">DM</a>;
          commenting on prospects' content lives under{" "}
          <a href="/engagement" className="text-violet-700 hover:underline">Engage</a>.
        </p>
      </div>

      <ConnectReminders kpis={kpis} limits={effective.limits} activeWindow={effective.activeWindow} />

      <ConnectQueuePlatform data={queue} />
    </div>
  );
}
