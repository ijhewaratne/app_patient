import { useState } from "react";
import {
  Search,
  Plus,
  Pill,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { trpc } from "@/providers/trpc";

const categories = [
  "all",
  "antidepressant",
  "antipsychotic",
  "anxiolytic",
  "mood_stabilizer",
  "stimulant",
  "sleep_aid",
  "other",
];

const categoryLabels: Record<string, string> = {
  all: "All",
  antidepressant: "Antidepressants",
  antipsychotic: "Antipsychotics",
  anxiolytic: "Anxiolytics",
  mood_stabilizer: "Mood Stabilizers",
  stimulant: "Stimulants",
  sleep_aid: "Sleep Aids",
  other: "Others",
};

export default function Medications() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const { data: medications, refetch } = trpc.medication.list.useQuery({
    category: category === "all" ? undefined : category,
    search: search || undefined,
  });

  const createMed = trpc.medication.create.useMutation({
    onSuccess: () => {
      setIsAddOpen(false);
      refetch();
    },
  });

  const handleAddMedication = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const strengthsStr = (formData.get("availableStrengths") as string) || "";
    createMed.mutate({
      brandName: formData.get("brandName") as string,
      genericName: formData.get("genericName") as string,
      drugClass: (formData.get("category") as string) || "other",
      availableStrengths: strengthsStr ? strengthsStr.split(",").map((s) => s.trim()) : [],
      defaultDose: (formData.get("defaultDose") as string) || undefined,
      defaultFrequency: (formData.get("defaultFrequency") as string) || undefined,
      defaultTiming: (formData.get("defaultTiming") as string) || undefined,
      defaultDuration: Number(formData.get("defaultDuration")) || undefined,
      defaultInstructions: (formData.get("defaultInstructions") as string) || undefined,
      warnings: (formData.get("warnings") as string) || undefined,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-display text-[28px] font-normal text-[#2C3A2B]">
          Medication Database
        </h1>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="h-9 bg-[#3D4F3B] hover:bg-[#2C3A2B] text-white">
              <Plus className="w-4 h-4 mr-1" />
              Add Medication
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-auto">
            <DialogHeader>
              <DialogTitle className="font-display text-xl">
                Add New Medication
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddMedication} className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="brandName">Brand Name *</Label>
                  <Input
                    id="brandName"
                    name="brandName"
                    required
                    className="mt-1 bg-[#EDECE8] border-0"
                  />
                </div>
                <div>
                  <Label htmlFor="genericName">Generic Name *</Label>
                  <Input
                    id="genericName"
                    name="genericName"
                    required
                    className="mt-1 bg-[#EDECE8] border-0"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <select
                  id="category"
                  name="category"
                  className="mt-1 w-full h-10 px-3 rounded-md bg-[#EDECE8] border-0 text-sm"
                >
                  {categories.filter((c) => c !== "all").map((cat) => (
                    <option key={cat} value={cat}>
                      {categoryLabels[cat]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="availableStrengths">
                  Available Strengths (comma-separated)
                </Label>
                <Input
                  id="availableStrengths"
                  name="availableStrengths"
                  placeholder="e.g., 10mg, 25mg, 50mg"
                  className="mt-1 bg-[#EDECE8] border-0"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="defaultDose">Default Dose</Label>
                  <Input
                    id="defaultDose"
                    name="defaultDose"
                    className="mt-1 bg-[#EDECE8] border-0"
                  />
                </div>
                <div>
                  <Label htmlFor="defaultFrequency">Frequency</Label>
                  <select
                    id="defaultFrequency"
                    name="defaultFrequency"
                    className="mt-1 w-full h-10 px-3 rounded-md bg-[#EDECE8] border-0 text-sm"
                  >
                    <option>OD</option>
                    <option>BD</option>
                    <option>TDS</option>
                    <option>QID</option>
                    <option>HS</option>
                    <option>PRN</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="defaultTiming">Timing</Label>
                  <Input
                    id="defaultTiming"
                    name="defaultTiming"
                    placeholder="e.g., after meals"
                    className="mt-1 bg-[#EDECE8] border-0"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="defaultDuration">Duration (days)</Label>
                  <Input
                    id="defaultDuration"
                    name="defaultDuration"
                    type="number"
                    defaultValue={30}
                    className="mt-1 bg-[#EDECE8] border-0"
                  />
                </div>
                <div>
                  <Label htmlFor="route">Route</Label>
                  <select
                    id="route"
                    name="route"
                    className="mt-1 w-full h-10 px-3 rounded-md bg-[#EDECE8] border-0 text-sm"
                  >
                    <option>oral</option>
                    <option>sublingual</option>
                    <option>IM</option>
                    <option>IV</option>
                    <option>topical</option>
                  </select>
                </div>
              </div>
              <div>
                <Label htmlFor="defaultInstructions">Default Instructions</Label>
                <Input
                  id="defaultInstructions"
                  name="defaultInstructions"
                  className="mt-1 bg-[#EDECE8] border-0"
                />
              </div>
              <div>
                <Label htmlFor="warnings">Warnings</Label>
                <Input
                  id="warnings"
                  name="warnings"
                  className="mt-1 bg-[#EDECE8] border-0"
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-[#7E8F7C] hover:bg-[#5A6B58] text-white"
                disabled={createMed.isPending}
              >
                {createMed.isPending ? "Adding..." : "Add Medication"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9C9B97]" />
        <Input
          placeholder="Search medication..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-10 bg-[#EDECE8] border-0"
        />
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
              category === cat
                ? "bg-[#7E8F7C] text-white"
                : "bg-white border border-[#EDECE8] text-[#9C9B97] hover:border-[#7E8F7C] hover:text-[#7E8F7C]"
            }`}
          >
            {categoryLabels[cat]}
          </button>
        ))}
      </div>

      {/* Medication List */}
      <div className="space-y-3">
        {medications?.map((med) => (
          <Card
            key={med.id}
            className="bg-white border-[#EDECE8] card-hover cursor-pointer"
            onClick={() =>
              setExpandedId(expandedId === med.id ? null : med.id)
            }
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[rgba(126,143,124,0.12)]">
                    <Pill className="w-4 h-4 text-[#7E8F7C]" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-[#2C3A2B]">
                      {med.brandName}
                    </div>
                    <div className="text-xs text-[#9C9B97]">
                      {med.genericName}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="status-pill status-active text-xs capitalize">
                    {(med.drugClass ?? "other").replace("_", " ")}
                  </span>
                  <span className="font-mono-dose text-sm text-[#2D2D2A]">
                    {med.defaultDose ?? "—"}
                  </span>
                  {expandedId === med.id ? (
                    <ChevronUp className="w-4 h-4 text-[#9C9B97]" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-[#9C9B97]" />
                  )}
                </div>
              </div>

              {expandedId === med.id && (
                <div className="mt-4 pt-4 border-t border-[#EDECE8] grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-[#9C9B97] text-xs uppercase">
                      Default Dose
                    </span>
                    <p className="font-mono-dose text-[#2D2D2A]">
                      {med.defaultDose ?? "—"} ({med.defaultFrequency ?? ""})
                    </p>
                  </div>
                  <div>
                    <span className="text-[#9C9B97] text-xs uppercase">
                      Timing
                    </span>
                    <p className="text-[#2D2D2A]">
                      {med.defaultTiming ?? "—"}
                    </p>
                  </div>
                  <div>
                    <span className="text-[#9C9B97] text-xs uppercase">
                      Duration
                    </span>
                    <p className="text-[#2D2D2A]">
                      {med.defaultDuration ?? "—"} days
                    </p>
                  </div>
                  <div>
                    <span className="text-[#9C9B97] text-xs uppercase">
                      Route
                    </span>
                    <p className="text-[#2D2D2A] capitalize">
                      {med.route ?? "oral"}
                    </p>
                  </div>
                  {med.availableStrengths && (med.availableStrengths as string[]).length > 0 && (
                    <div className="col-span-2">
                      <span className="text-[#9C9B97] text-xs uppercase">
                        Available Strengths
                      </span>
                      <div className="flex gap-2 mt-1">
                        {(med.availableStrengths as string[]).map((d) => (
                          <span
                            key={d}
                            className="px-2 py-0.5 bg-[#EDECE8] rounded text-xs font-mono-dose"
                          >
                            {d}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {med.defaultInstructions && (
                    <div className="col-span-2">
                      <span className="text-[#9C9B97] text-xs uppercase">
                        Instructions
                      </span>
                      <p className="text-[#2D2D2A] mt-0.5">
                        {med.defaultInstructions}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {(!medications || medications.length === 0) && (
          <div className="text-center py-12 text-[#9C9B97]">
            <AlertCircle className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p>No medications found</p>
          </div>
        )}
      </div>
    </div>
  );
}
