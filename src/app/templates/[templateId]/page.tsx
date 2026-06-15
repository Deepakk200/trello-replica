import { TemplateDetail } from "@/components/templates/template-detail";

// Next.js 16: params is a Promise and must be awaited.
export default async function TemplateDetailPage({
  params,
}: {
  params: Promise<{ templateId: string }>;
}) {
  const { templateId } = await params;
  return <TemplateDetail slug={templateId} />;
}
