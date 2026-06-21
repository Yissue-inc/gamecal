import type { Metadata } from "next";
import { MatchHub } from "@/components/calendar/MatchHub";

export const metadata: Metadata = {
  title: "Match · Summer Cup 2026 | GamerClock",
  description:
    "Live score, goal timeline, group table, and ROAR crowd for this Summer Cup 2026 fixture.",
};

export default function MatchHubPage({ params }: { params: { id: string } }) {
  return <MatchHub matchId={params.id} />;
}
