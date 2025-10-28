"use client";
import { useEffect, useState } from "react";

declare global {
  interface Window { deferredPrompt?: any }
}

export default function InstallPrompt() {
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      window.deferredPrompt = e;
      setCanInstall(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const onInstall = async () => {
    const prompt = window.deferredPrompt;
    if (!prompt) return;
    const { outcome } = await prompt.prompt();
    if (outcome === "accepted") {
      window.deferredPrompt = null;
      setCanInstall(false);
    }
  };

  if (!canInstall) return null;
  return (
    <button
      onClick={onInstall}
      style={{
        position: "fixed", right: 16, bottom: 16, padding: "10px 14px",
        borderRadius: 12, border: "1px solid #ddd", background: "#111", color: "#fff", zIndex: 9999,
        cursor: "pointer"
      }}
    >
      Install PINIT
    </button>
  );
}

