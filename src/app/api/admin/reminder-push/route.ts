import { NextRequest, NextResponse } from 'next/server'
import { getReminderPushHealth, processDueReminders } from '@/lib/reminder-push'
import { verifyAdminSecret } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  if (!verifyAdminSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    return NextResponse.json(await getReminderPushHealth())
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Reminder push health failed' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  if (!verifyAdminSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    return NextResponse.json(await processDueReminders())
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Reminder processing failed' },
      { status: 500 }
    )
  }
}
