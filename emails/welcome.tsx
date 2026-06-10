import { Button, Heading, Text, Link } from "@react-email/components";
import * as React from "react";
import { BaseLayout } from "./base-layout";

interface WelcomeEmailProps {
  userName: string;
  workspaceName: string;
  dashboardUrl: string;
}

export function WelcomeEmail({
  userName,
  workspaceName,
  dashboardUrl,
}: WelcomeEmailProps) {
  return (
    <BaseLayout preview={`Welcome to Trello Clone, ${userName}!`}>
      <Heading className="text-white text-2xl font-bold mt-0 mb-2">
        Welcome aboard, {userName}! 👋
      </Heading>
      <Text className="text-[#9FADBC] text-sm leading-6 mt-0">
        Your workspace <strong className="text-white">{workspaceName}</strong> is
        ready to go. Here&apos;s what you can do to get started:
      </Text>

      <div className="my-6">
        {[
          "Create your first board with a built-in template",
          "Invite teammates with one click",
          "Drag cards between lists to track progress",
          "Use Cmd+K to search across all your boards",
        ].map((item, i) => (
          <Text key={i} className="text-[#9FADBC] text-sm m-0 mb-2">
            ✓ <span className="text-white">{item}</span>
          </Text>
        ))}
      </div>

      <Button
        href={dashboardUrl}
        className="bg-[#0052CC] text-white text-sm font-medium
                   px-6 py-3 rounded-lg no-underline block text-center"
      >
        Open your workspace →
      </Button>

      <Text className="text-[#626F7A] text-xs mt-6 mb-0">
        Need help?{" "}
        <Link href="mailto:support@example.com" className="text-[#0052CC]">
          Reply to this email
        </Link>{" "}
        and we&apos;ll get back to you.
      </Text>
    </BaseLayout>
  );
}

export default WelcomeEmail;

WelcomeEmail.PreviewProps = {
  userName: "Alex",
  workspaceName: "Alex's Workspace",
  dashboardUrl: "https://trello-replica-one.vercel.app/boards",
} satisfies WelcomeEmailProps;
