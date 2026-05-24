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
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/providers/trpc";

interface PrescriptionItem {
  medicationId: number;
  medicationName: string;
  genericName: string;
  dosage: string;
  frequency: string;
  duration: number;
  quantity: number;
  instructions: string;
  availableDosages: string[];
}

interface RecordingState {
  isRecording: boolean;
  targetField: string | null;
}

export default function NewConsultation() {
  const [patientSearch, setPatientSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<
    { id: number; fullName: string; age: number; patientId: string } | null
  >(null);
  const [presentingComplaint, setPresentingComplaint] = useState("");
  const [historyOfIllness, setHistoryOfIllness] = useState("");
  const [examinationFindings, setExaminationFindings] = useState("");
  const [diagnosisPrimary, setDiagnosisPrimary] = useState("");
  const [specialNotes, setSpecialNotes] = useState("");
  const [prescriptions, setPrescriptions] = useState<PrescriptionItem[]>([]);
  const [recording, setRecording] = useState<RecordingState>({
    isRecording: false,
    targetField: null,
  });
  const [refiningField, setRefiningField] = useState<string | null>(null);
  const [refinedText, setRefinedText] = useState<string | null>(null);
  const [medicationSearch, setMedicationSearch] = useState("");
  const [showMedSearch, setShowMedSearch] = useState(false);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const transcriptBufferRef = useRef("");

  const { data: searchResults } = trpc.patient.search.useQuery(
    { query: patientSearch },
    { enabled: patientSearch.length >= 2 }
  );

  const { data: medicationResults } = trpc.medication.list.useQuery(
    { search: medicationSearch },
    { enabled: medicationSearch.length >= 1 }
  );

  const refineMutation = trpc.speech.refineText.useMutation();
  const createConsultation = trpc.consultation.create.useMutation();
  const createPrescriptionHeader = trpc.prescription.create.useMutation();
  const addPrescriptionItem = trpc.prescription.addItem.useMutation();
  const confirmPrescription = trpc.prescription.confirm.useMutation();
  const utils = trpc.useUtils();

  const calculateAge = (dateOfBirth: string | Date | null) => {
    if (!dateOfBirth) return 30;
    const dob = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  };

  const startRecording = useCallback(
    (field: string) => {
      if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
        alert("Speech recognition is not supported in this browser.");
        return;
      }

      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert("Speech recognition is not supported in this browser.");
        return;
      }
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      transcriptBufferRef.current = "";

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          transcriptBufferRef.current += finalTranscript + " ";
        }
      };

      recognition.onerror = () => {
        setRecording({ isRecording: false, targetField: null });
      };

      recognition.onend = () => {
        const text = transcriptBufferRef.current.trim();
        if (text) {
          switch (field) {
            case "presentingComplaint":
              setPresentingComplaint((prev) =>
                prev ? prev + " " + text : text
              );
              break;
            case "historyOfIllness":
              setHistoryOfIllness((prev) =>
                prev ? prev + " " + text : text
              );
              break;
            case "examinationFindings":
              setExaminationFindings((prev) =>
                prev ? prev + " " + text : text
              );
              break;
            case "specialNotes":
              setSpecialNotes((prev) => (prev ? prev + " " + text : text));
              break;
          }
        }
        setRecording({ isRecording: false, targetField: null });
      };

      recognition.start();
      recognitionRef.current = recognition;
      setRecording({ isRecording: true, targetField: field });
    },
    []
  );

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  const handleRefine = async (text: string, field: string) => {
    if (!text.trim()) return;
    setRefiningField(field);
    try {
      const result = await refineMutation.mutateAsync({ text });
      setRefinedText(result.refinedText);
    } catch {
      setRefiningField(null);
    }
  };

  const acceptRefined = (field: string) => {
    if (!refinedText) return;
    switch (field) {
      case "presentingComplaint":
        setPresentingComplaint(refinedText);
        break;
      case "historyOfIllness":
        setHistoryOfIllness(refinedText);
        break;
      case "examinationFindings":
        setExaminationFindings(refinedText);
        break;
      case "specialNotes":
        setSpecialNotes(refinedText);
        break;
    }
    setRefinedText(null);
    setRefiningField(null);
  };

  const addMedication = async (medId: number) => {
    const med = medicationResults?.find((m) => m.id === medId);
    if (!med || !selectedPatient) return;

    const defaults = await utils.client.medication.getDefaultsForPatient.query({
      medicationId: medId,
      patientAge: selectedPatient.age,
    });

    const duration = defaults?.duration ?? med.defaultDuration ?? 30;
    const newRx: PrescriptionItem = {
      medicationId: med.id,
      medicationName: med.brandName,
      genericName: med.genericName,
      dosage: defaults?.dose ?? med.defaultDose ?? "",
      frequency: defaults?.frequency ?? med.defaultFrequency ?? "OD",
      duration,
      quantity: duration,
      instructions: defaults?.instructions ?? med.defaultInstructions ?? "",
      availableDosages: (med.availableStrengths ?? []) as string[],
    };

    setPrescriptions((prev) => [...prev, newRx]);
    setMedicationSearch("");
    setShowMedSearch(false);
  };

  const updatePrescription = (index: number, updates: Partial<PrescriptionItem>) => {
    setPrescriptions((prev) =>
      prev.map((p, i) => (i === index ? { ...p, ...updates } : p))
    );
  };

  const removePrescription = (index: number) => {
    setPrescriptions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveAndPrint = async () => {
    if (!selectedPatient) return;

    const consultation = await createConsultation.mutateAsync({
      patientId: selectedPatient.id,
      ageAtVisit: selectedPatient.age,
      chiefComplaint: presentingComplaint || undefined,
      diagnosisImpression: diagnosisPrimary || undefined,
      visitType: "initial",
    });

    const prescription = await createPrescriptionHeader.mutateAsync({
      patientId: selectedPatient.id,
      consultationId: consultation.id,
      ageAtPrescription: selectedPatient.age,
    });

    for (const rx of prescriptions) {
      await addPrescriptionItem.mutateAsync({
        prescriptionId: prescription.id,
        medicationId: rx.medicationId,
        medicineNameSnapshot: rx.medicationName,
        genericNameSnapshot: rx.genericName,
        strengthSnapshot: rx.dosage,
        dose: rx.dosage,
        frequency: rx.frequency,
        duration: rx.duration,
        quantity: rx.duration,
        instructions: rx.instructions || undefined,
        itemStatus: "new",
      });
    }

    await confirmPrescription.mutateAsync({ id: prescription.id });

    // Open print dialog
    window.print();

    // Reset form
    setSelectedPatient(null);
    setPresentingComplaint("");
    setHistoryOfIllness("");
    setExaminationFindings("");
    setDiagnosisPrimary("");
    setSpecialNotes("");
    setPrescriptions([]);
  };

  const SpeechButton = ({
    field,
    text,
  }: {
    field: string;
    text: string;
  }) => (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() =>
          recording.isRecording && recording.targetField === field
            ? stopRecording()
            : startRecording(field)
        }
        className={`mic-button flex items-center justify-center w-8 h-8 rounded-full ${
          recording.isRecording && recording.targetField === field
            ? "recording text-white"
            : "bg-[#EDECE8] text-[#7E8F7C] hover:bg-[#7E8F7C] hover:text-white"
        }`}
      >
        {recording.isRecording && recording.targetField === field ? (
          <Square className="w-3.5 h-3.5" />
        ) : (
          <Mic className="w-3.5 h-3.5" />
        )}
      </button>
      {text.length > 20 && refiningField !== field && (
        <button
          type="button"
          onClick={() => handleRefine(text, field)}
          className="flex items-center justify-center w-8 h-8 rounded-full bg-[#EDECE8] text-[#7E8F7C] hover:bg-[#7E8F7C] hover:text-white transition-colors"
          disabled={refineMutation.isPending}
        >
          <Sparkles className="w-3.5 h-3.5" />
        </button>
      )}
      {refiningField === field && (
        <span className="text-xs text-[#7E8F7C]">Refining...</span>
      )}
    </div>
  );

  const TextAreaField = ({
    label,
    value,
    onChange,
    fieldKey,
    placeholder,
    rows = 4,
  }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    fieldKey: string;
    placeholder: string;
    rows?: number;
  }) => (
    <div className="relative">
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-medium uppercase tracking-wider text-[#9C9B97]">
          {label}
        </label>
        <SpeechButton field={fieldKey} text={value} />
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full px-3 py-2 bg-[#EDECE8] rounded-md text-sm text-[#2D2D2A] placeholder:text-[#9C9B97] resize-none focus:outline-none focus:ring-2 focus:ring-[#7E8F7C]"
      />
      {refiningField === fieldKey && refinedText && (
        <div className="mt-2 p-3 bg-[rgba(126,143,124,0.08)] rounded-md border border-[#7E8F7C]">
          <div className="text-xs font-medium text-[#7E8F7C] mb-1">
            AI Refined Version:
          </div>
          <div className="text-sm text-[#2D2D2A] whitespace-pre-wrap">
            {refinedText}
          </div>
          <div className="flex gap-2 mt-2">
            <Button
              size="sm"
              className="h-7 bg-[#7E8F7C] hover:bg-[#5A6B58] text-white"
              onClick={() => acceptRefined(fieldKey)}
            >
              <Check className="w-3 h-3 mr-1" />
              Accept
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-[#9C9B97]"
              onClick={() => {
                setRefinedText(null);
                setRefiningField(null);
              }}
            >
              <X className="w-3 h-3 mr-1" />
              Discard
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <h1 className="font-display text-[28px] font-normal text-[#2C3A2B]">
        New Consultation
      </h1>

      <div className="grid grid-cols-5 gap-6">
        {/* Left Column - Clinical Input */}
        <div className="col-span-3 space-y-5">
          {/* Patient Selection */}
          <Card className="bg-white border-[#EDECE8]">
            <CardContent className="p-4">
              {!selectedPatient ? (
                <div className="relative">
                  <label className="text-xs font-medium uppercase tracking-wider text-[#9C9B97] mb-1.5 block">
                    Select Patient
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9C9B97]" />
                    <Input
                      placeholder="Search patient name or ID..."
                      value={patientSearch}
                      onChange={(e) => setPatientSearch(e.target.value)}
                      className="pl-9 bg-[#EDECE8] border-0"
                    />
                  </div>
                  {searchResults && searchResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-[#EDECE8] rounded-md shadow-lg max-h-48 overflow-auto">
                      {searchResults.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => {
                            const age = calculateAge(p.dateOfBirth);
                            setSelectedPatient({
                              id: p.id,
                              fullName: p.fullName,
                              age,
                              patientId: p.patientId,
                            });
                            setPatientSearch("");
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-[rgba(126,143,124,0.04)] text-sm"
                        >
                          <div className="font-medium text-[#2C3A2B]">
                            {p.fullName}
                          </div>
                          <div className="text-xs text-[#9C9B97]">
                            {p.patientId} ·{" "}
                            {p.dateOfBirth
                              ? `${calculateAge(p.dateOfBirth)} yrs`
                              : ""}
                          </div>
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
                      <div className="text-sm font-medium text-[#2C3A2B]">
                        {selectedPatient.fullName}
                      </div>
                      <div className="text-xs text-[#9C9B97]">
                        {selectedPatient.patientId} · {selectedPatient.age}{" "}
                        years
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedPatient(null)}
                    className="text-[#9C9B97]"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Clinical Fields */}
          <div className="space-y-4">
            <TextAreaField
              label="Presenting Complaint"
              value={presentingComplaint}
              onChange={setPresentingComplaint}
              fieldKey="presentingComplaint"
              placeholder="Patient's main complaint today..."
              rows={3}
            />

            <TextAreaField
              label="History of Presenting Illness"
              value={historyOfIllness}
              onChange={setHistoryOfIllness}
              fieldKey="historyOfIllness"
              placeholder="Detailed clinical history..."
              rows={6}
            />

            <TextAreaField
              label="Examination Findings"
              value={examinationFindings}
              onChange={setExaminationFindings}
              fieldKey="examinationFindings"
              placeholder="Mental state examination findings..."
              rows={4}
            />

            {/* Diagnosis */}
            <div>
              <label className="text-xs font-medium uppercase tracking-wider text-[#9C9B97] mb-1.5 block">
                Primary Diagnosis
              </label>
              <Input
                value={diagnosisPrimary}
                onChange={(e) => setDiagnosisPrimary(e.target.value)}
                placeholder="e.g., F32.1 - Moderate Depressive Episode"
                className="bg-[#EDECE8] border-0"
              />
            </div>

            {/* Medications */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium uppercase tracking-wider text-[#9C9B97]">
                  Prescription
                </label>
              </div>

              {prescriptions.map((rx, index) => (
                <Card
                  key={index}
                  className="mb-3 bg-white border-[#EDECE8] card-hover"
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="font-medium text-[#2C3A2B]">
                          {rx.medicationName}
                        </div>
                        <div className="text-xs text-[#9C9B97]">
                          {rx.genericName}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removePrescription(index)}
                        className="text-[#C97B7B] hover:text-[#8B4513] h-7 w-7 p-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-[10px] text-[#9C9B97] uppercase">
                          Dosage
                        </label>
                        {rx.availableDosages.length > 0 ? (
                          <select
                            value={rx.dosage}
                            onChange={(e) =>
                              updatePrescription(index, {
                                dosage: e.target.value,
                              })
                            }
                            className="w-full h-8 px-2 rounded bg-[#EDECE8] border-0 text-sm"
                          >
                            {rx.availableDosages.map((d) => (
                              <option key={d} value={d}>
                                {d}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <Input
                            value={rx.dosage}
                            onChange={(e) =>
                              updatePrescription(index, {
                                dosage: e.target.value,
                              })
                            }
                            className="h-8 bg-[#EDECE8] border-0"
                          />
                        )}
                      </div>
                      <div>
                        <label className="text-[10px] text-[#9C9B97] uppercase">
                          Frequency
                        </label>
                        <select
                          value={rx.frequency}
                          onChange={(e) =>
                            updatePrescription(index, {
                              frequency: e.target.value,
                            })
                          }
                          className="w-full h-8 px-2 rounded bg-[#EDECE8] border-0 text-sm"
                        >
                          <option>OD</option>
                          <option>BD</option>
                          <option>TDS</option>
                          <option>QID</option>
                          <option>HS</option>
                          <option>PRN</option>
                          <option>Weekly</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] text-[#9C9B97] uppercase">
                          Duration (days)
                        </label>
                        <select
                          value={rx.duration}
                          onChange={(e) =>
                            updatePrescription(index, {
                              duration: Number(e.target.value),
                            })
                          }
                          className="w-full h-8 px-2 rounded bg-[#EDECE8] border-0 text-sm"
                        >
                          <option value={7}>7 days</option>
                          <option value={14}>14 days</option>
                          <option value={30}>30 days</option>
                          <option value={60}>60 days</option>
                          <option value={90}>90 days</option>
                        </select>
                      </div>
                    </div>

                    <div className="mt-3">
                      <label className="text-[10px] text-[#9C9B97] uppercase">
                        Instructions
                      </label>
                      <Input
                        value={rx.instructions}
                        onChange={(e) =>
                          updatePrescription(index, {
                            instructions: e.target.value,
                          })
                        }
                        placeholder="Special instructions..."
                        className="h-8 bg-[#EDECE8] border-0 mt-0.5"
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Add Medication */}
              <div className="relative">
                {!showMedSearch ? (
                  <Button
                    variant="outline"
                    onClick={() => setShowMedSearch(true)}
                    className="w-full h-10 border-dashed border-2 border-[#7E8F7C] text-[#7E8F7C] hover:bg-[rgba(126,143,124,0.08)]"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Medication
                  </Button>
                ) : (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9C9B97]" />
                    <Input
                      autoFocus
                      placeholder="Search medication..."
                      value={medicationSearch}
                      onChange={(e) => setMedicationSearch(e.target.value)}
                      className="pl-9 bg-[#EDECE8] border-0"
                      onBlur={() =>
                        setTimeout(() => setShowMedSearch(false), 200)
                      }
                    />
                    {medicationResults && medicationResults.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-[#EDECE8] rounded-md shadow-lg max-h-48 overflow-auto">
                        {medicationResults.map((med) => (
                          <button
                            key={med.id}
                            onClick={() => addMedication(med.id)}
                            className="w-full text-left px-4 py-2 hover:bg-[rgba(126,143,124,0.04)]"
                          >
                            <div className="text-sm font-medium text-[#2C3A2B]">
                              {med.brandName}
                            </div>
                            <div className="text-xs text-[#9C9B97]">
                              {med.genericName} · {med.drugClass ?? "other"}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Special Notes */}
            <TextAreaField
              label="Special Notes for Patient"
              value={specialNotes}
              onChange={setSpecialNotes}
              fieldKey="specialNotes"
              placeholder="Instructions to patient (e.g., Return in 2 weeks for review)..."
              rows={3}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              className="flex-1 h-11 border-[#7E8F7C] text-[#3D4F3B] hover:bg-[rgba(126,143,124,0.08)]"
              onClick={() => {
                setPresentingComplaint("");
                setHistoryOfIllness("");
                setExaminationFindings("");
                setDiagnosisPrimary("");
                setSpecialNotes("");
                setPrescriptions([]);
              }}
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              Reset
            </Button>
            <Button
              onClick={handleSaveAndPrint}
              disabled={
                !selectedPatient ||
                createConsultation.isPending ||
                createPrescriptionHeader.isPending
              }
              className="flex-[2] h-11 bg-[#3D4F3B] hover:bg-[#2C3A2B] text-white"
            >
              {createConsultation.isPending ? (
                "Saving..."
              ) : (
                <>
                  <Save className="w-4 h-4 mr-1" />
                  Save & Print Prescription
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Right Column - Prescription Preview */}
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
                <div className="print-preview border border-[#EDECE8] rounded-lg p-6 bg-white">
                  {/* Header */}
                  <div className="text-center border-b border-[#EDECE8] pb-4 mb-4">
                    <h3 className="font-display text-lg text-[#2C3A2B]">
                      MindCare Clinic
                    </h3>
                    <p className="text-xs text-[#9C9B97]">
                      123 Galle Road, Colombo 03, Sri Lanka
                    </p>
                    <p className="text-xs text-[#9C9B97]">
                      Tel: +94 11 234 5678
                    </p>
                  </div>

                  {/* Date & Patient */}
                  <div className="flex justify-between text-sm mb-4">
                    <div>
                      <span className="text-[#9C9B97]">Date: </span>
                      <span className="text-[#2D2D2A]">
                        {new Date().toLocaleDateString("en-GB")}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#9C9B97]">ID: </span>
                      <span className="font-mono-dose text-[#2D2D2A]">
                        {selectedPatient?.patientId ?? "---"}
                      </span>
                    </div>
                  </div>

                  <div className="mb-4">
                    <span className="text-[#9C9B97] text-sm">Patient: </span>
                    <span className="text-sm font-medium text-[#2C3A2B]">
                      {selectedPatient?.fullName ?? "---"}
                    </span>
                    {selectedPatient && (
                      <span className="text-sm text-[#9C9B97]">
                        {" "}
                        ({selectedPatient.age} years)
                      </span>
                    )}
                  </div>

                  {/* Diagnosis */}
                  {diagnosisPrimary && (
                    <div className="mb-4">
                      <span className="text-xs font-medium uppercase tracking-wider text-[#9C9B97]">
                        Diagnosis
                      </span>
                      <p className="text-sm text-[#2D2D2A] mt-1">
                        {diagnosisPrimary}
                      </p>
                    </div>
                  )}

                  {/* Rx */}
                  <div className="mb-4">
                    <span className="text-xs font-medium uppercase tracking-wider text-[#9C9B97]">
                      Rx
                    </span>
                    {prescriptions.length > 0 ? (
                      <div className="space-y-3 mt-2">
                        {prescriptions.map((rx, i) => (
                          <div
                            key={i}
                            className="pl-3 border-l-2 border-[#7E8F7C]"
                          >
                            <div className="text-sm font-medium text-[#2C3A2B]">
                              {i + 1}. {rx.medicationName}
                            </div>
                            <div className="font-mono-dose text-sm text-[#2D2D2A]">
                              {rx.dosage} — {rx.frequency}
                            </div>
                            <div className="text-xs text-[#9C9B97]">
                              {rx.duration} days · {rx.quantity} tablets
                            </div>
                            {rx.instructions && (
                              <div className="text-xs italic text-[#2D2D2A] mt-0.5">
                                {rx.instructions}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-[#9C9B97] mt-1 italic">
                        No medications added yet
                      </p>
                    )}
                  </div>

                  {/* Special Notes */}
                  {specialNotes && (
                    <div className="mb-4 pt-3 border-t border-[#EDECE8]">
                      <span className="text-xs font-medium uppercase tracking-wider text-[#9C9B97]">
                        Notes
                      </span>
                      <p className="text-sm text-[#2D2D2A] mt-1 italic">
                        {specialNotes}
                      </p>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="mt-8 pt-4 border-t border-[#EDECE8]">
                    <div className="flex justify-between items-end">
                      <div className="text-[10px] text-[#9C9B97]">
                        This is a computer-generated prescription
                      </div>
                      <div className="text-right">
                        <div className="border-t border-[#2C3A2B] w-32 pt-1">
                          <span className="text-xs text-[#2D2D2A]">
                            Signature
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={() => window.print()}
                  disabled={!selectedPatient}
                  className="w-full mt-4 h-10 bg-[#3D4F3B] hover:bg-[#2C3A2B] text-white"
                >
                  <Printer className="w-4 h-4 mr-1" />
                  Print Prescription
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
