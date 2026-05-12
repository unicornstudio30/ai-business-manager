// Cadence engine — pure compute over contacts to figure out who's due
// for the next step in their LinkedIn / Facebook DM sequence.
//
// Reuses the 7-step LinkedIn / 8-step Facebook templates from lib/sequences.ts.
// Doesn't store cadence state in its own table — derives "next due" lazily
// from contact.engageTouch + contact.lastTouchAt + sequence definitions.

import { getSequence, nextStep, trackForPlatform, type SequenceStep, type SequenceTrack } from "./sequences";
import { isTerminal } from "./stages";
import type { Contact } from "./db/schema";

export type CadenceItem = {
  contact: Contact;
  track: SequenceTrack;
  currentStep: number;
  nextStep: SequenceStep | null;
  dueDate: Date | null;       // when the next step should fire (lastTouchAt + dayOffset)
  daysUntilDue: number | null; // negative = overdue, 0 = today, positive = future
  isFinal: boolean;
};

export function computeCadence(contact: Contact, now: Date = new Date()): CadenceItem | null {
  if (isTerminal(contact.status)) return null;
  if (contact.status === "Partnership") return null; // active client, different rhythm

  const track = (contact.sequenceTrack as SequenceTrack) ?? trackForPlatform(contact.platform);
  const currentStep = contact.engageTouch ?? 0;
  const { next, isFinal } = nextStep(track, currentStep);
  if (!next) return null;

  let dueDate: Date | null = null;
  let daysUntilDue: number | null = null;
  if (contact.lastTouchAt) {
    dueDate = new Date(contact.lastTouchAt.getTime() + next.dayOffsetFromPrev * 86400000);
    daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / 86400000);
  } else {
    // Never touched → step 1 due today
    dueDate = now;
    daysUntilDue = 0;
  }

  return { contact, track, currentStep, nextStep: next, dueDate, daysUntilDue, isFinal };
}

// Returns contacts whose next sequence step is due today or overdue.
export function dueToday(items: CadenceItem[]): CadenceItem[] {
  return items
    .filter((i) => i.nextStep && i.daysUntilDue !== null && i.daysUntilDue <= 0)
    .sort((a, b) => (a.daysUntilDue ?? 0) - (b.daysUntilDue ?? 0)); // most overdue first
}

export function dueSoon(items: CadenceItem[], withinDays = 3): CadenceItem[] {
  return items
    .filter((i) => i.nextStep && i.daysUntilDue !== null && i.daysUntilDue > 0 && i.daysUntilDue <= withinDays)
    .sort((a, b) => (a.daysUntilDue ?? 0) - (b.daysUntilDue ?? 0));
}
