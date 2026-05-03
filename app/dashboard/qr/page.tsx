"use client";
import { ArrowLeft, QrCode as QrIcon, ScanLine, Share2, Download, Loader } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { userService } from '@/app/services/user.service';
import { generateQRCode } from '@/app/lib/utils';
import { handleError } from '@/app/utils/error-handler';
import toast from 'react-hot-toast';
import QRScannerModal from '@/app/components/QRScannerModal';
import { useRouter } from 'next/navigation';

export default function QRCodePage() {
  const [loading, setLoading] = useState(true);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const loadAccountInfo = async () => {
      try {
        setLoading(true);
        const response = await userService.getMyAccount();
        const accountData = response.data;
        
        setAccountNumber(accountData.accountNumber);
        setUserName(accountData.ownerName);

        // QR should carry the account number so the transfer screen can resolve it directly.
        const qrPayload = JSON.stringify({
          accountNumber: accountData.accountNumber,
          accountId: accountData.id,
          ownerName: accountData.ownerName,
        });
        const qrUrl = await generateQRCode(qrPayload);
        setQrCodeUrl(qrUrl);
      } catch (error) {
        console.error('Error loading account info:', error);
        handleError(error);
      } finally {
        setLoading(false);
      }
    };

    loadAccountInfo();
  }, []);

  const handleDownloadQR = async () => {
    try {
      const link = document.createElement('a');
      link.href = qrCodeUrl;
      link.download = `qr-code-${accountNumber}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('QR Code downloaded!');
    } catch {
      toast.error('Failed to download QR code');
    }
  };

  const handleShareQR = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'My NeoBank QR Code',
          text: `Scan to transfer money to me (${userName})`,
          url: window.location.href,
        });
        toast.success('QR Code shared!');
      } else {
        toast.error('Sharing not supported on this device');
      }
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      toast.error('Failed to share QR code');
    }
  };

  const handleScanQR = () => {
    setIsScannerOpen(true);
  };

  const handleScanResult = (data: string) => {
    // Navigate to transfer page with the scanned account number
    let accountNumber = data;
    try {
      const parsed = JSON.parse(data);
      accountNumber = parsed.accountNumber || data;
    } catch {
      // Not a JSON
    }
    
    if (accountNumber) {
      router.push(`/dashboard/transfer?accountNumber=${accountNumber}`);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard" className="p-2 hover:bg-slate-100 rounded-full transition">
          <ArrowLeft size={24} className="text-slate-700" />
        </Link>
        <h1 className="text-2xl font-bold text-slate-800">My QR Code</h1>
      </div>

      <div className="bg-white rounded-[2.5rem] p-8 shadow-lg border border-slate-100 flex flex-col items-center">
        <div className="size-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
          <QrIcon size={32} />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-1">NeoBank Account</h2>
        <p className="text-slate-500 mb-8">Đưa mã vào camera là tự nhận ra số tài khoản để chuyển tiền</p>

        {/* QR Code Display */}
        {loading ? (
          <div className="w-64 h-64 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl flex items-center justify-center mb-8">
            <Loader className="animate-spin text-slate-400" size={48} />
          </div>
        ) : qrCodeUrl ? (
          <div className="w-64 h-64 bg-slate-50 rounded-3xl flex items-center justify-center mb-8 overflow-hidden border-2 border-slate-200">
            <img src={qrCodeUrl} alt="QR Code" className="w-full h-full object-contain" />
          </div>
        ) : (
          <div className="w-64 h-64 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center mb-8">
            <ScanLine size={64} className="text-slate-300 mb-4" />
            <p className="text-sm font-medium text-slate-400">Failed to generate QR code</p>
          </div>
        )}

        {/* Account Number */}
        <p className="text-lg font-mono tracking-widest font-bold text-slate-700 mb-8">
          {accountNumber}
        </p>

        {/* Action Buttons */}
        <div className="flex gap-4 w-full">
          <button
            onClick={handleDownloadQR}
            disabled={loading || !qrCodeUrl}
            className="flex-1 bg-slate-100 hover:bg-slate-200 disabled:bg-slate-50 text-slate-700 font-bold py-3.5 rounded-2xl flex justify-center items-center gap-2 transition"
          >
            <Download size={20} /> Save
          </button>
          <button
            onClick={handleShareQR}
            disabled={loading || !qrCodeUrl}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-3.5 rounded-2xl flex justify-center items-center gap-2 transition"
          >
            <Share2 size={20} /> Share
          </button>
        </div>
      </div>
      
      {/* Scan Other QR */}
      <button
        onClick={handleScanQR}
        className="bg-slate-900 text-white rounded-3xl p-6 flex items-center justify-between shadow-xl hover:bg-slate-800 transition w-full cursor-pointer"
      >
        <div>
          <h3 className="font-bold text-lg mb-1">Quét QR bằng camera</h3>
          <p className="text-slate-400 text-sm">Đưa mã QR trước camera để tự điền số tài khoản transfer</p>
        </div>
        <div className="size-12 bg-white/10 rounded-full flex items-center justify-center">
          <ScanLine size={24} />
        </div>
      </button>

      <QRScannerModal 
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleScanResult}
      />
    </div>
  );
}

