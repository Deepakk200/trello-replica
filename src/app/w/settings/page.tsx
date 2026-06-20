// Workspace Settings — Server Component. Loads the real workspace + caller role,
// then hands off to the interactive client page. Next 16: dynamic (session + DB).
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getMyWorkspace } from '@/features/workspaces/actions';
import { WorkspaceSettingsPage } from '@/components/workspace/settings-page';

export const metadata = { title: 'Workspace settings' };
export const dynamic = 'force-dynamic';

export default async function SettingsRoute() {
  const session = await auth();
  if (!session?.user?.id) redirect('/sign-in?callbackUrl=/w/settings');

  const workspace = await getMyWorkspace();
  if (!workspace) {
    return <div className="px-6 py-6 md:px-10 text-white/60">No workspace found.</div>;
  }
  const myRole = workspace.members.find((m) => m.user.id === session.user!.id)?.role ?? 'MEMBER';

  return (
    <WorkspaceSettingsPage
      workspace={{ id: workspace.id, name: workspace.name, description: workspace.description }}
      myRole={myRole}
    />
  );
}
