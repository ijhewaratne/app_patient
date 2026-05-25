import { z } from "zod";
import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { consultations, clinicalNotes } from "@db/schema";
import { eq, desc, and } from "drizzle-orm";

export const consultationRouter = createRouter({
  list: publicQuery
    .input(
      z
        .object({
          patientId: z.number().optional(),
          dateFrom: z.string().optional(),
          dateTo: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const db = getDb();
      const conditions = [];

      if (input?.patientId) {
        conditions.push(eq(consultations.patientId, input.patientId));
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      return db
        .select()
        .from(consultations)
        .where(where)
        .orderBy(desc(consultations.visitDate));
    }),

  getById: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const consultationResult = await db
        .select()
        .from(consultations)
        .where(eq(consultations.id, input.id));

      const consultation = consultationResult[0];
      if (!consultation) return null;

      const notesResult = await db
        .select()
        .from(clinicalNotes)
        .where(eq(clinicalNotes.consultationId, input.id));

      return {
        ...consultation,
        clinicalNote: notesResult[0] ?? null,
      };
    }),

  create: publicQuery
    .input(
      z.object({
        patientId: z.number(),
        doctorId: z.number().optional(),
        clinicId: z.number().optional(),
        visitDate: z.string().optional(),
        visitType: z.enum(["initial", "follow_up"]).default("initial"),
        ageAtVisit: z.number().optional(),
        chiefComplaint: z.string().optional(),
        diagnosisImpression: z.string().optional(),
        nextReviewDate: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const result = await db.insert(consultations).values({
        patientId: input.patientId,
        doctorId: input.doctorId ?? null,
        clinicId: input.clinicId ?? null,
        visitDate: input.visitDate ? new Date(input.visitDate) : new Date(),
        visitType: input.visitType,
        ageAtVisit: input.ageAtVisit ?? null,
        chiefComplaint: input.chiefComplaint ?? null,
        diagnosisImpression: input.diagnosisImpression ?? null,
        nextReviewDate: input.nextReviewDate
          ? new Date(input.nextReviewDate)
          : null,
        status: "draft",
      });
      return {
        id: Number(result[0].insertId),
        ...input,
        status: "draft" as const,
      };
    }),

  update: publicQuery
    .input(
      z.object({
        id: z.number(),
        chiefComplaint: z.string().optional(),
        diagnosisImpression: z.string().optional(),
        nextReviewDate: z.string().optional(),
        status: z.enum(["draft", "confirmed"]).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const { id, ...data } = input;
      const updateData: Record<string, unknown> = { ...data };
      if (data.nextReviewDate) {
        updateData.nextReviewDate = new Date(data.nextReviewDate);
      }
      if (data.status === "confirmed") {
        updateData.confirmedAt = new Date();
      }
      await db
        .update(consultations)
        .set(updateData)
        .where(eq(consultations.id, id));
      const updated = await db
        .select()
        .from(consultations)
        .where(eq(consultations.id, id));
      return updated[0];
    }),

  confirm: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db
        .update(consultations)
        .set({ status: "confirmed", confirmedAt: new Date() })
        .where(eq(consultations.id, input.id));
      const updated = await db
        .select()
        .from(consultations)
        .where(eq(consultations.id, input.id));
      return updated[0];
    }),

  // Clinical Note operations
  saveNoteDraft: publicQuery
    .input(
      z.object({
        consultationId: z.number(),
        patientId: z.number(),
        noteType: z
          .enum(["initial_history", "follow_up_progress"])
          .default("initial_history"),
        rawTranscript: z.string().optional(),
        aiCleanedDraft: z.string().optional(),
        finalConfirmedNote: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      // Check if note exists for this consultation
      const existing = await db
        .select()
        .from(clinicalNotes)
        .where(eq(clinicalNotes.consultationId, input.consultationId));

      if (existing.length > 0) {
        await db
          .update(clinicalNotes)
          .set({
            rawTranscript: input.rawTranscript ?? existing[0].rawTranscript,
            aiCleanedDraft:
              input.aiCleanedDraft ?? existing[0].aiCleanedDraft,
            finalConfirmedNote:
              input.finalConfirmedNote ?? existing[0].finalConfirmedNote,
            noteType: input.noteType,
          })
          .where(eq(clinicalNotes.consultationId, input.consultationId));
        const updated = await db
          .select()
          .from(clinicalNotes)
          .where(eq(clinicalNotes.consultationId, input.consultationId));
        return updated[0];
      }

      const result = await db.insert(clinicalNotes).values({
        consultationId: input.consultationId,
        patientId: input.patientId,
        noteType: input.noteType,
        rawTranscript: input.rawTranscript ?? null,
        aiCleanedDraft: input.aiCleanedDraft ?? null,
        finalConfirmedNote: input.finalConfirmedNote ?? null,
        status: "draft",
      });

      return {
        id: Number(result[0].insertId),
        ...input,
        status: "draft" as const,
      };
    }),

  confirmNote: publicQuery
    .input(
      z.object({
        noteId: z.number(),
        finalNote: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      await db
        .update(clinicalNotes)
        .set({
          finalConfirmedNote: input.finalNote,
          status: "confirmed",
          confirmedAt: new Date(),
        })
        .where(eq(clinicalNotes.id, input.noteId));
      const updated = await db
        .select()
        .from(clinicalNotes)
        .where(eq(clinicalNotes.id, input.noteId));
      return updated[0];
    }),
});
