import { NextResponse } from "next/server";
import { sendDueDateReminders } from "@/features/notifications/due-date-reminders";

// Called by Vercel Cron — protected with a secret bearer token.
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { sent } = await sendDueDateReminders();
    return NextResponse.json({ ok: true, sent });
  } catch {
    return NextResponse.json({ error: "Cron failed" }, { status: 500 });
  }
}
