import { NextRequest, NextResponse } from 'next/server'
import { buildDailyReport, sendDailyReportEmail } from '@/lib/daily-report'
import { verifyCronSecret } from '@/lib/utils'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const report = await buildDailyReport()
    const email = await sendDailyReportEmail(report)

    return NextResponse.json({
      success: true,
      recipient: report.recipient,
      generatedAt: report.generatedAt,
      email,
      metrics: report.metrics,
      posthogEvents: report.posthogEvents,
      notes: report.notes,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Daily report failed' },
      { status: 500 }
    )
  }
}
