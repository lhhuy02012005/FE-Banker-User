"use client";
import { useEffect, useState } from 'react';
import { ArrowLeft, Eye, EyeOff, Copy, Check, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import axiosClient from '@/app/lib/axios';
import { SERVICE_PREFIX } from '@/app/constants/config';
import { getDeviceId } from '@/app/lib/axios';
import { authService } from '@/app/services/auth.service';

interface UserProfile {
  id: string;
  fullName: string;
  phoneNumber: string;
  email: string;
  createdAt: string;
}

interface AccountInfo {
  id: string;
  ownerName: string;
  accountNumber: string;
  balance: number;
  currency: string;
  status: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [showBalance, setShowBalance] = useState(false);
  const [showAccountNumber, setShowAccountNumber] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const [userRes, accountRes] = await Promise.all([
          axiosClient.post(`${SERVICE_PREFIX.IDENTITY}/v1/users/my-info`),
          axiosClient.get(`${SERVICE_PREFIX.ACCOUNT}/v1/accounts/my`)
        ]);
        setProfile(userRes.data.data?.user);
        console.log("user res: " , userRes.data.data);
        setAccount(accountRes.data.data);
        console.log(accountRes.data.data);
      } catch (error) {
        console.error('Failed to fetch profile:', error);
        toast.error('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);
console.log("profile: " , profile);
console.log("account: " , account);
  const maskAccountNumber = (num: string) => {
    if (!num || num.length < 8) return num;
    return `****${num.slice(-4)}`;
  };

  const formatBalance = (balance: number) => {
    return new Intl.NumberFormat('en-US').format(balance);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success('Copied!');
    setTimeout(() => setCopied(null), 2000);
  };

  const handleLogoutAllDevices = async () => {
    if (!confirm('Are you sure? You will be logged out from all devices.')) return;
    
    setLoggingOut(true);
    try {
      await authService.logoutAllDevices();
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      toast.success('Logged out from all devices');
      router.push('/auth/login');
    } catch (error) {
      console.error('Logout failed:', error);
      toast.error('Failed to logout');
    } finally {
      setLoggingOut(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin size-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-slate-100 rounded-lg transition-all"
        >
          <ArrowLeft size={24} className="text-slate-600" />
        </button>
        <h1 className="text-3xl font-bold text-slate-900">Profile</h1>
      </div>

      {/* User Information */}
      <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900 mb-6">Personal Information</h2>
        
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-slate-500 font-medium mb-2">Full Name</p>
              <p className="text-lg font-semibold text-slate-900">{profile?.fullName}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium mb-2">Email</p>
              <p className="text-lg font-semibold text-slate-900">{profile?.email}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium mb-2">Phone Number</p>
              <p className="text-lg font-semibold text-slate-900">{profile?.phoneNumber}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium mb-2">Member Since</p>
              <p className="text-lg font-semibold text-slate-900">
                {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                }) : 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Account Information */}
      {account && (
        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900 mb-6">Account Information</h2>
          
          <div className="space-y-6">
            {/* Account Number */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
              <div>
                <p className="text-sm text-slate-500 font-medium mb-1">Account Number</p>
                <p className="text-lg font-semibold text-slate-900 font-mono">
                  {showAccountNumber ? account.accountNumber : maskAccountNumber(account.accountNumber)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAccountNumber(!showAccountNumber)}
                  className="p-2 hover:bg-slate-200 rounded-lg transition-all text-slate-600"
                >
                  {showAccountNumber ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
                <button
                  onClick={() => copyToClipboard(account.accountNumber, 'accountNumber')}
                  className="p-2 hover:bg-slate-200 rounded-lg transition-all text-slate-600"
                >
                  {copied === 'accountNumber' ? (
                    <Check size={20} className="text-green-600" />
                  ) : (
                    <Copy size={20} />
                  )}
                </button>
              </div>
            </div>

            {/* Balance */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
              <div>
                <p className="text-sm text-slate-500 font-medium mb-1">Account Balance</p>
                <p className="text-2xl font-bold text-slate-900">
                  {showBalance ? formatBalance(account.balance) : '****'} {account.currency}
                </p>
              </div>
              <button
                onClick={() => setShowBalance(!showBalance)}
                className="p-2 hover:bg-slate-200 rounded-lg transition-all text-slate-600"
              >
                {showBalance ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {/* Account Status */}
            <div>
              <p className="text-sm text-slate-500 font-medium mb-2">Account Status</p>
              <div className="inline-block px-4 py-2 bg-green-100 text-green-700 rounded-xl font-semibold text-sm">
                {account.status}
              </div>
            </div>

            {/* Account Owner */}
            <div>
              <p className="text-sm text-slate-500 font-medium mb-2">Account Owner</p>
              <p className="text-lg font-semibold text-slate-900">{account.ownerName}</p>
            </div>
          </div>
        </div>
      )}

      {/* Logout All Devices */}
      <div className="bg-red-50 rounded-3xl p-8 border border-red-100 shadow-sm">
        <h2 className="text-xl font-bold text-red-900 mb-4">Security</h2>
        <p className="text-red-700 mb-6">Log out from all your devices. You will need to log in again on all devices.</p>
        <button
          onClick={handleLogoutAllDevices}
          disabled={loggingOut}
          className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-bold py-4 rounded-2xl transition-all active:scale-[0.98]"
        >
          <LogOut size={20} /> 
          {loggingOut ? 'Logging out...' : 'Logout All Devices'}
        </button>
      </div>
    </div>
  );
}
