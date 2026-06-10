import { Button, Heading, Text, Hr, Row, Column } from "@react-email/components";
import * as React from "react";
import { BaseLayout } from "./base-layout";

interface PaymentReceiptEmailProps {
  userName: string;
  planName: string;
  amount: string; // e.g. "$9.00"
  periodEnd: string; // e.g. "July 3, 2026"
  invoiceUrl: string;
  portalUrl: string;
}

export function PaymentReceiptEmail({
  userName,
  planName,
  amount,
  periodEnd,
  invoiceUrl,
  portalUrl,
}: PaymentReceiptEmailProps) {
  return (
    <BaseLayout preview={`Payment confirmed — ${planName} plan`}>
      <Heading className="text-white text-2xl font-bold mt-0 mb-2">
        Payment confirmed ✓
      </Heading>
      <Text className="text-[#9FADBC] text-sm leading-6 mt-0 mb-6">
        Thanks, {userName}. Your subscription has been renewed.
      </Text>

      {/* Receipt box */}
      <div className="bg-[#1D2125] rounded-lg p-4 mb-6">
        <Row className="mb-2">
          <Column className="text-[#9FADBC] text-sm">Plan</Column>
          <Column className="text-white text-sm text-right font-medium">
            {planName}
          </Column>
        </Row>
        <Row className="mb-2">
          <Column className="text-[#9FADBC] text-sm">Amount charged</Column>
          <Column className="text-white text-sm text-right font-medium">
            {amount}
          </Column>
        </Row>
        <Hr className="border-[#384048] my-3" />
        <Row>
          <Column className="text-[#9FADBC] text-sm">Next renewal</Column>
          <Column className="text-white text-sm text-right font-medium">
            {periodEnd}
          </Column>
        </Row>
      </div>

      <Row>
        <Column className="pr-2">
          <Button
            href={invoiceUrl}
            className="bg-[#0052CC] text-white text-sm font-medium
                       px-4 py-2.5 rounded-lg no-underline block text-center"
          >
            Download invoice
          </Button>
        </Column>
        <Column className="pl-2">
          <Button
            href={portalUrl}
            className="bg-[#282E33] border border-[#384048] text-white text-sm
                       font-medium px-4 py-2.5 rounded-lg no-underline block text-center"
          >
            Manage subscription
          </Button>
        </Column>
      </Row>
    </BaseLayout>
  );
}

export default PaymentReceiptEmail;

PaymentReceiptEmail.PreviewProps = {
  userName: "Alex",
  planName: "Pro",
  amount: "$9.00",
  periodEnd: "July 3, 2026",
  invoiceUrl: "https://invoice.stripe.com/...",
  portalUrl: "https://billing.stripe.com/...",
} satisfies PaymentReceiptEmailProps;
