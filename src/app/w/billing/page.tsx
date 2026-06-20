// Workspace Billing — Server Component. Reads the real plan from the workspace
// record. Next 16: dynamic (session + DB).
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getMyWorkspace } from '@/features/workspaces/actions';
import { WorkspaceBillingPage } from '@/components/workspace/billing-page';

export const metadata = { title: 'Billing' };
export const dynamic = 'force-dynamic';

export default async function BillingRoute() {
  const session = await auth();
  if (!session?.user?.id) redirect('/sign-in?callbackUrl=/w/billing');

  const workspace = await getMyWorkspace();
  return <WorkspaceBillingPage planName={workspace?.planName ?? 'FREE'} />;
}
