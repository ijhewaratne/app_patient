import { z } from "zod";
import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import {
  patients,
  consultations,
  prescriptions,
  prescriptionItems,
  medications,
  patientSummaries,
  clinicalNotes,
} from "@db/schema";
import { eq, like, or, desc, sql, and } from "drizzle-orm";

function generatePatientId(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(1000 + Math.random() * 9000);
  return `MLP-${year}-${random}`;
}

function calculateAge(dateOfBirth: string | Date | null): number {
  if (!dateOfBirth) return 0;
  const dob = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

export const patientRouter = createRouter({
  list: publicQuery
    .input(
      z
        .object({
          search: z.string().optional(),
          dob: z.string().optional(),
          status: z.string().optional(),
          page: z.number().default(1),
          limit: z.number().default(20),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const db = getDb();
      const conditions = [];

      if (input?.search) {
        const searchTerm = `%${input.search}%`;
        conditions.push(
          or(
            like(patients.fullName, searchTerm),
            like(patients.patientId, searchTerm),
            like(patients.phone, searchTerm)
          )
        );
      }

      if (input?.dob) {
        conditions.push(eq(patients.dateOfBirth, new Date(input.dob)));
      }

      if (input?.status && input.status !== "all") {
        conditions.push(
          eq(patients.status, input.status as "active" | "discharged" | "new")
        );
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const result = await db
        .select()
        .from(patients)
        .where(where)
        .orderBy(desc(patients.createdAt))
        .limit(input?.limit ?? 20)
        .offset(((input?.page ?? 1) - 1) * (input?.limit ?? 20));

      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(patients)
        .where(where);

      return {
        patients: result.map((p) => ({
          ...p,
          age: calculateAge(p.dateOfBirth),
        })),
        total: countResult[0]?.count ?? 0,
      };
    }),

  getById: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const patientResult = await db
        .select()
        .from(patients)
        .where(eq(patients.id, input.id));

      const patient = patientResult[0];
      if (!patient) return null;

      // Get consultations with clinical notes
      const consultationsResult = await db
        .select()
        .from(consultations)
        .where(eq(consultations.patientId, input.id))
        .orderBy(desc(consultations.visitDate));

      // Get clinical notes
      const notesResult = await db
        .select()
        .from(clinicalNotes)
        .where(eq(clinicalNotes.patientId, input.id))
        .orderBy(desc(clinicalNotes.createdAt));

      // Get prescriptions with items
      const prescriptionsResult = await db
        .select()
        .from(prescriptions)
        .where(eq(prescriptions.patientId, input.id))
        .orderBy(desc(prescriptions.prescriptionDate));

      // Get prescription items for each prescription
      const allItems = await db
        .select({
          item: prescriptionItems,
          medication: medications,
        })
        .from(prescriptionItems)
        .leftJoin(
          medications,
          eq(prescriptionItems.medicationId, medications.id)
        );

      const prescriptionsWithItems = prescriptionsResult.map((rx) => ({
        ...rx,
        items: allItems
          .filter((i) => i.item.prescriptionId === rx.id)
          .map((i) => ({ ...i.item })),
      }));

      // Get patient summary
      const summaryResult = await db
        .select()
        .from(patientSummaries)
        .where(eq(patientSummaries.patientId, input.id));

      return {
        ...patient,
        age: calculateAge(patient.dateOfBirth),
        consultations: consultationsResult,
        clinicalNotes: notesResult,
        prescriptions: prescriptionsWithItems,
        summary: summaryResult[0] ?? null,
      };
    }),

  create: publicQuery
    .input(
      z.object({
        fullName: z.string().min(1),
        dateOfBirth: z.string().optional(),
        gender: z.enum(["male", "female", "other"]).optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
        guardianName: z.string().optional(),
        guardianPhone: z.string().optional(),
        emergencyContactName: z.string().optional(),
        emergencyContactPhone: z.string().optional(),
        allergies: z.string().optional(),
        medicalConditions: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const patientId = generatePatientId();
      const result = await db.insert(patients).values({
        fullName: input.fullName,
        dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null,
        gender: input.gender ?? null,
        phone: input.phone ?? null,
        address: input.address ?? null,
        guardianName: input.guardianName ?? null,
        guardianPhone: input.guardianPhone ?? null,
        emergencyContactName: input.emergencyContactName ?? null,
        emergencyContactPhone: input.emergencyContactPhone ?? null,
        allergies: input.allergies ?? null,
        medicalConditions: input.medicalConditions ?? null,
        patientId,
        status: "new",
      });
      return {
        id: Number(result[0].insertId),
        patientId,
        ...input,
        age: calculateAge(input.dateOfBirth ?? null),
      };
    }),

  update: publicQuery
    .input(
      z
        .object({
          id: z.number(),
          fullName: z.string().min(1).optional(),
          dateOfBirth: z.string().optional(),
          gender: z.enum(["male", "female", "other"]).optional(),
          phone: z.string().optional(),
          address: z.string().optional(),
          guardianName: z.string().optional(),
          guardianPhone: z.string().optional(),
          emergencyContactName: z.string().optional(),
          emergencyContactPhone: z.string().optional(),
          allergies: z.string().optional(),
          medicalConditions: z.string().optional(),
          status: z.enum(["active", "discharged", "new"]).optional(),
        })
        .extend({ id: z.number() })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const { id, ...rawData } = input;
      const data: Record<string, unknown> = { ...rawData };
      if (data.dateOfBirth) {
        data.dateOfBirth = new Date(data.dateOfBirth as string);
      }
      await db.update(patients).set(data).where(eq(patients.id, id));
      const updated = await db
        .select()
        .from(patients)
        .where(eq(patients.id, id));
      return updated[0];
    }),

  search: publicQuery
    .input(z.object({ query: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      const searchTerm = `%${input.query}%`;
      // Support DOB search: if input looks like a date (YYYY-MM-DD), search by DOB too
      const dobCondition = /^\d{4}-\d{2}-\d{2}$/.test(input.query)
        ? eq(patients.dateOfBirth, new Date(input.query))
        : undefined;

      const conditions = [
        or(
          like(patients.fullName, searchTerm),
          like(patients.patientId, searchTerm),
          like(patients.phone, searchTerm)
        ),
      ];
      if (dobCondition) conditions.push(dobCondition);

      return db
        .select()
        .from(patients)
        .where(or(...conditions))
        .limit(10);
    }),
});
