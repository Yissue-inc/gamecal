'use client'

import Link from 'next/link'
import { CheckCircle2, Coins, ShieldCheck, Sparkles, Zap } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  GP_SHOP_ITEMS,
  getGpLocal,
  getShopStateLocal,
  purchaseItem,
  purchaseItemLocal,
  type ShopItem,
  type ShopState,
} from '@/lib/engagement-store'
import { isSupabaseConfigured } from '@/lib/mock-data'

function itemAccent(itemId: string) {
  if (itemId === 'streak_freeze') return 'border-cyan-700/60 bg-cyan-950/20'
  if (itemId === 'double_gp_day') return 'border-fuchsia-700/60 bg-fuchsia-950/20'
  if (itemId === 'theme_gold' || itemId === 'veteran_badge') return 'border-amber-700/60 bg-amber-950/20'
  return 'border-indigo-700/60 bg-indigo-950/20'
}

export default function ShopPage() {
  const { user, isGuest } = useAuth()
  const [gp, setGp] = useState(0)
  const [state, setState] = useState<ShopState>(getShopStateLocal())
  const [selected, setSelected] = useState<ShopItem | null>(null)
  const [busy, setBusy] = useState(false)
  const useApi = isSupabaseConfigured()

  useEffect(() => {
    if (useApi && user) {
      fetch('/api/shop')
        .then((res) => (res.ok ? res.json() : null))
        .then((payload) => {
          if (!payload) return
          setGp(payload.gp ?? 0)
          setState(payload.state ?? getShopStateLocal())
        })
        .catch(() => {
          setGp(getGpLocal())
          setState(getShopStateLocal())
        })
    } else {
      setGp(getGpLocal())
      setState(getShopStateLocal())
    }
  }, [useApi, user])

  const confirmPurchase = async () => {
    if (!selected) return
    setBusy(true)
    try {
      if (useApi && user) {
        const result = await purchaseItem(selected.id)
        setGp(result.gp)
        setState(result.state)
      } else {
        const nextState = purchaseItemLocal(selected.id)
        setGp(getGpLocal())
        setState(nextState)
      }
      toast.success(`${selected.price} GP spent`, {
        description: `${selected.name} is now active.`,
        icon: '✅',
      })
      setSelected(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Purchase failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f]" data-testid="shop-page">
      <header className="border-b border-zinc-800 px-6 py-4">
        <Link href="/" className="font-rajdhani text-xl font-bold">
          Gamer<span className="text-primary">Clock</span>
        </Link>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-rajdhani text-3xl font-semibold">GP Shop</h1>
            <p className="mt-1 text-sm text-zinc-500">Spend Gamer Points on streak saves, boosts, themes, and badges.</p>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-amber-700/50 bg-amber-950/20 px-4 py-2">
            <Coins className="h-5 w-5 text-amber-300" />
            <span className="font-rajdhani text-2xl font-bold text-amber-200">{gp} GP</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-6 py-8">
        {(isGuest || !user) && (
          <Card className="border-zinc-800 bg-zinc-900/60 shadow-none">
            <CardContent className="p-4 text-sm text-zinc-400">
              Sign in to sync purchases. Local GP shop mode is available for this device.
            </CardContent>
          </Card>
        )}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {GP_SHOP_ITEMS.map((item) => {
            const owned =
              (item.id === 'theme_neon' && state.activeTheme === 'neon') ||
              (item.id === 'theme_gold' && state.activeTheme === 'gold') ||
              (item.id === 'veteran_badge' && state.unlockedBadges.includes('veteran'))

            return (
              <Card key={item.id} className={`${itemAccent(item.id)} shadow-none`}>
                <CardHeader className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-3xl">{item.icon}</div>
                    <div className="rounded-md border border-zinc-700 bg-zinc-950/50 px-2 py-1 text-sm font-bold text-amber-200">
                      {item.price} GP
                    </div>
                  </div>
                  <CardTitle className="font-rajdhani text-xl">{item.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 px-5 pb-5">
                  <p className="min-h-10 text-sm text-zinc-400">{item.description}</p>
                  <Button
                    className="w-full"
                    variant={owned ? 'secondary' : 'default'}
                    disabled={busy || gp < item.price || owned}
                    onClick={() => setSelected(item)}
                  >
                    {owned ? <CheckCircle2 className="h-4 w-4" /> : <Coins className="h-4 w-4" />}
                    {owned ? 'Owned' : gp < item.price ? 'Need More GP' : 'Buy'}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </section>

        <section className="grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
            <ShieldCheck className="mb-2 h-5 w-5 text-cyan-300" />
            <div className="text-2xl font-bold">{state.streakFreezeCount}</div>
            <div className="text-xs text-zinc-500">Streak Freeze owned</div>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
            <Zap className="mb-2 h-5 w-5 text-fuchsia-300" />
            <div className="text-sm font-bold">
              {state.doubleGpUntil ? new Date(state.doubleGpUntil).toLocaleString() : 'Inactive'}
            </div>
            <div className="text-xs text-zinc-500">Double GP until</div>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
            <Sparkles className="mb-2 h-5 w-5 text-amber-300" />
            <div className="text-2xl font-bold capitalize">{state.activeTheme}</div>
            <div className="text-xs text-zinc-500">Active profile theme</div>
          </div>
        </section>
      </main>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm purchase</DialogTitle>
            <DialogDescription>
              Spend {selected?.price} GP on {selected?.name}? This applies immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setSelected(null)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={confirmPurchase} disabled={busy}>
              {busy ? 'Buying...' : 'Spend GP'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
