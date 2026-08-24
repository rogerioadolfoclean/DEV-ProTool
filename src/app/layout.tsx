import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
const geistSans=Geist({variable:"--font-geist-sans",subsets:["latin"]});
const geistMono=Geist_Mono({variable:"--font-geist-mono",subsets:["latin"]});
const SITE_URL = process.env.APP_BASE_URL || "https://omnicomm-360.vercel.app";
const DESCRIPTION = "OmniComm 360° — plateforme CPaaS complète : SMS, WhatsApp, E-mail, Voix/VoIP, IoT, Radio Web et MVNO, avec IA commerciale, API REST, multi-tenant et facturation à l'usage. Votre API. Votre entreprise. Sans limites.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "OmniComm 360° — API complète de communications",
    template: "%s · OmniComm 360°",
  },
  description: DESCRIPTION,
  applicationName: "OmniComm 360°",
  authors: [{ name: "Devaryx-Kernel Software", url: "https://devaryx-kernel.vercel.app" }],
  creator: "Devaryx-Kernel Software",
  publisher: "Devaryx-Kernel Software",
  keywords: [
    "OmniComm 360", "CPaaS", "API communication", "SMS API", "WhatsApp Business API",
    "VoIP", "IoT SIM", "Radio Web", "MVNO", "Twilio alternative", "RDC", "Afrique",
    "IA commerciale", "auto-dialer", "CRM", "STIR/SHAKEN", "multi-tenant",
  ],
  category: "technology",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: SITE_URL,
    siteName: "OmniComm 360°",
    title: "OmniComm 360° — API complète de communications",
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "OmniComm 360° — API complète de communications",
    description: DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
  icons: { icon: "/favicon.ico" },
};
const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "OmniComm 360°",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description: DESCRIPTION,
  url: SITE_URL,
  offers: { "@type": "Offer", category: "SaaS / API à l'usage" },
  publisher: {
    "@type": "Organization",
    name: "Devaryx-Kernel Software",
    url: "https://devaryx-kernel.vercel.app",
    location: { "@type": "Place", address: { "@type": "PostalAddress", addressLocality: "Rio de Janeiro", addressCountry: "BR" } },
    telephone: "+55-21-99064-5151",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
        {children}
      </body>
    </html>
  );
}
