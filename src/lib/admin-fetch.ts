export function getAdminSecret(): string | null {
  if (typeof window === 'undefined') return null
  return sessionStorage.getItem('admin_secret')
}

export function adminHeaders(): HeadersInit {
  const secret = getAdminSecret()
  return secret ? { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' }
}

export async function adminFetch(input: RequestInfo, init?: RequestInit) {
  return fetch(input, {
    ...init,
    headers: { ...adminHeaders(), ...init?.headers },
  })
}
