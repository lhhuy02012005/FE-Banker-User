"use client";
import { useEffect, useState } from 'react';
import { Fingerprint, CheckCircle2 } from 'lucide-react';
import { authService } from '@/app/services/auth.service';
import { biometricUtils } from '@/app/lib/webauthn';
import { userService } from '@/app/services/user.service';
import { getDeviceId } from '@/app/lib/axios';


export default function BiometricSetup() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [profile, setProfile] = useState<{ id: string; phoneNumber?: string; fullName?: string } | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const response = await userService.getMyProfile();
        setProfile(response.data);
      } catch (error) {
        console.error('Failed to load profile for biometric setup', error);
      }
    })();
  }, []);

  const handleSetup = async () => {
    setLoading(true);
    try {
      const challengeRes = await authService.getChallenge();
      const userIdentifier = profile?.phoneNumber || profile?.id || localStorage.getItem('user_phone') || 'unknown-user';
      const displayName = profile?.fullName || profile?.phoneNumber || 'NeoBank user';
      const result = await biometricUtils.register(challengeRes.data.challenge, userIdentifier, displayName);
      
      await authService.enableBiometric({
        deviceId: getDeviceId(),
        deviceName: result.deviceName,
        publicKey: result.publicKey,
        credentialId: result.credentialId
      });
      setSuccess(true);
    } catch (error) {
      console.error("Setup thất bại", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-3xl border border-slate-100 shadow-sm text-center">
      {success ? (
        <div className="space-y-3">
          <CheckCircle2 className="mx-auto text-green-500" size={48} />
          <p className="font-bold">Đã bật vân tay!</p>
        </div>
      ) : (
        <>
          <Fingerprint className="mx-auto text-blue-600 mb-4" size={48} />
          <h3 className="font-bold text-lg">Bảo mật vân tay</h3>
          <p className="text-slate-500 text-sm mb-6">Đăng nhập nhanh chóng và an toàn hơn bằng sinh trắc học.</p>
          <button 
            onClick={handleSetup}
            disabled={loading}
            className="w-full bg-slate-900 text-white py-3 rounded-xl font-medium"
          >
            {loading ? "Đang xử lý..." : "Kích hoạt ngay"}
          </button>
        </>
      )}
    </div>
  );
}