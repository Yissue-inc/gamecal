import type { Metadata } from "next";
import { headers } from "next/headers";
import { MatchHub } from "@/components/calendar/MatchHub";
import { JsonLd } from "@/components/seo/JsonLd";
import { getAppUrl } from "@/lib/app-url";
import { fetchWorldCupEvents } from "@/lib/world-cup";

const FALLBACK: Metadata = {
  title: "Match · Summer Cup 2026 | GamerClock",
  description:
    "Live score, goal timeline, group table, and ROAR crowd for this Summer Cup 2026 fixture.",
};

const OG_IMAGE = "/mini-cup/assets/promo/og-1200x630.png";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  try {
    const host = headers().get("host");
    if (!host) return FALLBACK;
    const proto = host.includes("localhost") ? "http" : "https";
    const res = await fetch(`${proto}://${host}/api/world-cup/matches?limit=200`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return FALLBACK;
    const data = await res.json();
    const match = ((data?.matches ?? []) as Array<{
      id: string;
      title: string;
      score?: { ft?: [number, number] };
    }>).find((m) => m.id === params.id);
    if (!match) return FALLBACK;
    const ft = match.score?.ft;
    const title = `${match.title}${ft ? ` ${ft[0]}-${ft[1]}` : ""} · Summer Cup 2026`;
    return {
      title: `${title} | GamerClock`,
      description: `${title} — live score, goal timeline, and ROAR crowd on GamerClock.`,
      alternates: { canonical: `/summer-cup/${params.id}` },
      openGraph: {
        title,
        description: "Cheer your nation in ROAR.",
        url: `/summer-cup/${params.id}`,
        images: [OG_IMAGE],
      },
      twitter: {
        card: "summary_large_image",
        title,
        images: [OG_IMAGE],
      },
    };
  } catch {
    return FALLBACK;
  }
}

export default async function MatchHubPage({ params }: { params: { id: string } }) {
  const appUrl = getAppUrl();
  const match = (await fetchWorldCupEvents({ limit: 200 }).catch(() => []))
    .find((event) => event.id === params.id);
  const team1 = typeof match?.metadata?.team1 === "string" ? match.metadata.team1 : undefined;
  const team2 = typeof match?.metadata?.team2 === "string" ? match.metadata.team2 : undefined;

  return (
    <>
      {match && (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "SportsEvent",
            "@id": `${appUrl}/summer-cup/${params.id}#event`,
            name: `${match.title} · Summer Cup 2026`,
            url: `${appUrl}/summer-cup/${params.id}`,
            startDate: match.start_at,
            endDate: match.end_at,
            eventStatus: "https://schema.org/EventScheduled",
            eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
            location: {
              "@type": "VirtualLocation",
              url: `${appUrl}/summer-cup/${params.id}`,
            },
            competitor: [team1, team2].filter(Boolean).map((name) => ({
              "@type": "SportsTeam",
              name,
            })),
            organizer: { "@id": `${appUrl}/#organization` },
            description: match.description,
            isAccessibleForFree: true,
          }}
        />
      )}
      <MatchHub matchId={params.id} />
    </>
  );
}
