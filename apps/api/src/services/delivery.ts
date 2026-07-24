import { prisma } from "@muratori/database";
import { idempotencyKey } from "../lib/auth";
import { env } from "../config/env";
import { sendGa4QualifiedLead, sendMetaCapi } from "./conversions";

type EnqueueInput = {
  leadId: string;
  destination: string;
  eventName: string;
  payload?: Record<string, unknown>;
};

/** Cria delivery log idempotente e tenta envio (best-effort) */
export async function enqueueDelivery(input: EnqueueInput) {
  const eventId = idempotencyKey(input.leadId, input.destination, input.eventName);

  const log = await prisma.deliveryLog.upsert({
    where: {
      leadId_destination_eventName: {
        leadId: input.leadId,
        destination: input.destination,
        eventName: input.eventName,
      },
    },
    create: {
      leadId: input.leadId,
      destination: input.destination,
      eventName: input.eventName,
      eventId,
      status: "pending",
      attempts: 0,
    },
    update: {},
  });

  if (log.status === "sent" || log.status === "ignored") {
    return log;
  }

  try {
    if (input.destination === "internal_webhook") {
      if (!env.INTERNAL_WEBHOOK_URL?.trim()) {
        return prisma.deliveryLog.update({
          where: { id: log.id },
          data: {
            status: "ignored",
            lastError: "INTERNAL_WEBHOOK_URL não configurada",
            attempts: { increment: 1 },
          },
        });
      }
      const res = await fetch(env.INTERNAL_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: eventId,
          event_name: input.eventName,
          lead_id: input.leadId,
          ...input.payload,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    }

    if (input.destination === "meta_capi") {
      const lead = await prisma.qualificationLead.findUnique({ where: { id: input.leadId } });
      if (!lead) throw new Error("Lead não encontrado");
      if (!lead.isQualified) {
        return prisma.deliveryLog.update({
          where: { id: log.id },
          data: {
            status: "ignored",
            lastError: "Lead não qualificado — conversão Meta não enviada",
            attempts: { increment: 1 },
          },
        });
      }
      const result = await sendMetaCapi({
        id: lead.id,
        email: lead.email,
        phone: lead.phone,
        eventId,
        eventSourceUrl: lead.landingUrl || lead.sourcePage,
        fbp: lead.fbp,
        fbc: lead.fbc,
      });
      if (!result.ok) {
        return prisma.deliveryLog.update({
          where: { id: log.id },
          data: {
            status: "ignored",
            lastError: String((result.body as { error?: string })?.error || "Meta não configurada"),
            attempts: { increment: 1 },
            response: result.body as object,
          },
        });
      }
      return prisma.deliveryLog.update({
        where: { id: log.id },
        data: {
          status: "sent",
          attempts: { increment: 1 },
          response: result.body as object,
          lastError: null,
        },
      });
    }

    if (input.destination === "google_ads" || input.destination === "ga4") {
      const lead = await prisma.qualificationLead.findUnique({ where: { id: input.leadId } });
      if (!lead) throw new Error("Lead não encontrado");
      if (!lead.isQualified) {
        return prisma.deliveryLog.update({
          where: { id: log.id },
          data: {
            status: "ignored",
            lastError: "Lead não qualificado — conversão Google não enviada",
            attempts: { increment: 1 },
          },
        });
      }
      const result = await sendGa4QualifiedLead({
        id: lead.id,
        email: lead.email,
        phone: lead.phone,
        eventId,
        eventSourceUrl: lead.landingUrl || lead.sourcePage,
      });
      if (!result.ok) {
        return prisma.deliveryLog.update({
          where: { id: log.id },
          data: {
            status: "ignored",
            lastError: String((result.body as { error?: string })?.error || "GA4 não configurada"),
            attempts: { increment: 1 },
            response: result.body as object,
          },
        });
      }
      return prisma.deliveryLog.update({
        where: { id: log.id },
        data: {
          status: "sent",
          attempts: { increment: 1 },
          response: result.body as object,
          lastError: null,
        },
      });
    }

    return prisma.deliveryLog.update({
      where: { id: log.id },
      data: {
        status: "sent",
        attempts: { increment: 1 },
        response: { ok: true, at: new Date().toISOString() },
      },
    });
  } catch (error) {
    return prisma.deliveryLog.update({
      where: { id: log.id },
      data: {
        status: "failed",
        attempts: { increment: 1 },
        lastError: error instanceof Error ? error.message : "erro",
      },
    });
  }
}
