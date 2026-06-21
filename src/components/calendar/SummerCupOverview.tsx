"use client";

import Image from "next/image";
import Link from "next/link";
import { CalendarDays, ChevronRight, Flame, Gamepad2, Trophy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { flagFor } from "@/lib/flags";

type WorldCupGoal = {
  name: string;
  minute?: string;
  penalty?: boolean;
};

type WorldCupMatchSummary = {
  id: string;
  title: string;
  startAt: string;
  endAt?: string;
  round?: string;
  group?: string;
  venue?: string;
  score?: { ft?: [number, number] };
  goals1?: WorldCupGoal[];
  goals2?: WorldCupGoal[];
};

type WorldCupStandingRow = {
  team: string;
  played: number;
  goalDifference: number;
  points: number;
};

type WorldCupPulseData = {
  matches: WorldCupMatchSummary[];
  standings: Record<string, WorldCupStandingRow[]>;
  cheerTotals: Record<string, number>;
};

function formatScorer(goal: WorldCupGoal) {
  return `${goal.name}${goal.minute ? ` ${goal.minute}'` : ""}${goal.penalty ? " pen" : ""}`;
}

function matchScoreLine(match: WorldCupMatchSummary) {
  const [homeScore, awayScore] = match.score?.ft ?? [0, 0];
  return `${homeScore} - ${awayScore}`;
}

function matchTeams(match: WorldCupMatchSummary) {
  const [team1 = "Team A", team2 = "Team B"] = match.title.split(" vs ");
  return { team1, team2 };
}

function formatKickoff(dateIso: string) {
  return new Date(dateIso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatCountdown(dateIso: string) {
  const diff = new Date(dateIso).getTime() - Date.now();
  if (diff <= 0) return "Live now";
  const hours = Math.floor(diff / 36e5);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h to kickoff`;
  return `${hours}h ${Math.floor((diff % 36e5) / 6e4)}m to kickoff`;
}

function matchStatus(match: WorldCupMatchSummary) {
  const now = Date.now();
  const start = new Date(match.startAt).getTime();
  const end = new Date(match.endAt ?? match.startAt).getTime();
  if (match.score?.ft) return { label: "FINAL", className: "border-zinc-500/45 bg-zinc-700/35 text-zinc-200" };
  if (now >= start && now <= end) return { label: "LIVE", className: "border-red-400/45 bg-red-500/15 text-red-100" };
  return { label: "UPCOMING", className: "border-emerald-300/40 bg-emerald-400/15 text-emerald-100" };
}

function scoreGoals(match: WorldCupMatchSummary) {
  return [...(match.goals1 ?? []), ...(match.goals2 ?? [])];
}

export function SummerCupOverview() {
  const [data, setData] = useState<WorldCupPulseData | null>(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      fetch("/api/world-cup/matches?limit=200").then((res) =>
        res.ok ? res.json() : null,
      ),
      fetch("/api/roar/cheer?scope=global&limit=80")
        .then((res) => (res.ok ? res.json() : null))
        .catch(() => null),
    ])
      .then(([payload, cheerPayload]) => {
        if (cancelled || !payload) return;
        const cheerTotals = Object.fromEntries(
          ((cheerPayload?.totals ?? []) as Array<{
            country: string;
            total: number;
          }>).map((row) => [row.country, Number(row.total) || 0]),
        );
        setData({
          matches: payload.matches ?? [],
          standings: payload.standings ?? {},
          cheerTotals,
        });
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  const now = Date.now();

  const nextMatch = useMemo(
    () =>
      (data?.matches ?? [])
        .filter((match) => new Date(match.startAt).getTime() >= now)
        .sort(
          (a, b) =>
            new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
        )[0] ?? null,
    [data?.matches, now],
  );

  const upcomingMatches = useMemo(
    () =>
      (data?.matches ?? [])
        .filter((match) => new Date(match.startAt).getTime() >= now)
        .sort(
          (a, b) =>
            new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
        ),
    [data?.matches, now],
  );

  const recentResults = useMemo(
    () =>
      (data?.matches ?? [])
        .filter((match) => match.score?.ft)
        .sort(
          (a, b) =>
            new Date(b.startAt).getTime() - new Date(a.startAt).getTime(),
        ),
    [data?.matches],
  );

  const groups = useMemo(
    () => Object.entries(data?.standings ?? {}).sort(([a], [b]) => a.localeCompare(b)),
    [data?.standings],
  );

  const loudestNations = useMemo(
    () =>
      Object.entries(data?.cheerTotals ?? {})
        .map(([team, total]) => ({ team, total }))
        .sort((a, b) => b.total - a.total || a.team.localeCompare(b.team))
        .slice(0, 12),
    [data?.cheerTotals],
  );

  const liveMatches = useMemo(
    () =>
      (data?.matches ?? []).filter((match) => {
        const start = new Date(match.startAt).getTime();
        const end = new Date(match.endAt ?? match.startAt).getTime();
        return Date.now() >= start && Date.now() <= end && !match.score?.ft;
      }),
    [data?.matches],
  );

  return (
    <div
      data-theme="stadium"
      className="min-h-screen bg-[#06130d] text-white"
    >
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(5,17,13,.78),rgba(5,17,13,.94)),url('/mini-cup/assets/themes/hero-stadium.webp')] bg-cover bg-center" />
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-[28px] border border-emerald-300/15 bg-black/30 shadow-[0_20px_80px_rgba(0,0,0,.35)] backdrop-blur">
          <div className="h-1.5 w-full bg-gradient-to-r from-emerald-400 via-amber-300 to-emerald-400" />
          <div className="border-b border-white/10 px-5 py-6 sm:px-7">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] text-emerald-100">
                  <Trophy className="h-3.5 w-3.5" />
                  Summer Cup 2026 Board
                </div>
                <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
                  Full groups, fixtures, results, and ROAR momentum
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-50/72 sm:text-base">
                  Track every group table, upcoming match, final score, and
                  loudest nation signal from one place.
                </p>
                <div className="mt-4 grid max-w-2xl grid-cols-3 gap-2">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2">
                    <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/45">Live</div>
                    <div className="mt-1 font-mono text-lg font-black text-red-100">{liveMatches.length}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2">
                    <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/45">Next</div>
                    <div className="mt-1 font-mono text-lg font-black text-emerald-100">{upcomingMatches.length}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2">
                    <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/45">Finals</div>
                    <div className="mt-1 font-mono text-lg font-black text-amber-100">{recentResults.length}</div>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Image
                  src="/mini-cup/assets/mascot/mascot-cheer.png"
                  alt=""
                  aria-hidden
                  width={48}
                  height={48}
                  className="h-12 w-12 shrink-0 object-contain drop-shadow-[0_6px_10px_rgba(0,0,0,0.45)]"
                />
                <Link
                  href={
                    nextMatch
                      ? `/roar?match=${encodeURIComponent(nextMatch.id)}&source=summer_cup_board`
                      : "/roar?source=summer_cup_board"
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-amber-300 via-emerald-300 to-emerald-400 px-5 py-2.5 text-sm font-black text-emerald-950 shadow-[0_0_24px_rgba(52,211,153,0.45)] ring-1 ring-emerald-200/40 transition hover:brightness-110"
                >
                  <Gamepad2 className="h-4 w-4" />
                  Play ROAR
                </Link>
                <a
                  href="/api/feed/world-cup"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-black text-white transition hover:bg-white/10"
                >
                  <CalendarDays className="h-4 w-4" />
                  Add SC calendar
                </a>
                <a
                  href="#standings"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-4 py-2.5 text-sm font-black text-emerald-100 transition hover:bg-emerald-300/15"
                >
                  <Trophy className="h-4 w-4" />
                  Standings
                </a>
              </div>
            </div>

            {nextMatch && (
              <div className="mt-5 grid gap-3 lg:grid-cols-[1.35fr_.85fr]">
                <div className="relative overflow-hidden rounded-3xl border border-emerald-300/25 bg-gradient-to-br from-emerald-400/15 via-emerald-400/[0.06] to-transparent p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-200">
                      Match of the moment
                    </div>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black leading-none ${matchStatus(nextMatch).className}`}>
                      {matchStatus(nextMatch).label}
                    </span>
                  </div>
                  {(() => {
                    const { team1, team2 } = matchTeams(nextMatch);
                    return (
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                          <span className="text-3xl leading-none">{flagFor(team1)}</span>
                          <span className="truncate text-lg font-black text-white">{team1}</span>
                        </div>
                        <span className="shrink-0 rounded-full bg-black/35 px-2.5 py-1 text-xs font-black text-emerald-200">VS</span>
                        <div className="flex min-w-0 flex-1 items-center justify-end gap-2 text-right">
                          <span className="truncate text-lg font-black text-white">{team2}</span>
                          <span className="text-3xl leading-none">{flagFor(team2)}</span>
                        </div>
                      </div>
                    );
                  })()}
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-emerald-50/70">
                    <span>{nextMatch.group ?? nextMatch.round ?? "Summer Cup fixture"}</span>
                    <span>{formatKickoff(nextMatch.startAt)}</span>
                    {nextMatch.venue && <span>{nextMatch.venue}</span>}
                  </div>
                </div>
                <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
                  <div className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-200">
                    Countdown
                  </div>
                  <div className="mt-2 text-2xl font-black text-white">
                    {formatCountdown(nextMatch.startAt)}
                  </div>
                  <p className="mt-2 text-sm text-white/60">
                    Open ROAR before kickoff to pick a side and build crowd momentum.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="grid gap-4 p-5 sm:p-7 xl:grid-cols-[1.1fr_.9fr]">
            <section className="order-1 space-y-4">
              <div className="rounded-3xl border border-white/10 bg-black/20 p-4 sm:p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-200">
                      Upcoming fixtures
                    </div>
                    <h2 className="mt-1 text-xl font-black text-white">
                      What&apos;s next
                    </h2>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-black text-white/65">
                    {upcomingMatches.length} matches
                  </span>
                </div>
                <div className="space-y-3">
                  {upcomingMatches.length === 0 && (
                    <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/58">
                      No upcoming fixtures are available yet.
                    </p>
                  )}
                  {upcomingMatches.slice(0, 18).map((match) => {
                    const { team1, team2 } = matchTeams(match);
                    const status = matchStatus(match);
                    return (
                      <Link
                        key={match.id}
                        href={`/roar?match=${encodeURIComponent(match.id)}&source=summer_cup_fixtures`}
                        className="block rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-emerald-300/35 hover:bg-emerald-300/[0.06]"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black leading-none tracking-wide ${status.className}`}>
                                {status.label}
                              </span>
                              <span className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-300/90">
                                {match.group ?? match.round ?? "Summer Cup fixture"}
                              </span>
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-lg font-black text-white">
                              <span className="text-xl leading-none">{flagFor(team1)}</span>
                              <span>{team1}</span>
                              <span className="px-0.5 text-sm font-bold text-white/40">vs</span>
                              <span className="text-xl leading-none">{flagFor(team2)}</span>
                              <span>{team2}</span>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/58">
                              <span>{formatKickoff(match.startAt)}</span>
                              {match.venue && <span>{match.venue}</span>}
                            </div>
                          </div>
                          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-400 px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-emerald-950">
                            ROAR
                            <ChevronRight className="h-3.5 w-3.5" />
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-black/20 p-4 sm:p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-200">
                      Completed matches
                    </div>
                    <h2 className="mt-1 text-xl font-black text-white">
                      Recent results
                    </h2>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-black text-white/65">
                    {recentResults.length} finals
                  </span>
                </div>
                <div className="space-y-3">
                  {recentResults.length === 0 && (
                    <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/58">
                      Final scores and goal history will appear here after matches settle.
                    </p>
                  )}
                  {recentResults.slice(0, 18).map((match) => {
                    const { team1, team2 } = matchTeams(match);
                    const goals = scoreGoals(match);
                    return (
                      <div
                        key={match.id}
                        className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                      >
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black leading-none tracking-wide ${matchStatus(match).className}`}>
                            {matchStatus(match).label}
                          </span>
                          <span className="truncate text-xs text-white/45">{match.group ?? match.round ?? "Summer Cup result"}</span>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex min-w-0 flex-1 items-center gap-2 text-lg font-black text-white">
                            <span className="text-2xl leading-none">{flagFor(team1)}</span>
                            <span className="truncate">{team1}</span>
                          </div>
                          <div className="shrink-0 rounded-2xl border border-emerald-300/20 bg-white/10 px-3.5 py-1 font-mono text-xl font-black text-emerald-100">
                            {matchScoreLine(match)}
                          </div>
                          <div className="flex min-w-0 flex-1 items-center justify-end gap-2 text-right text-lg font-black text-white">
                            <span className="truncate">{team2}</span>
                            <span className="text-2xl leading-none">{flagFor(team2)}</span>
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/58">
                          <span>{formatKickoff(match.startAt)}</span>
                        </div>
                        {goals.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {(match.goals1 ?? []).map((g, i) => (
                              <span
                                key={`g1-${i}`}
                                className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.05] px-2 py-0.5 text-xs font-bold text-emerald-50/85"
                              >
                                <span className="leading-none">{flagFor(team1)}</span>
                                <span>{formatScorer(g)}</span>
                              </span>
                            ))}
                            {(match.goals2 ?? []).map((g, i) => (
                              <span
                                key={`g2-${i}`}
                                className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.05] px-2 py-0.5 text-xs font-bold text-emerald-50/85"
                              >
                                <span className="leading-none">{flagFor(team2)}</span>
                                <span>{formatScorer(g)}</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            <section className="order-2 space-y-4">
              <div id="standings" className="scroll-mt-6 rounded-3xl border border-white/10 bg-black/20 p-4 sm:p-5">
                <div className="mb-4 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-amber-200">
                  <Flame className="h-4 w-4" />
                  Loudest nation
                </div>
                <div className="space-y-2">
                  {loudestNations.length === 0 ? (
                    <p className="text-sm text-white/58">
                      Live ROAR nation totals will appear here as players cheer.
                    </p>
                  ) : (
                    loudestNations.map((row, index) => {
                      const max = loudestNations[0]?.total || 1;
                      const pct = Math.max(4, Math.round((row.total / max) * 100));
                      const medal =
                        index === 0
                          ? "text-amber-300"
                          : index === 1
                            ? "text-zinc-200"
                            : index === 2
                              ? "text-amber-600"
                              : "text-zinc-400";
                      return (
                        <div
                          key={row.team}
                          className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2.5"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-6 text-center font-mono text-sm font-black ${medal}`}>
                              {index + 1}
                            </div>
                            <div className="flex min-w-0 flex-1 items-center gap-2 text-sm font-bold text-white">
                              <span className="text-lg leading-none">{flagFor(row.team)}</span>
                              <span className="truncate">{row.team}</span>
                            </div>
                            <div className="font-mono text-sm font-black text-emerald-200">
                              {Intl.NumberFormat().format(row.total)}
                            </div>
                          </div>
                          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-amber-300"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-black/20 p-4 sm:p-5">
                <div className="mb-4">
                  <div className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-200">
                    Full group tables
                  </div>
                  <h2 className="mt-1 text-xl font-black text-white">
                    Current standings
                  </h2>
                </div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1">
                  {groups.length === 0 && (
                    <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/58">
                      Group standings are syncing.
                    </p>
                  )}
                  {groups.map(([group, rows]) => (
                    <div
                      key={group}
                      className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                    >
                      <div className="mb-3 text-sm font-black uppercase tracking-[0.18em] text-emerald-200">
                        {group}
                      </div>
                      <div className="space-y-2">
                        {rows.map((row, index) => (
                          <div
                            key={row.team}
                            className={`grid grid-cols-[22px_1fr_auto] items-center gap-3 rounded-xl px-2 py-1.5 ${index < 2 ? "bg-emerald-400/[0.09] ring-1 ring-inset ring-emerald-300/25" : ""}`}
                          >
                            <div className={`text-center font-mono text-sm ${index < 2 ? "font-black text-emerald-300" : "text-zinc-500"}`}>
                              {index + 1}
                            </div>
                            <div className="min-w-0">
                              <div className="flex min-w-0 items-center gap-2 text-sm font-bold text-white">
                                <span className="text-base leading-none">{flagFor(row.team)}</span>
                                <span className="truncate">{row.team}</span>
                              </div>
                              <div className="mt-0.5 flex flex-wrap gap-x-3 text-[11px] text-white/48">
                                <span>P {row.played}</span>
                                <span>GD {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}</span>
                                <span>
                                  ROAR {Intl.NumberFormat().format(data?.cheerTotals[row.team] ?? 0)}
                                </span>
                              </div>
                            </div>
                            <div className="font-mono text-sm font-black text-emerald-200">
                              {row.points} pts
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
