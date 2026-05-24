import { useEffect } from "react";
import { Link } from "react-router";
import {
  Users,
  Stethoscope,
  FileText,
  HardDrive,
  Plus,
  Clock,
  CheckCircle,
  HourglassIcon,
  Mic,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/providers/trpc";
import { format } from "date-fns";

export default function Dashboard() {
  const today = format(new Date(), "EEEE, d MMMM yyyy");

  const { data: todayAppointments } = trpc.appointment.getToday.useQuery();
  const { data: patientData } = trpc.patient.list.useQuery({ limit: 1 });
  const { data: prescriptionData } = trpc.prescription.list.useQuery();
  const { data: settings } = trpc.settings.get.useQuery();

  const seedMutation = trpc.seed.init.useMutation();

  useEffect(() => {
    if (settings === null) {
      seedMutation.mutate();
    }
  }, [settings]);

  const totalPatients = patientData?.total ?? 0;
  const todaysConsultations = todayAppointments?.length ?? 0;
  const completedConsultations =
    todayAppointments?.filter((a) => a.appointment.status === "completed")
      .length ?? 0;
  const pendingPrescriptions =
    prescriptionData?.filter((p) => p.status === "confirmed")
      .length ?? 0;

  const stats = [
    {
      label: "Total Patients",
      value: totalPatients,
      change: "Active records",
      icon: Users,
      color: "text-[#7E8F7C]",
      bg: "bg-[rgba(126,143,124,0.12)]",
    },
    {
      label: "Today's Consultations",
      value: todaysConsultations,
      change: `${completedConsultations} completed`,
      icon: Stethoscope,
      color: "text-[#3D4F3B]",
      bg: "bg-[rgba(61,79,59,0.12)]",
    },
    {
      label: "Active Prescriptions",
      value: pendingPrescriptions,
      change: "Ongoing treatment",
      icon: FileText,
      color: "text-[#8B6914]",
      bg: "bg-[rgba(212,160,23,0.12)]",
    },
    {
      label: "Storage",
      value: "Local",
      change: "Offline mode",
      icon: HardDrive,
      color: "text-[#7E8F7C]",
      bg: "bg-[rgba(126,143,124,0.12)]",
    },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4 text-[#3D4F3B]" />;
      case "waiting":
        return <HourglassIcon className="w-4 h-4 text-[#D4A017]" />;
      case "in_session":
        return <Clock className="w-4 h-4 text-[#7E8F7C]" />;
      default:
        return <Clock className="w-4 h-4 text-[#9C9B97]" />;
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case "completed":
        return "status-completed";
      case "waiting":
        return "status-waiting";
      case "in_session":
        return "status-in_session";
      default:
        return "status-active";
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-[28px] font-normal text-[#2C3A2B]">
            Dashboard
          </h1>
          <p className="text-[17px] text-[#9C9B97] mt-1">{today}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/patients">
            <Button
              variant="outline"
              className="h-9 border-[#7E8F7C] text-[#3D4F3B] hover:bg-[rgba(126,143,124,0.08)]"
            >
              <Plus className="w-4 h-4 mr-1" />
              Patient
            </Button>
          </Link>
          <Link to="/consultation">
            <Button className="h-9 bg-[#7E8F7C] hover:bg-[#5A6B58] text-white">
              <Stethoscope className="w-4 h-4 mr-1" />
              New Consultation
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.label}
              className="bg-white border-[#EDECE8] card-hover"
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className={`p-2 rounded-lg ${stat.bg}`}>
                    <Icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-semibold text-[#2C3A2B]">
                    {stat.value}
                  </div>
                  <div className="text-sm text-[#9C9B97] mt-0.5">
                    {stat.label}
                  </div>
                  <div className="text-xs text-[#7E8F7C] mt-1">{stat.change}</div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Today's Appointments */}
        <Card className="col-span-2 bg-white border-[#EDECE8]">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="font-display text-xl text-[#2C3A2B]">
              Today's Schedule
            </CardTitle>
            <Link to="/consultation">
              <Button className="h-8 bg-[#7E8F7C] hover:bg-[#5A6B58] text-white text-sm">
                <Stethoscope className="w-4 h-4 mr-1" />
                New Consultation
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {todayAppointments && todayAppointments.length > 0 ? (
              <div className="space-y-2">
                {todayAppointments.map(({ appointment, patient }) => (
                  <div
                    key={appointment.id}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-[rgba(126,143,124,0.04)] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(appointment.status ?? "scheduled")}
                        <span className="text-sm font-mono-dose text-[#9C9B97] w-16">
                          {appointment.appointmentTime
                            ? String(appointment.appointmentTime).slice(0, 5)
                            : "--:--"}
                        </span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-[#2C3A2B]">
                          {patient.fullName}
                        </div>
                        <div className="text-xs text-[#9C9B97]">
                          {appointment.type === "new"
                            ? "New Patient"
                            : "Follow-up"}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`status-pill ${getStatusClass(
                          appointment.status ?? "scheduled"
                        )}`}
                      >
                        {(appointment.status ?? "scheduled").replace("_", " ")}
                      </span>
                      <Link
                        to={`/patients?id=${patient.id}`}
                        className="text-[#7E8F7C] hover:text-[#3D4F3B]"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-[#9C9B97]">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No appointments scheduled for today</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="space-y-4">
          <Link to="/consultation">
            <Card className="bg-white border-[#EDECE8] border-dashed border-2 cursor-pointer card-hover">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-full bg-[rgba(126,143,124,0.12)]">
                    <Mic className="w-5 h-5 text-[#7E8F7C]" />
                  </div>
                  <div>
                    <div className="font-medium text-[#2C3A2B]">
                      Start Consultation
                    </div>
                    <div className="text-xs text-[#9C9B97]">
                      Speech-to-text notes + prescription
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Card className="bg-white border-[#EDECE8]">
            <CardHeader className="pb-3">
              <CardTitle className="font-display text-lg text-[#2C3A2B]">
                Recent Prescriptions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {prescriptionData && prescriptionData.length > 0 ? (
                <div className="space-y-3">
                  {prescriptionData.slice(0, 5).map((rx) => (
                    <div
                      key={rx.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <div>
                        <div className="text-[#2C3A2B] font-medium">
                          {rx.prescriptionNumber ?? "Prescription"}
                        </div>
                        <div className="text-[#9C9B97] text-xs">
                          {rx.items?.length ?? 0} medications
                        </div>
                      </div>
                      <span className="status-pill status-active text-xs">
                        {rx.status ?? "draft"}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[#9C9B97] text-center py-4">
                  No recent prescriptions
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
