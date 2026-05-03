"use client";
import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Upload } from 'lucide-react';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (data: string) => void;
}

export default function QRScannerModal({ isOpen, onClose, onScan }: QRScannerModalProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    let isActive = true;
    const scanner = new Html5Qrcode('reader');
    scannerRef.current = scanner;

    const stopScanner = async () => {
      try {
        if (scanner.isScanning) {
          await scanner.stop();
        }
      } catch {
        // Ignore stop errors when the component is closing.
      }

      try {
        await scanner.clear();
      } catch {
        // Ignore clear errors when the component is closing.
      }
    };

    const handleScanSuccess = async (decodedText: string) => {
      if (!isActive) return;
      isActive = false;
      await stopScanner();
      onScan(decodedText);
      onClose();
    };

    const startScanner = async () => {
      try {
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          handleScanSuccess,
          () => {
            // Ignore frame decode noise while scanning.
          }
        );
      } catch (primaryError) {
        try {
          await scanner.start(
            { facingMode: 'user' },
            { fps: 10, qrbox: { width: 250, height: 250 } },
            handleScanSuccess,
            () => {
              // Ignore frame decode noise while scanning.
            }
          );
        } catch (fallbackError) {
          console.error('Failed to start QR scanner', fallbackError || primaryError);
        }
      }
    };

    void startScanner();

    return () => {
      isActive = false;
      void stopScanner();
      scannerRef.current = null;
    };
  }, [isOpen, onClose, onScan]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !scannerRef.current) return;

    try {
      setIsUploading(true);
      const decodedText = await scannerRef.current.scanFile(file, true);
      onScan(decodedText);
      onClose();
    } catch (error) {
      console.error('Failed to scan QR from image', error);
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-4xl w-full max-w-md overflow-hidden relative">
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 p-2 hover:bg-slate-100 rounded-full transition z-10"
        >
          <X size={24} className="text-slate-500" />
        </button>
        
        <div className="p-8">
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Scan QR Code</h2>
          <p className="text-slate-500 mb-6">Đưa QR vào camera, máy sẽ tự nhận số tài khoản</p>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
          />

          <button
            type="button"
            onClick={handleUploadClick}
            disabled={isUploading}
            className="mb-4 w-full flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Upload size={18} />
            {isUploading ? 'Đang quét ảnh...' : 'Upload ảnh QR từ thiết bị'}
          </button>
          
          <div id="reader" className="overflow-hidden rounded-2xl border-none"></div>
          
          <p className="mt-6 text-center text-sm text-slate-400">
            Hãy cấp quyền camera nếu trình duyệt hỏi
          </p>
        </div>
      </div>
    </div>
  );
}
