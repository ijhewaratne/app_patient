import { useState, useEffect } from "react";
import {
  UserCog,
  FileText,
  Mic,
  Database,
  Save,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/providers/trpc";

export default function SettingsPage() {
  const { data: clinic, refetch } =
    trpc.clinic.get.useQuery(undefined, {
      retry: false,
    });
  const updateClinic = trpc.clinic.update.useMutation({
    onSuccess: () => refetch(),
  });
  const seedMutation = trpc.seed.init.useMutation();

  const [formData, setFormData] = useState({
    doctorName: "",
    doctorQualification: "",
    doctorRegistrationNumber: "",
    clinicName: "",
    clinicAddress: "",
    clinicPhone: "",
    prescriptionFooter: "",
    prescriptionPaperSize: "A4" as "A4" | "A5",
    sttAutoCorrect: true,
    sttAiRefine: true,
  });

  useEffect(() => {
    if (clinic) {
      setFormData({
        doctorName: clinic.doctorName ?? "",
        doctorQualification: clinic.doctorQualification ?? "",
        doctorRegistrationNumber: clinic.doctorRegistrationNumber ?? "",
        clinicName: clinic.clinicName ?? "",
        clinicAddress: clinic.clinicAddress ?? "",
        clinicPhone: clinic.clinicPhone ?? "",
        prescriptionFooter: clinic.prescriptionFooter ?? "",
        prescriptionPaperSize: (clinic.prescriptionPaperSize ?? "A4") as "A4" | "A5",
        sttAutoCorrect: true,
        sttAiRefine: true,
      });
    }
  }, [clinic]);

  const handleSave = () => {
    updateClinic.mutate(formData);
  };

  const handleSeed = () => {
    seedMutation.mutate(undefined, {
      onSuccess: () => {
        window.location.reload();
      },
    });
  };

  return (
    <div className="max-w-[700px] mx-auto space-y-6">
      <h1 className="font-display text-[28px] font-normal text-[#2C3A2B]">
        Settings
      </h1>

      {/* Doctor Profile */}
      <Card className="bg-white border-[#EDECE8]">
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-lg text-[#2C3A2B] flex items-center gap-2">
            <UserCog className="w-5 h-5 text-[#7E8F7C]" />
            Doctor Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Doctor Name</Label>
              <Input
                value={formData.doctorName}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    doctorName: e.target.value,
                  }))
                }
                className="mt-1 bg-[#EDECE8] border-0"
              />
            </div>
            <div>
              <Label>Qualifications</Label>
              <Input
                value={formData.doctorQualification}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    doctorQualification: e.target.value,
                  }))
                }
                className="mt-1 bg-[#EDECE8] border-0"
                placeholder="e.g., MBBS, MD Psychiatry"
              />
            </div>
          </div>
          <div>
            <Label>Registration Number (SLMC)</Label>
            <Input
              value={formData.doctorRegistrationNumber}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  doctorRegistrationNumber: e.target.value,
                }))
              }
              className="mt-1 bg-[#EDECE8] border-0"
            />
          </div>
          <div>
            <Label>Clinic Name</Label>
            <Input
              value={formData.clinicName}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  clinicName: e.target.value,
                }))
              }
              className="mt-1 bg-[#EDECE8] border-0"
            />
          </div>
          <div>
            <Label>Clinic Address</Label>
            <Input
              value={formData.clinicAddress}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  clinicAddress: e.target.value,
                }))
              }
              className="mt-1 bg-[#EDECE8] border-0"
            />
          </div>
          <div>
            <Label>Clinic Phone</Label>
            <Input
              value={formData.clinicPhone}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  clinicPhone: e.target.value,
                }))
              }
              className="mt-1 bg-[#EDECE8] border-0"
            />
          </div>
        </CardContent>
      </Card>

      {/* Prescription Settings */}
      <Card className="bg-white border-[#EDECE8]">
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-lg text-[#2C3A2B] flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#7E8F7C]" />
            Prescription Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Prescription Footer</Label>
            <textarea
              value={formData.prescriptionFooter}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  prescriptionFooter: e.target.value,
                }))
              }
              rows={2}
              className="w-full mt-1 px-3 py-2 bg-[#EDECE8] rounded-md text-sm text-[#2D2D2A] resize-none focus:outline-none focus:ring-2 focus:ring-[#7E8F7C]"
            />
          </div>
          <div>
            <Label>Prescription Paper Size</Label>
            <div className="flex gap-2 mt-1">
              {(["A4", "A5"] as const).map((size) => (
                <button
                  key={size}
                  onClick={() =>
                    setFormData((prev) => ({ ...prev, prescriptionPaperSize: size }))
                  }
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    formData.prescriptionPaperSize === size
                      ? "bg-[#7E8F7C] text-white"
                      : "bg-[#EDECE8] text-[#9C9B97] hover:text-[#2C3A2B]"
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

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
              <p className="text-xs text-[#9C9B97]">
                Automatically fix common speech-to-text errors
              </p>
            </div>
            <Switch
              checked={formData.sttAutoCorrect}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({
                  ...prev,
                  sttAutoCorrect: checked,
                }))
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">AI Refinement</Label>
              <p className="text-xs text-[#9C9B97]">
                Use AI to refine grammar and formatting
              </p>
            </div>
            <Switch
              checked={formData.sttAiRefine}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, sttAiRefine: checked }))
              }
            />
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
          <Button
            variant="outline"
            onClick={handleSeed}
            disabled={seedMutation.isPending}
            className="border-[#7E8F7C] text-[#3D4F3B] hover:bg-[rgba(126,143,124,0.08)]"
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${
                seedMutation.isPending ? "animate-spin" : ""
              }`}
            />
            {seedMutation.isPending
              ? "Seeding..."
              : "Reset & Seed Sample Data"}
          </Button>
          <p className="text-xs text-[#9C9B97] mt-2">
            This will reset the database with sample medications, patients, and
            consultations.
          </p>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={updateClinic.isPending}
          className="h-10 bg-[#7E8F7C] hover:bg-[#5A6B58] text-white px-6"
        >
          {updateClinic.isPending ? (
            "Saving..."
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Settings
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
