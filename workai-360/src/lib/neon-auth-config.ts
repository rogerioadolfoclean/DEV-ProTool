export const neonAuthConfig = {
  authUrl: process.env.NEON_AUTH_URL,
  jwksUrl: process.env.NEON_AUTH_JWKS_URL,
}

export const supportedLanguages = ['en','fr','es','pt'] as const
export type SupportedLanguage = typeof supportedLanguages[number]
export const defaultLanguage: SupportedLanguage = 'en'
