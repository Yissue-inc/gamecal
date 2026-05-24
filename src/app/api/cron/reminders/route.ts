import { NextResponse } from 'next/server'

export async function GET() {
  // MVP stub: cron reminders require Vercel Pro; local reminders use engagement-store
  return NextResponse.json({ processed: 0, message: 'Reminder cron stub' })
}
