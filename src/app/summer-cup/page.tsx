import type { Metadata } from "next";
import { SummerCupOverview } from "@/components/calendar/SummerCupOverview";

export const metadata: Metadata = {
  title: "Summer Cup 2026 Board | GamerClock",
  description:
    "See full group standings, upcoming fixtures, recent results, and ROAR momentum for Summer Cup 2026 on GamerClock.",
};

export default function SummerCupPage() {
  return <SummerCupOverview />;
}
