"use client";
import { useState } from "react";
import { User, Mail, Smartphone, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { authService } from "@/app/services/auth.service";
import { handleError } from "@/app/utils/error-handler";
import { toast } from "react-hot-toast";
import InputItem from "@/app/components/InputItem";

export default function RegisterPage() {
  const [form, setForm] = useState({
    fullName: "",
    phoneNumber: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const router = useRouter();

  const handleRegister = async () => {
    try {
      const response = await authService.register(form);
      toast.success("Account created! Please log in to verify your account.");
      router.push(`/auth/login`);
    } catch (e: any) {
      handleError(e);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-[2.5rem] p-10 shadow-2xl shadow-blue-100/50 border border-slate-100">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-black text-slate-900 mb-2">NeoBank</h2>
          <p className="text-slate-500 font-medium">
            Create your digital account
          </p>
        </div>

        <div className="space-y-5">
          <InputItem
            icon={<User strokeWidth={2.5} />}
            placeholder="Full Name"
            value={form.fullName}
            onChange={(v: string) => setForm({ ...form, fullName: v })}
          />
          <InputItem
            icon={<Smartphone strokeWidth={2.5} />}
            placeholder="Phone Number"
            value={form.phoneNumber}
            onChange={(v: string) => setForm({ ...form, phoneNumber: v })}
          />
          <InputItem
            icon={<Mail strokeWidth={2.5} />}
            placeholder="Email Address"
            value={form.email}
            onChange={(v: string) => setForm({ ...form, email: v })}
          />
          <InputItem
            icon={<Lock strokeWidth={2.5} />}
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(v: string) => setForm({ ...form, password: v })}
          />
          <InputItem
            icon={<Lock strokeWidth={2.5} />}
            type="password"
            placeholder="Confirm Password"
            value={form.confirmPassword}
            onChange={(v: string) => setForm({ ...form, confirmPassword: v })}
          />

          <button
            onClick={handleRegister}
            className="w-full bg-slate-900 hover:bg-black text-white py-4 rounded-2xl font-bold text-lg mt-4 transition-all active:scale-[0.98] shadow-xl shadow-slate-200"
          >
            Continue
          </button>

          <p className="text-center text-slate-500 font-medium text-sm">
            Already have an account?{" "}
            <span
              className="text-blue-600 font-bold cursor-pointer hover:underline"
              onClick={() => router.push("/auth/login")}
            >
              Log in
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
