import { z } from "zod";
import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { clinicSettings } from "@db/schema";
import { eq } from "drizzle-orm";

export const clinicRouter = createRouter({
  list: publicQuery.query(async () => {
    const db = getDb();
    return db.select().from(clinicSettings).orderBy(clinicSettings.clinicName);
  }),

  get: publicQuery
    .input(z.object({ id: z.number() }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      if (input?.id) {
        const result = await db.select().from(clinicSettings).where(eq(clinicSettings.id, input.id));
        return result[0] ?? null;
      }
      const result = await db.select().from(clinicSettings);
      return result[0] ?? null;
    }),

  create: publicQuery
    .input(
      z.object({
        clinicName: z.string().min(1),
        clinicAddress: z.string().optional(),
        clinicPhone: z.string().optional(),
        doctorName: z.string().optional(),
        doctorQualification: z.string().optional(),
        doctorRegistrationNumber: z.string().optional(),
        prescriptionFooter: z.string().optional(),
        prescriptionPaperSize: z.enum(["A4", "A5"]).optional(),
        logoUrl: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const result = await db.insert(clinicSettings).values(input);
      return { id: Number(result[0].insertId), ...input };
    }),

  update: publicQuery
    .input(
      z.object({
        id: z.number(),
        clinicName: z.string().optional(),
        clinicAddress: z.string().optional(),
        clinicPhone: z.string().optional(),
        doctorName: z.string().optional(),
        doctorQualification: z.string().optional(),
        doctorRegistrationNumber: z.string().optional(),
        prescriptionFooter: z.string().optional(),
        prescriptionPaperSize: z.enum(["A4", "A5"]).optional(),
        logoUrl: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const { id, ...data } = input;
      await db
        .update(clinicSettings)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(clinicSettings.id, id));
      const updated = await db.select().from(clinicSettings).where(eq(clinicSettings.id, id));
      return updated[0];
    }),

  delete: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(clinicSettings).where(eq(clinicSettings.id, input.id));
      return { success: true };
    }),
});
