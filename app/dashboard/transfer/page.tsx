"use client";
import { ArrowLeft, User, Building2, AlignLeft, ScanLine, Loader } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { userService } from '@/app/services/user.service';
import { transactionService } from '@/app/services/transaction.service';
import { securityService } from '@/app/services/security.service';
import { biometricUtils } from '@/app/lib/webauthn';
import { formatCurrency, getDeviceId } from '@/app/lib/utils';
import { handleError } from '@/app/utils/error-handler';
import toast from 'react-hot-toast';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import QRScannerModal from '@/app/components/QRScannerModal';

interface MyAccount {
  id: string;
  userId: string;
}

interface RegisteredDevice {
  credentialId?: string;
}

export default function TransferPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [accountNumber, setAccountNumber] = useState(searchParams.get('accountNumber') || '');
  const [recipientName, setRecipientName] = useState('');
  const [recipientBank, setRecipientBank] = useState('NeoBank');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [step, setStep] = useState<'form' | 'verify'>('form');
  const [showOtp, setShowOtp] = useState(false);
  const [otp, setOtp] = useState('');
  const [verificationId, setVerificationId] = useState('');
  const [myAccount, setMyAccount] = useState<MyAccount | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  useEffect(() => {
    userService.getMyAccount().then(res => setMyAccount(res.data));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (accountNumber.length >= 10) {
        handleAccountLookup(accountNumber);
      } else {
        setRecipientName('');
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [accountNumber]);

  function handleAccountLookup(accNum: string) {
    if (!accNum) return;

    void (async () => {
      setIsSearching(true);
      try {
        const response = await userService.searchAccount(accNum);
        if (response.data) {
          setRecipientName(response.data.ownerName || '');
        }
      } catch (error) {
        console.error('Account not found:', error);
        setRecipientName('');
      } finally {
        setIsSearching(false);
      }
    })();
  }

  const handleScanQR = () => {
    setIsScannerOpen(true);
  };

  const handleScanResult = async (data: string) => {
    try {
      // The QR code could contain the account number directly or as a JSON
      let scannedAccountNumber = data;
      try {
        const parsed = JSON.parse(data) as { accountNumber?: string };
        scannedAccountNumber = parsed.accountNumber || data;
      } catch {
        // Not a JSON, use as is
      }

      if (scannedAccountNumber) {
        setStep('form');
        setAccountNumber(scannedAccountNumber);
        await handleAccountLookup(scannedAccountNumber);
        toast.success('Đã nhận số tài khoản từ QR');
      }
    } catch {
      toast.error('Invalid QR code format');
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!accountNumber || !amount || !description) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!recipientName) {
      toast.error('Please verify the recipient account');
      return;
    }

    setStep('verify');
  };

  const handleBiometricVerification = async () => {
    try {
      setIsLoading(true);
      
      const challengeRes = await securityService.getChallenge();
      const challenge = challengeRes.data;
      console.log('Biometric challenge received:', challenge);


      console.log("Allowed credential IDs for biometric verification:", challenge.allowedCredentialIds);
      const biometricData = await biometricUtils.authenticate(challenge.challenge, challenge.allowedCredentialIds);

      await transactionService.createTransaction({
        userId: myAccount?.userId,
        accountId: myAccount?.id,
        targetAccountNumber: accountNumber,
        amount: parseFloat(amount),
        description: description,
        transactionType: 'TRANSFER',
        verificationMethod: 'BIOMETRIC',
        credentialId: biometricData.credentialId,
        signature: biometricData.signature,
        challenge: challenge.challenge,
        clientDataJSON: biometricData.clientDataJSON,
        authenticatorData: biometricData.authenticatorData,
      });

      toast.success('Transfer successful!');
      setTimeout(() => {
        router.push('/dashboard');
      }, 1500);
    } catch (error: unknown) {
      console.error('Transfer failed:', error);
      
      // Check for OTP fallback from backend (Security-Service unavailable)
      const errorData =
        typeof error === 'object' && error && 'response' in error
          ? (error as { response?: { data?: { code?: number; message?: string } } }).response?.data
          : undefined;
      if (errorData?.code === 1008) { // OTP_REQUIRED
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
        targetAccountNumber: accountNumber,
        amount: parseFloat(amount),
        description: description,
        transactionType: 'TRANSFER',
        verificationMethod: 'EMAIL_OTP',
        verificationId: verificationId,
        otp: otp,
      });

      toast.success('Transfer successful via OTP!');
      setTimeout(() => {
        router.push('/dashboard');
      }, 1500);
    } catch (error: unknown) {
      handleError(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard" className="p-2 hover:bg-slate-100 rounded-full transition">
          <ArrowLeft size={24} className="text-slate-700" />
        </Link>
        <h1 className="text-3xl font-bold text-slate-800">
          {step === 'form' ? 'Transfer Money' : 'Verify Transfer'}
        </h1>
      </div>

      {step === 'form' ? (
        <div className="bg-white rounded-4xl p-8 shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-6 pb-6 border-b border-slate-100">
            <h2 className="text-xl font-bold text-slate-800">Recipient Details</h2>
            <button
              onClick={handleScanQR}
              className="text-blue-600 flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-xl font-medium hover:bg-blue-100 transition"
            >
              <ScanLine size={18} /> Scan QR
            </button>
          </div>

          <p className="text-sm text-slate-500 mb-6">
            Bạn có thể mở camera, đưa QR của người nhận vào trước máy để tự điền số tài khoản.
          </p>

          <form onSubmit={handleTransfer} className="space-y-6">
            {/* Account Number */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Account Number</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input 
                  type="text" 
                  placeholder="Enter 15-digit account number" 
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  maxLength={15}
                  className="w-full text-slate-900 pl-12 pr-4 py-3.5 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                />
                {isSearching && <Loader className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-blue-600" size={20} />}
              </div>
              {recipientName && (
                <p className="mt-2 text-sm text-green-600 font-medium flex items-center gap-1">
                  <span className="inline-block size-1.5 bg-green-500 rounded-full"></span> Found: {recipientName}
                </p>
              )}
            </div>

            {/* Bank */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Bank</label>
              <div className="relative">
                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <select
                  value={recipientBank}
                  onChange={(e) => setRecipientBank(e.target.value)}
                  className="w-full text-slate-900 pl-12 pr-4 py-3.5 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 outline-none font-medium appearance-none"
                >
                  <option>NeoBank (Internal)</option>
                  <option>Vietcombank</option>
                  <option>Techcombank</option>
                  <option>MB Bank</option>
                </select>
              </div>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Amount</label>
              <input 
                type="number" 
                placeholder="Enter amount in VND" 
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full text-slate-900 px-4 py-3.5 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 outline-none font-medium"
              />
              {amount && (
                <p className="mt-2 text-sm text-slate-600">
                  Total: {formatCurrency(parseFloat(amount))}
                </p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Transfer Description</label>
              <div className="relative">
                <AlignLeft className="absolute left-4 top-4 text-slate-400" size={20} />
                <textarea
                  placeholder="What is this transfer for?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full text-slate-900 pl-12 pr-4 py-3 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                ></textarea>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !accountNumber || !amount || !description}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold py-3.5 rounded-2xl transition flex justify-center items-center gap-2"
            >
              {isLoading ? <Loader className="animate-spin" size={20} /> : null}
              Continue to Verification
            </button>
          </form>
        </div>
      ) : (
        <div className="bg-white rounded-4xl p-8 shadow-sm border border-slate-100 space-y-6">
          <div className="bg-blue-50 rounded-2xl p-6 space-y-4">
            <h3 className="font-bold text-slate-800">Transfer Summary</h3>
            <div className="space-y-3">
              <SummaryRow label="To" value={recipientName} />
              <SummaryRow label="Amount" value={formatCurrency(parseFloat(amount))} />
              <SummaryRow label="Description" value={description} />
              <SummaryRow label="Bank" value={recipientBank} />
            </div>
          </div>

          <div className="space-y-6">
            {!showOtp ? (
              <>
                <p className="text-sm text-slate-600 font-medium">Complete your transfer with biometric authentication:</p>
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
                      <ScanLine size={20} />
                      Verify with Biometric
                    </>
                  )}
                </button>
              </>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-slate-600 font-medium text-center">
                  Enter the 6-digit code sent to your email
                </p>
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
                  Verify OTP & Transfer
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      <QRScannerModal 
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleScanResult}
      />
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
