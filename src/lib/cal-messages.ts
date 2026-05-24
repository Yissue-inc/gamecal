export type CalMood = 'idle' | 'happy' | 'disappointed' | 'alert' | 'celebration'

export function getCalStreakMessage(streak: number): string {
  if (streak >= 365) return '365 days. You ARE the calendar.'
  if (streak >= 100) return "Triple digits. You're on the honor roll."
  if (streak >= 30) return "30 days straight. I'm actually impressed."
  if (streak >= 7) return "Week complete. Your streak is secured. Don't waste it."
  if (streak >= 3) return 'Three days. You actually came back.'
  return "Day one. Let's see if you stick around."
}

export function getCalWishlistMessage(): string {
  return "Wishlist started. Smart move. I'll make sure you don't sleep through it."
}

export function getCalLoginPrompt(reason: 'wishlist' | 'reminder' | 'checkin'): string {
  const messages = {
    wishlist: 'Sign in free to save events to your wishlist. CAL will watch them for you.',
    reminder: 'Sign in to let CAL remind you before events start.',
    checkin: 'Sign in to start your daily streak with CAL.',
  }
  return messages[reason]
}

export function getCalEmoji(mood: CalMood): string {
  const map: Record<CalMood, string> = {
    idle: '🤓',
    happy: '🤓✨',
    disappointed: '😮‍💨',
    alert: '📋',
    celebration: '🤓🎉',
  }
  return map[mood]
}
