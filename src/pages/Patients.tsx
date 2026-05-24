import { useState } from "react";
import { useSearchParams } from "react-router";
import {
  Search,
  Plus,
  User,
  Phone,
  MapPin,
  Calendar,
  ChevronLeft,
  FileText,
  Pill,
  Stethoscope,
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
  allergies: string | null;
  status: "active" | "discharged" | "new" | null;
  age: number;
  consultations: Array<{
    id: number;
    visitDate: string | Date | null;
    chiefComplaint: string | null;
    diagnosisImpression: string | null;
  }>;
  prescriptions: Array<{
    id: number;
    prescriptionNumber: string | null;
    status: string | null;
    items: Array<{
      id: number;
      medicineNameSnapshot: string;
      genericNameSnapshot: string | null;
      dose: string;
      frequency: string;
      itemStatus: string;
    }>;
  }>;
}

export default function Patients() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedPatientId = searchParams.get("id");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const { data: patientList, refetch } = trpc.patient.list.useQuery({
    search: search || undefined,
    status: statusFilter,
    page: 1,
    limit: 20,
  });

  const { data: selectedPatientRaw } = trpc.patient.getById.useQuery(
    { id: Number(selectedPatientId) },
    { enabled: !!selectedPatientId }
  );

  const selectedPatient = selectedPatientRaw as unknown as PatientDetailData | null;

  const createPatient = trpc.patient.create.useMutation({
    onSuccess: () => {
      setIsAddDialogOpen(false);
      refetch();
    },
  });

  const handleAddPatient = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createPatient.mutate({
      fullName: formData.get("fullName") as string,
      dateOfBirth: (formData.get("dateOfBirth") as string) || undefined,
      gender: (formData.get("gender") as "male" | "female" | "other") || undefined,
      phone: (formData.get("phone") as string) || undefined,
      address: (formData.get("address") as string) || undefined,
      emergencyContactName: (formData.get("emergencyContactName") as string) || undefined,
      emergencyContactPhone: (formData.get("emergencyContactPhone") as string) || undefined,
      allergies: (formData.get("allergies") as string) || undefined,
    });
  };

  const tabs = [
    { key: "all", label: `All (${patientList?.total ?? 0})` },
    { key: "active", label: "Active" },
    { key: "new", label: "New" },
    { key: "discharged", label: "Discharged" },
  ];

  if (selectedPatientId && selectedPatient) {
    return (
      <PatientDetail
        patient={selectedPatient}
        onBack={() => setSearchParams({})}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-display text-[28px] font-normal text-[#2C3A2B]">
          Patients
        </h1>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="h-9 bg-[#3D4F3B] hover:bg-[#2C3A2B] text-white">
              <Plus className="w-4 h-4 mr-1" />
              Add Patient
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display text-xl">
                Add New Patient
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddPatient} className="space-y-4 mt-2">
              <div>
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  name="fullName"
                  required
                  className="mt-1 bg-[#EDECE8] border-0"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="dateOfBirth">Date of Birth</Label>
                  <Input
                    id="dateOfBirth"
                    name="dateOfBirth"
                    type="date"
                    className="mt-1 bg-[#EDECE8] border-0"
                  />
                </div>
                <div>
                  <Label htmlFor="gender">Gender</Label>
                  <select
                    id="gender"
                    name="gender"
                    className="mt-1 w-full h-10 px-3 rounded-md bg-[#EDECE8] border-0 text-sm"
                  >
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  name="phone"
                  className="mt-1 bg-[#EDECE8] border-0"
                />
              </div>
              <div>
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  name="address"
                  className="mt-1 bg-[#EDECE8] border-0"
                />
              </div>
              <div>
                <Label htmlFor="allergies">Allergies</Label>
                <Input
                  id="allergies"
                  name="allergies"
                  className="mt-1 bg-[#EDECE8] border-0"
                  placeholder="Any known allergies..."
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-[#7E8F7C] hover:bg-[#5A6B58] text-white"
                disabled={createPatient.isPending}
              >
                {createPatient.isPending ? "Adding..." : "Add Patient"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9C9B97]" />
          <Input
            placeholder="Search by name, phone, or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-11 bg-[#EDECE8] border-0"
          />
        </div>
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                statusFilter === tab.key
                  ? "text-[#2C3A2B] bg-[rgba(126,143,124,0.08)] border-b-2 border-[#7E8F7C]"
                  : "text-[#9C9B97] hover:text-[#2C3A2B]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Patient Table */}
      <Card className="bg-white border-[#EDECE8]">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#EDECE8]">
                  <th className="text-left px-4 py-3 text-xs font-medium text-[#9C9B97] uppercase tracking-wider">
                    Patient ID
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-[#9C9B97] uppercase tracking-wider">
                    Name
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-[#9C9B97] uppercase tracking-wider">
                    Age / Gender
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-[#9C9B97] uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-[#9C9B97] uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-[#9C9B97] uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {patientList?.patients.map((patient) => (
                  <tr
                    key={patient.id}
                    className="border-b border-[#EDECE8] hover:bg-[rgba(126,143,124,0.04)] transition-colors cursor-pointer"
                    onClick={() =>
                      setSearchParams({ id: String(patient.id) })
                    }
                  >
                    <td className="px-4 py-3 text-sm font-mono-dose text-[#9C9B97]">
                      {patient.patientId}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-[#2C3A2B]">
                        {patient.fullName}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-[#2D2D2A]">
                      {patient.age > 0 ? `${patient.age} yrs` : "N/A"} /{" "}
                      {patient.gender
                        ? patient.gender.charAt(0).toUpperCase() +
                          patient.gender.slice(1)
                        : "N/A"}
                    </td>
                    <td className="px-4 py-3 text-sm text-[#9C9B97]">
                      {patient.phone ?? "N/A"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`status-pill ${
                          patient.status === "active"
                            ? "status-active"
                            : patient.status === "new"
                            ? "status-waiting"
                            : "status-discontinued"
                        }`}
                      >
                        {patient.status ?? "new"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-[#7E8F7C] hover:text-[#3D4F3B]"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSearchParams({ id: String(patient.id) });
                        }}
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {(!patientList || patientList.patients.length === 0) && (
            <div className="text-center py-12 text-[#9C9B97]">
              <User className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p>No patients found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PatientDetail({
  patient,
  onBack,
}: {
  patient: PatientDetailData;
  onBack: () => void;
}) {
  const dob = patient.dateOfBirth
    ? format(new Date(patient.dateOfBirth), "dd MMM yyyy")
    : "N/A";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="text-[#9C9B97] hover:text-[#2C3A2B]"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left Column - Patient Info */}
        <div className="space-y-4">
          <Card className="bg-white border-[#EDECE8]">
            <CardContent className="p-6 text-center">
              <div className="w-20 h-20 mx-auto rounded-full bg-[#EDECE8] flex items-center justify-center">
                <User className="w-8 h-8 text-[#9C9B97]" />
              </div>
              <h2 className="font-display text-xl text-[#2C3A2B] mt-3">
                {patient.fullName ?? "Unknown"}
              </h2>
              <p className="text-sm text-[#9C9B97] mt-1">
                {patient.age > 0 ? `${patient.age} years` : ""} {patient.gender ? `· ${patient.gender}` : ""}
              </p>
              <p className="text-xs font-mono-dose text-[#7E8F7C] mt-1">
                {patient.patientId}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white border-[#EDECE8]">
            <CardContent className="p-4 space-y-3">
              <h3 className="text-xs font-medium uppercase tracking-wider text-[#9C9B97]">
                Contact
              </h3>
              <div className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 text-[#7E8F7C]" />
                <span className="text-[#2D2D2A]">
                  {patient.phone ?? "N/A"}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-[#7E8F7C]" />
                <span className="text-[#2D2D2A]">
                  {patient.address ?? "N/A"}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-[#7E8F7C]" />
                <span className="text-[#2D2D2A]">DOB: {dob}</span>
              </div>
              {patient.allergies && (
                <div className="pt-2 border-t border-[#EDECE8]">
                  <span className="text-xs text-[#C97B7B] font-medium">
                    Allergies: {patient.allergies}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-2">
            <Button className="w-full bg-[#7E8F7C] hover:bg-[#5A6B58] text-white">
              <Stethoscope className="w-4 h-4 mr-2" />
              New Consultation
            </Button>
          </div>
        </div>

        {/* Right Column - Medical History */}
        <div className="col-span-2">
          <Tabs defaultValue="history" className="w-full">
            <TabsList className="bg-[#EDECE8] mb-4">
              <TabsTrigger
                value="history"
                className="data-[state=active]:bg-white"
              >
                <FileText className="w-4 h-4 mr-1" />
                Consultation History
              </TabsTrigger>
              <TabsTrigger
                value="medications"
                className="data-[state=active]:bg-white"
              >
                <Pill className="w-4 h-4 mr-1" />
                Medications
              </TabsTrigger>
            </TabsList>

            <TabsContent value="history">
              <Card className="bg-white border-[#EDECE8]">
                <CardContent className="p-6">
                  {patient.consultations.length > 0 ? (
                    <div className="space-y-4">
                      {patient.consultations.map((consultation) => (
                        <div
                          key={consultation.id}
                          className="border-l-2 border-[#EDECE8] pl-4 pb-4"
                        >
                          <div className="text-xs font-medium text-[#9C9B97] uppercase tracking-wider">
                            {consultation.visitDate
                              ? format(
                                  new Date(consultation.visitDate),
                                  "dd MMM yyyy"
                                )
                              : "N/A"}
                          </div>
                          <div className="text-sm text-[#2D2D2A] mt-1">
                            {consultation.chiefComplaint ??
                              "No presenting complaint recorded"}
                          </div>
                          {consultation.diagnosisImpression && (
                            <div className="text-xs text-[#7E8F7C] mt-1">
                              Diagnosis: {consultation.diagnosisImpression}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[#9C9B97] text-center py-8">
                      No consultation history
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="medications">
              <Card className="bg-white border-[#EDECE8]">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-[#EDECE8]">
                          <th className="text-left px-4 py-3 text-xs font-medium text-[#9C9B97] uppercase">
                            Medication
                          </th>
                          <th className="text-left px-4 py-3 text-xs font-medium text-[#9C9B97] uppercase">
                            Dosage
                          </th>
                          <th className="text-left px-4 py-3 text-xs font-medium text-[#9C9B97] uppercase">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {patient.prescriptions.flatMap((rx) =>
                          rx.items.map((item) => (
                            <tr
                              key={item.id}
                              className="border-b border-[#EDECE8]"
                            >
                              <td className="px-4 py-3">
                                <div className="text-sm font-medium text-[#2C3A2B]">
                                  {item.medicineNameSnapshot}
                                </div>
                                <div className="text-xs text-[#9C9B97]">
                                  {item.genericNameSnapshot ?? ""}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm font-mono-dose text-[#2D2D2A]">
                                {item.dose} · {item.frequency}
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`status-pill ${
                                    rx.status === "printed"
                                      ? "status-active"
                                      : rx.status === "confirmed"
                                      ? "status-completed"
                                      : "status-discontinued"
                                  }`}
                                >
                                  {item.itemStatus}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  {patient.prescriptions.flatMap((rx) => rx.items).length === 0 && (
                    <p className="text-sm text-[#9C9B97] text-center py-8">
                      No medications prescribed
                    </p>
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
