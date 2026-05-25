import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import {
  medications,
  clinicSettings,
  patients,
  consultations,
  clinicalNotes,
  prescriptions,
  prescriptionItems,
  appointments,
  users,
  patientSummaries,
} from "@db/schema";

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "medilogix-salt");
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const seedRouter = createRouter({
  init: publicQuery.mutation(async () => {
    const db = getDb();

    // Check if already seeded
    const existingMeds = await db.select().from(medications);
    if (existingMeds.length > 0) {
      return { message: "Already seeded", medications: existingMeds.length };
    }

    // Create default user
    const existingUsers = await db.select().from(users);
    if (existingUsers.length === 0) {
      const passwordHash = await hashPassword("admin");
      await db.insert(users).values({
        name: "Doctor",
        role: "doctor",
        passwordHash,
        isActive: true,
      });
    }

    // Seed clinic settings
    const existingClinic = await db.select().from(clinicSettings);
    if (existingClinic.length === 0) {
      await db.insert(clinicSettings).values({
        clinicName: "MindCare Psychiatry Clinic",
        clinicAddress: "123 Galle Road, Colombo 03, Sri Lanka",
        clinicPhone: "+94 11 234 5678",
        doctorName: "Dr. S. Fernando",
        doctorQualification: "MBBS(Col), MD Psychiatry",
        doctorRegistrationNumber: "SLMC-34567",
        prescriptionFooter:
          "This is a computer-generated prescription. Please follow up as advised. In case of emergency, contact +94 11 234 5678.",
        prescriptionPaperSize: "A4",
      });
    }

    // Seed medications
    const medsData = [
      {
        genericName: "Sertraline",
        brandName: "Sertraline",
        drugClass: "antidepressant",
        availableStrengths: ["25mg", "50mg", "100mg"],
        ageGroup: "adult" as const,
        defaultDose: "50mg",
        defaultFrequency: "OD",
        defaultTiming: "after breakfast",
        defaultDuration: 30,
        route: "oral",
        defaultInstructions: "Take after breakfast. Can increase to 100mg after 2 weeks if needed.",
        warnings: "Monitor for suicidal ideation in first few weeks. Avoid abrupt discontinuation.",
      },
      {
        genericName: "Fluoxetine",
        brandName: "Fluoxetine",
        drugClass: "antidepressant",
        availableStrengths: ["10mg", "20mg", "40mg"],
        ageGroup: "adult" as const,
        defaultDose: "20mg",
        defaultFrequency: "OD",
        defaultTiming: "morning",
        defaultDuration: 30,
        route: "oral",
        defaultInstructions: "Take in the morning after breakfast. Avoid evening dose due to activation.",
        warnings: "Long half-life. Drug interactions via CYP2D6.",
      },
      {
        genericName: "Escitalopram",
        brandName: "Escitalopram",
        drugClass: "antidepressant",
        availableStrengths: ["5mg", "10mg", "20mg"],
        ageGroup: "adult" as const,
        defaultDose: "10mg",
        defaultFrequency: "OD",
        defaultTiming: "after breakfast",
        defaultDuration: 30,
        route: "oral",
        defaultInstructions: "Take after breakfast. Maximum 20mg daily.",
        warnings: "QT prolongation at higher doses. Avoid in congenital long QT.",
      },
      {
        genericName: "Venlafaxine",
        brandName: "Venlafaxine XR",
        drugClass: "antidepressant",
        availableStrengths: ["37.5mg", "75mg", "150mg"],
        ageGroup: "adult" as const,
        defaultDose: "75mg",
        defaultFrequency: "OD",
        defaultTiming: "with food",
        defaultDuration: 30,
        route: "oral",
        defaultInstructions: "Take with food. Do not crush or chew extended-release capsule.",
        warnings: "Monitor BP. Withdrawal symptoms common - taper slowly.",
      },
      {
        genericName: "Risperidone",
        brandName: "Risperidone",
        drugClass: "antipsychotic",
        availableStrengths: ["0.5mg", "1mg", "2mg", "3mg", "4mg"],
        ageGroup: "adult" as const,
        defaultDose: "2mg",
        defaultFrequency: "OD / BD",
        defaultTiming: "bedtime",
        defaultDuration: 30,
        route: "oral",
        defaultInstructions: "Take at the same time daily. Monitor for extrapyramidal symptoms.",
        warnings: "Monitor prolactin, weight, metabolic parameters. EPS risk.",
      },
      {
        genericName: "Olanzapine",
        brandName: "Olanzapine",
        drugClass: "antipsychotic",
        availableStrengths: ["2.5mg", "5mg", "10mg"],
        ageGroup: "adult" as const,
        defaultDose: "5mg",
        defaultFrequency: "OD",
        defaultTiming: "bedtime",
        defaultDuration: 30,
        route: "oral",
        defaultInstructions: "Take at bedtime. Monitor weight and metabolic parameters.",
        warnings: "High metabolic risk. Regular monitoring of weight, glucose, lipids required.",
      },
      {
        genericName: "Quetiapine",
        brandName: "Quetiapine XR",
        drugClass: "antipsychotic",
        availableStrengths: ["50mg", "150mg", "200mg", "300mg"],
        ageGroup: "adult" as const,
        defaultDose: "150mg",
        defaultFrequency: "OD",
        defaultTiming: "bedtime",
        defaultDuration: 30,
        route: "oral",
        defaultInstructions: "Take at bedtime without food. Can increase gradually.",
        warnings: "Sedation common. Orthostatic hypotension risk.",
      },
      {
        genericName: "Aripiprazole",
        brandName: "Aripiprazole",
        drugClass: "antipsychotic",
        availableStrengths: ["5mg", "10mg", "15mg", "20mg"],
        ageGroup: "adult" as const,
        defaultDose: "10mg",
        defaultFrequency: "OD",
        defaultTiming: "morning",
        defaultDuration: 30,
        route: "oral",
        defaultInstructions: "Take with or without food. Akathisia is a common side effect.",
        warnings: "Monitor for akathisia and activation. Less metabolic risk.",
      },
      {
        genericName: "Alprazolam",
        brandName: "Alprazolam",
        drugClass: "anxiolytic",
        availableStrengths: ["0.25mg", "0.5mg", "1mg"],
        ageGroup: "adult" as const,
        defaultDose: "0.5mg",
        defaultFrequency: "BD / TDS",
        defaultTiming: "PRN",
        defaultDuration: 14,
        route: "oral",
        defaultInstructions: "Short-term use only. Taper gradually to avoid withdrawal. Not for long-term use.",
        warnings: "HIGH DEPENDENCE RISK. Maximum 4 weeks. Taper gradually.",
      },
      {
        genericName: "Clonazepam",
        brandName: "Clonazepam",
        drugClass: "anxiolytic",
        availableStrengths: ["0.25mg", "0.5mg", "1mg", "2mg"],
        ageGroup: "adult" as const,
        defaultDose: "0.5mg",
        defaultFrequency: "OD / BD",
        defaultTiming: "bedtime",
        defaultDuration: 30,
        route: "oral",
        defaultInstructions: "Take at bedtime. Long half-life. Avoid abrupt discontinuation.",
        warnings: "Dependence risk with prolonged use. Cognitive effects in elderly.",
      },
      {
        genericName: "Sodium Valproate",
        brandName: "Sodium Valproate",
        drugClass: "mood_stabilizer",
        availableStrengths: ["200mg", "300mg", "500mg"],
        ageGroup: "adult" as const,
        defaultDose: "500mg",
        defaultFrequency: "BD",
        defaultTiming: "after meals",
        defaultDuration: 30,
        route: "oral",
        defaultInstructions: "Take with food. Monitor liver function. Avoid in pregnancy.",
        warnings: "Hepatotoxicity risk. Teratogenic - avoid in pregnancy. Monitor LFTs.",
      },
      {
        genericName: "Lithium Carbonate",
        brandName: "Lithium Carbonate",
        drugClass: "mood_stabilizer",
        availableStrengths: ["300mg", "400mg"],
        ageGroup: "adult" as const,
        defaultDose: "400mg",
        defaultFrequency: "BD",
        defaultTiming: "with meals",
        defaultDuration: 30,
        route: "oral",
        defaultInstructions: "Take with meals. Monitor serum lithium levels. Maintain adequate hydration.",
        warnings: "Narrow therapeutic index. Monitor levels, thyroid, renal function.",
      },
      {
        genericName: "Lamotrigine",
        brandName: "Lamotrigine",
        drugClass: "mood_stabilizer",
        availableStrengths: ["25mg", "50mg", "100mg", "200mg"],
        ageGroup: "adult" as const,
        defaultDose: "25mg",
        defaultFrequency: "OD",
        defaultTiming: "morning",
        defaultDuration: 60,
        route: "oral",
        defaultInstructions: "Slow titration required. Start 25mg OD for 2 weeks, then increase gradually. Watch for rash.",
        warnings: "Risk of Stevens-Johnson syndrome. Slow titration essential.",
      },
      {
        genericName: "Zolpidem",
        brandName: "Zolpidem",
        drugClass: "sleep_aid",
        availableStrengths: ["5mg", "10mg"],
        ageGroup: "adult" as const,
        defaultDose: "10mg",
        defaultFrequency: "HS",
        defaultTiming: "bedtime",
        defaultDuration: 14,
        route: "oral",
        defaultInstructions: "Take immediately before bedtime. Short-term use only (2-4 weeks max).",
        warnings: "Complex sleep behaviors reported. Tolerance develops quickly.",
      },
      {
        genericName: "Melatonin",
        brandName: "Melatonin",
        drugClass: "sleep_aid",
        availableStrengths: ["3mg", "5mg", "10mg"],
        ageGroup: "adult" as const,
        defaultDose: "3mg",
        defaultFrequency: "HS",
        defaultTiming: "30 min before bedtime",
        defaultDuration: 30,
        route: "oral",
        defaultInstructions: "Take 30 minutes before bedtime. Non-habit forming.",
        warnings: "May cause morning drowsiness. Vivid dreams possible.",
      },
      {
        genericName: "Methylphenidate",
        brandName: "Methylphenidate",
        drugClass: "stimulant",
        availableStrengths: ["5mg", "10mg", "20mg"],
        ageGroup: "adult" as const,
        defaultDose: "10mg",
        defaultFrequency: "OD / BD",
        defaultTiming: "morning",
        defaultDuration: 30,
        route: "oral",
        defaultInstructions: "Take in the morning. Last dose before 4 PM to avoid insomnia. Monitor BP.",
        warnings: "Controlled substance. Monitor BP, HR, weight. Appetite suppression.",
      },
      {
        genericName: "Propranolol",
        brandName: "Propranolol",
        drugClass: "other",
        availableStrengths: ["10mg", "20mg", "40mg"],
        ageGroup: "adult" as const,
        defaultDose: "20mg",
        defaultFrequency: "BD / TDS",
        defaultTiming: "before anxiety-provoking situation",
        defaultDuration: 30,
        route: "oral",
        defaultInstructions: "Take with food. Useful for performance anxiety and akathisia. Monitor heart rate.",
        warnings: "Avoid in asthma, bradycardia, heart block. Do not stop abruptly.",
      },
      {
        genericName: "Hydroxyzine",
        brandName: "Hydroxyzine",
        drugClass: "other",
        availableStrengths: ["10mg", "25mg"],
        ageGroup: "adult" as const,
        defaultDose: "25mg",
        defaultFrequency: "TDS",
        defaultTiming: "as needed",
        defaultDuration: 14,
        route: "oral",
        defaultInstructions: "Can cause drowsiness. Non-addictive anxiolytic. Antihistamine properties.",
        warnings: "Sedation. Anticholinergic effects. QT prolongation risk.",
      },
    ];

    await db.insert(medications).values(medsData);

    // Seed sample patients
    const samplePatients = [
      {
        patientId: "MLP-2026-0001",
        fullName: "Kamal Perera",
        dateOfBirth: new Date("1985-03-15"),
        gender: "male" as const,
        phone: "+94 71 234 5678",
        address: "45 Temple Road, Dehiwala",
        guardianName: "Nimal Perera",
        guardianPhone: "+94 71 234 5679",
        allergies: "None known",
        medicalConditions: "Hypertension",
        status: "active" as const,
      },
      {
        patientId: "MLP-2026-0002",
        fullName: "Sithara Fernando",
        dateOfBirth: new Date("1992-07-22"),
        gender: "female" as const,
        phone: "+94 77 345 6789",
        address: "12 Galle Road, Colombo 04",
        guardianName: "Sunil Fernando",
        guardianPhone: "+94 77 345 6790",
        allergies: "Penicillin",
        medicalConditions: "None",
        status: "active" as const,
      },
      {
        patientId: "MLP-2026-0003",
        fullName: "Rajitha Silva",
        dateOfBirth: new Date("1978-11-08"),
        gender: "male" as const,
        phone: "+94 76 456 7890",
        address: "78 Havelock City, Colombo 05",
        guardianName: "Amara Silva",
        guardianPhone: "+94 76 456 7891",
        allergies: "None known",
        medicalConditions: "Diabetes Type 2",
        status: "active" as const,
      },
    ];

    await db.insert(patients).values(samplePatients);

    // Seed consultations and clinical notes
    const today = new Date();
    const sampleConsultations = [
      {
        patientId: 1,
        visitDate: today,
        visitType: "initial" as const,
        ageAtVisit: 41,
        chiefComplaint: "Difficulty sleeping and persistent sadness for past 2 months",
        diagnosisImpression: "F32.1 - Moderate Depressive Episode",
        nextReviewDate: new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000),
        status: "confirmed" as const,
      },
      {
        patientId: 2,
        visitDate: today,
        visitType: "follow_up" as const,
        ageAtVisit: 34,
        chiefComplaint: "Follow-up for anxiety management",
        diagnosisImpression: "F41.1 - Generalized Anxiety Disorder",
        nextReviewDate: new Date(today.getTime() + 28 * 24 * 60 * 60 * 1000),
        status: "confirmed" as const,
      },
    ];

    await db.insert(consultations).values(sampleConsultations);

    // Seed clinical notes
    const sampleNotes = [
      {
        consultationId: 1,
        patientId: 1,
        rawTranscript:
          "patient is 41 year old male reports gradual onset of low mood loss of interest in activities early morning awakening reduced appetite no suicidal ideation stressors include work pressure and family conflicts",
        aiCleanedDraft:
          "Patient is a 41-year-old male who reports gradual onset of low mood, loss of interest in activities, early morning awakening, and reduced appetite. No suicidal ideation. Stressors include work pressure and family conflicts.",
        finalConfirmedNote:
          "Patient is a 41-year-old male who reports gradual onset of low mood, loss of interest in activities, early morning awakening, and reduced appetite over the past 2 months. No suicidal ideation reported. Stressors include work pressure and family conflicts. PHQ-9 score: 14 (moderate depression). Mental state examination: Alert and oriented. Affect is sad. Speech normal rate and volume. No psychotic features.",
        noteType: "initial_history" as const,
        status: "confirmed" as const,
      },
      {
        consultationId: 2,
        patientId: 2,
        rawTranscript:
          "patient reports improvement in anxiety symptoms since starting medication sleep has improved still has occasional panic attacks but less frequent",
        aiCleanedDraft:
          "Patient reports improvement in anxiety symptoms since starting medication. Sleep has improved. Still has occasional panic attacks but less frequent.",
        finalConfirmedNote:
          "Patient reports significant improvement in anxiety symptoms since starting Escitalopram 10mg. Sleep quality has improved. Occasional panic attacks continue but frequency reduced from daily to 1-2 per week. No side effects reported. Patient adherent to medication.",
        noteType: "follow_up_progress" as const,
        status: "confirmed" as const,
      },
    ];

    await db.insert(clinicalNotes).values(sampleNotes);

    // Seed prescriptions with items
    const samplePrescriptions = [
      {
        prescriptionNumber: "RX-2026-10001",
        patientId: 1,
        consultationId: 1,
        prescriptionDate: today,
        ageAtPrescription: 41,
        nextReviewDate: new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000),
        status: "printed" as const,
      },
      {
        prescriptionNumber: "RX-2026-10002",
        patientId: 2,
        consultationId: 2,
        prescriptionDate: today,
        ageAtPrescription: 34,
        nextReviewDate: new Date(today.getTime() + 28 * 24 * 60 * 60 * 1000),
        status: "printed" as const,
      },
    ];

    await db.insert(prescriptions).values(samplePrescriptions);

    // Seed prescription items
    const sampleItems = [
      {
        prescriptionId: 1,
        medicationId: 1,
        medicineNameSnapshot: "Sertraline",
        genericNameSnapshot: "Sertraline",
        strengthSnapshot: "50mg",
        dose: "50mg",
        frequency: "OD",
        timing: "after breakfast",
        duration: 30,
        route: "oral",
        instructions: "Take after breakfast",
        quantity: 30,
        itemStatus: "new" as const,
      },
      {
        prescriptionId: 1,
        medicationId: 14,
        medicineNameSnapshot: "Zolpidem",
        genericNameSnapshot: "Zolpidem",
        strengthSnapshot: "10mg",
        dose: "10mg",
        frequency: "HS",
        timing: "bedtime",
        duration: 14,
        route: "oral",
        instructions: "Take at bedtime for sleep. Short-term use only.",
        quantity: 14,
        itemStatus: "new" as const,
      },
      {
        prescriptionId: 2,
        medicationId: 3,
        medicineNameSnapshot: "Escitalopram",
        genericNameSnapshot: "Escitalopram",
        strengthSnapshot: "10mg",
        dose: "10mg",
        frequency: "OD",
        timing: "morning",
        duration: 30,
        route: "oral",
        instructions: "Continue current dose. Take after breakfast.",
        quantity: 30,
        itemStatus: "continue" as const,
      },
    ];

    await db.insert(prescriptionItems).values(sampleItems);

    // Seed patient summary
    await db.insert(patientSummaries).values({
      patientId: 1,
      activeDiagnosis: "F32.1 - Moderate Depressive Episode with insomnia",
      keyHistorySummary:
        "41-year-old male, 2-month history of depressive symptoms triggered by work stress and family conflicts. No prior psychiatric history.",
      currentClinicalStatus:
        "PHQ-9: 14 (moderate). No suicidal ideation. Functional impairment moderate.",
      activeRiskFlags: "Low risk. No suicidal ideation. Monitor for worsening.",
      currentMedicationSummary:
        "Sertraline 50mg OD (started today), Zolpidem 10mg HS PRN (2 weeks)",
      latestPlan:
        "Review in 2 weeks. Consider CBT referral. Family therapy may be beneficial.",
      doctorConfirmed: true,
    });

    // Seed appointments
    const sampleAppointments = [
      {
        patientId: 1,
        appointmentDate: today,
        appointmentTime: "09:00:00",
        type: "follow_up" as const,
        status: "completed" as const,
      },
      {
        patientId: 2,
        appointmentDate: today,
        appointmentTime: "10:00:00",
        type: "follow_up" as const,
        status: "completed" as const,
      },
      {
        patientId: 3,
        appointmentDate: today,
        appointmentTime: "11:30:00",
        type: "new" as const,
        status: "waiting" as const,
      },
    ];

    await db.insert(appointments).values(sampleAppointments);

    return {
      message: "Database seeded successfully",
      medications: medsData.length,
      patients: samplePatients.length,
      consultations: sampleConsultations.length,
    };
  }),
});
