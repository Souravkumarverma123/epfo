/**
 * "Things that need you" — derived purely from real member fields, never
 * fabricated. If we don't store the data behind a task (e.g. nominee
 * records — not in the current schema), we don't show the task. Matches the
 * hackathon brief's honesty requirement as much as PRD §29.
 */

export type MemberTaskSeverity = "action" | "optional";

export interface MemberTask {
  code: string;
  title: { en: string; hi: string };
  description: { en: string; hi: string };
  severity: MemberTaskSeverity;
}

export interface MemberTaskContext {
  maskedPan: string | null;
}

export function computeMemberTasks(ctx: MemberTaskContext): MemberTask[] {
  const tasks: MemberTask[] = [];

  if (!ctx.maskedPan) {
    tasks.push({
      code: "ADD_PAN",
      title: { en: "Add your PAN", hi: "अपना PAN जोड़ें" },
      description: {
        en: "Without PAN, tax at a higher rate is deducted from withdrawals.",
        hi: "PAN के बिना, निकासी से उच्च दर पर कर काटा जाता है।",
      },
      severity: "action",
    });
  }

  return tasks;
}
