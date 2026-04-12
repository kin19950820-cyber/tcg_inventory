'use server'
import { signIn } from '@/auth'

export async function credentialsSignIn(
  email: string,
  password: string,
  callbackUrl: string,
): Promise<{ error: string } | never> {
  try {
    await signIn('credentials', { email, password, redirectTo: callbackUrl })
  } catch (error) {
    // Auth.js throws a NEXT_REDIRECT on success — re-throw so Next.js follows it
    if ((error as { digest?: string }).digest?.startsWith('NEXT_REDIRECT')) throw error
    return { error: 'Invalid email or password' }
  }
  // unreachable, but satisfies TS
  return { error: 'Unknown error' }
}
