'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function AdminPage() {
  return (
    <main data-testid="admin-landing" className="mx-auto max-w-3xl px-6 py-16 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">GAMECAL Admin</h1>
        <p className="text-muted-foreground">
          Full admin console with Supabase direct access, event CRUD, crawlers, and health checks.
        </p>
      </div>

      <Card className="bg-zinc-900">
        <CardHeader>
          <CardTitle>Admin Console (Standalone)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Open the standalone admin panel, enter your Supabase URL, service role key, admin secret,
            and deployed site URL. Settings are stored in browser localStorage only.
          </p>
          <Button data-testid="open-admin-console" asChild>
            <Link href="/admin/console.html" target="_blank">
              Open Admin Console →
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-zinc-900">
        <CardHeader>
          <CardTitle>Built-in Admin (Next.js)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Lightweight dashboard using API routes. Requires{' '}
            <code>?secret=YOUR_ADMIN_SECRET</code> on first visit.
          </p>
          <div className="flex gap-2">
            <Button data-testid="open-events-admin" variant="outline" asChild>
              <Link href="/admin/events">Events</Link>
            </Button>
            <Button data-testid="open-releases-admin" variant="outline" asChild>
              <Link href="/admin/releases">Releases</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
