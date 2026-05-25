import { useState, useRef, useCallback } from "react";
import {
  Mic,
  Square,
  Plus,
  Trash2,
  Printer,
  Save,
  Search,
  User,
  X,
  Sparkles,
  Check,
  RotateCcw,
  ClipboardList,
  Stethoscope,
  FileText,
  Repeat,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/providers/trpc";

// ─── Types ──────────────────────────────────────────────
interface RxItem {
  medicationId: number;
  medicationName: string;
  genericName: string;
  dosage: string;
  frequency: string;
  duration: number;
  quantity: number;
  instructions: string;
  itemStatus: "new" | "continue" | "changed" | "stopped";
  availableDosages: string[];
}

// ─── Helpers ────────────────────────────────────────────
function calcAge(dob: string | Date | null): number {
  if (!dob) return 0;
  const d = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return age;
}

// ─── Component ──────────────────────────────────────────
export default function NewConsultation() {
  // ── Patient Selection ──
  const [patientSearch, setPatientSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<
    { id: number; fullName: string; age: number; patientId: string } | null
  >(null);

  // ── Clinic Selection ──
  const [selectedClinicId, setSelectedClinicId] = useState<number | null>(null);

  // ── Visit Type ──
  const [visitType, setVisitType] = useState<"initial" | "follow_up">("initial");

  // ── Consultation Fields ──
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [diagnosisImpression, setDiagnosisImpression] = useState("");
  const [nextReviewDate, setNextReviewDate] = useState("");

  // ── Clinical Notes (3-version system) ──
  const [clinicalNote, setClinicalNote] = useState("");
  const [confirmedNote, setConfirmedNote] = useState("");
  const [noteStatus, setNoteStatus] = useState<"draft" | "confirmed">("draft");

  // ── Prescription ──
  const [rxItems, setRxItems] = useState<RxItem[]>([]);

  // ── UI States ──
  const [step, setStep] = useState<"patient" | "notes" | "prescription">("patient");
  const [recording, setRecording] = useState(false);
  const [refining, setRefining] = useState(false);
  const [refinedText, setRefinedText] = useState<string | null>(null);
  const [medSearch, setMedSearch] = useState("");
  const [showMedSearch, setShowMedSearch] = useState(false);
  const [saving, setSaving] = useState(false);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const transcriptBuf = useRef("");

  // ── tRPC ──
  const { data: searchResults } = trpc.patient.search.useQuery(
    { query: patientSearch },
    { enabled: patientSearch.length >= 2 }
  );
  const { data: medResults } = trpc.medication.list.useQuery(
    { search: medSearch },
    { enabled: medSearch.length >= 1 }
  );
  const { data: lastRx } = trpc.prescription.getLastPrescription.useQuery(
    { patientId: selectedPatient?.id ?? 0 },
    { enabled: !!selectedPatient && visitType === "follow_up" }
  );
  const { data: clinicList } = trpc.clinic.list.useQuery();

  const refineMutation = trpc.speech.refineText.useMutation();
  const createConsultation = trpc.consultation.create.useMutation();
  const confirmConsultation = trpc.consultation.confirm.useMutation();
  const saveNoteDraft = trpc.consultation.saveNoteDraft.useMutation();
  const createRxHeader = trpc.prescription.create.useMutation();
  const addRxItem = trpc.prescription.addItem.useMutation();
  const confirmRx = trpc.prescription.confirm.useMutation();
  const markPrinted = trpc.prescription.markPrinted.useMutation();
  const utils = trpc.useUtils();

  // ── Speech-to-Text ──
  const startRecording = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert("Speech recognition not supported"); return; }
    const r = new SR();
    r.continuous = true; r.interimResults = true; r.lang = "en-US";
    transcriptBuf.current = "";
    r.onresult = (e: SpeechRecognitionEvent) => {
      for (let i = e.resultIndex; i < e.results.length; i++)
        if (e.results[i].isFinal) transcriptBuf.current += e.results[i][0].transcript + " ";
    };
    r.onend = () => {
      const t = transcriptBuf.current.trim();
      if (t) setClinicalNote((p) => (p ? p + "\n\n" + t : t));
      setRecording(false);
    };
    r.onerror = () => setRecording(false);
    r.start(); recognitionRef.current = r; setRecording(true);
  }, []);

  const stopRecording = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  // ── AI Refinement ──
  const handleRefine = async () => {
    if (!clinicalNote.trim()) return;
    setRefining(true);
    try {
      const r = await refineMutation.mutateAsync({ text: clinicalNote });
      setRefinedText(r.refinedText);
    } catch { setRefining(false); }
  };

  const acceptRefined = () => {
    if (refinedText) setClinicalNote(refinedText);
    setRefinedText(null); setRefining(false);
  };

  const discardRefined = () => { setRefinedText(null); setRefining(false); };

  // ── Confirm Clinical Note ──
  const handleConfirmNote = () => {
    setConfirmedNote(clinicalNote);
    setNoteStatus("confirmed");
  };

  // ── Prescription Actions ──
  const addMedication = async (medId: number) => {
    const med = medResults?.find((m) => m.id === medId);
    if (!med || !selectedPatient) return;
    const defs = await utils.client.medication.getDefaultsForPatient.query({
      medicationId: medId, patientAge: selectedPatient.age,
    });
    const dur = defs?.duration ?? med.defaultDuration ?? 30;
    const item: RxItem = {
      medicationId: med.id, medicationName: med.brandName,
      genericName: med.genericName,
      dosage: defs?.dose ?? med.defaultDose ?? "",
      frequency: defs?.frequency ?? med.defaultFrequency ?? "OD",
      duration: dur, quantity: dur,
      instructions: defs?.instructions ?? med.defaultInstructions ?? "",
      itemStatus: "new",
      availableDosages: (med.availableStrengths ?? []) as string[],
    };
    setRxItems((p) => [...p, item]);
    setMedSearch(""); setShowMedSearch(false);
  };

  const repeatLastPrescription = () => {
    if (!lastRx?.items) return;
    const items: RxItem[] = lastRx.items.map((it: Record<string, unknown>) => ({
      medicationId: (it.item as Record<string, unknown>).medicationId as number ?? 0,
      medicationName: (it.item as Record<string, unknown>).medicineNameSnapshot as string ?? "",
      genericName: (it.item as Record<string, unknown>).genericNameSnapshot as string ?? "",
      dosage: (it.item as Record<string, unknown>).dose as string ?? "",
      frequency: (it.item as Record<string, unknown>).frequency as string ?? "OD",
      duration: (it.item as Record<string, unknown>).duration as number ?? 30,
      quantity: (it.item as Record<string, unknown>).quantity as number ?? 30,
      instructions: (it.item as Record<string, unknown>).instructions as string ?? "",
      itemStatus: "continue" as const,
      availableDosages: [],
    }));
    setRxItems(items);
  };

  const updateRx = (i: number, u: Partial<RxItem>) =>
    setRxItems((p) => p.map((x, j) => j === i ? { ...x, ...u } : x));
  const removeRx = (i: number) => setRxItems((p) => p.filter((_, j) => j !== i));

  // ── Save & Print ──
  const handleSaveAndPrint = async () => {
    if (!selectedPatient) return;
    setSaving(true);
    try {
      // 1. Create consultation
      const consultation = await createConsultation.mutateAsync({
        patientId: selectedPatient.id,
        ageAtVisit: selectedPatient.age,
        chiefComplaint: chiefComplaint || undefined,
        diagnosisImpression: diagnosisImpression || undefined,
        visitType,
        nextReviewDate: nextReviewDate || undefined,
        clinicId: selectedClinicId ?? undefined,
      });

      // 2. Save clinical note (3-version system)
      if (clinicalNote || confirmedNote) {
        await saveNoteDraft.mutateAsync({
          consultationId: consultation.id,
          patientId: selectedPatient.id,
          noteType: visitType === "initial" ? "initial_history" : "follow_up_progress",
          rawTranscript: clinicalNote,
          aiCleanedDraft: refinedText ?? undefined,
          finalConfirmedNote: confirmedNote || clinicalNote,
        });
      }

      // 3. Confirm consultation & note
      await confirmConsultation.mutateAsync({ id: consultation.id });

      // 4. Create prescription header
      const prescription = await createRxHeader.mutateAsync({
        patientId: selectedPatient.id,
        consultationId: consultation.id,
        ageAtPrescription: selectedPatient.age,
        nextReviewDate: nextReviewDate || undefined,
        clinicId: selectedClinicId ?? undefined,
      });

      // 5. Add prescription items with snapshots
      for (const rx of rxItems) {
        await addRxItem.mutateAsync({
          prescriptionId: prescription.id,
          medicationId: rx.medicationId || undefined,
          medicineNameSnapshot: rx.medicationName,
          genericNameSnapshot: rx.genericName,
          strengthSnapshot: rx.dosage,
          dose: rx.dosage,
          frequency: rx.frequency,
          duration: rx.duration,
          quantity: rx.quantity,
          instructions: rx.instructions || undefined,
          itemStatus: rx.itemStatus,
        });
      }

      // 6. Confirm & print
      await confirmRx.mutateAsync({ id: prescription.id });
      await markPrinted.mutateAsync({ id: prescription.id });
      window.print();

      // 7. Reset
      resetForm();
    } catch (e) {
      console.error("Save failed:", e);
      alert("Failed to save. Please try again.");
    } finally { setSaving(false); }
  };

  const resetForm = () => {
    setSelectedPatient(null);
    setSelectedClinicId(null);
    setChiefComplaint(""); setDiagnosisImpression(""); setNextReviewDate("");
    setClinicalNote(""); setConfirmedNote(""); setNoteStatus("draft");
    setRxItems([]); setStep("patient"); setVisitType("initial");
  };

  // ── Render ──
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-[28px] font-normal text-[#2C3A2B]">
            {visitType === "initial" ? "New Consultation" : "Follow-Up Consultation"}
          </h1>
          {selectedPatient && (
            <p className="text-sm text-[#9C9B97] mt-0.5">
              {selectedPatient.fullName} · {selectedPatient.patientId} · {selectedPatient.age} yrs
            </p>
          )}
        </div>
        {/* Step indicator */}
        <div className="flex items-center gap-1 bg-[#EDECE8] rounded-lg p-1">
          {(["patient", "notes", "prescription"] as const).map((s, i) => (
            <button
              key={s}
              onClick={() => selectedPatient && setStep(s)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                step === s
                  ? "bg-white text-[#2C3A2B] shadow-sm"
                  : "text-[#9C9B97] hover:text-[#2C3A2B]"
              }`}
            >
              {i + 1}. {s === "patient" ? "Patient" : s === "notes" ? "Notes" : "Rx"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-5 gap-6">
        {/* LEFT COLUMN */}
        <div className="col-span-3 space-y-5">

          {/* ── STEP 1: PATIENT ── */}
          {step === "patient" && (
            <>
              {/* Patient Search */}
              <Card className="bg-white border-[#EDECE8]">
                <CardContent className="p-4">
                  {!selectedPatient ? (
                    <div className="relative">
                      <label className="text-xs font-medium uppercase tracking-wider text-[#9C9B97] mb-1.5 block">
                        Search Patient
                      </label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9C9B97]" />
                        <Input
                          placeholder="Name, phone, or ID..."
                          value={patientSearch}
                          onChange={(e) => setPatientSearch(e.target.value)}
                          className="pl-9 bg-[#EDECE8] border-0"
                          autoFocus
                        />
                      </div>
                      {searchResults && searchResults.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-[#EDECE8] rounded-md shadow-lg max-h-48 overflow-auto">
                          {searchResults.map((p) => (
                            <button
                              key={p.id}
                              onClick={() => {
                                setSelectedPatient({
                                  id: p.id, fullName: p.fullName,
                                  age: calcAge(p.dateOfBirth), patientId: p.patientId,
                                });
                                setPatientSearch("");
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-[rgba(126,143,124,0.04)] text-sm"
                            >
                              <div className="font-medium text-[#2C3A2B]">{p.fullName}</div>
                              <div className="text-xs text-[#9C9B97]">{p.patientId} · {calcAge(p.dateOfBirth)} yrs</div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between bg-[rgba(126,143,124,0.08)] p-3 rounded-md">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#7E8F7C] flex items-center justify-center">
                          <User className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <div className="text-sm font-medium">{selectedPatient.fullName}</div>
                          <div className="text-xs text-[#9C9B97]">{selectedPatient.patientId} · {selectedPatient.age} years</div>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => { setSelectedPatient(null); setStep("patient"); }} className="text-[#9C9B97]">
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {selectedPatient && (
                <>
                  {/* Medical Center */}
                  <div>
                    <label className="text-xs font-medium uppercase tracking-wider text-[#9C9B97] mb-1.5 block">
                      Medical Center
                    </label>
                    <select
                      value={selectedClinicId ?? ""}
                      onChange={(e) => setSelectedClinicId(e.target.value ? Number(e.target.value) : null)}
                      className="w-full h-10 px-3 rounded-md bg-[#EDECE8] border-0 text-sm text-[#2D2D2A] focus:outline-none focus:ring-2 focus:ring-[#7E8F7C]"
                    >
                      <option value="">Select medical center...</option>
                      {clinicList?.map((c) => (
                        <option key={c.id} value={c.id}>{c.clinicName}</option>
                      ))}
                    </select>
                  </div>

                  {/* Visit Type */}
                  <div>
                    <label className="text-xs font-medium uppercase tracking-wider text-[#9C9B97] mb-1.5 block">
                      Visit Type
                    </label>
                    <div className="flex gap-2">
                      {(["initial", "follow_up"] as const).map((t) => (
                        <button
                          key={t}
                          onClick={() => setVisitType(t)}
                          className={`flex-1 py-2.5 rounded-md text-sm font-medium transition-colors ${
                            visitType === t
                              ? "bg-[#7E8F7C] text-white"
                              : "bg-white border border-[#EDECE8] text-[#9C9B97] hover:text-[#2C3A2B]"
                          }`}
                        >
                          {t === "initial" ? "Initial Visit" : "Follow-Up"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Chief Complaint */}
                  <div>
                    <label className="text-xs font-medium uppercase tracking-wider text-[#9C9B97] mb-1.5 block">
                      Chief Complaint
                    </label>
                    <textarea
                      value={chiefComplaint}
                      onChange={(e) => setChiefComplaint(e.target.value)}
                      placeholder="Patient's main complaint today..."
                      rows={2}
                      className="w-full px-3 py-2 bg-[#EDECE8] rounded-md text-sm text-[#2D2D2A] placeholder:text-[#9C9B97] resize-none focus:outline-none focus:ring-2 focus:ring-[#7E8F7C]"
                    />
                  </div>

                  {/* Diagnosis */}
                  <div>
                    <label className="text-xs font-medium uppercase tracking-wider text-[#9C9B97] mb-1.5 block">
                      Diagnosis / Clinical Impression
                    </label>
                    <Input
                      value={diagnosisImpression}
                      onChange={(e) => setDiagnosisImpression(e.target.value)}
                      placeholder="e.g., F32.1 - Moderate Depressive Episode"
                      className="bg-[#EDECE8] border-0"
                    />
                  </div>

                  {/* Next Review */}
                  <div>
                    <label className="text-xs font-medium uppercase tracking-wider text-[#9C9B97] mb-1.5 block">
                      Next Review Date
                    </label>
                    <Input
                      type="date"
                      value={nextReviewDate}
                      onChange={(e) => setNextReviewDate(e.target.value)}
                      className="bg-[#EDECE8] border-0 w-48"
                    />
                  </div>

                  <Button onClick={() => setStep("notes")} className="w-full h-10 bg-[#7E8F7C] hover:bg-[#5A6B58] text-white">
                    <FileText className="w-4 h-4 mr-2" />
                    Continue to Clinical Notes
                  </Button>
                </>
              )}
            </>
          )}

          {/* ── STEP 2: CLINICAL NOTES ── */}
          {step === "notes" && (
            <>
              <Card className="bg-white border-[#EDECE8]">
                <CardHeader className="pb-2">
                  <CardTitle className="font-display text-lg flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-[#7E8F7C]" />
                    {visitType === "initial" ? "Clinical History" : "Follow-Up Progress Note"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Dictation Controls */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={recording ? stopRecording : startRecording}
                      className={`mic-button flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                        recording
                          ? "recording text-white"
                          : "bg-[#EDECE8] text-[#7E8F7C] hover:bg-[#7E8F7C] hover:text-white"
                      }`}
                    >
                      {recording ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                      {recording ? "Stop Recording" : "Start Dictation"}
                    </button>
                    {clinicalNote.length > 20 && (
                      <button
                        onClick={handleRefine}
                        disabled={refining}
                        className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#EDECE8] text-[#7E8F7C] hover:bg-[#7E8F7C] hover:text-white text-sm font-medium transition-colors disabled:opacity-50"
                      >
                        <Sparkles className="w-4 h-4" />
                        {refining ? "Refining..." : "AI Refine"}
                      </button>
                    )}
                  </div>
                  {recording && (
                    <div className="flex items-center gap-2 text-sm text-[#C97B7B]">
                      <span className="w-2 h-2 rounded-full bg-[#C97B7B] animate-pulse" />
                      Listening... speak now
                    </div>
                  )}

                  {/* Clinical Note Text Area */}
                  <textarea
                    value={clinicalNote}
                    onChange={(e) => setClinicalNote(e.target.value)}
                    placeholder={visitType === "initial"
                      ? "Dictate or type the full clinical history..."
                      : "Dictate progress since last visit..."
                    }
                    rows={10}
                    className="w-full px-3 py-2 bg-[#EDECE8] rounded-md text-sm text-[#2D2D2A] placeholder:text-[#9C9B97] resize-none focus:outline-none focus:ring-2 focus:ring-[#7E8F7C]"
                  />

                  {/* AI Refined Preview */}
                  {refinedText && (
                    <div className="p-3 bg-[rgba(126,143,124,0.08)] rounded-md border border-[#7E8F7C]">
                      <div className="text-xs font-medium text-[#7E8F7C] mb-1">AI Refined Version:</div>
                      <div className="text-sm text-[#2D2D2A] whitespace-pre-wrap">{refinedText}</div>
                      <div className="flex gap-2 mt-2">
                        <Button size="sm" className="h-7 bg-[#7E8F7C] hover:bg-[#5A6B58] text-white" onClick={acceptRefined}>
                          <Check className="w-3 h-3 mr-1" /> Accept
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-[#9C9B97]" onClick={discardRefined}>
                          <X className="w-3 h-3 mr-1" /> Discard
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Confirm Note Button */}
                  {noteStatus === "draft" && clinicalNote && (
                    <Button onClick={handleConfirmNote} variant="outline" className="w-full border-[#7E8F7C] text-[#3D4F3B]">
                      <Check className="w-4 h-4 mr-2" />
                      Confirm Clinical Note
                    </Button>
                  )}
                  {noteStatus === "confirmed" && (
                    <div className="flex items-center gap-2 text-sm text-[#3D4F3B] bg-[rgba(126,143,124,0.12)] p-2 rounded-md">
                      <Check className="w-4 h-4" />
                      Note confirmed. Ready for prescription.
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 h-10 border-[#EDECE8]" onClick={() => setStep("patient")}>Back</Button>
                <Button className="flex-[2] h-10 bg-[#7E8F7C] hover:bg-[#5A6B58] text-white" onClick={() => setStep("prescription")}>
                  <Stethoscope className="w-4 h-4 mr-2" />
                  Continue to Prescription
                </Button>
              </div>
            </>
          )}

          {/* ── STEP 3: PRESCRIPTION ── */}
          {step === "prescription" && (
            <>
              {/* Repeat Last Prescription (follow-up only) */}
              {visitType === "follow_up" && lastRx && rxItems.length === 0 && (
                <Button
                  variant="outline"
                  onClick={repeatLastPrescription}
                  className="w-full h-10 border-dashed border-2 border-[#7E8F7C] text-[#7E8F7C]"
                >
                  <Repeat className="w-4 h-4 mr-2" />
                  Repeat Last Prescription ({lastRx.items?.length ?? 0} items)
                </Button>
              )}

              {/* Prescription Items */}
              <div>
                <label className="text-xs font-medium uppercase tracking-wider text-[#9C9B97] mb-2 block">
                  Prescription Items ({rxItems.length})
                </label>

                {rxItems.map((rx, idx) => (
                  <Card key={idx} className="mb-3 bg-white border-[#EDECE8] card-hover">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <div className="font-medium text-[#2C3A2B]">{rx.medicationName}</div>
                          <div className="text-xs text-[#9C9B97]">{rx.genericName}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`status-pill ${
                            rx.itemStatus === "new" ? "status-waiting"
                            : rx.itemStatus === "continue" ? "status-active"
                            : rx.itemStatus === "changed" ? "status-urgent"
                            : "status-discontinued"
                          }`}>{rx.itemStatus}</span>
                          <Button variant="ghost" size="sm" onClick={() => removeRx(idx)} className="text-[#C97B7B] h-7 w-7 p-0">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Dosage, Frequency, Duration */}
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="text-[10px] text-[#9C9B97] uppercase">Dose</label>
                          {rx.availableDosages.length > 0 ? (
                            <select value={rx.dosage} onChange={(e) => updateRx(idx, { dosage: e.target.value })}
                              className="w-full h-8 px-2 rounded bg-[#EDECE8] border-0 text-sm">
                              {rx.availableDosages.map((d) => <option key={d} value={d}>{d}</option>)}
                            </select>
                          ) : (
                            <Input value={rx.dosage} onChange={(e) => updateRx(idx, { dosage: e.target.value })} className="h-8 bg-[#EDECE8] border-0" />
                          )}
                        </div>
                        <div>
                          <label className="text-[10px] text-[#9C9B97] uppercase">Frequency</label>
                          <select value={rx.frequency} onChange={(e) => updateRx(idx, { frequency: e.target.value })}
                            className="w-full h-8 px-2 rounded bg-[#EDECE8] border-0 text-sm">
                            {["OD", "BD", "TDS", "QID", "HS", "PRN", "Weekly"].map((f) => <option key={f} value={f}>{f}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] text-[#9C9B97] uppercase">Duration</label>
                          <select value={rx.duration} onChange={(e) => {
                            const d = Number(e.target.value);
                            updateRx(idx, { duration: d, quantity: d });
                          }} className="w-full h-8 px-2 rounded bg-[#EDECE8] border-0 text-sm">
                            {[7, 14, 30, 60, 90].map((d) => <option key={d} value={d}>{d} days</option>)}
                          </select>
                        </div>
                      </div>

                      {/* Instructions */}
                      <div className="mt-3">
                        <label className="text-[10px] text-[#9C9B97] uppercase">Instructions</label>
                        <Input value={rx.instructions} onChange={(e) => updateRx(idx, { instructions: e.target.value })}
                          placeholder="Special instructions..." className="h-8 bg-[#EDECE8] border-0 mt-0.5" />
                      </div>

                      {/* Item Status Change (for follow-up) */}
                      {visitType === "follow_up" && (
                        <div className="mt-2 flex gap-1">
                          {(["continue", "changed", "stopped"] as const).map((s) => (
                            <button key={s} onClick={() => updateRx(idx, { itemStatus: s })}
                              className={`px-2 py-0.5 rounded text-[10px] font-medium capitalize transition-colors ${
                                rx.itemStatus === s ? "bg-[#7E8F7C] text-white" : "bg-[#EDECE8] text-[#9C9B97] hover:text-[#2C3A2B]"
                              }`}>{s}</button>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}

                {/* Add Medication */}
                <div className="relative">
                  {!showMedSearch ? (
                    <Button variant="outline" onClick={() => setShowMedSearch(true)}
                      className="w-full h-10 border-dashed border-2 border-[#7E8F7C] text-[#7E8F7C] hover:bg-[rgba(126,143,124,0.08)]">
                      <Plus className="w-4 h-4 mr-1" /> Add Medication
                    </Button>
                  ) : (
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9C9B97]" />
                      <Input autoFocus placeholder="Search medication..." value={medSearch}
                        onChange={(e) => setMedSearch(e.target.value)} className="pl-9 bg-[#EDECE8] border-0"
                        onBlur={() => setTimeout(() => setShowMedSearch(false), 200)} />
                      {medResults && medResults.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-[#EDECE8] rounded-md shadow-lg max-h-48 overflow-auto">
                          {medResults.map((med) => (
                            <button key={med.id} onClick={() => addMedication(med.id)}
                              className="w-full text-left px-4 py-2 hover:bg-[rgba(126,143,124,0.04)]">
                              <div className="text-sm font-medium text-[#2C3A2B]">{med.brandName}</div>
                              <div className="text-xs text-[#9C9B97]">{med.genericName} · {med.drugClass ?? "other"}</div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button variant="outline" className="flex-1 h-11 border-[#EDECE8]" onClick={() => setStep("notes")}>Back</Button>
                <Button variant="outline" className="h-11 border-[#7E8F7C] text-[#3D4F3B]"
                  onClick={() => { setChiefComplaint(""); setDiagnosisImpression(""); setClinicalNote(""); setConfirmedNote(""); setRxItems([]); setStep("patient"); }}>
                  <RotateCcw className="w-4 h-4 mr-1" /> Reset
                </Button>
                <Button onClick={handleSaveAndPrint}
                  disabled={!selectedPatient || saving || rxItems.length === 0}
                  className="flex-[2] h-11 bg-[#3D4F3B] hover:bg-[#2C3A2B] text-white">
                  {saving ? "Saving..." : <><Save className="w-4 h-4 mr-1" /> Save & Print</>}
                </Button>
              </div>
            </>
          )}
        </div>

        {/* RIGHT COLUMN — Prescription Preview */}
        <div className="col-span-2">
          <div className="sticky top-8">
            <Card className="bg-white border-[#EDECE8] shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="font-display text-lg text-[#2C3A2B] flex items-center gap-2">
                  <Printer className="w-5 h-5 text-[#7E8F7C]" />
                  Prescription Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* derive selected clinic for preview */}
                {(() => {
                  const selectedClinic = clinicList?.find((c) => c.id === selectedClinicId) ?? clinicList?.[0] ?? null;
                  return (
                <div className="print-preview border border-[#EDECE8] rounded-lg p-6 bg-white">
                  {/* Clinic Header */}
                  <div className="text-center border-b border-[#EDECE8] pb-4 mb-4">
                    {selectedClinic?.logoUrl && (
                      <img src={selectedClinic.logoUrl} alt="Clinic logo" className="h-12 mx-auto mb-2 object-contain" />
                    )}
                    <h3 className="font-display text-lg text-[#2C3A2B]">{selectedClinic?.clinicName ?? "—"}</h3>
                    {selectedClinic?.clinicAddress && (
                      <p className="text-xs text-[#9C9B97]">{selectedClinic.clinicAddress}</p>
                    )}
                    {selectedClinic?.clinicPhone && (
                      <p className="text-xs text-[#9C9B97]">Tel: {selectedClinic.clinicPhone}</p>
                    )}
                    {selectedClinic?.doctorName && (
                      <p className="text-xs font-medium text-[#2C3A2B] mt-1">
                        {selectedClinic.doctorName}
                        {selectedClinic.doctorQualification ? `, ${selectedClinic.doctorQualification}` : ""}
                      </p>
                    )}
                  </div>
                  {/* Patient Info */}
                  <div className="flex justify-between text-sm mb-4">
                    <div><span className="text-[#9C9B97]">Date: </span><span className="text-[#2D2D2A]">{new Date().toLocaleDateString("en-GB")}</span></div>
                    <div><span className="text-[#9C9B97]">ID: </span><span className="font-mono-dose text-[#2D2D2A]">{selectedPatient?.patientId ?? "---"}</span></div>
                  </div>
                  <div className="mb-4">
                    <span className="text-[#9C9B97] text-sm">Patient: </span>
                    <span className="text-sm font-medium">{selectedPatient?.fullName ?? "---"}</span>
                    {selectedPatient && <span className="text-sm text-[#9C9B97]"> ({selectedPatient.age} yrs)</span>}
                  </div>
                  {/* Diagnosis */}
                  {diagnosisImpression && (
                    <div className="mb-4">
                      <span className="text-xs font-medium uppercase tracking-wider text-[#9C9B97]">Diagnosis</span>
                      <p className="text-sm text-[#2D2D2A] mt-1">{diagnosisImpression}</p>
                    </div>
                  )}
                  {/* Next Review */}
                  {nextReviewDate && (
                    <div className="mb-4">
                      <span className="text-xs font-medium uppercase tracking-wider text-[#9C9B97]">Next Review</span>
                      <p className="text-sm text-[#2D2D2A] mt-1">{new Date(nextReviewDate).toLocaleDateString("en-GB")}</p>
                    </div>
                  )}
                  {/* Medications */}
                  <div className="mb-4">
                    <span className="text-xs font-medium uppercase tracking-wider text-[#9C9B97]">Rx</span>
                    {rxItems.length > 0 ? (
                      <div className="space-y-3 mt-2">
                        {rxItems.map((rx, i) => (
                          <div key={i} className="pl-3 border-l-2 border-[#7E8F7C]">
                            <div className="text-sm font-medium">{i + 1}. {rx.medicationName}</div>
                            <div className="font-mono-dose text-sm">{rx.dosage} — {rx.frequency}</div>
                            <div className="text-xs text-[#9C9B97]">{rx.duration} days · {rx.quantity} tablets</div>
                            {rx.instructions && <div className="text-xs italic mt-0.5">{rx.instructions}</div>}
                            {rx.itemStatus !== "new" && (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                                rx.itemStatus === "continue" ? "bg-[rgba(126,143,124,0.12)] text-[#3D4F3B]"
                                : rx.itemStatus === "changed" ? "bg-[rgba(212,160,23,0.12)] text-[#8B6914]"
                                : "bg-[rgba(201,123,123,0.12)] text-[#8B4513]"
                              }`}>{rx.itemStatus}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : <p className="text-sm text-[#9C9B97] mt-1 italic">No medications added</p>}
                  </div>
                  {/* Footer */}
                  <div className="mt-8 pt-4 border-t border-[#EDECE8]">
                    <div className="flex justify-between items-end">
                      <div className="text-[10px] text-[#9C9B97]">Computer-generated prescription</div>
                      <div className="text-right"><div className="border-t border-[#2C3A2B] w-32 pt-1"><span className="text-xs">Signature</span></div></div>
                    </div>
                  </div>
                </div>
                  );
                })()}

                <Button onClick={() => window.print()} disabled={!selectedPatient || rxItems.length === 0}
                  className="w-full mt-4 h-10 bg-[#3D4F3B] hover:bg-[#2C3A2B] text-white">
                  <Printer className="w-4 h-4 mr-1" /> Print Prescription
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
