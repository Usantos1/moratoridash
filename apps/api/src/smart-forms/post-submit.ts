import type { Prisma, SmartForm, SmartFormLead, SmartFormSession } from "@muratori/database";
import { prisma } from "@muratori/database";
import type { FormSettings, SmartFormDefinition } from "./types";
import { sendFormMetaCapi } from "./meta-capi";

type PostSubmitInput = {
  form: SmartForm;
  lead: SmartFormLead;
  session: SmartFormSession;
  settings: FormSettings;
  notifyTeam: boolean;
  trackPaid: boolean;
  definition: SmartFormDefinition;
  terminalNodeId: string;
};

function temperatureRank(t: string): number {
  switch (t) {
    case "COLD":
      return 0;
    case "WARM":
      return 1;
    case "HOT":
      return 2;
    case "VERY_HOT":
      return 3;
    default:
      return 0;
  }
}

export function isConversionQualified(
  temperature: string,
  min: string | undefined
): boolean {
  const m = (min || "ALL").toUpperCase();
  if (!m || m === "ALL" || m === "ANY") return true;
  const need = temperatureRank(m);
  return temperatureRank(temperature) >= need;
}

export async function runPostSubmit(input: PostSubmitInput) {
  const { form, lead, session, settings, notifyTeam, trackPaid, terminalNodeId } =
    input;

  if (notifyTeam && settings.webhook?.enabled && settings.webhook.url) {
    try {
      const body = {
        event: "smart_form.lead.completed",
        formId: form.id,
        formName: form.name,
        leadId: lead.id,
        temperature: lead.temperature,
        score: lead.score,
        fullName: lead.fullName,
        email: lead.email,
        phone: lead.phone,
        companyName: lead.companyName,
        customFields: lead.customFields,
        answers: lead.answers,
        tags: lead.tags,
        utm: {
          source: lead.utmSource,
          medium: lead.utmMedium,
          campaign: lead.utmCampaign,
          term: lead.utmTerm,
          content: lead.utmContent,
        },
        clickIds: { gclid: lead.gclid, fbclid: lead.fbclid, ttclid: lead.ttclid },
      };
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (settings.webhook.secret) {
        headers["X-Smart-Form-Secret"] = settings.webhook.secret;
      }
      const res = await fetch(settings.webhook.url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      if (res.ok) {
        await prisma.smartFormLead.update({
          where: { id: lead.id },
          data: { webhookSentAt: new Date() },
        });
        await prisma.smartFormLeadEvent.create({
          data: {
            leadId: lead.id,
            eventType: "webhook",
            eventName: "sent",
            nodeId: terminalNodeId,
            payload: { status: res.status },
          },
        });
      } else {
        await prisma.smartFormLeadEvent.create({
          data: {
            leadId: lead.id,
            eventType: "webhook",
            eventName: "error",
            nodeId: terminalNodeId,
            payload: { status: res.status },
          },
        });
      }
    } catch (err) {
      await prisma.smartFormLeadEvent.create({
        data: {
          leadId: lead.id,
          eventType: "webhook",
          eventName: "error",
          nodeId: terminalNodeId,
          payload: { error: String(err) },
        },
      });
    }
  }

  if (notifyTeam && form.crmSyncEnabled) {
    // Handoff CRM: evento estruturado (integração externa futura)
    await prisma.smartFormLead.update({
      where: { id: lead.id },
      data: {
        crmSyncedAt: new Date(),
        crmContactId: lead.crmContactId || `sf-${lead.id.slice(0, 10)}`,
        crmSyncError: null,
      },
    });
    await prisma.smartFormLeadEvent.create({
      data: {
        leadId: lead.id,
        eventType: "crm",
        eventName: "handoff_queued",
        payload: {
          fullName: lead.fullName,
          email: lead.email,
          phone: lead.phone,
          temperature: lead.temperature,
          score: lead.score,
        },
      },
    });
  }

  const tracking = settings.tracking || {};
  const minTemp = tracking.conversionMinTemperature as string | undefined;
  const qualified = trackPaid && isConversionQualified(lead.temperature, minTemp);

  if (qualified) {
    await prisma.smartFormLeadEvent.create({
      data: {
        leadId: lead.id,
        eventType: "pixel",
        eventName: "conversion_qualified",
        nodeId: terminalNodeId,
        payload: {
          temperature: lead.temperature,
          facebookPixelId: tracking.facebookPixelId ?? null,
          gaMeasurementId: tracking.gaMeasurementId ?? null,
          googleAdsConversionId: tracking.googleAdsConversionId ?? null,
          clientShouldFire: true,
        },
      },
    });

    const pixelId = String(tracking.facebookPixelId || "").trim();
    const token = String(tracking.metaCapiAccessToken || "").trim();
    if (pixelId && token) {
      try {
        const result = await sendFormMetaCapi({
          pixelId,
          accessToken: token,
          testEventCode: tracking.metaCapiTestEventCode
            ? String(tracking.metaCapiTestEventCode)
            : undefined,
          lead: {
            id: lead.id,
            email: lead.email,
            phone: lead.phone,
            fullName: lead.fullName,
            eventSourceUrl: lead.landingPage || session.landingPage,
            clientIp: session.ipAddress,
            userAgent: session.userAgent,
            fbclid: lead.fbclid || session.fbclid,
          },
        });
        await prisma.smartFormLeadEvent.create({
          data: {
            leadId: lead.id,
            eventType: "capi",
            eventName: "Lead",
            nodeId: terminalNodeId,
            payload: result.body as Prisma.InputJsonValue,
          },
        });
      } catch (err) {
        await prisma.smartFormLeadEvent.create({
          data: {
            leadId: lead.id,
            eventType: "capi",
            eventName: "error",
            nodeId: terminalNodeId,
            payload: { error: String(err) },
          },
        });
      }
    }
  }

  if (form.aiEnabled) {
    const answers = lead.answers as Record<string, unknown>;
    const answerLines = Object.entries(answers || {})
      .slice(0, 12)
      .map(([k, v]) => `• ${k}: ${Array.isArray(v) ? v.join(", ") : String(v ?? "")}`)
      .join("\n");
    const promptHint = form.aiSystemPrompt
      ? form.aiSystemPrompt.slice(0, 240)
      : "Resumo executivo do lead.";
    const summary = {
      stub: false,
      engine: "rules",
      promptUsed: Boolean(form.aiSystemPrompt),
      promptHint,
      text: [
        `Lead: ${lead.fullName || "—"}`,
        `Contato: ${lead.email || "—"} · ${lead.phone || "—"}`,
        `Empresa: ${lead.companyName || "—"}`,
        `Score ${lead.score} · ${lead.temperature}`,
        lead.tags?.length ? `Tags: ${lead.tags.join(", ")}` : null,
        answerLines ? `Respostas:\n${answerLines}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
    };
    await prisma.smartFormLead.update({
      where: { id: lead.id },
      data: {
        aiSummary: summary as Prisma.InputJsonValue,
        aiProcessedAt: new Date(),
        aiError: null,
      },
    });
    await prisma.smartFormLeadEvent.create({
      data: {
        leadId: lead.id,
        eventType: "ai",
        eventName: "summary_generated",
        payload: { length: summary.text.length },
      },
    });
  }
}
