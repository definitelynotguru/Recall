"use client";

import { useEffect, useState } from "react";
import { WifiSlash } from "@phosphor-icons/react";

export function OfflineBanner() {
  const [online, setOnline] = useState(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  if (online) return null;

  return (
    <div className="offline-banner" role="status">
      <WifiSlash size={16} weight="bold" />
      You are offline. Some features may be unavailable.
    </div>
  );
}
