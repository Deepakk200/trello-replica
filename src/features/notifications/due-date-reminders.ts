"use server";

// Run via Vercel Cron or a scheduled job — NOT a user-triggered action.
// Sends due-date reminder emails to users with cards due in the next 24 hours.
// Called from the cron route: src/app/api/cron/due-reminders/route.ts

import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { DueDateReminderEmail } from "@/../emails/due-date-reminder";
import { logger } from "@/lib/logger";

export async function sendDueDateReminders(): Promise<{ sent: number }> {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Cards due in the next 24h or overdue within the last 24h, not yet completed.
  const cards = await db.card.findMany({
    where: {
      dueDate: { gte: yesterday, lte: tomorrow },
      completed: false,
      deletedAt: null,
      archived: false,
    },
    include: {
      list: {
        include: {
          board: {
            include: {
              workspace: {
                include: {
                  members: {
                    include: {
                      user: { select: { id: true, email: true, name: true } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (cards.length === 0) return { sent: 0 };

  // Group cards by workspace member.
  const byUser = new Map<
    string,
    { user: { email: string; name: string | null }; cards: typeof cards }
  >();

  for (const card of cards) {
    const workspace = card.list.board.workspace;
    if (!workspace) continue; // legacy boards may have no workspace
    for (const member of workspace.members) {
      const { user } = member;
      if (!user.email) continue;
      if (!byUser.has(user.id)) {
        byUser.set(user.id, { user: { email: user.email, name: user.name }, cards: [] });
      }
      byUser.get(user.id)!.cards.push(card);
    }
  }

  const baseUrl = process.env.NEXTAUTH_URL ?? "https://trello-replica-one.vercel.app";
  let sent = 0;

  for (const { user, cards: userCards } of byUser.values()) {
    await sendEmail({
      to: user.email,
      subject: `📋 ${userCards.length} task${userCards.length > 1 ? "s" : ""} need your attention`,
      react: DueDateReminderEmail({
        userName: user.name ?? "there",
        dashboardUrl: `${baseUrl}/boards`,
        cards: userCards.map((c) => ({
          title: c.title,
          boardName: c.list.board.title,
          dueDate: c.dueDate!.toLocaleDateString("en-US", {
            month: "short", day: "numeric", year: "numeric",
          }),
          cardUrl: `${baseUrl}/board/${c.list.board.id}`,
          overdue: c.dueDate! < now,
        })),
      }),
    });
    sent++;
  }

  logger.info("Due-date reminders sent", { sent });
  return { sent };
}
