"use client";
import OtpInput from "@/app/components/auth/otp-input";
import { authService } from "@/app/services/auth.service";
import { handleError } from "@/app/utils/error-handler";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { Suspense, useState } from "react";

function OtpPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const verificationId = searchParams.get("vId") || "";
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerify = async (otp: string) => {
    // Prevent double submission
    if (isVerifying) return;
    setIsVerifying(true);

    try {
      await authService.verifyOtp({
        verificationId: verificationId,
        otp: otp,
        otpType: "REGISTER_ACTIVATION",
      });
      
      toast.success("Kích hoạt tài khoản thành công!");
      
      // DO NOT delete tokens - keep them for resend/retry flow
      // Redirect to login after short delay
      setTimeout(() => {
        localStorage.removeItem("token");
        localStorage.removeItem("refreshToken");
        router.push("/auth/login");
      }, 1500);
    } catch (e: any) {
      handleError(e);
      console.log("Error: ", e.response?.data);
      setIsVerifying(false); // Reset on error so user can retry
    }
  };

  const handleResend = async () => {
    if (!verificationId || isVerifying) return;
    try {
      const response = await authService.resendOtp(verificationId);
      const newVId = response.data;

      if (newVId) {
        router.replace(`/auth/otp?vId=${newVId}`);
        toast.success("Mã mới đã được gửi đến email!");
      }
    } catch (e: any) {
      handleError(e);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-[2.5rem] p-10 shadow-2xl shadow-blue-100/50">
        <h2 className="text-2xl font-black text-center mb-2 text-slate-900">
          Xác thực OTP
        </h2>

        <div className="text-center text-slate-500 mb-8">
          <p className="font-medium">Mã xác thực đã được gửi đến Email</p>
          <p className="text-xs mt-1 text-slate-400">Vui lòng kiểm tra hộp thư đến hoặc thư rác</p>
        </div>

        <OtpInput length={6} onComplete={handleVerify} onResend={handleResend} isLoading={isVerifying} />
      </div>
    </div>
  );
}

export default function OtpPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <OtpPageContent />
    </Suspense>
  );
}