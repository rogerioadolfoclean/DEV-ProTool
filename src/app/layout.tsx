import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
const geistSans=Geist({variable:"--font-geist-sans",subsets:["latin"]});
const geistMono=Geist_Mono({variable:"--font-geist-mono",subsets:["latin"]});
export const metadata:Metadata={title:"OmniComm 360° — Console de la plateforme",description:"OmniComm 360° — API complète de communications : Voix, Messages, IoT, Radio Web et MVNO. Votre API. Votre entreprise. Sans limites."};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="fr" className={`${geistSans.variable} ${geistMono.variable}`}><body>{children}</body></html>}
