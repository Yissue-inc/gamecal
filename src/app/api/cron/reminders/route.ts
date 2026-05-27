import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { createAdminClient } from '@/lib/supabase/admin'
import { isSupabaseConfigured } from '@/lib/mock-data'
import { formatTime } from '@/lib/utils'
import { verifyCronSecret } from '@/lib/utils'

interface DueReminder {
  id: string
  user_id: string
  offset_min: number
  event_id: string
  event: {
    id: string
    title: string
    start_at: string
    game?: { name?: string; slug?: string }
  } | null
}

function configureWebPush() {
  const subject = process.env.VAPID_SUBJECT ?? process.env.NEXT_PUBLIC_APP_URL ?? 'mailto:admin@gamerclock.com'
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  if (!publicKey || !privateKey) return false
  webpush.setVapidDetails(subject, publicKey, privateKey)
  return true
}

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ processed: 0, sent: 0, failed: 0 })
  }

  const pushReady = configureWebPush()
  const admin = createAdminClient()
  const now = new Date().toISOString()
  const { data: reminders, error } = await admin
    .from('reminders')
    .select('id,user_id,offset_min,event_id,event:events(id,title,start_at,game:games(name,slug))')
    .eq('is_sent', false)
    .lte('remind_at', now)
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const due = ((reminders ?? []) as unknown as DueReminder[]).filter((item) => item.event)
  if (!pushReady) {
    return NextResponse.json({
      processed: due.length,
      sent: 0,
      failed: due.length,
      message: 'VAPID keys are missing. Set NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY.',
    })
  }

  let sent = 0
  let failed = 0

  for (const reminder of due) {
    const { data: subscriptions } = await admin
      .from('push_subscriptions')
      .select('id,endpoint,subscription')
      .eq('user_id', reminder.user_id)

    if (!subscriptions?.length) {
      failed++
      await admin.from('reminders').update({ last_error: 'No push subscription' }).eq('id', reminder.id)
      continue
    }

    const event = reminder.event!
    const payload = JSON.stringify({
      title: `${event.game?.name ?? 'GamerClock'} reminder`,
      body: `${event.title} starts at ${formatTime(event.start_at, '12h', 'UTC')} UTC.`,
      url: `/?event=${event.id}`,
    })

    let delivered = false
    for (const subscription of subscriptions) {
      try {
        await webpush.sendNotification(subscription.subscription, payload)
        delivered = true
      } catch (err) {
        const statusCode = typeof err === 'object' && err && 'statusCode' in err
          ? Number((err as { statusCode?: number }).statusCode)
          : 0
        if (statusCode === 404 || statusCode === 410) {
          await admin.from('push_subscriptions').delete().eq('id', subscription.id)
        }
      }
    }

    if (delivered) {
      sent++
      await admin
        .from('reminders')
        .update({ is_sent: true, sent_at: new Date().toISOString(), last_error: null })
        .eq('id', reminder.id)
    } else {
      failed++
      await admin.from('reminders').update({ last_error: 'Push delivery failed' }).eq('id', reminder.id)
    }
  }

  return NextResponse.json({ processed: due.length, sent, failed })
}
