"use client";

import { useSyncExternalStore } from "react";
import { WifiSlash } from "@phosphor-icons/react";

function subscribe(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getOnlineSnapshot() {
  return navigator.onLine;
}

function getServerOnlineSnapshot() {
  return true;
}

export function OfflineBanner() {
  const online = useSyncExternalStore(
    subscribe,
    getOnlineSnapshot,
    getServerOnlineSnapshot,
  );

  if (online) return null;

  return (
    <div className="offline-banner" role="status">
      <WifiSlash size={16} weight="bold" />
      You are offline. Some features may be unavailable.
    </div>
  );
}
