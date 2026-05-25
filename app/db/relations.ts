import { relations } from "drizzle-orm";
import {
  patients,
  consultations,
  clinicalNotes,
  patientSummaries,
  medications,
  prescriptions,
  prescriptionItems,
  appointments,
  users,
} from "./schema";

export const usersRelations = relations(users, ({ many }) => ({
  consultations: many(consultations),
}));

export const patientsRelations = relations(patients, ({ many }) => ({
  consultations: many(consultations),
  appointments: many(appointments),
  prescriptions: many(prescriptions),
  summaries: many(patientSummaries),
}));

export const consultationsRelations = relations(consultations, ({ one }) => ({
  patient: one(patients, {
    fields: [consultations.patientId],
    references: [patients.id],
  }),
  clinicalNote: one(clinicalNotes, {
    fields: [consultations.id],
    references: [clinicalNotes.consultationId],
  }),
  prescription: one(prescriptions, {
    fields: [consultations.id],
    references: [prescriptions.consultationId],
  }),
}));

export const clinicalNotesRelations = relations(clinicalNotes, ({ one }) => ({
  consultation: one(consultations, {
    fields: [clinicalNotes.consultationId],
    references: [consultations.id],
  }),
  patient: one(patients, {
    fields: [clinicalNotes.patientId],
    references: [patients.id],
  }),
}));

export const patientSummariesRelations = relations(patientSummaries, ({ one }) => ({
  patient: one(patients, {
    fields: [patientSummaries.patientId],
    references: [patients.id],
  }),
}));

export const medicationsRelations = relations(medications, ({ many }) => ({
  prescriptionItems: many(prescriptionItems),
}));

export const prescriptionsRelations = relations(prescriptions, ({ one, many }) => ({
  patient: one(patients, {
    fields: [prescriptions.patientId],
    references: [patients.id],
  }),
  consultation: one(consultations, {
    fields: [prescriptions.consultationId],
    references: [consultations.id],
  }),
  items: many(prescriptionItems),
}));

export const prescriptionItemsRelations = relations(prescriptionItems, ({ one }) => ({
  prescription: one(prescriptions, {
    fields: [prescriptionItems.prescriptionId],
    references: [prescriptions.id],
  }),
  medication: one(medications, {
    fields: [prescriptionItems.medicationId],
    references: [medications.id],
  }),
}));

export const appointmentsRelations = relations(appointments, ({ one }) => ({
  patient: one(patients, {
    fields: [appointments.patientId],
    references: [patients.id],
  }),
}));
