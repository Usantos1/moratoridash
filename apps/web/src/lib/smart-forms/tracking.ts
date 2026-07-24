/** Dispara pixels/GTM/Ads no browser ao concluir o Smart Form */

type DataLayer = Array<Record<string, unknown> | unknown[]>;

type TrackingWindow = Window & {
  fbq?: (...args: unknown[]) => void;
  gtag?: (...args: unknown[]) => void;
  dataLayer?: DataLayer;
};

export type PublicTrackingConfig = {
  facebookPixelId?: string | null;
  gtmContainerId?: string | null;
  gaMeasurementId?: string | null;
  googleAdsId?: string | null;
  googleAdsConversionId?: string | null;
  googleAdsConversionLabel?: string | null;
};

let bootstrapped = false;

function w(): TrackingWindow {
  return window as TrackingWindow;
}

export function bootstrapPublicTracking(t: PublicTrackingConfig) {
  if (bootstrapped || typeof document === "undefined") return;
  bootstrapped = true;
  const win = w();

  if (t.gtmContainerId) {
    win.dataLayer = win.dataLayer || [];
    win.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
    const s = document.createElement("script");
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(t.gtmContainerId)}`;
    document.head.appendChild(s);
  }

  if (t.facebookPixelId) {
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    script.onload = () => {
      win.fbq?.("init", t.facebookPixelId);
      win.fbq?.("track", "PageView");
    };
    // stub queue until script loads
    const queue: unknown[] = [];
    const stub = (...args: unknown[]) => {
      queue.push(args);
    };
    win.fbq = stub;
    document.head.appendChild(script);
    // also init via inline pattern used by Meta
    const inline = document.createElement("script");
    inline.text = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];}(window,document);fbq('init','${t.facebookPixelId}');fbq('track','PageView');`;
    document.head.appendChild(inline);
  }

  if (t.gaMeasurementId || t.googleAdsConversionId || t.googleAdsId) {
    const id = t.gaMeasurementId || t.googleAdsConversionId || t.googleAdsId;
    const s = document.createElement("script");
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(String(id))}`;
    document.head.appendChild(s);
    win.dataLayer = win.dataLayer || [];
    win.gtag = function gtag(...args: unknown[]) {
      win.dataLayer?.push(args);
    };
    win.gtag("js", new Date());
    if (t.gaMeasurementId) win.gtag("config", t.gaMeasurementId);
    const ads = t.googleAdsConversionId || t.googleAdsId;
    if (ads) win.gtag("config", ads);
  }
}

export function fireSmartFormConversion(
  t: PublicTrackingConfig,
  meta: { leadId?: string; temperature?: string; value?: number }
) {
  const win = w();
  win.dataLayer = win.dataLayer || [];
  win.dataLayer.push({
    event: "smart_form_complete",
    lead_id: meta.leadId,
    temperature: meta.temperature,
  });

  if (t.facebookPixelId && win.fbq) {
    win.fbq("track", "Lead", {
      content_name: "smart_form",
      status: meta.temperature || "completed",
    });
  }

  if (win.gtag) {
    if (t.gaMeasurementId) {
      win.gtag("event", "generate_lead", {
        event_category: "smart_form",
        temperature: meta.temperature,
      });
    }
    const convId = t.googleAdsConversionId || t.googleAdsId;
    const label = t.googleAdsConversionLabel;
    if (convId && label) {
      win.gtag("event", "conversion", {
        send_to: `${convId}/${label}`,
        value: meta.value ?? 1,
        currency: "BRL",
      });
    }
  }
}
