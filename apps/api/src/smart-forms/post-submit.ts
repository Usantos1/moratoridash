import type { Prisma, SmartForm, SmartFormLead, SmartFormSession } from "@muratori/database";
import { prisma } from "@muratori/database";
import type { FormSettings, SmartFormDefinition } from "./types";

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

function isConversionQualified(
  temperature: string,
  min: string | undefined
): boolean {
  const m = (min || "ALL").toUpperCase();
  if (!m || m === "ALL" || m === "ANY") return true;
  const need = temperatureRank(m);
  return temperatureRank(temperature) >= need;
}

export async function runPostSubmit(input: PostSubmitInput) {
  const { form, lead, settings, notifyTeam, trackPaid, terminalNodeId } = input;

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
    // Stub fase 2
    await prisma.smartFormLead.update({
      where: { id: lead.id },
      data: {
        crmSyncedAt: new Date(),
        crmContactId: `stub-${lead.id.slice(0, 8)}`,
      },
    });
    await prisma.smartFormLeadEvent.create({
      data: {
        leadId: lead.id,
        eventType: "crm",
        eventName: "stub_synced",
        payload: {},
      },
    });
  }

  const minTemp = settings.tracking?.conversionMinTemperature as string | undefined;
  if (trackPaid && isConversionQualified(lead.temperature, minTemp)) {
    await prisma.smartFormLeadEvent.create({
      data: {
        leadId: lead.id,
        eventType: "pixel",
        eventName: "conversion_qualified",
        nodeId: terminalNodeId,
        payload: {
          temperature: lead.temperature,
          facebookPixelId: settings.tracking?.facebookPixelId ?? null,
          gaMeasurementId: settings.tracking?.gaMeasurementId ?? null,
          googleAdsConversionId: settings.tracking?.googleAdsConversionId ?? null,
          note: "client-side pixels; CAPI stub",
        },
      },
    });
  }

  if (form.aiEnabled) {
    const summary = {
      stub: true,
      text: `Lead ${lead.fullName || lead.email || lead.id} — score ${lead.score} (${lead.temperature}).`,
      promptUsed: Boolean(form.aiSystemPrompt),
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
        eventName: "summary_stub",
        payload: summary,
      },
    });
  }
}
