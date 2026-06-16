// Public marketing landing + pricing (prompt 12). Lives at /welcome (public via
// proxy) so it doesn't displace the authenticated app at "/". Auth-aware CTA:
// signed-in visitors get "Go to your boards"; logged-out get sign-up/sign-in.
import Link from "next/link";
import { Check, Minus, Columns3, Bot, Users, Zap, Sparkles, Calendar } from "lucide-react";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "TaskFlow — boards your team will actually use",
  description: "Drag-and-drop boards with real-time collaboration, automation, and AI. Free to start.",
};

const FEATURES = [
  { Icon: Columns3, title: "Boards, lists & cards", body: "Organize anything with flexible drag-and-drop boards." },
  { Icon: Users, title: "Real-time collaboration", body: "See teammates' presence and changes live." },
  { Icon: Bot, title: "Butler automation", body: "Rules and card buttons that do the busywork for you." },
  { Icon: Sparkles, title: "AI assist", body: "Summaries, checklists, and board generation from a prompt." },
  { Icon: Calendar, title: "Calendar & views", body: "Board, Calendar, Table and Dashboard views." },
  { Icon: Zap, title: "Templates", body: "Start fast with ready-made boards for any workflow." },
];

type Plan = { name: string; price: string; per: string; highlight?: boolean; cta: string; feats: [string, boolean][] };
const PLANS: Plan[] = [
  { name: "Free", price: "$0", per: "for your whole team", cta: "Get started", feats: [["Unlimited cards", true], ["Up to 10 boards", true], ["Advanced checklists", false], ["Admin controls", false]] },
  { name: "Premium", price: "$10", per: "per user / month", highlight: true, cta: "Start free trial", feats: [["Everything in Free", true], ["Unlimited boards", true], ["All views + automation", true], ["Admin controls", false]] },
  { name: "Enterprise", price: "$17.50", per: "per user / month", cta: "Contact sales", feats: [["Everything in Premium", true], ["Org-wide permissions", true], ["Admin & security", true], ["Priority support", true]] },
];

export default async function WelcomePage() {
  const session = await auth();
  const signedIn = !!session?.user?.id;

  return (
    <main className="min-h-screen bg-trello-bg text-trello-text">
      {/* Nav */}
      <header className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <span className="flex items-center gap-2 font-bold text-lg">
          <span className="w-7 h-7 rounded bg-trello-primary inline-flex items-center justify-center text-white"><Columns3 size={16} /></span>
          TaskFlow
        </span>
        <nav className="flex items-center gap-3 text-sm">
          {signedIn ? (
            <Link href="/boards" className="btn-primary px-4 py-2 rounded">Go to your boards</Link>
          ) : (
            <>
              <Link href="/sign-in" className="text-trello-textSubtle hover:text-trello-text px-3 py-2">Log in</Link>
              <Link href="/sign-up" className="btn-primary px-4 py-2 rounded">Get started free</Link>
            </>
          )}
        </nav>
      </header>

      {/* Hero */}
      <section className="max-w-3xl mx-auto text-center px-6 pt-16 pb-12">
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
          Boards your team will <span className="text-trello-accent">actually use</span>.
        </h1>
        <p className="mt-4 text-lg text-trello-textSecondary">
          Plan, track, and ship work with drag-and-drop boards — plus real-time collaboration,
          automation, and AI built in.
        </p>
        <div className="mt-7 flex items-center justify-center gap-3">
          <Link href={signedIn ? "/boards" : "/sign-up"} className="btn-primary px-5 py-2.5 rounded text-sm font-medium">
            {signedIn ? "Open your boards" : "Get started — it's free"}
          </Link>
          <Link href="#pricing" className="px-5 py-2.5 rounded text-sm font-medium border border-trello-border hover:bg-trello-cardHover">
            See pricing
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 py-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {FEATURES.map(({ Icon, title, body }) => (
          <div key={title} className="rounded-xl border border-trello-border bg-trello-surfaceRaised p-5">
            <Icon size={20} className="text-trello-accent mb-2" />
            <h3 className="text-sm font-semibold">{title}</h3>
            <p className="text-sm text-trello-textSubtle mt-1">{body}</p>
          </div>
        ))}
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-5xl mx-auto px-6 py-12">
        <h2 className="text-2xl font-bold text-center mb-8">Simple pricing</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PLANS.map((p) => (
            <div key={p.name} className={`rounded-xl border p-6 flex flex-col ${p.highlight ? "border-trello-accent bg-[#1C3D5A]/20" : "border-trello-border bg-trello-surfaceRaised"}`}>
              <h3 className="text-base font-semibold">{p.name}</h3>
              <p className="text-3xl font-bold mt-1">{p.price}</p>
              <p className="text-xs text-trello-textSubtle mb-4">{p.per}</p>
              <ul className="flex flex-col gap-2 mb-5 flex-1">
                {p.feats.map(([label, included]) => (
                  <li key={String(label)} className="flex items-center gap-2 text-sm">
                    {included ? <Check size={15} className="text-emerald-400" /> : <Minus size={15} className="text-trello-textSubtle/50" />}
                    <span className={included ? "text-trello-textSecondary" : "text-trello-textSubtle/60"}>{label}</span>
                  </li>
                ))}
              </ul>
              <Link href={signedIn ? "/w/billing" : "/sign-up"} className={`text-center text-sm font-medium py-2 rounded ${p.highlight ? "btn-primary" : "border border-trello-border hover:bg-trello-cardHover"}`}>
                {p.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      <footer className="max-w-5xl mx-auto px-6 py-10 text-center text-xs text-trello-textSubtle border-t border-trello-border">
        TaskFlow — a Trello-style project board. Built with Next.js.
      </footer>
    </main>
  );
}
