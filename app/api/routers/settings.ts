import { z } from "zod";
import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { settings } from "@db/schema";
import { eq } from "drizzle-orm";

export const settingsRouter = createRouter({
  get: publicQuery.query(async () => {
    const db = getDb();
    const result = await db.select().from(settings);
    return result[0] ?? null;
  }),

  update: publicQuery
    .input(
      z.object({
        doctorName: z.string().optional(),
        qualifications: z.string().optional(),
        registrationNumber: z.string().optional(),
        clinicName: z.string().optional(),
        clinicAddress: z.string().optional(),
        clinicPhone: z.string().optional(),
        letterheadText: z.string().optional(),
        prescriptionFooter: z.string().optional(),
        googleDriveEnabled: z.boolean().optional(),
        googleDriveFolderId: z.string().optional(),
        syncFrequency: z.enum(["manual", "15min", "hourly", "daily"]).optional(),
        encryptBackups: z.boolean().optional(),
        sttLanguage: z.enum(["english", "sinhala", "tamil"]).optional(),
        sttAutoCorrect: z.boolean().optional(),
        sttAiRefine: z.boolean().optional(),
        autoSaveDrafts: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const existing = await db.select().from(settings);

      if (existing.length === 0) {
        const result = await db.insert(settings).values(input);
        return { id: Number(result[0].insertId), ...input };
      }

      await db
        .update(settings)
        .set({ ...input, updatedAt: new Date() })
        .where(eq(settings.id, existing[0].id));

      const updated = await db.select().from(settings);
      return updated[0];
    }),
});
