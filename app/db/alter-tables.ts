import "dotenv/config";
import { createConnection } from "mysql2/promise";

async function alterTables() {
  const connection = await createConnection({
    uri: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    multipleStatements: true,
  });

  const alters = [
    // ─── Patients ───────────────────────────────────────────
    `ALTER TABLE patients ADD COLUMN IF NOT EXISTS guardian_name VARCHAR(100)`,
    `ALTER TABLE patients ADD COLUMN IF NOT EXISTS guardian_phone VARCHAR(20)`,
    `ALTER TABLE patients ADD COLUMN IF NOT EXISTS medical_conditions TEXT`,
    // Rename emergency contact columns
    `ALTER TABLE patients CHANGE COLUMN IF EXISTS emergency_contact_name emergency_contact_name VARCHAR(100)`,
    `ALTER TABLE patients CHANGE COLUMN IF EXISTS emergency_contact_phone emergency_contact_phone VARCHAR(20)`,

    // ─── Consultations ──────────────────────────────────────
    `ALTER TABLE consultations ADD COLUMN IF NOT EXISTS doctor_id BIGINT UNSIGNED`,
    `ALTER TABLE consultations ADD COLUMN IF NOT EXISTS visit_type ENUM('initial','follow_up') DEFAULT 'initial'`,
    `ALTER TABLE consultations ADD COLUMN IF NOT EXISTS age_at_visit INT`,
    `ALTER TABLE consultations ADD COLUMN IF NOT EXISTS chief_complaint TEXT`,
    `ALTER TABLE consultations ADD COLUMN IF NOT EXISTS diagnosis_impression VARCHAR(200)`,
    `ALTER TABLE consultations ADD COLUMN IF NOT EXISTS next_review_date DATE`,
    `ALTER TABLE consultations ADD COLUMN IF NOT EXISTS confirmed_by BIGINT UNSIGNED`,
    `ALTER TABLE consultations ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP`,
    // Rename columns
    `ALTER TABLE consultations CHANGE COLUMN IF EXISTS consultation_date visit_date DATE`,
    `ALTER TABLE consultations CHANGE COLUMN IF EXISTS presenting_complaint chief_complaint TEXT`,
    `ALTER TABLE consultations CHANGE COLUMN IF EXISTS diagnosis_primary diagnosis_impression VARCHAR(200)`,
    // Drop old columns (we'll keep them for now to avoid data loss)
    // `ALTER TABLE consultations DROP COLUMN IF EXISTS presenting_complaint`,
    // `ALTER TABLE consultations DROP COLUMN IF EXISTS history_of_illness`,
    // `ALTER TABLE consultations DROP COLUMN IF EXISTS examination_findings`,
    // `ALTER TABLE consultations DROP COLUMN IF EXISTS diagnosis_secondary`,
    // `ALTER TABLE consultations DROP COLUMN IF EXISTS special_notes`,

    // ─── Medications ────────────────────────────────────────
    `ALTER TABLE medications ADD COLUMN IF NOT EXISTS drug_class VARCHAR(100)`,
    `ALTER TABLE medications ADD COLUMN IF NOT EXISTS age_group ENUM('child','adolescent','adult','elderly') DEFAULT 'adult'`,
    `ALTER TABLE medications ADD COLUMN IF NOT EXISTS default_timing VARCHAR(50)`,
    `ALTER TABLE medications ADD COLUMN IF NOT EXISTS route VARCHAR(50) DEFAULT 'oral'`,
    `ALTER TABLE medications ADD COLUMN IF NOT EXISTS warnings TEXT`,
    `ALTER TABLE medications ADD COLUMN IF NOT EXISTS max_dose_note TEXT`,
    `ALTER TABLE medications ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE`,
    // Rename columns
    `ALTER TABLE medications CHANGE COLUMN IF EXISTS available_dosages available_strengths JSON`,
    `ALTER TABLE medications CHANGE COLUMN IF EXISTS default_dosage_adult default_dose VARCHAR(50)`,
    // Drop old columns we don't need anymore
    `ALTER TABLE medications DROP COLUMN IF EXISTS default_dosage_elderly`,
    `ALTER TABLE medications DROP COLUMN IF EXISTS default_dosage_child`,
    `ALTER TABLE medications DROP COLUMN IF EXISTS default_frequency`,
    `ALTER TABLE medications DROP COLUMN IF EXISTS default_duration`,
    `ALTER TABLE medications DROP COLUMN IF EXISTS default_instructions`,
    `ALTER TABLE medications DROP COLUMN IF EXISTS notes`,

    // ─── Prescriptions ──────────────────────────────────────
    // The old prescriptions table had medication columns inline.
    // We need to restructure: prescriptions becomes a header, items go to prescription_items.
    // First, add new columns to prescriptions
    `ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS prescription_number VARCHAR(30)`,
    `ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS patient_id BIGINT UNSIGNED`,
    `ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS doctor_id BIGINT UNSIGNED`,
    `ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS prescription_date DATE`,
    `ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS age_at_prescription INT`,
    `ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS next_review_date DATE`,
    `ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS confirmed_by BIGINT UNSIGNED`,
    `ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP`,
    `ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS printed_at TIMESTAMP`,
    // Change status enum
    `ALTER TABLE prescriptions MODIFY COLUMN status ENUM('draft','confirmed','printed') DEFAULT 'draft'`,
    // Keep old medication columns for data migration but mark them deprecated
  ];

  for (let i = 0; i < alters.length; i++) {
    const sql = alters[i];
    try {
      await connection.execute(sql);
      console.log(`✓ ALTER ${i + 1}/${alters.length}`);
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      if (error.code === "ER_DUP_FIELDNAME") {
        console.log(`⚠ ALTER ${i + 1} skipped (column exists)`);
      } else if (error.code === "ER_BAD_FIELD_ERROR") {
        console.log(`⚠ ALTER ${i + 1} skipped (old column doesn't exist): ${error.message?.slice(0, 60)}`);
      } else {
        console.log(`✗ ALTER ${i + 1} failed: ${error.message?.slice(0, 100)}`);
      }
    }
  }

  await connection.end();
  console.log("Alter tables complete!");
}

alterTables().catch(console.error);
