/**
 * Admin access control
 * Only emails listed here can access /admin routes.
 * This check always runs on the SERVER — never trusted from the client.
 */
export const ADMIN_EMAILS = ['mjphotographyy24@gmail.com']

export function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false
  return ADMIN_EMAILS.includes(email)
}

export const PLAN_LABELS: Record<string, string> = {
  starter: 'Starter',
  creator: 'Creator',
  pro: 'Pro',
  studio: 'Studio',
}

export const PLAN_COLORS: Record<string, string> = {
  starter: 'bg-gray-100 text-gray-600',
  creator: 'bg-blue-50 text-blue-700',
  pro:     'bg-purple-50 text-purple-700',
  studio:  'bg-amber-50 text-amber-700',
}

// Storage limits per plan in bytes
export const PLAN_LIMITS: Record<string, number> = {
  starter: 5   * 1024 * 1024 * 1024,
  creator: 50  * 1024 * 1024 * 1024,
  pro:     200 * 1024 * 1024 * 1024,
  studio:  1024 * 1024 * 1024 * 1024,
}
