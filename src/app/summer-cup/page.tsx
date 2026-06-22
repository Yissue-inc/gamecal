import type { Metadata } from "next";
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
    </>
  );
}
