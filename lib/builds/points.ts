// "Build or Die" point system. Same shape as marketing + sales points.
// Rewards shipping: features delivered, integrations wired, deploys, bug
// fixes, refactors. Points scale with delivery weight, not effort spent.

export type Stack =
  | "n8n"
  | "gpt"
  | "claude"
  | "zapier"
  | "make"
  | "retool"
  | "code"           // custom code (Next.js, Python, etc.)
  | "no_code"        // Softr, Glide, Framer, etc.
  | "figma"
  | "other";

export type ActivityKind =
  | "kickoff"             // project kickoff — new build started
  | "spec_written"        // scoped a build (SOW, technical spec)
  | "prototype_shipped"   // rough working prototype
  | "feature_delivered"   // production-ready feature
  | "integration_wired"   // hooked up an external system
  | "milestone_shipped"   // hit a project milestone
  | "deploy"              // deployed to production
  | "bug_fix"             // resolved a bug in shipped work
  | "refactor"            // meaningful code-quality improvement
  | "client_demo"         // showed shipped work to a client
  | "client_handoff"      // final delivery + handoff
  | "docs_written"        // wrote docs for a shipped build
  | "test_added"          // added tests to shipped work
  | "other";

const BASE_POINTS: Record<ActivityKind, number> = {
  kickoff:             50,
  spec_written:        60,
  prototype_shipped:  100,
  feature_delivered:  150,
  integration_wired:  120,
  milestone_shipped:  120,
  deploy:              40,
  bug_fix:             20,
  refactor:            30,
  client_demo:         80,
  client_handoff:     200,
  docs_written:        30,
  test_added:          25,
  other:               20,
};

// Stack multiplier — heavier stacks (custom code) reward slightly higher per
// unit because ship-time is longer. Doesn't matter for total-value work — the
// BASE_POINTS carry that.
const STACK_MULTIPLIER: Record<Stack, number> = {
  n8n:      1.0,
  gpt:      1.0,
  claude:   1.0,
  zapier:   0.9,
  make:     0.9,
  retool:   1.1,
  code:     1.3,   // custom code takes real engineering
  no_code:  0.9,
  figma:    1.0,
  other:    1.0,
};

export function pointsFor(stack: Stack, kind: ActivityKind, count = 1): number {
  const base = BASE_POINTS[kind] ?? BASE_POINTS.other;
  const mult = STACK_MULTIPLIER[stack] ?? 1.0;
  return Math.max(1, Math.round(base * mult * count));
}

export type Level = 1 | 2 | 3 | 4;

export function levelFromLifetimePoints(lifetime: number): Level {
  if (lifetime >= 20_000) return 4;
  if (lifetime >= 6_000)  return 3;
  if (lifetime >= 1_500)  return 2;
  return 1;
}

// Weekly targets tuned so ~1 client handoff + a couple features + regular
// deploys/bug-fixes lands around L2 target. Adjust as team ramps.
export const DEFAULT_TARGET_BY_LEVEL: Record<Level, number> = {
  1: 250,
  2: 700,
  3: 1_800,
  4: 4_500,
};

export function defaultTargetFor(lifetime: number): number {
  return DEFAULT_TARGET_BY_LEVEL[levelFromLifetimePoints(lifetime)];
}

export const ALL_KINDS: { kind: ActivityKind; label: string }[] = [
  { kind: "kickoff",            label: "Project kickoff" },
  { kind: "spec_written",       label: "Spec / SOW written" },
  { kind: "prototype_shipped",  label: "Prototype shipped" },
  { kind: "feature_delivered",  label: "Feature delivered" },
  { kind: "integration_wired",  label: "Integration wired" },
  { kind: "milestone_shipped",  label: "Milestone shipped" },
  { kind: "deploy",             label: "Production deploy" },
  { kind: "bug_fix",            label: "Bug fix" },
  { kind: "refactor",           label: "Refactor" },
  { kind: "client_demo",        label: "Client demo" },
  { kind: "client_handoff",     label: "Client handoff" },
  { kind: "docs_written",       label: "Docs written" },
  { kind: "test_added",         label: "Test added" },
  { kind: "other",              label: "Other" },
];

export const ALL_STACKS: { stack: Stack; label: string }[] = [
  { stack: "n8n",     label: "n8n" },
  { stack: "gpt",     label: "GPT / OpenAI" },
  { stack: "claude",  label: "Claude / Anthropic" },
  { stack: "zapier",  label: "Zapier" },
  { stack: "make",    label: "Make (Integromat)" },
  { stack: "retool",  label: "Retool" },
  { stack: "code",    label: "Custom code" },
  { stack: "no_code", label: "No-code (Softr / Glide / Framer)" },
  { stack: "figma",   label: "Figma" },
  { stack: "other",   label: "Other" },
];

// Shared week-bucketing helpers.
export { addWeeks, fmtWeekLabel, weekStartFor } from "../marketing/points";
