type TrackingIds = {
  gtmId?: string | null;
  ga4MeasurementId?: string | null;
  metaPixelId?: string | null;
  googleAdsId?: string | null;
};

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

const installed = {
  gtm: new Set<string>(),
  ga4: new Set<string>(),
  meta: new Set<string>(),
};

function isGtm(id: string) {
  return /^GTM-[A-Z0-9]+$/i.test(id);
}
function isGa4(id: string) {
  return /^G-[A-Z0-9]+$/i.test(id);
}
function isMetaPixel(id: string) {
  return /^\d{5,20}$/.test(id);
}
function isGoogleAds(id: string) {
  return /^AW-\d+$/i.test(id);
}

function pushDataLayer(payload: Record<string, unknown>) {
  window.dataLayer = window.dataLayer || [];
  // Nunca enviar PII
  const safe = { ...payload };
  delete safe.email;
  delete safe.phone;
  delete safe.name;
  delete safe.company;
  delete safe.companyName;
  window.dataLayer.push(safe);
}

export function installTrackingTags(ids: TrackingIds) {
  const gtm = ids.gtmId?.trim();
  const ga4 = ids.ga4MeasurementId?.trim();
  const meta = ids.metaPixelId?.trim();
  const ads = ids.googleAdsId?.trim();

  if (gtm && isGtm(gtm) && !installed.gtm.has(gtm)) {
    installed.gtm.add(gtm);
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
    const s = document.createElement("script");
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtm.js?id=${gtm}`;
    document.head.appendChild(s);
  }

  if ((ga4 && isGa4(ga4)) || (ads && isGoogleAds(ads))) {
    const key = ga4 || ads || "";
    if (key && !installed.ga4.has(key)) {
      installed.ga4.add(key);
      const s = document.createElement("script");
      s.async = true;
      s.src = `https://www.googletagmanager.com/gtag/js?id=${ga4 || ads}`;
      document.head.appendChild(s);
      window.dataLayer = window.dataLayer || [];
      window.gtag = function gtag(...args: unknown[]) {
        window.dataLayer?.push(args as unknown as Record<string, unknown>);
      };
      window.gtag("js", new Date());
      if (ga4 && isGa4(ga4)) window.gtag("config", ga4, { send_page_view: false });
      if (ads && isGoogleAds(ads)) window.gtag("config", ads);
    }
  }

  if (meta && isMetaPixel(meta) && !installed.meta.has(meta)) {
    installed.meta.add(meta);
    /* eslint-disable */
    (function (f: any, b, e, v) {
      if (f.fbq) return;
      const n: any = (f.fbq = function (...args: unknown[]) {
        n.callMethod ? n.callMethod.apply(n, args) : n.queue.push(args);
      });
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = true;
      n.version = "2.0";
      n.queue = [];
      const t = b.createElement(e) as HTMLScriptElement;
      t.async = true;
      t.src = v;
      const s = b.getElementsByTagName(e)[0];
      s?.parentNode?.insertBefore(t, s);
    })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
    /* eslint-enable */
    window.fbq?.("init", meta);
    window.fbq?.("track", "PageView");
  }
}

/** Eventos comportamentais — sem PII */
export function trackDiagnosticEvent(
  event:
    | "diagnostic_page_view"
    | "diagnostic_started"
    | "diagnostic_step_completed"
    | "diagnostic_report_viewed"
    | "diagnostic_cta_clicked",
  params: Record<string, string | number | boolean | undefined> = {}
) {
  const payload = {
    event,
    ...params,
    page_path: window.location.pathname,
  };
  pushDataLayer(payload);

  if (typeof window.gtag === "function") {
    window.gtag("event", event, params);
  }

  // Meta: só PageView/custom sem Lead (Lead vai server-side se qualificado)
  if (event === "diagnostic_page_view") {
    window.fbq?.("trackCustom", "DiagnosticPageView");
  }
  if (event === "diagnostic_started") {
    window.fbq?.("trackCustom", "DiagnosticStarted");
  }
  if (event === "diagnostic_report_viewed") {
    window.fbq?.("trackCustom", "DiagnosticReportViewed");
  }
  if (event === "diagnostic_cta_clicked") {
    window.fbq?.("trackCustom", "DiagnosticCtaClicked", {
      cta: params.cta,
    });
  }
}
