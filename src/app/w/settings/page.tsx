// Settings consolidation: the DB-backed /settings (5-tab) is the single canonical
// workspace-settings surface. The legacy /w/settings now redirects to it rather
// than rendering a second (overlapping) settings UI.
import { redirect } from 'next/navigation';

export const metadata = { title: 'Workspace settings' };

export default function SettingsRoute() {
  redirect('/settings');
}
