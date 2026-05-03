"use client";
import { ArrowLeft, Copy, Check, Loader } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { transactionService, type TransactionResponse } from '@/app/services/transaction.service';
import { userService } from '@/app/services/user.service';
import { formatCurrency, formatDateTime, getTransactionTypeInfo, getTransactionStatusColor } from '@/app/lib/utils';
import { handleError } from '@/app/utils/error-handler';
import toast from 'react-hot-toast';

export default function TransactionDetailPage() {
  const params = useParams();
  const transactionId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [transaction, setTransaction] = useState<TransactionResponse | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [currentAccountId, setCurrentAccountId] = useState('');

  useEffect(() => {
    const loadTransaction = async () => {
      try {
        setLoading(true);
        const [response, accountRes] = await Promise.all([
          transactionService.getTransactionDetail(transactionId),
          userService.getMyAccount(),
        ]);
        setTransaction(response.data);
        setCurrentAccountId(accountRes.data.id);
      } catch (error) {
        console.error('Error loading transaction:', error);
        handleError(error);
      } finally {
        setLoading(false);
      }
    };

    if (transactionId) {
      loadTransaction();
    }

    const handleSocketNotification = () => {
      if (transactionId) {
        loadTransaction();
      }
    };

    window.addEventListener('banker:notification', handleSocketNotification);

    return () => {
      window.removeEventListener('banker:notification', handleSocketNotification);
    };
  }, [transactionId]);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success('Copied!');
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto flex justify-center items-center min-h-100">
        <Loader className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/transactions" className="p-2 hover:bg-slate-100 rounded-full transition">
            <ArrowLeft size={24} className="text-slate-700" />
          </Link>
          <h1 className="text-3xl font-bold text-slate-800">Transaction Not Found</h1>
        </div>
      </div>
    );
  }

  const isTransfer = transaction.transactionType === 'TRANSFER';
  const isIncoming = isTransfer
    ? transaction.targetAccountId === currentAccountId
    : ['DEPOSIT', 'WELCOME_BONUS', 'REFUND'].includes(transaction.transactionType);
  const typeInfo = getTransactionTypeInfo(transaction.transactionType);
  const statusColor = getTransactionStatusColor(transaction.status);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/transactions" className="p-2 hover:bg-slate-100 rounded-full transition">
          <ArrowLeft size={24} className="text-slate-700" />
        </Link>
        <h1 className="text-3xl font-bold text-slate-800">Transaction Details</h1>
      </div>

      <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 space-y-6">
        {/* Status & Amount */}
        <div className="text-center pb-6 border-b border-slate-100">
          <p className={`text-sm font-bold rounded-full inline-block px-3 py-1 mb-4 ${statusColor}`}>
            {transaction.status}
          </p>
          <h2 className={`text-4xl font-bold ${isIncoming ? 'text-green-600' : 'text-slate-800'}`}>
            {isIncoming ? '+' : '-'} {formatCurrency(transaction.amount)}
          </h2>
          <p className={`text-lg font-semibold ${typeInfo.color} mt-2`}>{typeInfo.label}</p>
        </div>

        {/* Transaction Info */}
        <div className="space-y-4">
          <h3 className="font-bold text-slate-700 text-lg">Transaction Information</h3>
          
          {/* Date & Time */}
          <InfoRow 
            label="Date & Time" 
            value={formatDateTime(transaction.createdAt)}
          />

          {/* Transaction ID */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
            <div>
              <p className="text-sm text-slate-500 font-medium">Transaction ID</p>
              <p className="font-mono text-slate-800">{transaction.id.substring(0, 12)}...</p>
            </div>
            <button
              onClick={() => copyToClipboard(transaction.id, 'id')}
              className="p-2 hover:bg-slate-200 rounded-lg transition"
            >
              {copiedField === 'id' ? <Check size={20} className="text-green-600" /> : <Copy size={20} />}
            </button>
          </div>

          {/* Description */}
          {transaction.description && (
            <InfoRow 
              label="Description" 
              value={transaction.description}
            />
          )}
        </div>

        {/* Sender Info */}
        <div className="space-y-4 pt-6 border-t border-slate-100">
          <h3 className="font-bold text-slate-700 text-lg">Sender Information</h3>
          <InfoRow 
            label="Sender Name" 
            value={transaction.senderName || 'N/A'}
          />
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
            <div>
              <p className="text-sm text-slate-500 font-medium">Account Number</p>
              <p className="font-mono text-slate-800">{transaction.senderAccountNumber}</p>
            </div>
            <button
              onClick={() => copyToClipboard(transaction.senderAccountNumber, 'senderAccount')}
              className="p-2 hover:bg-slate-200 rounded-lg transition"
            >
              {copiedField === 'senderAccount' ? <Check size={20} className="text-green-600" /> : <Copy size={20} />}
            </button>
          </div>
        </div>

        {/* Receiver Info (if transfer) */}
        {transaction.transactionType === 'TRANSFER' && transaction.receiverName && (
          <div className="space-y-4 pt-6 border-t border-slate-100">
            <h3 className="font-bold text-slate-700 text-lg">Recipient Information</h3>
            <InfoRow 
              label="Recipient Name" 
              value={transaction.receiverName}
            />
            {transaction.receiverAccountNumber && (
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <div>
                  <p className="text-sm text-slate-500 font-medium">Account Number</p>
                  <p className="font-mono text-slate-800">{transaction.receiverAccountNumber}</p>
                </div>
                <button
                  onClick={() => copyToClipboard(transaction.receiverAccountNumber!, 'receiverAccount')}
                  className="p-2 hover:bg-slate-200 rounded-lg transition"
                >
                  {copiedField === 'receiverAccount' ? <Check size={20} className="text-green-600" /> : <Copy size={20} />}
                </button>
              </div>
            )}
            {transaction.bank && (
              <InfoRow 
                label="Bank" 
                value={transaction.bank}
              />
            )}
          </div>
        )}

        {/* Failure Reason */}
        {transaction.status === 'FAILED' && transaction.failureReason && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-sm font-bold text-red-700 mb-2">Failure Reason</p>
            <p className="text-red-600">{transaction.failureReason}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
      <p className="text-sm text-slate-500 font-medium">{label}</p>
      <p className="font-medium text-slate-800">{value}</p>
    </div>
  );
}
