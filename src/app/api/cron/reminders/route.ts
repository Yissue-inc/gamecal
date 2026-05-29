import { NextRequest, NextResponse } from 'next/server'
import { verifyCronSecret } from '@/lib/utils'
import { processDueReminders } from '@/lib/reminder-push'

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
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
