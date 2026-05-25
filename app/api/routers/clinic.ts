import { z } from "zod";
import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { clinicSettings } from "@db/schema";
import { eq } from "drizzle-orm";

export const clinicRouter = createRouter({
  get: publicQuery.query(async () => {
    const db = getDb();
    const result = await db.select().from(clinicSettings);
    return result[0] ?? null;
  }),

  update: publicQuery
    .input(
      z.object({
        doctorName: z.string().optional(),
        doctorQualification: z.string().optional(),
        doctorRegistrationNumber: z.string().optional(),
        clinicName: z.string().optional(),
        clinicAddress: z.string().optional(),
        clinicPhone: z.string().optional(),
        prescriptionFooter: z.string().optional(),
        prescriptionPaperSize: z.enum(["A4", "A5"]).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const existing = await db.select().from(clinicSettings);

      if (existing.length === 0) {
        const result = await db.insert(clinicSettings).values(input);
        return { id: Number(result[0].insertId), ...input };
      }

      await db
        .update(clinicSettings)
        .set({ ...input, updatedAt: new Date() })
        .where(eq(clinicSettings.id, existing[0].id));

      const updated = await db.select().from(clinicSettings);
      return updated[0];
    }),
});
