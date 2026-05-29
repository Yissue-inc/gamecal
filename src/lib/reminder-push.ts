import webpush from 'web-push'
import { createAdminClient } from '@/lib/supabase/admin'
import { isSupabaseConfigured } from '@/lib/mock-data'
import { formatTime } from '@/lib/utils'

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

interface DueReleaseReminder {
  id: string
  user_id: string
  offset_min: number
  release_id: string
  release: {
    id: string
    title: string
    release_date: string
    platform?: string[]
  } | null
}

export function getReminderPushConfig() {
  return {
    supabaseConfigured: isSupabaseConfigured(),
    vapidPublicConfigured: Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY),
    vapidPrivateConfigured: Boolean(process.env.VAPID_PRIVATE_KEY),
    vapidSubjectConfigured: Boolean(process.env.VAPID_SUBJECT),
    cronSecretConfigured: Boolean(process.env.CRON_SECRET),
    adminSecretConfigured: Boolean(process.env.ADMIN_SECRET),
  }
}

function configureWebPush() {
  const subject = process.env.VAPID_SUBJECT ?? process.env.NEXT_PUBLIC_APP_URL ?? 'mailto:admin@gamerclock.com'
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  if (!publicKey || !privateKey) return false
  webpush.setVapidDetails(subject, publicKey, privateKey)
  return true
}

function isMissingReleaseEngagementTable(error?: { message?: string } | null) {
  return Boolean(error?.message?.includes('release_reminders'))
}

export async function getReminderPushHealth() {
  const config = getReminderPushConfig()

  if (!config.supabaseConfigured) {
    return {
      config,
      pendingReminders: 0,
      dueReminders: 0,
      pushSubscriptions: 0,
      failedUnsentReminders: 0,
    }
  }

  const admin = createAdminClient()
  const now = new Date().toISOString()
  const [
    pendingResult,
    dueResult,
    releasePendingResult,
    releaseDueResult,
    subscriptionResult,
    failedResult,
    releaseFailedResult,
  ] = await Promise.all([
    admin.from('reminders').select('*', { count: 'exact', head: true }).eq('is_sent', false),
    admin.from('reminders').select('*', { count: 'exact', head: true }).eq('is_sent', false).lte('remind_at', now),
    admin.from('release_reminders').select('*', { count: 'exact', head: true }).eq('is_sent', false),
    admin.from('release_reminders').select('*', { count: 'exact', head: true }).eq('is_sent', false).lte('remind_at', now),
    admin.from('push_subscriptions').select('*', { count: 'exact', head: true }),
    admin.from('reminders').select('*', { count: 'exact', head: true }).eq('is_sent', false).not('last_error', 'is', null),
    admin.from('release_reminders').select('*', { count: 'exact', head: true }).eq('is_sent', false).not('last_error', 'is', null),
  ])

  return {
    config,
    pendingReminders: (pendingResult.count ?? 0) + (releasePendingResult.count ?? 0),
    dueReminders: (dueResult.count ?? 0) + (releaseDueResult.count ?? 0),
    pushSubscriptions: subscriptionResult.count ?? 0,
    failedUnsentReminders: (failedResult.count ?? 0) + (releaseFailedResult.count ?? 0),
    error:
      pendingResult.error?.message ??
      dueResult.error?.message ??
      (isMissingReleaseEngagementTable(releasePendingResult.error) ? null : releasePendingResult.error?.message) ??
      (isMissingReleaseEngagementTable(releaseDueResult.error) ? null : releaseDueResult.error?.message) ??
      subscriptionResult.error?.message ??
      failedResult.error?.message ??
      (isMissingReleaseEngagementTable(releaseFailedResult.error) ? null : releaseFailedResult.error?.message) ??
      null,
  }
}

export async function processDueReminders() {
  if (!isSupabaseConfigured()) {
    return { processed: 0, sent: 0, failed: 0 }
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

  if (error) throw new Error(error.message)

  const { data: releaseReminders, error: releaseError } = await admin
    .from('release_reminders')
    .select('id,user_id,offset_min,release_id,release:new_releases(id,title,release_date,platform)')
    .eq('is_sent', false)
    .lte('remind_at', now)
    .limit(50)

  if (releaseError && !isMissingReleaseEngagementTable(releaseError)) {
    throw new Error(releaseError.message)
  }

  const due = ((reminders ?? []) as unknown as DueReminder[]).filter((item) => item.event)
  const dueReleases = releaseError
    ? []
    : ((releaseReminders ?? []) as unknown as DueReleaseReminder[]).filter((item) => item.release)
  if (!pushReady) {
    return {
      processed: due.length + dueReleases.length,
      sent: 0,
      failed: due.length + dueReleases.length,
      message: 'VAPID keys are missing. Set NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY.',
    }
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

  for (const reminder of dueReleases) {
    const { data: subscriptions } = await admin
      .from('push_subscriptions')
      .select('id,endpoint,subscription')
      .eq('user_id', reminder.user_id)

    if (!subscriptions?.length) {
      failed++
      await admin.from('release_reminders').update({ last_error: 'No push subscription' }).eq('id', reminder.id)
      continue
    }

    const release = reminder.release!
    const payload = JSON.stringify({
      title: 'New release reminder',
      body: `${release.title} releases on ${release.release_date}.`,
      url: `/new-releases?release=${release.id}`,
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
        .from('release_reminders')
        .update({ is_sent: true, sent_at: new Date().toISOString(), last_error: null })
        .eq('id', reminder.id)
    } else {
      failed++
      await admin.from('release_reminders').update({ last_error: 'Push delivery failed' }).eq('id', reminder.id)
    }
  }

  return { processed: due.length + dueReleases.length, sent, failed }
}
