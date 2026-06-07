import { NextRequest, NextResponse } from 'next/server'
import { buildDailyReport, sendDailyReportEmail } from '@/lib/daily-report'
import { verifyAdminSecret } from '@/lib/utils'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  if (!verifyAdminSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const report = await buildDailyReport()
    const email = await sendDailyReportEmail(report)

    return NextResponse.json({
      success: Boolean(email.sent),
      recipient: report.recipient,
      generatedAt: report.generatedAt,
      email,
      metrics: report.metrics,
      posthogEvents: report.posthogEvents,
      notes: report.notes,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Daily report test failed' },
      { status: 500 }
    )
  }
}
