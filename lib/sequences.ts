// DM sequence engine — maps the Appsmove Sales System's
// 7-step LinkedIn + 8-step Facebook DM sequences onto Unicorn Studio's contacts.
//
// Each step has: stepNumber, dayOffset (from previous step), channel,
// briefDescription (used by /next-message to prompt Claude),
// and which CRM Status the step typically corresponds to.

export type SequenceTrack = "linkedin" | "facebook";

export type SequenceStep = {
  step: number;
  dayOffsetFromPrev: number;
  channel: "linkedin-connect" | "linkedin-dm" | "linkedin-engage" | "email" | "fb-friend" | "fb-engage" | "fb-react" | "fb-dm";
  brief: string;        // 1-line for Claude
  promptHint: string;   // longer guide for the draft
  targetStatus: string; // CRM status this step lands the contact in
};

export const LINKEDIN_SEQUENCE: SequenceStep[] = [
  {
    step: 1,
    dayOffsetFromPrev: 0,
    channel: "linkedin-connect",
    brief: "Connection request + ACA note",
    promptHint:
      "Send a connection request with a short note. Lead with something specific about THEIR agency/work (Acknowledge). Tie to a positive trait (Compliment). Soft ask just to connect — no pitch.",
    targetStatus: "1st message",
  },
  {
    step: 2,
    dayOffsetFromPrev: 3,
    channel: "linkedin-engage",
    brief: "Engage with 2-3 of their recent posts",
    promptHint:
      "Identify 2-3 recent posts of theirs and suggest substantive ACA-style comments (3-5 sentences each). No pitching. The goal is name recognition before the DM.",
    targetStatus: "1st message",
  },
  {
    step: 3,
    dayOffsetFromPrev: 1,
    channel: "linkedin-dm",
    brief: "Value-first DM — open question about their dev/AI setup",
    promptHint:
      "Send a value-first DM. ACA structure. Open-ended question about how they currently handle AI automation / dev / their core operational pain. NEVER pitch in this message. Goal is a reply.",
    targetStatus: "Lead",
  },
  {
    step: 4,
    dayOffsetFromPrev: 3,
    channel: "linkedin-dm",
    brief: "Gentle follow-up DM after silence",
    promptHint:
      "Bump the previous message without pressure. Acknowledge their busy inbox. Reference one new specific observation (post, hire, win). Tie to a rare trait. Ask if AI/automation capacity is a current friction.",
    targetStatus: "1st Lead Follow up",
  },
  {
    step: 5,
    dayOffsetFromPrev: 4,
    channel: "email",
    brief: "Email with mini case study",
    promptHint:
      "Switch channels to email. Subject line creates curiosity (no clickbait). Body: brief ACA, then a short case study (3-4 sentences) of a similar-size operator who solved the same problem. Soft 15-min ask. Link to Unicorn site.",
    targetStatus: "2nd Lead Follow up",
  },
  {
    step: 6,
    dayOffsetFromPrev: 5,
    channel: "linkedin-dm",
    brief: "Final DM with direct ask",
    promptHint:
      "Last message in sequence. Respectful. ACA. Clear ask: a 15-20 min call to map their current automation gaps. Include landing page link. Make it easy to say no.",
    targetStatus: "2nd Lead Follow up",
  },
  {
    step: 7,
    dayOffsetFromPrev: 14,
    channel: "linkedin-dm",
    brief: "Move to monthly nurture",
    promptHint:
      "Send a brief, value-add message every ~30 days with something genuinely useful (insight, framework, free tool). No ask. Keep relationship warm.",
    targetStatus: "Follow up later",
  },
];

export const FACEBOOK_SEQUENCE: SequenceStep[] = [
  {
    step: 1,
    dayOffsetFromPrev: 0,
    channel: "fb-friend",
    brief: "Friend request (no message yet)",
    promptHint: "Send a plain friend request from your personal profile. No message, no pressure — just get on their radar.",
    targetStatus: "1st message",
  },
  {
    step: 2,
    dayOffsetFromPrev: 2,
    channel: "fb-engage",
    brief: "Leave valuable replies on their group posts",
    promptHint:
      "Find 1-2 of their recent posts in the shared FB group. Reply with ACA comments — Acknowledge their point, Compliment the thinking, Ask a sharper follow-up question. Substantive, not generic.",
    targetStatus: "1st message",
  },
  {
    step: 3,
    dayOffsetFromPrev: 2,
    channel: "fb-react",
    brief: "React/comment on their personal profile",
    promptHint:
      "Move beyond the group — engage on their personal profile content. Genuine interest, no pitch. Builds the recognition layer.",
    targetStatus: "1st message",
  },
  {
    step: 4,
    dayOffsetFromPrev: 1,
    channel: "fb-dm",
    brief: "Warm DM referencing the group / shared post",
    promptHint:
      "First real DM. Reference something specific from the group thread or their profile. ACA structure. Open question about how they currently handle the relevant pain (AI / dev / ops). No pitch.",
    targetStatus: "Lead",
  },
  {
    step: 5,
    dayOffsetFromPrev: 3,
    channel: "fb-dm",
    brief: "Personalized bump",
    promptHint:
      "Polite follow-up if no response. Reference a NEW specific signal (something else they posted since). ACA. Soft ask. No guilt.",
    targetStatus: "1st Lead Follow up",
  },
  {
    step: 6,
    dayOffsetFromPrev: 3,
    channel: "fb-dm",
    brief: "Voice note or short video DM with offer",
    promptHint:
      "Most powerful FB step. Suggest a 30-60s voice note or video — script for Saidur to record. Personalized. ACA + a clear, low-pressure offer (free 20-min AI audit / discovery call). Use the user's name.",
    targetStatus: "2nd Lead Follow up",
  },
  {
    step: 7,
    dayOffsetFromPrev: 4,
    channel: "fb-dm",
    brief: "Breakup message + landing page link",
    promptHint:
      "Final message. ACA. Acknowledge no reply. Compliment their focus. Drop the landing page link and a one-line: 'when timing's right, here's where to find us.' Respectful close.",
    targetStatus: "Follow up later",
  },
  {
    step: 8,
    dayOffsetFromPrev: 30,
    channel: "fb-engage",
    brief: "Move to nurture — periodic content engagement",
    promptHint:
      "Drop into long-term nurture. Engage on their content periodically (once every 2-4 weeks) without DM-ing. When timing changes for them, you're top of mind.",
    targetStatus: "Follow up later",
  },
];

export function getSequence(track: SequenceTrack): SequenceStep[] {
  return track === "facebook" ? FACEBOOK_SEQUENCE : LINKEDIN_SEQUENCE;
}

// Given a contact's current step + sequence track + days since last touch,
// return the next step they should receive (or null if sequence exhausted).
export function nextStep(
  track: SequenceTrack,
  currentStep: number | null | undefined,
): { next: SequenceStep | null; isFinal: boolean } {
  const seq = getSequence(track);
  const current = currentStep ?? 0;
  const idx = seq.findIndex((s) => s.step === current + 1);
  if (idx === -1) return { next: null, isFinal: true };
  return { next: seq[idx], isFinal: idx === seq.length - 1 };
}

// Helper: derive the recommended sequence track from a contact's platform.
export function trackForPlatform(platform: string | null | undefined): SequenceTrack {
  return platform?.toLowerCase().includes("facebook") ? "facebook" : "linkedin";
}
