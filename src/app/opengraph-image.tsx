import { ImageResponse } from "next/og";

export const alt = "OmniComm 360° — API complète de communications";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #0a1628 0%, #0f2847 55%, #0a1f3a 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 28 }}>
          <div
            style={{
              width: 84,
              height: 84,
              borderRadius: 20,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 40,
              fontWeight: 800,
              background: "linear-gradient(135deg, #22d3ee 0%, #2563eb 100%)",
              color: "#04121f",
            }}
          >
            O
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 30, letterSpacing: 4, color: "#7dd3fc" }}>PLATEFORME</div>
            <div style={{ fontSize: 58, fontWeight: 800, lineHeight: 1 }}>OMNICOMM 360°</div>
          </div>
        </div>

        <div style={{ fontSize: 40, fontWeight: 700, color: "#e2e8f0", marginBottom: 18 }}>
          API complète de communications
        </div>
        <div style={{ fontSize: 26, color: "#94a3b8", maxWidth: 950, lineHeight: 1.35 }}>
          SMS · WhatsApp · E-mail · Voix / VoIP · IoT · Radio Web · MVNO — IA commerciale, API REST, multi-tenant, facturation à l&apos;usage.
        </div>

        <div
          style={{
            marginTop: 40,
            fontSize: 24,
            fontWeight: 700,
            color: "#fbbf24",
            letterSpacing: 1,
          }}
        >
          VOTRE API. VOTRE ENTREPRISE. SANS LIMITES.
        </div>

        <div style={{ marginTop: "auto", fontSize: 20, color: "#64748b" }}>
          Devaryx-Kernel Software · omnicomm-360.vercel.app
        </div>
      </div>
    ),
    { ...size }
  );
}
