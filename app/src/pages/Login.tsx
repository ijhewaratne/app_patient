import { useState } from "react";
import { HeartPulse, Lock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";

export default function Login() {
  const { login, isLoggingIn, loginError, setup } = useAuth();
  const [name, setName] = useState("Doctor");
  const [password, setPassword] = useState("");
  const [needsSetup, setNeedsSetup] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login({ name, password });
    } catch {
      // Check if setup is needed
      try {
        await setup();
        setNeedsSetup(true);
      } catch {
        // Setup also failed
      }
    }
  };

  const handleSetup = async () => {
    try {
      await setup();
      await login({ name, password: "admin" });
    } catch {
      // Error handled
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F9F7] flex items-center justify-center">
      <div className="w-full max-w-sm mx-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[rgba(126,143,124,0.12)] mb-4">
            <HeartPulse className="w-8 h-8 text-[#7E8F7C]" />
          </div>
          <h1 className="font-display text-2xl text-[#2C3A2B]">MediLogix</h1>
          <p className="text-sm text-[#9C9B97] mt-1">
            Patient Management System
          </p>
        </div>

        <div className="bg-white rounded-lg border border-[#EDECE8] p-6 shadow-sm">
          {needsSetup ? (
            <div className="text-center space-y-4">
              <p className="text-sm text-[#2D2D2A]">
                First time setup complete. Default password is: <strong>admin</strong>
              </p>
              <Button
                onClick={handleSetup}
                className="w-full bg-[#7E8F7C] hover:bg-[#5A6B58] text-white"
              >
                Continue with Default Login
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-medium uppercase tracking-wider text-[#9C9B97]">
                  Username
                </label>
                <div className="relative mt-1">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9C9B97]" />
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-9 bg-[#EDECE8] border-0"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium uppercase tracking-wider text-[#9C9B97]">
                  Password
                </label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9C9B97]" />
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="pl-9 bg-[#EDECE8] border-0"
                    required
                  />
                </div>
              </div>
              {loginError && (
                <p className="text-xs text-[#C97B7B]">{loginError}</p>
              )}
              <Button
                type="submit"
                disabled={isLoggingIn}
                className="w-full h-10 bg-[#3D4F3B] hover:bg-[#2C3A2B] text-white"
              >
                {isLoggingIn ? "Signing in..." : "Sign In"}
              </Button>
              <p className="text-[10px] text-center text-[#9C9B97]">
                Default: Doctor / admin (on first run, click Sign In to auto-setup)
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
