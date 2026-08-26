import { cookies } from 'next/headers'

export type UserRole = 'candidate' | 'employer' | 'admin'
export const SESSION_COOKIE = 'workai_session'

export async function getSession() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  return token ? { token } : null
}
