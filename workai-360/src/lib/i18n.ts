export const languages = { en: 'English', fr: 'Français', es: 'Español', pt: 'Português' } as const
export type Language = keyof typeof languages
export const defaultLanguage: Language = 'en'
export const messages: Record<Language, Record<string,string>> = {
  en: { welcome:'Welcome to WorkAI 360°', candidates:'Candidates', employers:'Employers', learning:'AI Learning' },
  fr: { welcome:'Bienvenue sur WorkAI 360°', candidates:'Candidats', employers:'Employeurs', learning:'Formation IA' },
  es: { welcome:'Bienvenido a WorkAI 360°', candidates:'Candidatos', employers:'Empleadores', learning:'Formación IA' },
  pt: { welcome:'Bem-vindo ao WorkAI 360°', candidates:'Candidatos', employers:'Empregadores', learning:'Formação IA' }
}
