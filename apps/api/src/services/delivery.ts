import { prisma } from "@muratori/database";
import { idempotencyKey } from "../lib/auth";
import { env } from "../config/env";

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

  // Destinos conhecidos — v1: webhook interno / log
  try {
    if (input.destination === "internal_webhook") {
      if (!env.INTERNAL_WEBHOOK_URL) {
        return prisma.deliveryLog.update({
          where: { id: log.id },
          data: { status: "ignored", lastError: "INTERNAL_WEBHOOK_URL não configurada" },
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

    // Meta/Google — placeholder até tokens configurados
    if (input.destination === "meta_capi" || input.destination === "google_ads") {
      return prisma.deliveryLog.update({
        where: { id: log.id },
        data: {
          status: "ignored",
          lastError: "Integração pendente de tokens no servidor",
          attempts: { increment: 1 },
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
