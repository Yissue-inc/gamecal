import type { Metadata } from "next";
import Link from "next/link";
import { SummerCupOverview } from "@/components/calendar/SummerCupOverview";
import { JsonLd } from "@/components/seo/JsonLd";
import { getAppUrl } from "@/lib/app-url";

export const metadata: Metadata = {
  title: "Summer Cup 2026 Board | GamerClock",
  description:
    "See full group standings, upcoming fixtures, recent results, and ROAR momentum for Summer Cup 2026 on GamerClock.",
  keywords: [
    "Summer Cup 2026",
    "Summer Cup fixtures",
    "football match tracker",
    "group standings tracker",
    "ROAR game",
    "GamerClock",
  ],
  alternates: { canonical: "/summer-cup" },
  openGraph: {
    title: "Summer Cup 2026 Board | GamerClock",
    description:
      "Full Summer Cup 2026 fixtures, results, group standings, goal scorers, and ROAR momentum on GamerClock.",
    url: "/summer-cup",
    images: ["/mini-cup/assets/promo/og-1200x630.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Summer Cup 2026 Board | GamerClock",
    description:
      "Full Summer Cup 2026 fixtures, results, group standings, goal scorers, and ROAR momentum on GamerClock.",
    images: ["/mini-cup/assets/promo/og-1200x630.png"],
  },
};

export default function SummerCupPage() {
  const appUrl = getAppUrl();
  return (
    <>
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            "@id": `${appUrl}/summer-cup#collection`,
            name: "Summer Cup 2026 Board",
            url: `${appUrl}/summer-cup`,
            isPartOf: { "@id": `${appUrl}/#website` },
            about: [
              "Summer Cup 2026 fixtures",
              "football match results",
              "group standings",
              "ROAR crowd battle game",
            ],
            description:
              "A GamerClock board for Summer Cup 2026 fixtures, results, group standings, goal scorers, and ROAR match momentum.",
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "@id": `${appUrl}/summer-cup#faq`,
            mainEntity: [
              {
                "@type": "Question",
                name: "What can I track on the Summer Cup 2026 board?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text:
                    "You can track upcoming fixtures, completed results, goal scorers, group standings, venue context, and ROAR nation momentum.",
                },
              },
              {
                "@type": "Question",
                name: "Can I play ROAR from the Summer Cup board?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text:
                    "Yes. Match cards and the board hero link into ROAR with match context so players can pick a side, cheer, and save progress.",
                },
              },
              {
                "@type": "Question",
                name: "Is Summer Cup 2026 official tournament branding?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text:
                    "No. GamerClock uses a generic Summer Cup 2026 theme and does not use official FIFA or World Cup marks.",
                },
              },
            ],
          },
        ]}
      />
      <SummerCupOverview />
      <section className="bg-[#06130d] px-4 pb-12 text-white sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-3 border-t border-emerald-300/15 pt-6 md:grid-cols-3">
          {[
            {
              href: "/guides/summer-cup-match-tracker",
              title: "Summer Cup Match Tracker",
              body: "How fixtures, results, groups, and ROAR momentum fit together.",
            },
            {
              href: "/guides/roar-game",
              title: "ROAR Game Guide",
              body: "How the crowd battle works before, during, and after a match.",
            },
            {
              href: "/guides/gaming-event-calendar",
              title: "Gaming Event Calendar",
              body: "How GamerClock connects live game events, reminders, and match schedules.",
            },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition hover:border-emerald-300/35 hover:bg-emerald-300/[0.08]"
            >
              <div className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-200">
                Related guide
              </div>
              <h2 className="mt-2 text-lg font-black text-white">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-emerald-50/65">{item.body}</p>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
