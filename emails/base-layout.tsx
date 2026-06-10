import {
  Body, Container, Head, Html, Preview,
  Section, Text, Hr, Link, Tailwind,
} from "@react-email/components";
import * as React from "react";

interface BaseLayoutProps {
  preview: string;
  children: React.ReactNode;
}

export function BaseLayout({ preview, children }: BaseLayoutProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Tailwind>
        <Body className="bg-[#1D2125] font-sans">
          <Container className="mx-auto py-10 px-4 max-w-lg">
            {/* Logo */}
            <Section className="mb-8">
              <Text className="text-[#0052CC] text-2xl font-bold m-0">
                ■ Trello Clone
              </Text>
            </Section>

            {/* Card */}
            <Section className="bg-[#282E33] rounded-xl p-8 border border-[#384048]">
              {children}
            </Section>

            {/* Footer */}
            <Hr className="border-[#384048] my-6" />
            <Text className="text-[#626F7A] text-xs text-center m-0">
              Trello Clone · Sent by{" "}
              <Link
                href="https://trello-replica-one.vercel.app"
                className="text-[#0052CC]"
              >
                trello-replica-one.vercel.app
              </Link>
            </Text>
            <Text className="text-[#626F7A] text-xs text-center mt-1 m-0">
              You received this email because you have an account with us.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
