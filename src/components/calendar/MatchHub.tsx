"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronRight,
  Flame,
  Gamepad2,
  Share2,
  Trophy,
} from "lucide-react";
import { flagFor } from "@/lib/flags";

type Goal = { name: string; minute?: string; penalty?: boolean };

type Match = {
  id: string;
  title: string;
  startAt: string;
  endAt?: string;
  group?: string;
  round?: string;
  venue?: string;
  score?: { ft?: [number, number] };
  goals1?: Goal[];
  goals2?: Goal[];
};

type StandingRow = {
  team: string;
  played: number;
  goalDifference: number;
  points: number;
};

type Payload = {
  matches: Match[];
  standings: Record<string, StandingRow[]>;
};

function teamsOf(title: string): [string, string] {
  const [a = "Team A", b = "Team B"] = title.split(" vs ");
  return [a, b];
}

function kickoff(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function statusOf(match: Match) {
  const now = Date.now();
  const start = new Date(match.startAt).getTime();
  const end = new Date(match.endAt ?? match.startAt).getTime();
  if (match.score?.ft)
    return { label: "FINAL", className: "border-zinc-500/45 bg-zinc-700/35 text-zinc-200" };
  if (now >= start && now <= end)
    return { label: "LIVE", className: "border-red-400/45 bg-red-500/20 text-red-100" };
  return { label: "UPCOMING", className: "border-emerald-300/40 bg-emerald-400/15 text-emerald-100" };
}

function countdown(iso: string) {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return "Kicked off";
  const h = Math.floor(diff / 36e5);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ${h % 24}h to kickoff`;
  return `${h}h ${Math.floor((diff % 36e5) / 6e4)}m to kickoff`;
}

export function MatchHub({ matchId }: { matchId: string }) {
  const [data, setData] = useState<Payload | null>(null);
  const [cheer, setCheer] = useState<Record<string, number>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      Promise.all([
        fetch("/api/world-cup/matches?limit=200").then((r) => (r.ok ? r.json() : null)),
        fetch("/api/roar/cheer?scope=global&limit=120")
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
      ]).then(([p, c]) => {
        if (cancelled) return;
        if (p)
          setData({ matches: p.matches ?? [], standings: p.standings ?? {} });
        if (Array.isArray(c?.totals))
          setCheer(
            Object.fromEntries(
              (c.totals as Array<{ country: string; total: number }>).map((row) => [
                row.country,
                Number(row.total) || 0,
              ]),
            ),
          );
        setLoaded(true);
      });
    load();
    const id = setInterval(load, 90_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const match = useMemo(
    () => data?.matches.find((m) => m.id === matchId) ?? null,
    [data, matchId],
  );

  const [team1, team2] = match ? teamsOf(match.title) : ["", ""];
  const status = match ? statusOf(match) : null;
  const groupRows = match?.group ? data?.standings[match.group] ?? [] : [];
  const score = match?.score?.ft;
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    if (!match) return;
    const url = typeof window !== "undefined" ? window.location.href : "";
    const scoreText = score ? `${score[0]}-${score[1]}` : "vs";
    const text = `${flagFor(team1)} ${team1} ${scoreText} ${team2} ${flagFor(team2)} · Summer Cup 2026 — cheer your nation in ROAR`;
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: "Summer Cup 2026 · ROAR", text, url });
      } else if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(`${text} ${url}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // share cancelled / unavailable
    }
  };

  return (
    <div data-theme="stadium" className="min-h-screen bg-[#06130d] text-white">
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(5,17,13,.82),rgba(5,17,13,.96)),url('/mini-cup/assets/themes/hero-stadium.webp')] bg-cover bg-center" />
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <Link href="/" className="inline-flex items-center gap-2 text-white transition hover:opacity-90">
            <Image src="/header-icon.png" alt="GamerClock" width={32} height={32} className="h-8 w-8 shrink-0" />
            <span className="text-base font-black tracking-tight">GamerClock</span>
            <ChevronRight className="hidden h-4 w-4 text-white/30 sm:block" />
            <span className="hidden text-sm font-bold text-emerald-200/80 sm:block">Summer Cup</span>
          </Link>
          <Link href="/summer-cup" className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-black text-white transition hover:border-emerald-300/40 hover:bg-emerald-300/10">
            <ArrowLeft className="h-4 w-4" />
            Board
          </Link>
        </div>

        {!loaded ? (
          <div className="rounded-3xl border border-white/10 bg-black/30 p-10 text-center text-sm text-white/55 backdrop-blur">
            Loading match…
          </div>
        ) : !match ? (
          <div className="rounded-3xl border border-white/10 bg-black/30 p-10 text-center backdrop-blur">
            <p className="text-sm text-white/65">This fixture isn&apos;t on the board right now.</p>
            <Link href="/summer-cup" className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-400 px-4 py-2 text-sm font-black text-emerald-950">
              <Trophy className="h-4 w-4" /> Back to the board
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-[28px] border border-emerald-300/15 bg-black/30 shadow-[0_20px_80px_rgba(0,0,0,.35)] backdrop-blur">
            <div className="h-1.5 w-full bg-gradient-to-r from-emerald-400 via-amber-300 to-emerald-400" />

            <div className="border-b border-white/10 bg-[linear-gradient(120deg,rgba(5,17,13,.9),rgba(5,17,13,.55)_55%,rgba(5,17,13,.85)),url('/mini-cup/assets/themes/hero-stadium.webp')] bg-cover bg-center px-5 py-6 sm:px-7">
              <div className="mb-4 flex items-center gap-2">
                <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-black leading-none ${status?.className}`}>
                  {status?.label}
                </span>
                <span className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-300/90">
                  {match.group ?? match.round ?? "Summer Cup fixture"}
                </span>
              </div>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-5">
                <div className="flex flex-col items-center gap-2 text-center">
                  <span className="text-5xl leading-none sm:text-6xl">{flagFor(team1)}</span>
                  <span className="text-base font-black text-white sm:text-xl">{team1}</span>
                </div>
                <div className="text-center">
                  {score ? (
                    <div className="font-mono text-4xl font-black text-white sm:text-5xl">
                      {score[0]}<span className="px-1 text-white/40">-</span>{score[1]}
                    </div>
                  ) : status?.label === "LIVE" ? (
                    <div className="font-mono text-2xl font-black text-red-200 sm:text-3xl">LIVE</div>
                  ) : (
                    <div className="text-lg font-black text-emerald-200 sm:text-2xl">VS</div>
                  )}
                  <div className="mt-1 text-[11px] font-bold text-white/55">
                    {score ? kickoff(match.startAt) : status?.label === "LIVE" ? "In progress" : countdown(match.startAt)}
                  </div>
                </div>
                <div className="flex flex-col items-center gap-2 text-center">
                  <span className="text-5xl leading-none sm:text-6xl">{flagFor(team2)}</span>
                  <span className="text-base font-black text-white sm:text-xl">{team2}</span>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-white/60">
                <span>{kickoff(match.startAt)}</span>
                {match.venue && <span>{match.venue}</span>}
              </div>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <Link
                  href={`/roar?match=${encodeURIComponent(match.id)}&source=match_hub`}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-amber-300 via-emerald-300 to-emerald-400 px-6 py-2.5 text-sm font-black text-emerald-950 shadow-[0_0_24px_rgba(52,211,153,0.45)] ring-1 ring-emerald-200/40 transition hover:brightness-110"
                >
                  <Gamepad2 className="h-4 w-4" />
                  Play ROAR for this match
                </Link>
                <a
                  href="/api/feed/world-cup"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-black text-white transition hover:bg-white/10"
                >
                  <CalendarDays className="h-4 w-4" />
                  Add SC calendar
                </a>
                <button
                  type="button"
                  onClick={handleShare}
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-black text-white transition hover:bg-white/10"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-300" /> : <Share2 className="h-4 w-4" />}
                  {copied ? "Copied" : "Share"}
                </button>
              </div>
            </div>

            <div className="grid gap-4 p-5 sm:p-7 md:grid-cols-2">
              <section className="rounded-3xl border border-white/10 bg-black/20 p-4 sm:p-5">
                <div className="mb-3 text-[11px] font-black uppercase tracking-[0.22em] text-emerald-200">
                  Goal timeline
                </div>
                {(match.goals1?.length ?? 0) + (match.goals2?.length ?? 0) === 0 ? (
                  <p className="text-sm text-white/55">
                    {status?.label === "FINAL" ? "No goals recorded." : "Goals appear here as they are scored."}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {(match.goals1 ?? []).map((g, i) => (
                      <div key={`g1-${i}`} className="flex items-center gap-2 text-sm">
                        <span className="text-lg leading-none">{flagFor(team1)}</span>
                        <span className="font-mono text-xs text-emerald-200">{g.minute ?? "·"}{g.minute ? "'" : ""}</span>
                        <span className="font-bold text-white">{g.name}</span>
                        {g.penalty && <span className="text-[11px] font-black text-amber-300">PEN</span>}
                      </div>
                    ))}
                    {(match.goals2 ?? []).map((g, i) => (
                      <div key={`g2-${i}`} className="flex items-center gap-2 text-sm">
                        <span className="text-lg leading-none">{flagFor(team2)}</span>
                        <span className="font-mono text-xs text-emerald-200">{g.minute ?? "·"}{g.minute ? "'" : ""}</span>
                        <span className="font-bold text-white">{g.name}</span>
                        {g.penalty && <span className="text-[11px] font-black text-amber-300">PEN</span>}
                      </div>
                    ))}
                  </div>
                )}

                {groupRows.length > 0 && (
                  <>
                    <div className="mb-2 mt-5 text-[11px] font-black uppercase tracking-[0.22em] text-emerald-200">
                      {match.group} table
                    </div>
                    <div className="space-y-1.5">
                      {groupRows.map((row, i) => {
                        const isTeam = row.team === team1 || row.team === team2;
                        return (
                          <div
                            key={row.team}
                            className={`flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm ${isTeam ? "bg-emerald-400/[0.1] ring-1 ring-inset ring-emerald-300/25" : ""}`}
                          >
                            <span className={`w-4 text-center font-mono text-[11px] ${i < 2 ? "text-amber-300" : "text-zinc-500"}`}>{i + 1}</span>
                            <span className="text-base leading-none">{flagFor(row.team)}</span>
                            <span className={`min-w-0 flex-1 truncate ${isTeam ? "font-black text-white" : "font-bold text-white/85"}`}>{row.team}</span>
                            <span className="font-mono text-[11px] text-white/50">{row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}</span>
                            <span className="ml-2 font-mono text-xs font-black text-emerald-200">{row.points}</span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </section>

              <section className="rounded-3xl border border-amber-300/15 bg-amber-400/[0.04] p-4 sm:p-5">
                <div className="mb-3 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-amber-200">
                  <Flame className="h-4 w-4" /> ROAR crowd
                </div>
                <p className="text-sm text-white/65">
                  Pick {team1} or {team2}, tap and shake to fill the crowd, and climb the loudest-nation board.
                </p>
                <div className="mt-3 space-y-2">
                  {[team1, team2].map((team) => (
                    <div key={team} className="flex items-center gap-2 rounded-2xl border border-white/8 bg-black/25 px-3 py-2.5">
                      <span className="text-lg leading-none">{flagFor(team)}</span>
                      <span className="min-w-0 flex-1 truncate text-sm font-bold text-white">{team}</span>
                      <span className="font-mono text-sm font-black text-emerald-200">
                        {new Intl.NumberFormat().format(cheer[team] ?? 0)}
                      </span>
                    </div>
                  ))}
                </div>
                <Link
                  href={`/roar?match=${encodeURIComponent(match.id)}&source=match_hub_crowd`}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-emerald-400 px-4 py-2.5 text-sm font-black text-emerald-950 transition hover:bg-emerald-300"
                >
                  <Gamepad2 className="h-4 w-4" />
                  Cheer in ROAR
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </section>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
