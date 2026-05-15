// Stage advancement suggestions — reasons to nudge a contact to the next stage.
// Surfaced as banners on the contact detail page so Saidur can advance in Notion.

import type { Contact, Activity } from "./db/schema";
import { isTerminal } from "./stages";

export type StageSuggestion = {
  toStage: string;
  reason: string;
  confidence: "low" | "medium" | "high";
};

// Pattern: keyword in content suggesting a reply received
const REPLY_PATTERNS = [/\breplied\b/i, /\bresponded\b/i, /reply received/i, /they said/i, /\bdm'?d back\b/i];

function looksLikeReply(content: string): boolean {
  return REPLY_PATTERNS.some((p) => p.test(content));
}

export function computeStageSuggestions(contact: Contact, activities: Activity[]): StageSuggestion[] {
  const suggestions: StageSuggestion[] = [];
  const stage = contact.status;
  if (!stage || isTerminal(stage)) return suggestions;
  if (stage === "Partnership") return suggestions;

  // Recent activity windows
  const now = Date.now();
  const recent = activities.filter((a) => a.createdAt && now - a.createdAt.getTime() < 14 * 86400000);

  // Reply detected via note keywords or follow_up_sent that mentions reply
  const hasReply = recent.some(
    (a) => looksLikeReply(a.content) || (a.type === "note" && /\b(yes|interested|tell me more|sure)\b/i.test(a.content))
  );

  // Counts
  const dmsSent = recent.filter((a) => a.type === "dm_sent").length;
  const followUpsSent = recent.filter((a) => a.type === "follow_up_sent").length;
  const commentsDrafted = recent.filter((a) => a.type === "comment_drafted").length;
  const emailsDrafted = recent.filter((a) => a.type === "email_drafted").length;
  const auditRuns = recent.filter((a) => a.type === "audit_run").length;

  // Rule 1: Prospect → 1st message (we sent something)
  if (stage === "Prospect" && (dmsSent > 0 || emailsDrafted > 0 || commentsDrafted > 0)) {
    suggestions.push({
      toStage: "1st message",
      reason: `You've sent ${dmsSent + emailsDrafted + commentsDrafted} touch${
        dmsSent + emailsDrafted + commentsDrafted === 1 ? "" : "es"
      } recently. They've moved past Prospect.`,
      confidence: "high",
    });
  }

  // Rule 2: 1st message / 1st-2nd Prospect Follow-up → Lead (reply detected)
  if (
    hasReply &&
    ["1st message", "1st Prospect Follow-up", "2nd Prospect Follow up"].includes(stage)
  ) {
    suggestions.push({
      toStage: "Lead",
      reason: "Activity log mentions a reply — they've engaged.",
      confidence: "high",
    });
  }

  // Rule 3: 1st message → 1st Prospect Follow-up (≥2 follow-ups sent, no reply)
  if (stage === "1st message" && followUpsSent >= 1 && !hasReply) {
    suggestions.push({
      toStage: "1st Prospect Follow-up",
      reason: `You've sent ${followUpsSent} follow-up${followUpsSent === 1 ? "" : "s"}. Still waiting.`,
      confidence: "medium",
    });
  }

  // Rule 4: Lead → 1st Lead Follow up (we sent another message after reply, no new reply)
  if (stage === "Lead" && (followUpsSent >= 1 || dmsSent >= 2)) {
    suggestions.push({
      toStage: "1st Lead Follow up",
      reason: "Lead conversation has multiple outbound touches — moving deeper into follow-up.",
      confidence: "medium",
    });
  }

  // Rule 5: any waiting stage with audit + email → suggest Qualified
  if (
    auditRuns > 0 &&
    emailsDrafted > 0 &&
    ["Lead", "1st Lead Follow up", "2nd Lead Follow up"].includes(stage)
  ) {
    suggestions.push({
      toStage: "Qualified",
      reason: "Site audit run + email drafted — they're a real opportunity.",
      confidence: "low",
    });
  }

  return suggestions;
}
