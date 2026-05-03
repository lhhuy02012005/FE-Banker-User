"use client";
import { ArrowLeft, Wallet, Plus, Loader } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { transactionService } from '@/app/services/transaction.service';
import { securityService } from '@/app/services/security.service';
import { biometricUtils } from '@/app/lib/webauthn';
import { formatCurrency, getDeviceId } from '@/app/lib/utils';
import { handleError } from '@/app/utils/error-handler';
import toast from 'react-hot-toast';
import { userService, AccountInfo, UserProfile } from '@/app/services/user.service';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DepositPage() {
  const router = useRouter();
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('Deposit from bank');
  const [bankSource, setBankSource] = useState('vietcombank');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [step, setStep] = useState<'form' | 'verify'>('form');
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [accRes, userRes] = await Promise.all([
          userService.getMyAccount(),
          userService.getMyProfile()
        ]);
        setAccount(accRes.data);
        setUser(userRes.data);
      } catch (error) {
        console.error('Error fetching deposit info:', error);
        toast.error('Failed to load account information');
      } finally {
        setIsFetching(false);
      }
    };
    fetchData();
  }, []);

  const handleQuickAmount = (value: string) => {
    setAmount(value);
  };

  const handleDeposit = async (e: React.FormEvent) => {
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
      console.log('Challenge response from server:', challengeRes);
      const challenge = challengeRes.data;
      console.log('Biometric challenge received:', challenge);

      const biometricData = await biometricUtils.authenticate(challenge.challenge,challenge.allowedCredentialIds);

      const txRes = await transactionService.createTransaction({
        userId: account?.userId,
        accountId: account?.id,
        amount: parseFloat(amount),
        description: description || 'Deposit',
        transactionType: 'DEPOSIT',
        verificationMethod: 'BIOMETRIC',
        credentialId: biometricData.credentialId,
        signature: biometricData.signature,
        challenge: challenge.challenge,
        clientDataJSON: biometricData.clientDataJSON,
        authenticatorData: biometricData.authenticatorData,
        email: user?.email,
        phoneNumber: user?.phoneNumber,
      });

      toast.success('Deposit successful!');
      setTimeout(() => {
        router.push('/dashboard');
      }, 1500);
    } catch (error) {
      console.error('Deposit error:', error);
      handleError(error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  if (step === 'verify') {
    return (
      <div className="max-w-xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => setStep('form')} className="p-2 hover:bg-slate-100 rounded-full transition">
            <ArrowLeft size={24} className="text-slate-700" />
          </button>
          <h1 className="text-3xl font-bold text-slate-800">Verify Deposit</h1>
        </div>

        <div className="bg-white rounded-4xl p-8 shadow-sm border border-slate-100 space-y-6">
          <div className="bg-blue-50 rounded-2xl p-6 space-y-4">
            <h3 className="font-bold text-slate-800">Deposit Summary</h3>
            <div className="flex justify-between">
              <p className="text-slate-600">Amount:</p>
              <p className="font-bold text-slate-800">{formatCurrency(parseFloat(amount))}</p>
            </div>
            <div className="flex justify-between">
              <p className="text-slate-600">From:</p>
              <p className="font-bold text-slate-800 capitalize">{bankSource}</p>
            </div>
            <div className="flex justify-between">
              <p className="text-slate-600">To Account:</p>
              <p className="font-bold text-slate-800">{account?.accountNumber}</p>
            </div>
            <div className="flex justify-between">
              <p className="text-slate-600">Description:</p>
              <p className="font-bold text-slate-800">{description}</p>
            </div>
          </div>

          <button
            onClick={handleBiometricVerification}
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold py-3.5 rounded-2xl transition flex justify-center items-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader className="animate-spin" size={20} />
                Verifying...
              </>
            ) : (
              <>
                <Plus size={20} />
                Verify with Biometric
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard" className="p-2 hover:bg-slate-100 rounded-full transition">
          <ArrowLeft size={24} className="text-slate-700" />
        </Link>
        <h1 className="text-3xl font-bold text-slate-800">Deposit Money</h1>
      </div>

      <div className="bg-white rounded-4xl p-8 shadow-sm border border-slate-100">
        <p className="text-slate-500 font-medium mb-6">Select a funding source to deposit money into your NeoBank account.</p>
        
        <form onSubmit={handleDeposit} className="space-y-6">
          <div className="space-y-4 mb-8">
            <div
              onClick={() => setBankSource('vietcombank')}
              className={`border-2 rounded-2xl p-4 flex items-center justify-between cursor-pointer transition ${
                bankSource === 'vietcombank'
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-slate-100 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="size-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-blue-600">
                  <Wallet size={24} />
                </div>
                <div>
                  <p className="font-bold text-slate-800">Vietcombank</p>
                  <p className="text-sm text-slate-500">**** 1234</p>
                </div>
              </div>
              <div className={`size-5 rounded-full border-4 ${bankSource === 'vietcombank' ? 'border-blue-600' : 'border-slate-300'}`}></div>
            </div>

            <div
              onClick={() => setBankSource('techcombank')}
              className={`border-2 rounded-2xl p-4 flex items-center justify-between cursor-pointer transition ${
                bankSource === 'techcombank'
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-slate-100 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="size-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-blue-600">
                  <Wallet size={24} />
                </div>
                <div>
                  <p className="font-bold text-slate-800">Techcombank</p>
                  <p className="text-sm text-slate-500">**** 5678</p>
                </div>
              </div>
              <div className={`size-5 rounded-full border-4 ${bankSource === 'techcombank' ? 'border-blue-600' : 'border-slate-300'}`}></div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Amount to Deposit (VND)</label>
            <input 
              type="number" 
              placeholder="0" 
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-4 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 outline-none text-3xl font-bold text-slate-800 text-center mb-4"
            />
            <div className="flex justify-center gap-2">
              <button 
                type="button"
                onClick={() => handleQuickAmount('1000000')}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition"
              >
                1M
              </button>
              <button 
                type="button"
                onClick={() => handleQuickAmount('2000000')}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition"
              >
                2M
              </button>
              <button 
                type="button"
                onClick={() => handleQuickAmount('5000000')}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition"
              >
                5M
              </button>
            </div>
          </div>

          <button 
            type="submit"
            disabled={isLoading || !amount}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold text-lg py-4 rounded-2xl transition shadow-lg shadow-blue-600/20 mt-8 flex justify-center items-center gap-2"
          >
            {isLoading ? <Loader className="animate-spin" size={20} /> : null}
            Continue to Verification
          </button>
        </form>
      </div>
    </div>
  );
}
