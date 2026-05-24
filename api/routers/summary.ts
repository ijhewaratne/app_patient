import { z } from "zod";
import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { patientSummaries } from "@db/schema";
import { eq } from "drizzle-orm";

export const summaryRouter = createRouter({
  getByPatient: publicQuery
    .input(z.object({ patientId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const result = await db
        .select()
        .from(patientSummaries)
        .where(eq(patientSummaries.patientId, input.patientId));
      return result[0] ?? null;
    }),

  upsert: publicQuery
    .input(
      z.object({
        patientId: z.number(),
        activeDiagnosis: z.string().optional(),
        keyHistorySummary: z.string().optional(),
        currentClinicalStatus: z.string().optional(),
        activeRiskFlags: z.string().optional(),
        currentMedicationSummary: z.string().optional(),
        latestPlan: z.string().optional(),
        lastUpdatedConsultationId: z.number().optional(),
        doctorConfirmed: z.boolean().default(false),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const existing = await db
        .select()
        .from(patientSummaries)
        .where(eq(patientSummaries.patientId, input.patientId));

      if (existing.length > 0) {
        await db
          .update(patientSummaries)
          .set({
            ...input,
            updatedAt: new Date(),
            confirmedBy: input.doctorConfirmed
              ? input.lastUpdatedConsultationId
              : existing[0].confirmedBy,
            confirmedAt: input.doctorConfirmed ? new Date() : existing[0].confirmedAt,
          })
          .where(eq(patientSummaries.id, existing[0].id));
        const updated = await db
          .select()
          .from(patientSummaries)
          .where(eq(patientSummaries.patientId, input.patientId));
        return updated[0];
      }

      const result = await db.insert(patientSummaries).values({
        patientId: input.patientId,
        activeDiagnosis: input.activeDiagnosis ?? null,
        keyHistorySummary: input.keyHistorySummary ?? null,
        currentClinicalStatus: input.currentClinicalStatus ?? null,
        activeRiskFlags: input.activeRiskFlags ?? null,
        currentMedicationSummary: input.currentMedicationSummary ?? null,
        latestPlan: input.latestPlan ?? null,
        lastUpdatedConsultationId: input.lastUpdatedConsultationId ?? null,
        doctorConfirmed: input.doctorConfirmed,
        confirmedBy: input.doctorConfirmed ? input.lastUpdatedConsultationId ?? null : null,
        confirmedAt: input.doctorConfirmed ? new Date() : null,
      });

      return {
        id: Number(result[0].insertId),
        ...input,
      };
    }),
});
