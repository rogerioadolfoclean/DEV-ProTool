"use client";

import { useEffect, useState } from "react";

type OneSignalInstance = {
  init(options: Record<string, unknown>): Promise<void>;
  login(externalId: string): Promise<void>;
  Slidedown: { promptPush(): void };
  Notifications: { permission: boolean; requestPermission(): Promise<void>; isPushSupported(): boolean };
};

declare global {
  interface Window {
    OneSignalDeferred?: Array<(OneSignal: OneSignalInstance) => void | Promise<void>>;
  }
}

export function PushNotifications({ userId }: { userId: number }) {
  const [ready, setReady] = useState(false);
  const [permission, setPermission] = useState<boolean | null>(null);
  const [message, setMessage] = useState("");
  const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;

  useEffect(() => {
    if (!appId) return;
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal) => {
      await OneSignal.init({
        appId,
        serviceWorkerPath: "OneSignalSDKWorker.js",
        serviceWorkerParam: { scope: "/" },
        promptOptions: { slidedown: { prompts: [{ type: "push", autoPrompt: false }] } },
      });
      await OneSignal.login(String(userId));
      setPermission(OneSignal.Notifications.permission);
      setReady(true);
    });
    const script = document.querySelector('script[data-onesignal-sdk="true"]');
    if (!script) {
      const s = document.createElement("script");
      s.src = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
      s.defer = true;
      s.dataset.onesignalSdk = "true";
      document.head.appendChild(s);
    }
  }, [appId, userId]);

  if (!appId) return null;

  async function activer() {
    setMessage("");
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal) => {
      try {
        await OneSignal.Notifications.requestPermission();
        setPermission(OneSignal.Notifications.permission);
        setMessage(OneSignal.Notifications.permission ? "Notifications activées." : "Permission non accordée.");
      } catch {
        setMessage("Impossible d'activer les notifications sur ce navigateur.");
      }
    });
  }

  async function tester() {
    setMessage("");
    try {
      const res = await fetch("/api/push/test", { method: "POST" });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      setMessage(data.message ?? (data.ok ? "Notification envoyée." : "Échec de la notification."));
    } catch {
      setMessage("Service de notification indisponible.");
    }
  }

  return (
    <div className="flex items-center gap-2">
      {!ready && <span className="text-[11px] text-slate-500">Push…</span>}
      {ready && !permission && <button onClick={activer} className="text-xs border border-sky-500/40 text-sky-300 rounded-md px-2.5 py-1 hover:bg-sky-500/10">🔔 Activer</button>}
      {ready && permission && <button onClick={tester} className="text-xs border border-emerald-500/40 text-emerald-300 rounded-md px-2.5 py-1 hover:bg-emerald-500/10">🔔 Tester</button>}
      {message && <span className="text-[11px] text-slate-400 max-w-48 truncate" title={message}>{message}</span>}
    </div>
  );
}
