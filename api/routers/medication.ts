import { z } from "zod";
import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { medications } from "@db/schema";
import { eq, like, and, or } from "drizzle-orm";

export const medicationRouter = createRouter({
  list: publicQuery
    .input(
      z
        .object({
          category: z.string().optional(),
          search: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const db = getDb();
      const conditions = [];

      if (input?.category && input.category !== "all") {
        conditions.push(eq(medications.drugClass, input.category));
      }

      if (input?.search) {
        const searchTerm = `%${input.search}%`;
        conditions.push(
          or(
            like(medications.brandName, searchTerm),
            like(medications.genericName, searchTerm)
          )
        );
      }

      conditions.push(eq(medications.isActive, true));

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      return db.select().from(medications).where(where);
    }),

  getById: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const result = await db
        .select()
        .from(medications)
        .where(eq(medications.id, input.id));
      return result[0] ?? null;
    }),

  create: publicQuery
    .input(
      z.object({
        genericName: z.string().min(1),
        brandName: z.string().min(1),
        drugClass: z.string().optional(),
        availableStrengths: z.array(z.string()).optional(),
        ageGroup: z
          .enum(["child", "adolescent", "adult", "elderly"])
          .optional(),
        defaultDose: z.string().optional(),
        defaultFrequency: z.string().optional(),
        defaultTiming: z.string().optional(),
        defaultDuration: z.number().optional(),
        route: z.string().optional(),
        defaultInstructions: z.string().optional(),
        warnings: z.string().optional(),
        maxDoseNote: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const result = await db.insert(medications).values(input);
      return { id: Number(result[0].insertId), ...input };
    }),

  update: publicQuery
    .input(
      z
        .object({
          id: z.number(),
          genericName: z.string().min(1).optional(),
          brandName: z.string().min(1).optional(),
          drugClass: z.string().optional(),
          availableStrengths: z.array(z.string()).optional(),
          defaultDose: z.string().optional(),
          defaultFrequency: z.string().optional(),
          defaultTiming: z.string().optional(),
          defaultDuration: z.number().optional(),
          defaultInstructions: z.string().optional(),
          warnings: z.string().optional(),
          isActive: z.boolean().optional(),
        })
        .extend({ id: z.number() })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const { id, ...data } = input;
      await db.update(medications).set(data).where(eq(medications.id, id));
      const updated = await db
        .select()
        .from(medications)
        .where(eq(medications.id, id));
      return updated[0];
    }),

  deactivate: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db
        .update(medications)
        .set({ isActive: false })
        .where(eq(medications.id, input.id));
      const updated = await db
        .select()
        .from(medications)
        .where(eq(medications.id, input.id));
      return updated[0];
    }),

  getDefaultsForPatient: publicQuery
    .input(
      z.object({
        medicationId: z.number(),
        patientAge: z.number(),
      })
    )
    .query(async ({ input }) => {
      const db = getDb();
      const result = await db
        .select()
        .from(medications)
        .where(eq(medications.id, input.medicationId));

      const med = result[0];
      if (!med) return null;

      // Determine age group
      let ageGroup: string;
      if (input.patientAge < 13) ageGroup = "child";
      else if (input.patientAge < 18) ageGroup = "adolescent";
      else if (input.patientAge >= 65) ageGroup = "elderly";
      else ageGroup = "adult";

      return {
        dose: med.defaultDose ?? "",
        frequency: med.defaultFrequency ?? "OD",
        timing: med.defaultTiming ?? "",
        duration: med.defaultDuration ?? 30,
        instructions: med.defaultInstructions ?? "",
        route: med.route ?? "oral",
        availableStrengths: med.availableStrengths ?? [],
        warnings: med.warnings ?? "",
        ageGroup,
      };
    }),
});
