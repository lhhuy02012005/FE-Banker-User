"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Nếu có token thì vào dashboard, không thì vào login
    const token = localStorage.getItem("accessToken");
    if (token) {
      router.push("/dashboard");
    } else {
      router.push("/auth/login");
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      {/* Hiện loading nhẹ trong lúc redirect */}
      <div className="animate-spin size-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
    </div>
  );
}