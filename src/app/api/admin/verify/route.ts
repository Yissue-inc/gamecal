import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const adminSecret = process.env.ADMIN_SECRET
  if (!adminSecret) {
    return NextResponse.json({ valid: false }, { status: 401 })
  }

  // Authorization: Bearer <secret> 방식 우선 (URL 로그 노출 방지)
  const authHeader = request.headers.get('authorization')
  const headerSecret = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  // 하위 호환: URL 파라미터도 지원
  const querySecret = request.nextUrl.searchParams.get('secret')

  const provided = headerSecret ?? querySecret
  if (provided !== adminSecret) {
    return NextResponse.json({ valid: false }, { status: 401 })
  }

  return NextResponse.json({ valid: true })
}
