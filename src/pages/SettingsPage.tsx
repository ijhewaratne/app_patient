import { useState, useEffect } from "react";
import {
  UserCog, Mic, Database, Save, RefreshCw,
  Plus, Trash2, Building2, ChevronRight, X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/providers/trpc";

type ClinicForm = {
  clinicName: string;
  clinicAddress: string;
  clinicPhone: string;
  doctorName: string;
  doctorQualification: string;
  doctorRegistrationNumber: string;
  prescriptionFooter: string;
  prescriptionPaperSize: "A4" | "A5";
  logoUrl: string;
};

const emptyForm: ClinicForm = {
  clinicName: "", clinicAddress: "", clinicPhone: "",
  doctorName: "", doctorQualification: "", doctorRegistrationNumber: "",
  prescriptionFooter: "", prescriptionPaperSize: "A4", logoUrl: "",
};

export default function SettingsPage() {
  const { data: clinicList, refetch } = trpc.clinic.list.useQuery();
  const createClinic = trpc.clinic.create.useMutation({ onSuccess: () => { refetch(); setMode("idle"); } });
  const updateClinic = trpc.clinic.update.useMutation({ onSuccess: () => refetch() });
  const deleteClinic = trpc.clinic.delete.useMutation({ onSuccess: () => { refetch(); setMode("idle"); setSelectedId(null); } });
  const seedMutation = trpc.seed.init.useMutation();

  const [mode, setMode] = useState<"idle" | "edit" | "add">("idle");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState<ClinicForm>(emptyForm);
  const [sttAutoCorrect, setSttAutoCorrect] = useState(true);
  const [sttAiRefine, setSttAiRefine] = useState(true);

  const selectedClinic = clinicList?.find((c) => c.id === selectedId);

  useEffect(() => {
    if (mode === "edit" && selectedClinic) {
      setForm({
        clinicName: selectedClinic.clinicName ?? "",
        clinicAddress: selectedClinic.clinicAddress ?? "",
        clinicPhone: selectedClinic.clinicPhone ?? "",
        doctorName: selectedClinic.doctorName ?? "",
        doctorQualification: selectedClinic.doctorQualification ?? "",
        doctorRegistrationNumber: selectedClinic.doctorRegistrationNumber ?? "",
        prescriptionFooter: selectedClinic.prescriptionFooter ?? "",
        prescriptionPaperSize: (selectedClinic.prescriptionPaperSize ?? "A4") as "A4" | "A5",
        logoUrl: selectedClinic.logoUrl ?? "",
      });
    } else if (mode === "add") {
      setForm(emptyForm);
    }
  }, [mode, selectedId, selectedClinic]);

  const set = (field: keyof ClinicForm, value: string) =>
    setForm((p) => ({ ...p, [field]: value }));

  const handleSave = () => {
    if (mode === "add") {
      createClinic.mutate({ ...form, logoUrl: form.logoUrl || undefined });
    } else if (mode === "edit" && selectedId != null) {
      updateClinic.mutate({ id: selectedId, ...form, logoUrl: form.logoUrl || undefined });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Delete this medical center? This cannot be undone.")) {
      deleteClinic.mutate({ id });
    }
  };

  const openEdit = (id: number) => { setSelectedId(id); setMode("edit"); };
  const openAdd = () => { setSelectedId(null); setMode("add"); };
  const cancel = () => { setMode("idle"); setSelectedId(null); };

  return (
    <div className="max-w-[700px] mx-auto space-y-6">
      <h1 className="font-display text-[28px] font-normal text-[#2C3A2B]">Settings</h1>

      {/* Medical Centers List */}
      <Card className="bg-white border-[#EDECE8]">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="font-display text-lg text-[#2C3A2B] flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#7E8F7C]" />
              Medical Centers
            </CardTitle>
            <Button size="sm" onClick={openAdd} className="h-8 bg-[#7E8F7C] hover:bg-[#5A6B58] text-white">
              <Plus className="w-4 h-4 mr-1" /> Add Center
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {!clinicList?.length && (
            <p className="text-sm text-[#9C9B97] italic">No medical centers configured yet.</p>
          )}
          {clinicList?.map((c) => (
            <div
              key={c.id}
              className={`flex items-center justify-between px-3 py-2.5 rounded-md border transition-colors cursor-pointer ${
                selectedId === c.id && mode === "edit"
                  ? "border-[#7E8F7C] bg-[rgba(126,143,124,0.06)]"
                  : "border-[#EDECE8] hover:border-[#7E8F7C]"
              }`}
              onClick={() => openEdit(c.id)}
            >
              <div className="flex items-center gap-3">
                {c.logoUrl && <img src={c.logoUrl} alt="logo" className="h-8 w-8 object-contain rounded" />}
                <div>
                  <div className="text-sm font-medium text-[#2C3A2B]">{c.clinicName}</div>
                  {c.clinicAddress && <div className="text-xs text-[#9C9B97]">{c.clinicAddress}</div>}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <ChevronRight className="w-4 h-4 text-[#9C9B97]" />
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }}
                  className="p-1 text-[#C97B7B] hover:text-[#8B3030] rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Add / Edit Clinic Form */}
      {(mode === "edit" || mode === "add") && (
        <Card className="bg-white border-[#7E8F7C]">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="font-display text-lg text-[#2C3A2B] flex items-center gap-2">
                <UserCog className="w-5 h-5 text-[#7E8F7C]" />
                {mode === "add" ? "New Medical Center" : `Edit: ${selectedClinic?.clinicName ?? ""}`}
              </CardTitle>
              <button onClick={cancel} className="text-[#9C9B97] hover:text-[#2C3A2B]">
                <X className="w-5 h-5" />
              </button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Clinic / Medical Center Name *</Label>
              <Input value={form.clinicName} onChange={(e) => set("clinicName", e.target.value)}
                className="mt-1 bg-[#EDECE8] border-0" placeholder="e.g., Asiri Medical Centre" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Clinic Address</Label>
                <Input value={form.clinicAddress} onChange={(e) => set("clinicAddress", e.target.value)}
                  className="mt-1 bg-[#EDECE8] border-0" />
              </div>
              <div>
                <Label>Clinic Phone</Label>
                <Input value={form.clinicPhone} onChange={(e) => set("clinicPhone", e.target.value)}
                  className="mt-1 bg-[#EDECE8] border-0" />
              </div>
            </div>
            <div>
              <Label>Logo URL</Label>
              <Input value={form.logoUrl} onChange={(e) => set("logoUrl", e.target.value)}
                className="mt-1 bg-[#EDECE8] border-0" placeholder="https://... (optional)" />
              {form.logoUrl && (
                <img src={form.logoUrl} alt="preview" className="h-12 mt-2 object-contain rounded border border-[#EDECE8]" />
              )}
            </div>
            <div className="border-t border-[#EDECE8] pt-4">
              <p className="text-xs font-medium uppercase tracking-wider text-[#9C9B97] mb-3">Doctor Details</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Doctor Name</Label>
                  <Input value={form.doctorName} onChange={(e) => set("doctorName", e.target.value)}
                    className="mt-1 bg-[#EDECE8] border-0" />
                </div>
                <div>
                  <Label>Qualifications</Label>
                  <Input value={form.doctorQualification} onChange={(e) => set("doctorQualification", e.target.value)}
                    className="mt-1 bg-[#EDECE8] border-0" placeholder="e.g., MBBS, MD Psychiatry" />
                </div>
              </div>
              <div className="mt-3">
                <Label>SLMC Registration Number</Label>
                <Input value={form.doctorRegistrationNumber} onChange={(e) => set("doctorRegistrationNumber", e.target.value)}
                  className="mt-1 bg-[#EDECE8] border-0" />
              </div>
            </div>
            <div className="border-t border-[#EDECE8] pt-4">
              <p className="text-xs font-medium uppercase tracking-wider text-[#9C9B97] mb-3">Prescription</p>
              <div>
                <Label>Prescription Footer</Label>
                <textarea value={form.prescriptionFooter} onChange={(e) => set("prescriptionFooter", e.target.value)}
                  rows={2} className="w-full mt-1 px-3 py-2 bg-[#EDECE8] rounded-md text-sm text-[#2D2D2A] resize-none focus:outline-none focus:ring-2 focus:ring-[#7E8F7C]" />
              </div>
              <div className="mt-3">
                <Label>Paper Size</Label>
                <div className="flex gap-2 mt-1">
                  {(["A4", "A5"] as const).map((size) => (
                    <button key={size} onClick={() => set("prescriptionPaperSize", size)}
                      className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                        form.prescriptionPaperSize === size
                          ? "bg-[#7E8F7C] text-white"
                          : "bg-[#EDECE8] text-[#9C9B97] hover:text-[#2C3A2B]"
                      }`}>{size}</button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={cancel} className="flex-1 border-[#EDECE8]">Cancel</Button>
              <Button onClick={handleSave}
                disabled={createClinic.isPending || updateClinic.isPending || !form.clinicName}
                className="flex-[2] bg-[#7E8F7C] hover:bg-[#5A6B58] text-white">
                <Save className="w-4 h-4 mr-2" />
                {createClinic.isPending || updateClinic.isPending ? "Saving..." : mode === "add" ? "Add Medical Center" : "Save Changes"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Speech-to-Text */}
      <Card className="bg-white border-[#EDECE8]">
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-lg text-[#2C3A2B] flex items-center gap-2">
            <Mic className="w-5 h-5 text-[#7E8F7C]" />
            Speech-to-Text
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Auto-correct</Label>
              <p className="text-xs text-[#9C9B97]">Automatically fix common speech-to-text errors</p>
            </div>
            <Switch checked={sttAutoCorrect} onCheckedChange={setSttAutoCorrect} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">AI Refinement</Label>
              <p className="text-xs text-[#9C9B97]">Use AI to refine grammar and formatting</p>
            </div>
            <Switch checked={sttAiRefine} onCheckedChange={setSttAiRefine} />
          </div>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card className="bg-white border-[#EDECE8]">
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-lg text-[#2C3A2B] flex items-center gap-2">
            <Database className="w-5 h-5 text-[#7E8F7C]" />
            Data Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={() => seedMutation.mutate(undefined, { onSuccess: () => window.location.reload() })}
            disabled={seedMutation.isPending} className="border-[#7E8F7C] text-[#3D4F3B] hover:bg-[rgba(126,143,124,0.08)]">
            <RefreshCw className={`w-4 h-4 mr-2 ${seedMutation.isPending ? "animate-spin" : ""}`} />
            {seedMutation.isPending ? "Seeding..." : "Reset & Seed Sample Data"}
          </Button>
          <p className="text-xs text-[#9C9B97] mt-2">
            This will reset the database with sample medications, patients, and consultations.
          </p>
        </CardContent>
      </Card>

    </div>
  );
}
