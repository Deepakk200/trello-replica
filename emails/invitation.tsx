import { Button, Heading, Text, Hr } from "@react-email/components";
import * as React from "react";
import { BaseLayout } from "./base-layout";

interface InvitationEmailProps {
  inviterName: string;
  workspaceName: string;
  role: string;
  inviteUrl: string;
  expiresAt: string; // human-readable date string
}

export function InvitationEmail({
  inviterName,
  workspaceName,
  role,
  inviteUrl,
  expiresAt,
}: InvitationEmailProps) {
  return (
    <BaseLayout preview={`${inviterName} invited you to ${workspaceName}`}>
      <Heading className="text-white text-2xl font-bold mt-0 mb-2">
        You&apos;ve been invited 🎉
      </Heading>
      <Text className="text-[#9FADBC] text-sm leading-6 mt-0">
        <strong className="text-white">{inviterName}</strong> has invited you to
        join <strong className="text-white">{workspaceName}</strong> as a{" "}
        <strong className="text-white">{role.toLowerCase()}</strong>.
      </Text>

      <Button
        href={inviteUrl}
        className="bg-[#0052CC] text-white text-sm font-medium
                   px-6 py-3 rounded-lg no-underline block text-center my-6"
      >
        Accept invitation →
      </Button>

      <Hr className="border-[#384048]" />
      <Text className="text-[#626F7A] text-xs mt-4 mb-0">
        This invitation expires on {expiresAt}. If you didn&apos;t expect this email,
        you can safely ignore it.
      </Text>
    </BaseLayout>
  );
}

export default InvitationEmail;

InvitationEmail.PreviewProps = {
  inviterName: "Jordan",
  workspaceName: "Acme Corp",
  role: "MEMBER",
  inviteUrl: "https://trello-replica-one.vercel.app/invite/abc123",
  expiresAt: "July 10, 2026",
} satisfies InvitationEmailProps;
