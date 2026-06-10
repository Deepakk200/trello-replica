import { Button, Heading, Text } from "@react-email/components";
import * as React from "react";
import { BaseLayout } from "./base-layout";

interface DueDateReminderEmailProps {
  userName: string;
  cards: Array<{
    title: string;
    boardName: string;
    dueDate: string;
    cardUrl: string;
    overdue: boolean;
  }>;
  dashboardUrl: string;
}

export function DueDateReminderEmail({
  userName,
  cards,
  dashboardUrl,
}: DueDateReminderEmailProps) {
  const overdueCount = cards.filter((c) => c.overdue).length;
  const dueCount = cards.filter((c) => !c.overdue).length;

  return (
    <BaseLayout
      preview={`${overdueCount > 0 ? `${overdueCount} overdue` : `${dueCount} due soon`} — Task reminder`}
    >
      <Heading className="text-white text-2xl font-bold mt-0 mb-2">
        📋 Task reminder, {userName}
      </Heading>
      <Text className="text-[#9FADBC] text-sm leading-6 mt-0 mb-6">
        {overdueCount > 0 && (
          <span className="text-[#E2483D]">
            {overdueCount} card{overdueCount > 1 ? "s are" : " is"} overdue.{" "}
          </span>
        )}
        {dueCount > 0 && `${dueCount} card${dueCount > 1 ? "s are" : " is"} due soon.`}
      </Text>

      {cards.map((card, i) => (
        <div
          key={i}
          className={`rounded-lg p-4 mb-3 border ${
            card.overdue
              ? "bg-[#3D1F1F] border-[#E2483D]"
              : "bg-[#1D2125] border-[#384048]"
          }`}
        >
          <Text className="text-white text-sm font-medium m-0">{card.title}</Text>
          <Text className="text-[#9FADBC] text-xs mt-1 m-0">
            {card.boardName} ·{" "}
            <span className={card.overdue ? "text-[#E2483D]" : "text-[#FF9F1A]"}>
              {card.overdue ? "Overdue · " : "Due · "}
              {card.dueDate}
            </span>
          </Text>
        </div>
      ))}

      <Button
        href={dashboardUrl}
        className="bg-[#0052CC] text-white text-sm font-medium
                   px-6 py-3 rounded-lg no-underline block text-center mt-4"
      >
        View all tasks →
      </Button>
    </BaseLayout>
  );
}

export default DueDateReminderEmail;

DueDateReminderEmail.PreviewProps = {
  userName: "Alex",
  dashboardUrl: "https://trello-replica-one.vercel.app/boards",
  cards: [
    { title: "Design new onboarding flow", boardName: "Product Roadmap",
      dueDate: "June 1, 2026", cardUrl: "#", overdue: true },
    { title: "Write API documentation", boardName: "Engineering",
      dueDate: "June 5, 2026", cardUrl: "#", overdue: false },
  ],
} satisfies DueDateReminderEmailProps;
