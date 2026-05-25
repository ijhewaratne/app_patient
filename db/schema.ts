import {
  mysqlTable,
  mysqlEnum,
  serial,
  varchar,
  text,
  timestamp,
  date,
  time,
  json,
  int,
  boolean,
  bigint,
} from "drizzle-orm/mysql-core";

// ─── Users ──────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  role: mysqlEnum("role", ["doctor", "assistant", "admin"]).default("doctor"),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  isActive: boolean("is_active").default(true),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

// ─── Patients ───────────────────────────────────────────
export const patients = mysqlTable("patients", {
  id: serial("id").primaryKey(),
  patientId: varchar("patient_id", { length: 20 }).notNull().unique(),
  fullName: varchar("full_name", { length: 200 }).notNull(),
  dateOfBirth: date("date_of_birth"),
  gender: mysqlEnum("gender", ["male", "female", "other"]),
  phone: varchar("phone", { length: 20 }),
  address: text("address"),
  guardianName: varchar("guardian_name", { length: 100 }),
  guardianPhone: varchar("guardian_phone", { length: 20 }),
  emergencyContactName: varchar("emergency_contact_name", { length: 100 }),
  emergencyContactPhone: varchar("emergency_contact_phone", { length: 20 }),
  allergies: text("allergies"),
  medicalConditions: text("medical_conditions"),
  status: mysqlEnum("status", ["active", "discharged", "new"]).default("new"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

// ─── Consultations ──────────────────────────────────────
export const consultations = mysqlTable("consultations", {
  id: serial("id").primaryKey(),
  patientId: bigint("patient_id", { mode: "number", unsigned: true }).notNull(),
  doctorId: bigint("doctor_id", { mode: "number", unsigned: true }),
  clinicId: bigint("clinic_id", { mode: "number", unsigned: true }),
  visitDate: date("visit_date").notNull(),
  visitType: mysqlEnum("visit_type", ["initial", "follow_up"]).default("initial"),
  ageAtVisit: int("age_at_visit"),
  chiefComplaint: text("chief_complaint"),
  diagnosisImpression: varchar("diagnosis_impression", { length: 200 }),
  nextReviewDate: date("next_review_date"),
  status: mysqlEnum("status", ["draft", "confirmed"]).default("draft"),
  confirmedBy: bigint("confirmed_by", { mode: "number", unsigned: true }),
  confirmedAt: timestamp("confirmed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

// ─── Clinical Notes ─────────────────────────────────────
export const clinicalNotes = mysqlTable("clinical_notes", {
  id: serial("id").primaryKey(),
  consultationId: bigint("consultation_id", { mode: "number", unsigned: true }).notNull(),
  patientId: bigint("patient_id", { mode: "number", unsigned: true }).notNull(),
  rawTranscript: text("raw_transcript"),
  aiCleanedDraft: text("ai_cleaned_draft"),
  finalConfirmedNote: text("final_confirmed_note"),
  noteType: mysqlEnum("note_type", ["initial_history", "follow_up_progress"]).default("initial_history"),
  status: mysqlEnum("status", ["draft", "confirmed"]).default("draft"),
  confirmedBy: bigint("confirmed_by", { mode: "number", unsigned: true }),
  confirmedAt: timestamp("confirmed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

// ─── Patient Summaries (Clinical Snapshot) ──────────────
export const patientSummaries = mysqlTable("patient_summaries", {
  id: serial("id").primaryKey(),
  patientId: bigint("patient_id", { mode: "number", unsigned: true }).notNull(),
  activeDiagnosis: text("active_diagnosis"),
  keyHistorySummary: text("key_history_summary"),
  currentClinicalStatus: text("current_clinical_status"),
  activeRiskFlags: text("active_risk_flags"),
  currentMedicationSummary: text("current_medication_summary"),
  latestPlan: text("latest_plan"),
  lastUpdatedConsultationId: bigint("last_updated_consultation_id", { mode: "number", unsigned: true }),
  doctorConfirmed: boolean("doctor_confirmed").default(false),
  confirmedBy: bigint("confirmed_by", { mode: "number", unsigned: true }),
  confirmedAt: timestamp("confirmed_at"),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

// ─── Medications ────────────────────────────────────────
export const medications = mysqlTable("medications", {
  id: serial("id").primaryKey(),
  genericName: varchar("generic_name", { length: 200 }).notNull(),
  brandName: varchar("brand_name", { length: 200 }).notNull(),
  drugClass: varchar("drug_class", { length: 100 }),
  availableStrengths: json("available_strengths").$type<string[]>(),
  ageGroup: mysqlEnum("age_group", ["child", "adolescent", "adult", "elderly"]).default("adult"),
  defaultDose: varchar("default_dose", { length: 50 }),
  defaultFrequency: varchar("default_frequency", { length: 50 }),
  defaultTiming: varchar("default_timing", { length: 50 }),
  defaultDuration: int("default_duration"),
  route: varchar("route", { length: 50 }).default("oral"),
  defaultInstructions: text("default_instructions"),
  warnings: text("warnings"),
  maxDoseNote: text("max_dose_note"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Prescriptions ──────────────────────────────────────
export const prescriptions = mysqlTable("prescriptions", {
  id: serial("id").primaryKey(),
  prescriptionNumber: varchar("prescription_number", { length: 30 }),
  patientId: bigint("patient_id", { mode: "number", unsigned: true }).notNull(),
  consultationId: bigint("consultation_id", { mode: "number", unsigned: true }).notNull(),
  doctorId: bigint("doctor_id", { mode: "number", unsigned: true }),
  clinicId: bigint("clinic_id", { mode: "number", unsigned: true }),
  prescriptionDate: date("prescription_date").notNull(),
  ageAtPrescription: int("age_at_prescription"),
  status: mysqlEnum("status", ["draft", "confirmed", "printed"]).default("draft"),
  nextReviewDate: date("next_review_date"),
  confirmedBy: bigint("confirmed_by", { mode: "number", unsigned: true }),
  confirmedAt: timestamp("confirmed_at"),
  printedAt: timestamp("printed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Prescription Items ─────────────────────────────────
export const prescriptionItems = mysqlTable("prescription_items", {
  id: serial("id").primaryKey(),
  prescriptionId: bigint("prescription_id", { mode: "number", unsigned: true }).notNull(),
  medicationId: bigint("medication_id", { mode: "number", unsigned: true }),
  medicineNameSnapshot: varchar("medicine_name_snapshot", { length: 200 }).notNull(),
  genericNameSnapshot: varchar("generic_name_snapshot", { length: 200 }),
  brandNameSnapshot: varchar("brand_name_snapshot", { length: 200 }),
  strengthSnapshot: varchar("strength_snapshot", { length: 50 }),
  dose: varchar("dose", { length: 50 }).notNull(),
  frequency: varchar("frequency", { length: 50 }).notNull(),
  timing: varchar("timing", { length: 50 }),
  duration: int("duration"),
  route: varchar("route", { length: 50 }),
  instructions: text("instructions"),
  quantity: int("quantity"),
  itemStatus: mysqlEnum("item_status", ["new", "continue", "changed", "stopped"]).default("new"),
  changeReason: text("change_reason"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Appointments ───────────────────────────────────────
export const appointments = mysqlTable("appointments", {
  id: serial("id").primaryKey(),
  patientId: bigint("patient_id", { mode: "number", unsigned: true }).notNull(),
  appointmentDate: date("appointment_date").notNull(),
  appointmentTime: time("appointment_time"),
  type: mysqlEnum("type", ["new", "follow_up"]).default("follow_up"),
  status: mysqlEnum("status", ["scheduled", "waiting", "in_session", "completed", "cancelled"]).default("scheduled"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Clinic Settings ────────────────────────────────────
export const clinicSettings = mysqlTable("clinic_settings", {
  id: serial("id").primaryKey(),
  clinicName: varchar("clinic_name", { length: 200 }),
  clinicAddress: text("clinic_address"),
  clinicPhone: varchar("clinic_phone", { length: 20 }),
  doctorName: varchar("doctor_name", { length: 200 }),
  doctorQualification: varchar("doctor_qualification", { length: 200 }),
  doctorRegistrationNumber: varchar("doctor_registration_number", { length: 100 }),
  prescriptionFooter: text("prescription_footer"),
  prescriptionPaperSize: mysqlEnum("prescription_paper_size", ["A4", "A5"]).default("A4"),
  logoUrl: text("logo_url"),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

// ─── Audit Logs ─────────────────────────────────────────
export const auditLogs = mysqlTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: bigint("user_id", { mode: "number", unsigned: true }),
  action: varchar("action", { length: 100 }).notNull(),
  tableName: varchar("table_name", { length: 50 }),
  recordId: bigint("record_id", { mode: "number", unsigned: true }),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  timestamp: timestamp("timestamp").defaultNow(),
});

// ─── Legacy Settings (for backward compat) ──────────────
export const settings = mysqlTable("settings", {
  id: serial("id").primaryKey(),
  doctorName: varchar("doctor_name", { length: 200 }),
  qualifications: varchar("qualifications", { length: 200 }),
  registrationNumber: varchar("registration_number", { length: 100 }),
  clinicName: varchar("clinic_name", { length: 200 }),
  clinicAddress: text("clinic_address"),
  clinicPhone: varchar("clinic_phone", { length: 20 }),
  letterheadText: text("letterhead_text"),
  prescriptionFooter: text("prescription_footer"),
  googleDriveEnabled: boolean("google_drive_enabled").default(false),
  googleDriveFolderId: varchar("google_drive_folder_id", { length: 200 }),
  syncFrequency: mysqlEnum("sync_frequency", ["manual", "15min", "hourly", "daily"]).default("manual"),
  encryptBackups: boolean("encrypt_backups").default(true),
  sttLanguage: mysqlEnum("stt_language", ["english", "sinhala", "tamil"]).default("english"),
  sttAutoCorrect: boolean("stt_auto_correct").default(true),
  sttAiRefine: boolean("stt_ai_refine").default(true),
  autoSaveDrafts: boolean("auto_save_drafts").default(true),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});
