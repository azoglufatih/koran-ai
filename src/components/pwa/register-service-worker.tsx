"use client";

import { useEffect } from "react";

/**
 * Installs the service worker in public/sw.js — the App Shell cache, and what browsers look for
 * before offering to install the app to a home screen.
 *
 * Rendered as nothing. A browser that has no service workers, or refuses to register one (private
 * browsing, an origin that isn't secure), is a reader who loads the app over the network every
 * time and installs it from their browser's menu if at all — not a reader who sees an error.
 */
export function RegisterServiceWorker() {
  useEffect(() => {
    // In development the shell is exactly what changes on every edit, and the worker outlives the
    // page that registered it — so it would go on serving a cached build after the dev server had
    // moved on. It belongs to the built app only.
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    // A module worker, so sw.js can import the policy it shares with the tests rather than repeat
    // it. Chrome has taken those since 91 and Safari since 15, but Firefox only since 147 — an
    // older one lands in the catch below and reads over the network, which is what it was doing
    // before any of this. `updateViaCache` keeps the browser's own HTTP cache from standing
    // between the reader and a newer worker: this is a static export, so there are no response
    // headers of ours to say the same thing.
    navigator.serviceWorker
      .register("/sw.js", { type: "module", scope: "/", updateViaCache: "none" })
      .catch(() => {
        // Nothing to tell the reader: they can read and ask without a worker.
      });
  }, []);

  return null;
}
