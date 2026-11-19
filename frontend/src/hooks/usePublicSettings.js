import { useEffect, useState } from "react";
import { getPublicSettings } from "../services/superAdminService";

// Fallback until the server answers (and if it cannot be reached). The server always charges
// the fee from the super admin Settings page, whatever the page shows.
const DEFAULTS = { bookingFee: 100, onlinePayments: true };
let cached = null;

/** Platform values set by the super admin (booking fee, ...). Loaded once per page load. */
export function usePublicSettings() {
  const [settings, setSettings] = useState(cached || DEFAULTS);

  useEffect(() => {
    if (cached) return undefined;
    let cancelled = false;
    getPublicSettings().then((result) => {
      if (!result.success) return;
      cached = { ...DEFAULTS, ...result.data };
      if (!cancelled) setSettings(cached);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return settings;
}
