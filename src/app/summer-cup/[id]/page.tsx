import type { Metadata } from "next";
import { headers } from "next/headers";
import { MatchHub } from "@/components/calendar/MatchHub";

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
      openGraph: {
        title,
        description: "Cheer your nation in ROAR.",
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

export default function MatchHubPage({ params }: { params: { id: string } }) {
  return <MatchHub matchId={params.id} />;
}
