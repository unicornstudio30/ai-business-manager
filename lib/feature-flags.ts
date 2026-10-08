// Feature flags for PBM's read-only reporting mode.
//
// PBM is a read-only reporting layer over the Notion CRM. The Pipeline app is
// the only automated writer of Stage (Notion "Status") and owns the inbox,
// next action and drafts. Overlapping features stay in the codebase behind
// these flags instead of being deleted.
//
// Override any flag with an env var: PBM_FLAG_<NAME>=on|off
//   e.g. PBM_FLAG_NOTION_WRITES=on

export const FLAG_DEFAULTS = {
  // Any write to Notion: contact push, content push, "Log Actions" append,
  // schema setup, plus the contact create/edit/delete routes that feed them.
  NOTION_WRITES: false,
  // Sales drafting: next_message, comment_draft, next-action, stuck_suggestion,
  // stage-advance suggestions.
  DRAFTING: false,
  // Inbox view (dashboard widget, /inbox, MCP inbox).
  INBOX: false,
  // Next-message DM sequence drafting (MCP next_message, /api/ai/next-message).
  NEXT_MESSAGE: false,
  // Follow-up / action queues: needs_follow_up, cadences, engagement queue,
  // connect queue, DM reminders, today queue.
  FOLLOW_UP_QUEUES: false,
  // Networking (PRM) message drafting used by /write-message. Separate Notion
  // database from the sales CRM, so it stays on by default.
  NETWORKING_DRAFTS: true,
} as const;

export type FeatureFlag = keyof typeof FLAG_DEFAULTS;

export function isEnabled(flag: FeatureFlag): boolean {
  const raw = process.env[`PBM_FLAG_${flag}`]?.trim().toLowerCase();
  if (raw === "on" || raw === "true" || raw === "1") return true;
  if (raw === "off" || raw === "false" || raw === "0") return false;
  return FLAG_DEFAULTS[flag];
}

export const DISABLED_REASON: Record<FeatureFlag, string> = {
  NOTION_WRITES: "PBM is read-only. Notion is the system of record and the Pipeline app is the only automated writer.",
  DRAFTING: "Drafting moved to the Pipeline app.",
  INBOX: "The inbox moved to the Pipeline app.",
  NEXT_MESSAGE: "Next-message drafting moved to the Pipeline app.",
  FOLLOW_UP_QUEUES: "Follow-up queues and next action moved to the Pipeline app.",
  NETWORKING_DRAFTS: "Networking drafting is turned off.",
};

// Fields added to an MCP tool response when its feature is off. The tool keeps
// its name and normal shape (with empty data) so callers don't break.
export function disabledFields(flag: FeatureFlag) {
  return { disabled: true as const, reason: DISABLED_REASON[flag], flag: `PBM_FLAG_${flag}` };
}

// Standard API response for a route whose feature is off.
export function disabledResponse(flag: FeatureFlag, status = 410) {
  return Response.json({ error: "feature_disabled", ...disabledFields(flag) }, { status });
}
