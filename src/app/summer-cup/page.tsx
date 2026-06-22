import type { Metadata } from "next";
import { SummerCupOverview } from "@/components/calendar/SummerCupOverview";
import { JsonLd } from "@/components/seo/JsonLd";
import { getAppUrl } from "@/lib/app-url";

export const metadata: Metadata = {
  title: "Summer Cup 2026 Board | GamerClock",
  description:
    "See full group standings, upcoming fixtures, recent results, and ROAR momentum for Summer Cup 2026 on GamerClock.",
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
        data={{
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
        }}
      />
      <SummerCupOverview />
    </>
  );
}
