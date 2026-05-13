"use client";
import { useState } from "react";
import { Fingerprint, Smartphone, Lock, ArrowRight } from "lucide-react";
import { authService } from "@/app/services/auth.service";
import { securityService } from "@/app/services/security.service";
import { biometricUtils } from "@/app/lib/webauthn";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { getFCMToken } from "@/app/lib/firebase";
import { handleError } from "@/app/utils/error-handler";
import InputItem from "@/app/components/InputItem";

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handlePasswordLogin = async () => {
    setIsLoading(true);
    try {
      let fcmToken = localStorage.getItem("fcmToken");

      if (!fcmToken) {
        const token = await getFCMToken();
        if (token) {
          fcmToken = token;
        } else if (
          typeof window !== "undefined" &&
          (navigator as any).brave !== undefined
        ) {
          toast(
            (t) => (
              <span className="text-sm font-medium">
                Are you using <b>Brave</b>? Enable "Google services for push
                messaging" to receive alerts!
                <button
                  onClick={() => toast.dismiss(t.id)}
                  className="ml-2 text-blue-600 underline font-bold"
                >
                  Got it
                </button>
              </span>
            ),
            { duration: 6000, icon: "🦁" },
          );
        }
      }

      const res = await authService.login({ phoneNumber: phone, password });
      console.log("Login response:", res); // Debug log
      if (res.data.authenticated) {
        localStorage.setItem("token", res.data.accessToken);
        localStorage.setItem("refreshToken", res.data.refreshToken);
        toast.success("Login successful!");
        router.push("/dashboard");
      }
      // TRƯỜNG HỢP 2: Tài khoản chưa active
      else {
        // Lưu JWT vào trình duyệt web để dùng cho verifyOtp/resendOtp
        localStorage.setItem("token", res.data.accessToken);
        localStorage.setItem("refreshToken", res.data.refreshToken);
        
        toast("Please verify your account to continue.", { icon: "ℹ️" });
        router.push(`/auth/otp?vId=${res.data.verificationId}`);
      }
    } catch (error: any) {
      handleError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    try {
      const challengeRes = await authService.getChallenge();
      // challengeRes.data is ApiResponse<ChallengeResponse>:
      // { challenge: string, allowedCredentialIds: string[] }
      const { challenge, allowedCredentialIds } = challengeRes.data;

      const biometricData = await biometricUtils.authenticate(
        challenge,
        allowedCredentialIds
      );

      const loginPayload = {
        phoneNumber: phone,
        credentialId: biometricData.credentialId,
        signature: biometricData.signature,
        challenge: challenge,
        clientDataJSON: biometricData.clientDataJSON,
        authenticatorData: biometricData.authenticatorData,
      };

      // DEBUG: Log payload chi tiết trước gửi
      console.log("=== Biometric Login Payload ===");
      console.log("clientDataJSON:", loginPayload.clientDataJSON?.substring(0, 50) + "...");
      console.log("authenticatorData:", loginPayload.authenticatorData?.substring(0, 50) + "...");
      console.log("signature:", loginPayload.signature?.substring(0, 50) + "...");
      console.log("challenge:", loginPayload.challenge?.substring(0, 50) + "...");
      console.log("Full payload:", JSON.stringify(loginPayload));

      const res = await authService.loginByBiometric(loginPayload);

      if (res.data?.authenticated) {
        localStorage.setItem("token", res.data.accessToken);
        localStorage.setItem("refreshToken", res.data.refreshToken);
      }

      toast.success("Biometric login successful!");
      router.push("/dashboard");
    } catch (error: any) {
      handleError(error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-[2.5rem] p-10 shadow-2xl shadow-blue-100/50 border border-slate-100">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-200">
            <span className="text-white text-3xl font-black">N</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900">NeoBank</h1>
          <p className="text-slate-500 font-medium">Welcome back!</p>
        </div>

        <div className="space-y-5">
          <InputItem
            icon={<Smartphone strokeWidth={2.5} />}
            placeholder="Phone Number"
            value={phone}
            onChange={setPhone}
          />

          <InputItem
            icon={<Lock strokeWidth={2.5} />}
            type="password"
            placeholder="Password"
            value={password}
            onChange={setPassword}
          />

          <div className="flex gap-3 pt-2">
            <button
              onClick={handlePasswordLogin}
              disabled={isLoading}
              className={`flex-1 py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 text-lg active:scale-[0.98] ${
                isLoading
                  ? "bg-slate-400 cursor-not-allowed text-white"
                  : "bg-slate-900 hover:bg-black text-white shadow-xl shadow-slate-200"
              }`}
            >
              {isLoading ? (
                "Loading..."
              ) : (
                <>
                  Login <ArrowRight size={20} strokeWidth={2.5} />
                </>
              )}
            </button>
            <button
              onClick={handleBiometricLogin}
              className="px-6 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-100 transition-all border-2 border-blue-100 active:scale-[0.95]"
            >
              <Fingerprint size={32} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        <p className="text-center mt-10 text-slate-500 font-medium text-sm">
          Don't have an account?{" "}
          <span
            onClick={() => router.push("/auth/register")}
            className="text-blue-600 font-bold cursor-pointer hover:underline"
          >
            Register now
          </span>
        </p>
      </div>
    </div>
  );
}
