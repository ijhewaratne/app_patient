import { useState } from "react";
import { useSearchParams } from "react-router";
import {
  Search, Plus, User, Phone, MapPin, Calendar, ChevronLeft,
  FileText, Pill, Stethoscope, AlertTriangle, ClipboardList,
  HeartPulse, ShieldAlert, BookOpen, Clock, Activity,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { trpc } from "@/providers/trpc";
import { format } from "date-fns";

interface PatientDetailData {
  id: number;
  patientId: string;
  fullName: string | null;
  dateOfBirth: string | Date | null;
  gender: "male" | "female" | "other" | null;
  phone: string | null;
  address: string | null;
  guardianName: string | null;
  guardianPhone: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  allergies: string | null;
  medicalConditions: string | null;
  status: "active" | "discharged" | "new" | null;
  age: number;
  consultations: Array<{
    id: number;
    visitDate: string | Date | null;
    visitType: "initial" | "follow_up" | null;
    chiefComplaint: string | null;
    diagnosisImpression: string | null;
    status: "draft" | "confirmed" | null;
  }>;
  clinicalNotes: Array<{
    id: number;
    noteType: "initial_history" | "follow_up_progress" | null;
    finalConfirmedNote: string | null;
    status: "draft" | "confirmed" | null;
    createdAt: string | Date | null;
  }>;
  prescriptions: Array<{
    id: number;
    prescriptionNumber: string | null;
    prescriptionDate: string | Date | null;
    status: "draft" | "confirmed" | "printed" | null;
    items: Array<{
      id: number;
      medicineNameSnapshot: string;
      genericNameSnapshot: string | null;
      dose: string;
      frequency: string;
      duration: number | null;
      itemStatus: "new" | "continue" | "changed" | "stopped" | null;
      instructions: string | null;
    }>;
  }>;
  summary: {
    activeDiagnosis: string | null;
    keyHistorySummary: string | null;
    currentClinicalStatus: string | null;
    activeRiskFlags: string | null;
    currentMedicationSummary: string | null;
    latestPlan: string | null;
    doctorConfirmed: boolean | null;
  } | null;
}

export default function Patients() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedPatientId = searchParams.get("id");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const { data: patientList, refetch } = trpc.patient.list.useQuery({
    search: search || undefined, status: statusFilter, page: 1, limit: 20,
  });

  const { data: selectedPatientRaw } = trpc.patient.getById.useQuery(
    { id: Number(selectedPatientId) }, { enabled: !!selectedPatientId }
  );

  const selectedPatient = selectedPatientRaw as unknown as PatientDetailData | null;
  const createPatient = trpc.patient.create.useMutation({ onSuccess: () => { setIsAddDialogOpen(false); refetch(); } });

  const handleAddPatient = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createPatient.mutate({
      fullName: formData.get("fullName") as string,
      dateOfBirth: (formData.get("dateOfBirth") as string) || undefined,
      gender: (formData.get("gender") as "male" | "female" | "other") || undefined,
      phone: (formData.get("phone") as string) || undefined,
      address: (formData.get("address") as string) || undefined,
      guardianName: (formData.get("guardianName") as string) || undefined,
      guardianPhone: (formData.get("guardianPhone") as string) || undefined,
      emergencyContactName: (formData.get("emergencyContactName") as string) || undefined,
      emergencyContactPhone: (formData.get("emergencyContactPhone") as string) || undefined,
      allergies: (formData.get("allergies") as string) || undefined,
      medicalConditions: (formData.get("medicalConditions") as string) || undefined,
    });
  };

  const tabs = [
    { key: "all", label: `All (${patientList?.total ?? 0})` },
    { key: "active", label: "Active" },
    { key: "new", label: "New" },
    { key: "discharged", label: "Discharged" },
  ];

  if (selectedPatientId && selectedPatient) {
    return <PatientDetail patient={selectedPatient} onBack={() => setSearchParams({})} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-[28px] font-normal text-[#2C3A2B]">Patients</h1>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="h-9 bg-[#3D4F3B] hover:bg-[#2C3A2B] text-white"><Plus className="w-4 h-4 mr-1" /> Add Patient</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-auto">
            <DialogHeader><DialogTitle className="font-display text-xl">Add New Patient</DialogTitle></DialogHeader>
            <form onSubmit={handleAddPatient} className="space-y-3 mt-2">
              <div><Label>Full Name *</Label><Input name="fullName" required className="mt-1 bg-[#EDECE8] border-0" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Date of Birth</Label><Input name="dateOfBirth" type="date" className="mt-1 bg-[#EDECE8] border-0" /></div>
                <div><Label>Gender</Label><select name="gender" className="mt-1 w-full h-10 px-3 rounded-md bg-[#EDECE8] border-0 text-sm"><option value="">Select</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></select></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Phone</Label><Input name="phone" className="mt-1 bg-[#EDECE8] border-0" /></div>
                <div><Label>Guardian Name</Label><Input name="guardianName" className="mt-1 bg-[#EDECE8] border-0" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Guardian Phone</Label><Input name="guardianPhone" className="mt-1 bg-[#EDECE8] border-0" /></div>
                <div><Label>Emergency Contact</Label><Input name="emergencyContactName" className="mt-1 bg-[#EDECE8] border-0" /></div>
              </div>
              <div><Label>Emergency Phone</Label><Input name="emergencyContactPhone" className="mt-1 bg-[#EDECE8] border-0" /></div>
              <div><Label>Address</Label><Input name="address" className="mt-1 bg-[#EDECE8] border-0" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Allergies</Label><Input name="allergies" className="mt-1 bg-[#EDECE8] border-0" placeholder="None known" /></div>
                <div><Label>Medical Conditions</Label><Input name="medicalConditions" className="mt-1 bg-[#EDECE8] border-0" placeholder="None" /></div>
              </div>
              <Button type="submit" className="w-full bg-[#7E8F7C] hover:bg-[#5A6B58] text-white" disabled={createPatient.isPending}>
                {createPatient.isPending ? "Adding..." : "Add Patient"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9C9B97]" />
          <Input placeholder="Search by name, phone, or ID..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-11 bg-[#EDECE8] border-0" />
        </div>
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button key={tab.key} onClick={() => setStatusFilter(tab.key)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${statusFilter === tab.key ? "text-[#2C3A2B] bg-[rgba(126,143,124,0.08)] border-b-2 border-[#7E8F7C]" : "text-[#9C9B97] hover:text-[#2C3A2B]"}`}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <Card className="bg-white border-[#EDECE8]">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-[#EDECE8]">
                <th className="text-left px-4 py-3 text-xs font-medium text-[#9C9B97] uppercase tracking-wider">ID</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#9C9B97] uppercase tracking-wider">Name</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#9C9B97] uppercase tracking-wider">Age / Gender</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#9C9B97] uppercase tracking-wider">Phone</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#9C9B97] uppercase tracking-wider">Status</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-[#9C9B97] uppercase tracking-wider">Actions</th>
              </tr></thead>
              <tbody>
                {patientList?.patients.map((p) => (
                  <tr key={p.id} className="border-b border-[#EDECE8] hover:bg-[rgba(126,143,124,0.04)] transition-colors cursor-pointer"
                    onClick={() => setSearchParams({ id: String(p.id) })}>
                    <td className="px-4 py-3 text-sm font-mono-dose text-[#9C9B97]">{p.patientId}</td>
                    <td className="px-4 py-3"><div className="text-sm font-medium text-[#2C3A2B]">{p.fullName}</div></td>
                    <td className="px-4 py-3 text-sm text-[#2D2D2A]">{p.age > 0 ? `${p.age} yrs` : "N/A"} / {p.gender ? p.gender.charAt(0).toUpperCase() + p.gender.slice(1) : "N/A"}</td>
                    <td className="px-4 py-3 text-sm text-[#9C9B97]">{p.phone ?? "N/A"}</td>
                    <td className="px-4 py-3"><span className={`status-pill ${p.status === "active" ? "status-active" : p.status === "new" ? "status-waiting" : "status-discontinued"}`}>{p.status ?? "new"}</span></td>
                    <td className="px-4 py-3 text-right"><Button variant="ghost" size="sm" className="h-7 text-[#7E8F7C]" onClick={(e) => { e.stopPropagation(); setSearchParams({ id: String(p.id) }); }}>View</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {(!patientList || patientList.patients.length === 0) && (
            <div className="text-center py-12 text-[#9C9B97]"><User className="w-10 h-10 mx-auto mb-2 opacity-40" /><p>No patients found</p></div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Patient Detail ─────────────────────────────────────
function PatientDetail({ patient, onBack }: { patient: PatientDetailData; onBack: () => void }) {
  const dob = patient.dateOfBirth ? format(new Date(patient.dateOfBirth), "dd MMM yyyy") : "N/A";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-[#9C9B97] hover:text-[#2C3A2B]">
          <ChevronLeft className="w-4 h-4 mr-1" /> Back
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* LEFT: Patient Info */}
        <div className="space-y-4">
          {/* Identity Card */}
          <Card className="bg-white border-[#EDECE8]">
            <CardContent className="p-6 text-center">
              <div className="w-20 h-20 mx-auto rounded-full bg-[#EDECE8] flex items-center justify-center">
                <User className="w-8 h-8 text-[#9C9B97]" />
              </div>
              <h2 className="font-display text-xl text-[#2C3A2B] mt-3">{patient.fullName ?? "Unknown"}</h2>
              <p className="text-sm text-[#9C9B97] mt-1">{patient.age > 0 ? `${patient.age} years` : ""} {patient.gender ? `· ${patient.gender}` : ""}</p>
              <p className="text-xs font-mono-dose text-[#7E8F7C] mt-1">{patient.patientId}</p>
            </CardContent>
          </Card>

          {/* Contact Card */}
          <Card className="bg-white border-[#EDECE8]">
            <CardContent className="p-4 space-y-3">
              <h3 className="text-xs font-medium uppercase tracking-wider text-[#9C9B97]">Contact</h3>
              {patient.phone && <div className="flex items-center gap-2 text-sm"><Phone className="w-4 h-4 text-[#7E8F7C]" /><span className="text-[#2D2D2A]">{patient.phone}</span></div>}
              {patient.address && <div className="flex items-center gap-2 text-sm"><MapPin className="w-4 h-4 text-[#7E8F7C]" /><span className="text-[#2D2D2A]">{patient.address}</span></div>}
              <div className="flex items-center gap-2 text-sm"><Calendar className="w-4 h-4 text-[#7E8F7C]" /><span className="text-[#2D2D2A]">DOB: {dob}</span></div>
              {patient.guardianName && <div className="flex items-center gap-2 text-sm pt-2 border-t border-[#EDECE8]"><HeartPulse className="w-4 h-4 text-[#7E8F7C]" /><span className="text-[#2D2D2A]">Guardian: {patient.guardianName} {patient.guardianPhone ? `· ${patient.guardianPhone}` : ""}</span></div>}
              {patient.emergencyContactName && <div className="flex items-center gap-2 text-sm"><AlertTriangle className="w-4 h-4 text-[#D4A017]" /><span className="text-[#2D2D2A]">Emergency: {patient.emergencyContactName} {patient.emergencyContactPhone ? `· ${patient.emergencyContactPhone}` : ""}</span></div>}
            </CardContent>
          </Card>

          {/* Alerts Card */}
          {(patient.allergies || patient.medicalConditions) && (
            <Card className="bg-white border-[#C97B7B]">
              <CardContent className="p-4 space-y-2">
                <h3 className="text-xs font-medium uppercase tracking-wider text-[#C97B7B] flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5" /> Alerts
                </h3>
                {patient.allergies && <div className="text-sm text-[#C97B7B]"><span className="font-medium">Allergies:</span> {patient.allergies}</div>}
                {patient.medicalConditions && <div className="text-sm text-[#8B6914]"><span className="font-medium">Conditions:</span> {patient.medicalConditions}</div>}
              </CardContent>
            </Card>
          )}

          <Button className="w-full bg-[#7E8F7C] hover:bg-[#5A6B58] text-white">
            <Stethoscope className="w-4 h-4 mr-2" /> New Consultation
          </Button>
        </div>

        {/* RIGHT: Clinical Data */}
        <div className="col-span-2">
          <Tabs defaultValue="snapshot" className="w-full">
            <TabsList className="bg-[#EDECE8] mb-4">
              <TabsTrigger value="snapshot" className="data-[state=active]:bg-white"><Activity className="w-4 h-4 mr-1" /> Snapshot</TabsTrigger>
              <TabsTrigger value="history" className="data-[state=active]:bg-white"><FileText className="w-4 h-4 mr-1" /> Visits</TabsTrigger>
              <TabsTrigger value="notes" className="data-[state=active]:bg-white"><ClipboardList className="w-4 h-4 mr-1" /> Notes</TabsTrigger>
              <TabsTrigger value="medications" className="data-[state=active]:bg-white"><Pill className="w-4 h-4 mr-1" /> Medications</TabsTrigger>
            </TabsList>

            {/* ── Clinical Snapshot ── */}
            <TabsContent value="snapshot">
              {patient.summary ? (
                <div className="space-y-3">
                  {patient.summary.activeDiagnosis && (
                    <Card className="bg-white border-[#EDECE8]">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-[#9C9B97] mb-1">
                          <Stethoscope className="w-3.5 h-3.5" /> Active Diagnosis
                        </div>
                        <p className="text-sm text-[#2D2D2A]">{patient.summary.activeDiagnosis}</p>
                      </CardContent>
                    </Card>
                  )}
                  {patient.summary.currentClinicalStatus && (
                    <Card className="bg-white border-[#EDECE8]">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-[#9C9B97] mb-1">
                          <Activity className="w-3.5 h-3.5" /> Current Status
                        </div>
                        <p className="text-sm text-[#2D2D2A]">{patient.summary.currentClinicalStatus}</p>
                      </CardContent>
                    </Card>
                  )}
                  {patient.summary.activeRiskFlags && (
                    <Card className="bg-white border-[#D4A017]">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-[#8B6914] mb-1">
                          <AlertTriangle className="w-3.5 h-3.5" /> Risk Flags
                        </div>
                        <p className="text-sm text-[#8B6914]">{patient.summary.activeRiskFlags}</p>
                      </CardContent>
                    </Card>
                  )}
                  {patient.summary.currentMedicationSummary && (
                    <Card className="bg-white border-[#EDECE8]">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-[#9C9B97] mb-1">
                          <Pill className="w-3.5 h-3.5" /> Current Medications
                        </div>
                        <p className="text-sm text-[#2D2D2A]">{patient.summary.currentMedicationSummary}</p>
                      </CardContent>
                    </Card>
                  )}
                  {patient.summary.latestPlan && (
                    <Card className="bg-white border-[#EDECE8]">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-[#9C9B97] mb-1">
                          <BookOpen className="w-3.5 h-3.5" /> Latest Plan
                        </div>
                        <p className="text-sm text-[#2D2D2A]">{patient.summary.latestPlan}</p>
                      </CardContent>
                    </Card>
                  )}
                  {patient.summary.keyHistorySummary && (
                    <Card className="bg-[#F9F9F7] border-[#EDECE8]">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-[#9C9B97] mb-1">
                          <Clock className="w-3.5 h-3.5" /> Key History
                        </div>
                        <p className="text-sm text-[#2D2D2A]">{patient.summary.keyHistorySummary}</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-[#9C9B97]">
                  <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p>No clinical snapshot available yet.</p>
                  <p className="text-xs mt-1">Complete a consultation to generate one.</p>
                </div>
              )}
            </TabsContent>

            {/* ── Visit History ── */}
            <TabsContent value="history">
              <Card className="bg-white border-[#EDECE8]">
                <CardContent className="p-6">
                  {patient.consultations.length > 0 ? (
                    <div className="space-y-4">
                      {patient.consultations.map((c) => (
                        <div key={c.id} className="border-l-2 border-[#EDECE8] pl-4 pb-4">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-[#9C9B97] uppercase">
                              {c.visitDate ? format(new Date(c.visitDate), "dd MMM yyyy") : "N/A"}
                            </span>
                            <span className={`status-pill text-[10px] ${c.visitType === "initial" ? "status-waiting" : "status-active"}`}>
                              {c.visitType ?? "visit"}
                            </span>
                            <span className={`status-pill text-[10px] ${c.status === "confirmed" ? "status-completed" : "status-waiting"}`}>
                              {c.status ?? "draft"}
                            </span>
                          </div>
                          <div className="text-sm text-[#2D2D2A] mt-1">{c.chiefComplaint ?? "No chief complaint recorded"}</div>
                          {c.diagnosisImpression && <div className="text-xs text-[#7E8F7C] mt-1">{c.diagnosisImpression}</div>}
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-sm text-[#9C9B97] text-center py-8">No visit history</p>}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Clinical Notes ── */}
            <TabsContent value="notes">
              <Card className="bg-white border-[#EDECE8]">
                <CardContent className="p-6">
                  {patient.clinicalNotes.length > 0 ? (
                    <div className="space-y-4">
                      {patient.clinicalNotes.map((n) => (
                        <div key={n.id} className="border-l-2 border-[#7E8F7C] pl-4 pb-4">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-[#9C9B97] uppercase">
                              {n.noteType === "initial_history" ? "Initial History" : "Follow-Up Note"}
                            </span>
                            <span className={`status-pill text-[10px] ${n.status === "confirmed" ? "status-completed" : "status-waiting"}`}>
                              {n.status ?? "draft"}
                            </span>
                          </div>
                          {n.finalConfirmedNote ? (
                            <p className="text-sm text-[#2D2D2A] whitespace-pre-wrap">{n.finalConfirmedNote}</p>
                          ) : (
                            <p className="text-sm text-[#9C9B97] italic">Note not yet confirmed</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-sm text-[#9C9B97] text-center py-8">No clinical notes</p>}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Medications ── */}
            <TabsContent value="medications">
              <Card className="bg-white border-[#EDECE8]">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead><tr className="border-b border-[#EDECE8]">
                        <th className="text-left px-4 py-3 text-xs font-medium text-[#9C9B97] uppercase">Medication</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-[#9C9B97] uppercase">Dose</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-[#9C9B97] uppercase">Status</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-[#9C9B97] uppercase">Date</th>
                      </tr></thead>
                      <tbody>
                        {patient.prescriptions.flatMap((rx) => rx.items.map((item) => (
                          <tr key={`${rx.id}-${item.id}`} className="border-b border-[#EDECE8]">
                            <td className="px-4 py-3">
                              <div className="text-sm font-medium text-[#2C3A2B]">{item.medicineNameSnapshot}</div>
                              <div className="text-xs text-[#9C9B97]">{item.genericNameSnapshot}</div>
                            </td>
                            <td className="px-4 py-3 text-sm font-mono-dose text-[#2D2D2A]">{item.dose} · {item.frequency} · {item.duration} days</td>
                            <td className="px-4 py-3">
                              <span className={`status-pill ${
                                item.itemStatus === "new" ? "status-waiting"
                                : item.itemStatus === "continue" ? "status-active"
                                : item.itemStatus === "changed" ? "status-urgent"
                                : "status-discontinued"
                              }`}>{item.itemStatus ?? "new"}</span>
                            </td>
                            <td className="px-4 py-3 text-xs text-[#9C9B97]">
                              {rx.prescriptionDate ? format(new Date(rx.prescriptionDate), "dd MMM yyyy") : "N/A"}
                            </td>
                          </tr>
                        )))}
                      </tbody>
                    </table>
                  </div>
                  {patient.prescriptions.flatMap((rx) => rx.items).length === 0 && (
                    <p className="text-sm text-[#9C9B97] text-center py-8">No medications prescribed</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
