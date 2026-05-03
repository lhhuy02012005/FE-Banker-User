"use client";
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useRef } from 'react';
import { Plus, Send, QrCode, ArrowUpRight, Eye, EyeOff, User, MinusCircle, Loader, ArrowLeft, ChevronRight, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { userService } from '@/app/services/user.service';
import { transactionService, type TransactionResponse } from '@/app/services/transaction.service';
import { formatCurrency, maskAccountNumber, formatTime, getTransactionStatusColor } from '@/app/lib/utils';
import { toast } from 'react-hot-toast';
import { handleError } from '@/app/utils/error-handler';

export default function DashboardPage() {
  const [showBalance, setShowBalance] = useState(false);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState<number>(0);
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [currentAccountId, setCurrentAccountId] = useState<string>('');
  const [recentTransactions, setRecentTransactions] = useState<TransactionResponse[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [txLoading, setTxLoading] = useState(false);
  const balanceRef = useRef<number>(0);
  const hasLoadedAccountRef = useRef(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const accountRes = await userService.getMyAccount();
      const accountData = accountRes.data;
      setBalance(accountData.balance);
      balanceRef.current = accountData.balance;
      hasLoadedAccountRef.current = true;
      setAccountNumber(accountData.accountNumber);
      setCurrentAccountId(accountData.id);
      await loadTransactions(0);
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async (page: number) => {
    try {
      setTxLoading(true);
      const txRes = await transactionService.getMyTransactions(page, 10);
      setRecentTransactions(txRes.data.data || []);
      setTotalPages(txRes.data.totalPages || 0);
      setCurrentPage(page);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setTxLoading(false);
    }
  };

  const refreshBalanceRealtime = async (notify: boolean) => {
    try {
      const accountRes = await userService.getMyAccount();
      const accountData = accountRes.data;
      const nextBalance = Number(accountData.balance || 0);
      const previousBalance = balanceRef.current;
      const hasChanged = hasLoadedAccountRef.current && nextBalance !== previousBalance;

      setBalance(nextBalance);
      setAccountNumber(accountData.accountNumber);
      setCurrentAccountId(accountData.id);
      balanceRef.current = nextBalance;
      hasLoadedAccountRef.current = true;

      if (notify && hasChanged) {
        const diff = nextBalance - previousBalance;
        const absDiff = formatCurrency(Math.abs(diff));
        const direction = diff >= 0 ? 'increased' : 'decreased';
        toast.success(`Balance ${direction}: ${absDiff}`);
        await loadTransactions(0);
      }
    } catch (error) {
      console.error('Realtime balance refresh failed:', error);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const startPolling = () => {
      if (intervalId !== null) return;
      intervalId = setInterval(() => {
        if (document.visibilityState === 'visible' && navigator.onLine) {
          void refreshBalanceRealtime(true);
        }
      }, 10000);
    };

    const stopPolling = () => {
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void refreshBalanceRealtime(false);
        startPolling();
      } else {
        stopPolling();
      }
    };

    const handleOnline = () => {
      void refreshBalanceRealtime(false);
      startPolling();
    };

    const handleNotificationEvent = () => {
      void refreshBalanceRealtime(false);
      void loadTransactions(0);
    };

    const handleSocketNotification = (event: Event) => {
      const customEvent = event as CustomEvent;
      const title = customEvent.detail?.title || 'NeoBank';
      const body = customEvent.detail?.body || 'You have a new update.';

      toast(`${title}: ${body}`, { icon: '🔔' });
      handleNotificationEvent();
    };

    startPolling();
    window.addEventListener('banker:notification', handleSocketNotification as EventListener);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);

    return () => {
      stopPolling();
      window.removeEventListener('banker:notification', handleSocketNotification as EventListener);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Top Section: Balance & Actions */}
      <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl shadow-slate-200">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <p className="text-slate-400 font-medium">Current Balance</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowBalance(!showBalance)} className="text-slate-400 hover:text-white transition">
                {showBalance ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
              <button onClick={() => {
                toast.success('Refreshing...');
                loadData(); 
              }} className="text-slate-400 hover:text-white transition">
                <Loader size={18} className={loading ? "animate-spin" : ""} />
              </button>
            </div>
          </div>
          <h1 className="text-5xl font-bold tracking-tight mb-10">
            {loading ? (
              <Loader className="inline animate-spin mr-2" size={40} />
            ) : showBalance ? (
              formatCurrency(balance)
            ) : (
              '*'.repeat(10) + ' VND'
            )}
          </h1>
            <p className="mb-8 text-sm text-slate-400">
              Account {maskAccountNumber(accountNumber)}
            </p>
          
          <div className="flex flex-wrap gap-4">
            <Link href="/dashboard/deposit">
              <ActionButton icon={<Plus/>} label="Deposit" primary />
            </Link>
            <Link href="/dashboard/withdraw">
              <ActionButton icon={<MinusCircle/>} label="Withdraw" />
            </Link>
            <Link href="/dashboard/transfer">
              <ActionButton icon={<Send/>} label="Transfer" />
            </Link>
            <Link href="/dashboard/qr">
              <ActionButton icon={<QrCode/>} label="QR Code" />
            </Link>
            <Link href="/dashboard/profile">
              <ActionButton icon={<User/>} label="Profile" />
            </Link>
            <Link href="/dashboard/campaign">
              <ActionButton icon={<Sparkles/>} label="Campaigns" />
            </Link>
          </div>
        </div>
        {/* Decorative background circle */}
        <div className="absolute -top-24 -right-24 size-64 bg-blue-600/20 rounded-full blur-3xl"></div>
      </div>

      {/* Bottom Section: History */}
      <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-slate-800">Transaction History</h3>
          <div className="flex items-center gap-2">
            <button 
              disabled={currentPage === 0 || txLoading}
              onClick={() => loadTransactions(currentPage - 1)}
              className="p-2 rounded-xl border border-slate-100 disabled:opacity-30 hover:bg-slate-50 transition"
            >
              <ArrowLeft size={18} />
            </button>
            <span className="text-sm font-medium text-slate-500">
              Page {currentPage + 1} of {totalPages || 1}
            </span>
            <button 
              disabled={currentPage >= totalPages - 1 || txLoading}
              onClick={() => loadTransactions(currentPage + 1)}
              className="p-2 rounded-xl border border-slate-100 disabled:opacity-30 hover:bg-slate-50 transition"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <div className="space-y-2">
          {txLoading ? (
            <div className="flex justify-center py-8">
              <Loader className="animate-spin text-blue-600" size={32} />
            </div>
          ) : recentTransactions.length === 0 ? (
            <div className="text-center py-12">
              <div className="size-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <ArrowUpRight className="text-slate-300" size={32} />
              </div>
              <p className="text-slate-500 font-medium">No transactions yet</p>
              <p className="text-sm text-slate-400">Start by making a deposit or transfer</p>
            </div>
          ) : (
            recentTransactions.map((tx) => (
              <Link key={tx.id} href={`/dashboard/transactions/${tx.id}`}>
                <TransactionItem transaction={tx} currentAccountId={currentAccountId} />
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

type ActionButtonProps = {
  icon: React.ReactNode;
  label: string;
  primary?: boolean;
};

function ActionButton({ icon, label, primary = false }: ActionButtonProps) {
  return (
    <div className={`flex items-center gap-2 px-6 py-3.5 rounded-2xl font-bold transition-all cursor-pointer ${
      primary ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-white/10 text-white hover:bg-white/20 backdrop-blur-md'
    }`}>
      {icon} {label}
    </div>
  );
}

type TransactionItemProps = {
  transaction: TransactionResponse;
  currentAccountId: string;
};

function TransactionItem({ transaction, currentAccountId }: TransactionItemProps) {
  const isTransfer = transaction.transactionType === 'TRANSFER';
  const isIncoming = isTransfer
    ? transaction.targetAccountId === currentAccountId
    : ['DEPOSIT', 'WELCOME_BONUS', 'REFUND'].includes(transaction.transactionType);
  const statusColor = getTransactionStatusColor(transaction.status);
  const counterpartyName = isIncoming
    ? (transaction.senderName || 'Unknown')
    : (transaction.receiverName || transaction.senderName || 'Unknown');

  return (
    <div className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-colors cursor-pointer group">
      <div className="flex items-center gap-4">
        <div className={`size-12 rounded-2xl flex items-center justify-center text-white font-bold ${
          isIncoming ? 'bg-green-500' : 'bg-blue-500'
        }`}>
          {transaction.senderName?.charAt(0) || transaction.receiverName?.charAt(0) || 'T'}
        </div>
        <div>
          <p className="font-bold text-slate-800">
            {isIncoming ? 'From' : 'To'} {counterpartyName}
          </p>
          <p className="text-sm text-slate-400">{transaction.description || transaction.transactionType}</p>
        </div>
      </div>
      <div className="text-right">
        <p className={`font-bold text-lg ${isIncoming ? 'text-green-600' : 'text-slate-800'}`}>
          {isIncoming ? '+' : '-'} {formatCurrency(transaction.amount)}
        </p>
        <div className="flex items-center justify-end gap-2">
          <p className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${statusColor}`}>
            {transaction.status}
          </p>
          <p className="text-xs text-slate-400">{formatTime(transaction.createdAt.toString())}</p>
        </div>
      </div>
    </div>
  );
}