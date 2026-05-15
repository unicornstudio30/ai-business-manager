// ICP Fit Scoring — independent from Lead Score.
//
// Lead Score = how HOT (recent activity, stage progression, replies)
// ICP Fit Score = how IDEAL the contact is (matches Saidur's target customer)
//
// You can have a high lead score on a non-ICP contact (engaged but wrong fit),
// or a low lead score on a perfect-ICP contact (haven't reached out yet).
// Sorting by both gives the right priority list.
//
// Source signals (all from Notion CRM fields we already mirror):
//   - profession (multi-select): tech/AI/SaaS = strong fit
//   - position (multi-select): Founder/CEO/CTO = strong fit
//   - country: target geos (US, UK, CA, AU) get a bump
//   - platform: LinkedIn = strong (Saidur's primary channel)
//   - has website? engaged with comment? content_url present?

import type { Contact } from "./db/schema";
import { parseJson } from "./utils";

// Per-signal points. Tune these to your actual ICP definition.
const PROFESSION_WEIGHTS: Record<string, number> = {
  // High-fit professions (AI/SaaS adjacent)
  "Marketing": 6,
  "Sales": 5,
  "Web development": 8,
  "Software Engineering": 10,
  "Data Science": 8,
  "Product Management": 8,
  "Startup": 10,
  "SAAS": 12,
  "Saas": 12,
  "AI": 12,
  // Medium-fit
  "Copy writing": 4,
  "Project Management": 4,
  "Operations": 5,
  // Lower-fit (still possible buyers)
  "Real Estate": 2,
  "Finance": 3,
  "Consulting": 5,
};

const POSITION_WEIGHTS: Record<string, number> = {
  "Founder": 12,
  "CEO": 12,
  "CTO": 10,
  "Owner": 10,
  "VP Sales": 6,
  "Marketing Director": 7,
  "Sales manager": 5,
  "Wordpress developer": 4,
  "Project Manager": 4,
};

const TARGET_COUNTRIES = new Set([
  "United States",
  "USA",
  "US",
  "United Kingdom",
  "UK",
  "Canada",
  "Australia",
  "Germany",
  "Singapore",
  "Bangladesh", // local
]);

const PLATFORM_WEIGHTS: Record<string, number> = {
  Linkedin: 10,
  X: 6,
  Facebook: 4,
  Slack: 6,
  Whatsapp: 4,
  Reddit: 3,
};

export type IcpBreakdown = {
  score: number;
  professionScore: number;
  positionScore: number;
  countryScore: number;
  platformScore: number;
  contactabilityScore: number;
};

export function computeIcpScore(contact: Pick<Contact, "profession" | "position" | "country" | "platform" | "websiteUrl" | "contactUrl" | "email">): IcpBreakdown {
  // Profession
  const professions = parseJson<string[]>(contact.profession, []);
  const profMax = professions.reduce((max, p) => Math.max(max, PROFESSION_WEIGHTS[p] ?? 0), 0);
  // Multiple matching professions get partial bonus
  const profBonus = Math.min(8, professions.filter((p) => PROFESSION_WEIGHTS[p]).length * 2);
  const professionScore = Math.min(25, profMax + profBonus);

  // Position
  const positions = parseJson<string[]>(contact.position, []);
  const posMax = positions.reduce((max, p) => Math.max(max, POSITION_WEIGHTS[p] ?? 0), 0);
  const positionScore = Math.min(25, posMax);

  // Country
  const countryScore = contact.country && TARGET_COUNTRIES.has(contact.country) ? 15 : 0;

  // Platform
  const platformScore = contact.platform ? Math.min(15, PLATFORM_WEIGHTS[contact.platform] ?? 0) : 0;

  // Contactability — do we have ways to reach them
  let contactabilityScore = 0;
  if (contact.email) contactabilityScore += 8;
  if (contact.contactUrl) contactabilityScore += 6;
  if (contact.websiteUrl) contactabilityScore += 6;
  contactabilityScore = Math.min(20, contactabilityScore);

  const score = Math.min(
    100,
    professionScore + positionScore + countryScore + platformScore + contactabilityScore
  );

  return {
    score,
    professionScore,
    positionScore,
    countryScore,
    platformScore,
    contactabilityScore,
  };
}

// UI helper — color tier for ICP fit badge
export function icpColor(score: number): string {
  if (score >= 70) return "text-emerald-700 bg-emerald-50 border-emerald-200";
  if (score >= 50) return "text-green-700 bg-green-50 border-green-200";
  if (score >= 30) return "text-stone-700 bg-stone-50 border-stone-200";
  return "text-stone-400 bg-stone-50 border-stone-200";
}

// Composite ranking score = 60% lead + 40% ICP.
// Tuned so a hot non-ICP contact still ranks highly (you might learn something)
// but a perfect-ICP cold contact also surfaces (worth the outreach effort).
export function compositeScore(leadScore: number, icpScore: number): number {
  return Math.round(leadScore * 0.6 + icpScore * 0.4);
}
