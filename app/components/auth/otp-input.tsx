"use client";
import { useState, useRef, useEffect } from "react";

interface OtpInputProps {
  length?: number;
  onComplete: (otp: string) => void;
  onResend?: () => void;
  isLoading?: boolean;
}

export default function OtpInput({ length = 6, onComplete, onResend, isLoading = false }: OtpInputProps) {
  const [otp, setOtp] = useState<string[]>(new Array(length).fill(""));
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputs = useRef<HTMLInputElement[]>([]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (timer > 0 && !canResend) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else {
      setCanResend(true);
    }

    return () => clearInterval(interval);
  }, [timer, canResend]);

  const handleResendClick = () => {
    if (!canResend || isLoading) return;
    
    setTimer(60);
    setCanResend(false);
    setOtp(new Array(length).fill("")); 
    inputs.current[0].focus();
    
    if (onResend) onResend();
  };

  const handleChange = (value: string, index: number) => {
    // Prevent input while submitting or loading
    if (isLoading || isSubmitting) return;

    const char = value.slice(-1);
    if (!/^\d*$/.test(char)) return;

    const newOtp = [...otp];
    newOtp[index] = char;
    setOtp(newOtp);

    if (char && index < length - 1) {
      inputs.current[index + 1].focus();
    }

    // Kiểm tra nếu đã nhập đủ
    if (newOtp.every((v) => v !== "")) {
      setIsSubmitting(true);
      onComplete(newOtp.join(""));
      // Will be reset by parent component when isLoading becomes false
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputs.current[index - 1].focus();
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  // Reset submitting flag when loading changes
  useEffect(() => {
    if (!isLoading) {
      setIsSubmitting(false);
    }
  }, [isLoading]);

  return (
    <div className="space-y-8">
      <div className="flex justify-between gap-2">
        {otp.map((digit, i) => (
          <input
            key={i}
            ref={(el) => { if (el) inputs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(e.target.value, i)}
            onKeyDown={(e) => handleKeyDown(e, i)}
            disabled={isLoading || isSubmitting}
            className="w-full h-14 text-center text-2xl font-black bg-slate-50 border-2 border-transparent rounded-2xl focus:border-blue-600 focus:bg-white focus:shadow-xl focus:shadow-blue-100 outline-none transition-all text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
          />
        ))}
      </div>

      <div className="text-center">
        <p className="text-sm text-slate-500 mb-3">Bạn không nhận được mã?</p>
        <button
          type="button"
          disabled={!canResend || isLoading || isSubmitting}
          onClick={handleResendClick}
          className={`font-bold text-sm px-6 py-2 rounded-full transition-all ${
            canResend && !isLoading && !isSubmitting
            ? "text-blue-600 bg-blue-50 hover:bg-blue-100 cursor-pointer" 
            : "text-slate-400 bg-slate-100 cursor-not-allowed"
          }`}
        >
          {isSubmitting ? "Đang xác thực..." : canResend ? "Gửi lại mã ngay" : `Gửi lại mã sau (${formatTime(timer)})`}
        </button>
      </div>
    </div>
  );
}