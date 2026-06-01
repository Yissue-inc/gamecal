'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { adminFetch } from '@/lib/admin-fetch'
import { toast } from 'sonner'

const EVENT_ID = 'gamecal-level-up-launch-2026'

interface EventEntry {
  id: string
  user_id: string
  email: string
  platform: 'instagram' | 'tiktok' | 'twitter'
  social_url: string
  score_at_entry: number
  event_id: string
  entered_at: string
}

const PLATFORM_ICONS: Record<string, string> = {
  instagram: '📸',
  tiktok: '🎵',
  twitter: '🐦',
}

function downloadCsv(entries: EventEntry[]) {
  const headers = ['id', 'email', 'platform', 'social_url', 'score_at_entry', 'entered_at']
  const rows = entries.map((e) =>
    [
      e.id,
      e.email,
      e.platform,
      e.social_url,
      String(e.score_at_entry),
      e.entered_at,
    ]
      .map((v) => `"${v.replace(/"/g, '""')}"`)
      .join(',')
  )
  const csv = [headers.join(','), ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `event-entries-${EVENT_ID}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function pickWinners(entries: EventEntry[], count: number): EventEntry[] {
  const pool = [...entries]
  const winners: EventEntry[] = []
  while (winners.length < count && pool.length > 0) {
    const idx = Math.floor(Math.random() * pool.length)
    winners.push(pool.splice(idx, 1)[0])
  }
  return winners
}

// Simple confetti canvas animation
function ConfettiEffect({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    if (!active || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight

    const pieces = Array.from({ length: 80 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * -canvas.height,
      w: Math.random() * 10 + 5,
      h: Math.random() * 6 + 3,
      color: ['#6366f1', '#a855f7', '#ec4899', '#f59e0b', '#22c55e'][Math.floor(Math.random() * 5)],
      speed: Math.random() * 3 + 1.5,
      angle: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.2,
    }))

    function draw() {
      ctx!.clearRect(0, 0, canvas.width, canvas.height)
      let alive = false
      for (const p of pieces) {
        p.y += p.speed
        p.angle += p.spin
        if (p.y < canvas.height) alive = true
        ctx!.save()
        ctx!.translate(p.x, p.y)
        ctx!.rotate(p.angle)
        ctx!.fillStyle = p.color
        ctx!.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
        ctx!.restore()
      }
      if (alive) {
        rafRef.current = requestAnimationFrame(draw)
      }
    }
    rafRef.current = requestAnimationFrame(draw)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [active])

  if (!active) return null
  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full rounded-xl"
    />
  )
}

export default function AdminEventPage() {
  const [entries, setEntries] = useState<EventEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [winners, setWinners] = useState<EventEntry[]>([])
  const [showConfetti, setShowConfetti] = useState(false)

  const loadEntries = useCallback(async () => {
    setLoading(true)
    try {
      const res = await adminFetch(`/api/admin/event-entries?event_id=${encodeURIComponent(EVENT_ID)}`)
      const data = await res.json()
      if (res.ok) {
        setEntries(data.entries ?? [])
      } else {
        toast.error(data.error ?? '데이터 로드 실패')
      }
    } catch {
      toast.error('네트워크 오류')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadEntries()
  }, [loadEntries])

  const handleDraw = () => {
    if (entries.length === 0) {
      toast.error('응모자가 없습니다')
      return
    }
    const drawn = pickWinners(entries, 5)
    setWinners(drawn)
    setShowConfetti(true)
    toast.success(`🎲 ${drawn.length}명 추첨 완료!`)
    setTimeout(() => setShowConfetti(false), 4000)
  }

  const handleCsvDownload = () => {
    if (entries.length === 0) {
      toast.error('다운로드할 데이터가 없습니다')
      return
    }
    downloadCsv(entries)
    toast.success('CSV 다운로드 완료')
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-6 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">이벤트 응모 관리</h1>
          <p className="text-sm text-zinc-400">
            {EVENT_ID} · 총 {entries.length}명 응모
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadEntries} disabled={loading} className="border-zinc-700">
            {loading ? '로딩중…' : '새로고침'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleCsvDownload} className="border-zinc-700">
            CSV 다운로드
          </Button>
          <Button
            size="sm"
            onClick={handleDraw}
            disabled={entries.length === 0}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500"
          >
            추첨 실행 🎲
          </Button>
        </div>
      </div>

      {/* Winners section */}
      {winners.length > 0 && (
        <div className="relative overflow-hidden rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-6">
          <ConfettiEffect active={showConfetti} />
          <h2 className="mb-4 text-lg font-bold text-yellow-300">🏆 추첨 당첨자 ({winners.length}명)</h2>
          <div className="space-y-2">
            {winners.map((w, i) => (
              <div
                key={w.id}
                className="flex items-center gap-3 rounded-lg border border-yellow-500/20 bg-black/30 px-4 py-3"
              >
                <span className="font-rajdhani text-xl font-bold text-yellow-400">#{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-white">{w.email}</p>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-zinc-400">
                    <span>{PLATFORM_ICONS[w.platform]} {w.platform}</span>
                    <span>·</span>
                    <a
                      href={w.social_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="max-w-[240px] truncate text-indigo-400 hover:underline"
                    >
                      {w.social_url}
                    </a>
                  </div>
                </div>
                <span className="shrink-0 text-sm font-bold text-amber-400">{w.score_at_entry} GP</span>
              </div>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="mt-4 border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/10"
            onClick={() => setWinners([])}
          >
            결과 닫기
          </Button>
        </div>
      )}

      {/* Entries table */}
      <Card className="border-zinc-800 bg-zinc-900">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-white">전체 응모자 목록</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
            </div>
          ) : entries.length === 0 ? (
            <p className="py-12 text-center text-sm text-zinc-500">응모자가 없습니다</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-950/50">
                    <th className="px-4 py-3 text-left font-medium text-zinc-400">이메일</th>
                    <th className="px-4 py-3 text-left font-medium text-zinc-400">플랫폼</th>
                    <th className="px-4 py-3 text-left font-medium text-zinc-400">포스팅 URL</th>
                    <th className="px-4 py-3 text-right font-medium text-zinc-400">GP</th>
                    <th className="px-4 py-3 text-left font-medium text-zinc-400">응모 일시</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                      <td className="max-w-[200px] truncate px-4 py-3 text-white">{entry.email}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="border-zinc-700 text-zinc-300">
                          {PLATFORM_ICONS[entry.platform]} {entry.platform}
                        </Badge>
                      </td>
                      <td className="max-w-[240px] px-4 py-3">
                        <a
                          href={entry.social_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block truncate text-indigo-400 hover:underline"
                        >
                          {entry.social_url}
                        </a>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-amber-400">
                        {entry.score_at_entry}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-zinc-400">
                        {new Date(entry.entered_at).toLocaleString('ko-KR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
