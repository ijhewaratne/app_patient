import { z } from "zod";
import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import {
  prescriptions,
  prescriptionItems,
  medications,
  consultations,
  patients,
  clinicSettings,
} from "@db/schema";
import { eq, desc } from "drizzle-orm";

function generatePrescriptionNumber(): string {
  const date = new Date();
  const prefix = "RX";
  const year = date.getFullYear();
  const random = Math.floor(10000 + Math.random() * 90000);
  return `${prefix}-${year}-${random}`;
}

export const prescriptionRouter = createRouter({
  list: publicQuery
    .input(
      z
        .object({
          patientId: z.number().optional(),
          status: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const db = getDb();

      const where = input?.patientId
        ? eq(prescriptions.patientId, input.patientId)
        : undefined;

      const rxList = await db
        .select()
        .from(prescriptions)
        .where(where)
        .orderBy(desc(prescriptions.prescriptionDate))
        .limit(50);

      // Get items for each prescription
      const result = [];
      for (const rx of rxList) {
        const items = await db
          .select()
          .from(prescriptionItems)
          .where(eq(prescriptionItems.prescriptionId, rx.id));
        result.push({ ...rx, items });
      }

      return result;
    }),

  getLastPrescription: publicQuery
    .input(z.object({ patientId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const rxList = await db
        .select()
        .from(prescriptions)
        .where(eq(prescriptions.patientId, input.patientId))
        .orderBy(desc(prescriptions.prescriptionDate))
        .limit(1);

      if (rxList.length === 0) return null;

      const items = await db
        .select({
          item: prescriptionItems,
          medication: medications,
        })
        .from(prescriptionItems)
        .leftJoin(
          medications,
          eq(prescriptionItems.medicationId, medications.id)
        )
        .where(eq(prescriptionItems.prescriptionId, rxList[0].id));

      return { ...rxList[0], items };
    }),

  create: publicQuery
    .input(
      z.object({
        patientId: z.number(),
        consultationId: z.number(),
        doctorId: z.number().optional(),
        clinicId: z.number().optional(),
        ageAtPrescription: z.number().optional(),
        nextReviewDate: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const prescriptionNumber = generatePrescriptionNumber();
      const result = await db.insert(prescriptions).values({
        prescriptionNumber,
        patientId: input.patientId,
        consultationId: input.consultationId,
        doctorId: input.doctorId ?? null,
        clinicId: input.clinicId ?? null,
        prescriptionDate: new Date(),
        ageAtPrescription: input.ageAtPrescription ?? null,
        nextReviewDate: input.nextReviewDate
          ? new Date(input.nextReviewDate)
          : null,
        status: "draft",
      });
      return {
        id: Number(result[0].insertId),
        prescriptionNumber,
        ...input,
        status: "draft" as const,
      };
    }),

  addItem: publicQuery
    .input(
      z.object({
        prescriptionId: z.number(),
        medicationId: z.number().optional(),
        medicineNameSnapshot: z.string(),
        genericNameSnapshot: z.string().optional(),
        brandNameSnapshot: z.string().optional(),
        strengthSnapshot: z.string().optional(),
        dose: z.string(),
        frequency: z.string(),
        timing: z.string().optional(),
        duration: z.number().optional(),
        route: z.string().optional(),
        instructions: z.string().optional(),
        quantity: z.number().optional(),
        itemStatus: z.enum(["new", "continue", "changed", "stopped"]).default("new"),
        changeReason: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const result = await db.insert(prescriptionItems).values({
        prescriptionId: input.prescriptionId,
        medicationId: input.medicationId ?? null,
        medicineNameSnapshot: input.medicineNameSnapshot,
        genericNameSnapshot: input.genericNameSnapshot ?? null,
        brandNameSnapshot: input.brandNameSnapshot ?? null,
        strengthSnapshot: input.strengthSnapshot ?? null,
        dose: input.dose,
        frequency: input.frequency,
        timing: input.timing ?? null,
        duration: input.duration ?? null,
        route: input.route ?? null,
        instructions: input.instructions ?? null,
        quantity: input.quantity ?? null,
        itemStatus: input.itemStatus,
        changeReason: input.changeReason ?? null,
      });
      return { id: Number(result[0].insertId), ...input };
    }),

  confirm: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db
        .update(prescriptions)
        .set({ status: "confirmed", confirmedAt: new Date() })
        .where(eq(prescriptions.id, input.id));
      const updated = await db
        .select()
        .from(prescriptions)
        .where(eq(prescriptions.id, input.id));
      return updated[0];
    }),

  markPrinted: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db
        .update(prescriptions)
        .set({ status: "printed", printedAt: new Date() })
        .where(eq(prescriptions.id, input.id));
      const updated = await db
        .select()
        .from(prescriptions)
        .where(eq(prescriptions.id, input.id));
      return updated[0];
    }),

  getPrintData: publicQuery
    .input(z.object({ prescriptionId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();

      const rxResult = await db
        .select()
        .from(prescriptions)
        .where(eq(prescriptions.id, input.prescriptionId));

      const rx = rxResult[0];
      if (!rx) return null;

      const patientResult = await db
        .select()
        .from(patients)
        .where(eq(patients.id, rx.patientId));

      const patient = patientResult[0];

      const consultationResult = await db
        .select()
        .from(consultations)
        .where(eq(consultations.id, rx.consultationId));

      const consultation = consultationResult[0];

      // Use the clinic linked to the prescription, fall back to the first clinic
      const clinicResult = rx.clinicId
        ? await db.select().from(clinicSettings).where(eq(clinicSettings.id, rx.clinicId))
        : await db.select().from(clinicSettings);
      const clinic = clinicResult[0];

      const itemsResult = await db
        .select()
        .from(prescriptionItems)
        .where(eq(prescriptionItems.prescriptionId, input.prescriptionId));

      const age = rx.ageAtPrescription ?? (patient?.dateOfBirth
        ? Math.floor(
            (Date.now() - new Date(patient.dateOfBirth).getTime()) /
              (365.25 * 24 * 60 * 60 * 1000)
          )
        : 0);

      return {
        doctor: {
          name: clinic?.doctorName ?? "",
          qualification: clinic?.doctorQualification ?? "",
          registrationNumber: clinic?.doctorRegistrationNumber ?? "",
          clinicName: clinic?.clinicName ?? "MindCare Clinic",
          clinicAddress: clinic?.clinicAddress ?? "",
          clinicPhone: clinic?.clinicPhone ?? "",
          logoUrl: clinic?.logoUrl ?? null,
        },
        patient: {
          name: patient?.fullName ?? "",
          age,
          patientId: patient?.patientId ?? "",
        },
        prescription: {
          number: rx.prescriptionNumber ?? "",
          date: rx.prescriptionDate
            ? new Date(rx.prescriptionDate).toLocaleDateString("en-GB")
            : new Date().toLocaleDateString("en-GB"),
          nextReviewDate: rx.nextReviewDate
            ? new Date(rx.nextReviewDate).toLocaleDateString("en-GB")
            : null,
        },
        diagnosis: consultation?.diagnosisImpression ?? "",
        items: itemsResult.map((item) => ({
          name: item.medicineNameSnapshot,
          genericName: item.genericNameSnapshot ?? "",
          dose: item.dose,
          frequency: item.frequency,
          timing: item.timing ?? "",
          duration: item.duration ? `${item.duration} days` : "As directed",
          quantity: item.quantity ?? item.duration ?? 0,
          instructions: item.instructions ?? "",
          status: item.itemStatus,
        })),
        footer: clinic?.prescriptionFooter ?? "",
      };
    }),
});
