"use client";
import { ArrowLeft, Wallet, Building2, Loader, ScanLine } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { userService } from '@/app/services/user.service';
import { transactionService } from '@/app/services/transaction.service';
import { securityService } from '@/app/services/security.service';
import { biometricUtils } from '@/app/lib/webauthn';
import { formatCurrency, getDeviceId } from '@/app/lib/utils';
import { handleError } from '@/app/utils/error-handler';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

export default function WithdrawPage() {
  const router = useRouter();
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'form' | 'verify'>('form');
  const [showOtp, setShowOtp] = useState(false);
  const [otp, setOtp] = useState('');
  const [verificationId, setVerificationId] = useState('');
  const [myAccount, setMyAccount] = useState<any>(null);

  useEffect(() => {
    userService.getMyAccount().then(res => setMyAccount(res.data));
  }, []);

  const handleWithdraw = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    setStep('verify');
  };

  const handleBiometricVerification = async () => {
    try {
      setIsLoading(true);
      const challengeRes = await securityService.getChallenge();
      const challenge = challengeRes.data;

      const biometricData = await biometricUtils.authenticate(
        challenge.challenge,
        challenge.allowedCredentialIds,
      );

      const txRes = await transactionService.createTransaction({
        userId: myAccount?.userId,
        accountId: myAccount?.id,
        amount: parseFloat(amount),
        description: 'Withdrawal to linked bank',
        transactionType: 'WITHDRAW',
        verificationMethod: 'BIOMETRIC',
        credentialId: biometricData.credentialId,
        signature: biometricData.signature,
        challenge: challenge.challenge,
        clientDataJSON: biometricData.clientDataJSON,
        authenticatorData: biometricData.authenticatorData,
      });

      toast.success('Withdrawal successful!');
      router.push('/dashboard');
    } catch (error: any) {
      const errorData = error.response?.data;
      if (errorData?.code === 1008) {
        setVerificationId(errorData.message ?? '');
        setShowOtp(true);
        toast.success('Security service offline. Please verify via OTP.');
      } else {
        handleError(error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpVerification = async () => {
    try {
      setIsLoading(true);
      await transactionService.createTransaction({
        userId: myAccount?.userId,
        accountId: myAccount?.id,
        amount: parseFloat(amount),
        description: 'Withdrawal to linked bank',
        transactionType: 'WITHDRAW',
        verificationMethod: 'EMAIL_OTP',
        verificationId: verificationId,
        otp: otp,
      });

      toast.success('Withdrawal successful via OTP!');
      router.push('/dashboard');
    } catch (error) {
      handleError(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => step === 'verify' ? setStep('form') : router.back()} 
          className="p-2 hover:bg-slate-100 rounded-full transition"
        >
          <ArrowLeft size={24} className="text-slate-700" />
        </button>
        <h1 className="text-3xl font-bold text-slate-800">
          {step === 'form' ? 'Withdraw Money' : 'Verify Withdrawal'}
        </h1>
      </div>

      {step === 'form' ? (
        <div className="bg-white rounded-4xl p-8 shadow-sm border border-slate-100">
          <p className="text-slate-500 font-medium mb-6">Select a destination to withdraw money from your NeoBank account.</p>
          
          <form onSubmit={handleWithdraw} className="space-y-6">
            <div className="space-y-4 mb-8">
              <div className="border-2 border-blue-600 bg-blue-50 rounded-2xl p-4 flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="size-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-blue-600">
                    <Building2 size={24} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">Linked Bank Account</p>
                    <p className="text-sm text-slate-500">Vietcombank **** 1234</p>
                  </div>
                </div>
                <div className="size-5 rounded-full border-4 border-blue-600"></div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Amount to Withdraw (VND)</label>
              <input 
                type="number" 
                placeholder="0" 
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-4 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 outline-none text-3xl font-bold text-slate-800 text-center mb-4"
              />
              <p className="text-center text-sm font-medium text-slate-500 mb-4">
                Available Balance: {myAccount ? formatCurrency(myAccount.balance) : '...'}
              </p>
              <div className="flex justify-center gap-2">
                <button type="button" onClick={() => setAmount('1000000')} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition">1M</button>
                <button type="button" onClick={() => setAmount('2000000')} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition">2M</button>
                <button type="button" onClick={() => setAmount(myAccount?.balance?.toString())} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition">All</button>
              </div>
            </div>

            <button type="submit" disabled={!amount} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold text-lg py-4 rounded-2xl transition shadow-lg shadow-blue-600/20 mt-8">
              Continue Withdrawal
            </button>
          </form>
        </div>
      ) : (
        <div className="bg-white rounded-4xl p-8 shadow-sm border border-slate-100 space-y-6">
          <div className="bg-blue-50 rounded-2xl p-6 space-y-4">
            <h3 className="font-bold text-slate-800">Withdrawal Summary</h3>
            <div className="space-y-3">
              <SummaryRow label="From Account" value={myAccount?.accountNumber} />
              <SummaryRow label="To Bank" value="Vietcombank" />
              <SummaryRow label="Amount" value={formatCurrency(parseFloat(amount))} />
            </div>
          </div>

          <div className="space-y-6">
            {!showOtp ? (
              <button
                onClick={handleBiometricVerification}
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold py-3.5 rounded-2xl transition flex justify-center items-center gap-2"
              >
                {isLoading ? <Loader className="animate-spin" size={20} /> : <ScanLine size={20} />}
                Verify with Biometric
              </button>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-slate-600 font-medium text-center">Enter the 6-digit code sent to your email</p>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full px-4 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 outline-none text-3xl font-bold text-center tracking-[0.5em]"
                />
                <button
                  onClick={handleOtpVerification}
                  disabled={isLoading || otp.length !== 6}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold py-3.5 rounded-2xl transition flex justify-center items-center gap-2"
                >
                  {isLoading ? <Loader className="animate-spin" size={20} /> : null}
                  Verify OTP & Withdraw
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <p className="text-slate-600">{label}</p>
      <p className="font-bold text-slate-800">{value}</p>
    </div>
  );
}
