// Workspace Members — Server Component. Loads real members from the DB (authz),
// then hands off to the interactive client page. Next 16: dynamic (session + DB).
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getMyWorkspace } from '@/features/workspaces/actions';
import { WorkspaceMembersPage } from '@/components/workspace/members-page';

export const metadata = { title: 'Members' };
export const dynamic = 'force-dynamic';

export default async function MembersRoute() {
  const session = await auth();
  if (!session?.user?.id) redirect('/sign-in?callbackUrl=/w/members');

  const workspace = await getMyWorkspace();
  if (!workspace) {
    return <div className="px-6 py-6 md:px-10 text-white/60">No workspace found.</div>;
  }

  const myRole = workspace.members.find((m) => m.user.id === session.user!.id)?.role ?? 'MEMBER';

  return (
    <WorkspaceMembersPage
      members={workspace.members.map((m) => ({
        id: m.user.id, name: m.user.name, email: m.user.email, avatarUrl: m.user.avatarUrl, role: m.role,
      }))}
      myUserId={session.user.id}
      myRole={myRole}
    />
  );
}
