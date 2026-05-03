"use client";
import { ArrowLeft, Search, Filter, Loader, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { transactionService, type TransactionResponse } from '@/app/services/transaction.service';
import { userService } from '@/app/services/user.service';
import { formatCurrency, formatDateTime, getTransactionTypeInfo, getTransactionStatusColor } from '@/app/lib/utils';
import { handleError } from '@/app/utils/error-handler';

export default function TransactionsPage() {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<TransactionResponse[]>([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [currentAccountId, setCurrentAccountId] = useState('');

  useEffect(() => {
    const loadMyAccount = async () => {
      try {
        const accountRes = await userService.getMyAccount();
        setCurrentAccountId(accountRes.data.id);
      } catch (error) {
        console.error('Error loading account context:', error);
      }
    };

    loadMyAccount();
  }, []);

  useEffect(() => {
    const loadTransactions = async () => {
      try {
        setLoading(true);
        const response = await transactionService.getMyTransactions(page, 20, searchKeyword);
        console.log("my transaction " ,response.data.data);
        setTransactions(response.data.data || []);
        setTotalPages(response.data.totalPages || 0);
      } catch (error) {
        console.error('Error loading transactions:', error);
        handleError(error);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(() => {
      loadTransactions();
    }, 500);

    const handleSocketNotification = () => {
      loadTransactions();
    };

    window.addEventListener('banker:notification', handleSocketNotification);

    return () => {
      clearTimeout(debounceTimer);
      window.removeEventListener('banker:notification', handleSocketNotification);
    };
  }, [page, searchKeyword]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard" className="p-2 hover:bg-slate-100 rounded-full transition">
          <ArrowLeft size={24} className="text-slate-700" />
        </Link>
        <h1 className="text-3xl font-bold text-slate-800">Transaction History</h1>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="Search by name, description or bank..." 
              value={searchKeyword}
              onChange={(e) => {
                setSearchKeyword(e.target.value);
                setPage(0);
              }}
              className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <button className="px-4 py-3 bg-slate-50 rounded-xl flex items-center gap-2 font-medium text-slate-700 hover:bg-slate-100 transition">
            <Filter size={20} /> Filter
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader className="animate-spin text-blue-600" size={32} />
          </div>
        ) : transactions.length === 0 ? (
          <p className="text-center text-slate-500 py-12">No transactions found</p>
        ) : (
          <div className="space-y-4">
            {transactions.map((tx) => (
              <Link key={tx.id} href={`/dashboard/transactions/${tx.id}`}>
                <TransactionRow transaction={tx} currentAccountId={currentAccountId} />
              </Link>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-6 pt-6 border-t border-slate-100">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-slate-600">
              Page {page + 1} of {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
              className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function TransactionRow({ transaction, currentAccountId }: { transaction: TransactionResponse; currentAccountId: string }) {
  const statusColor = getTransactionStatusColor(transaction.status);
  const isTransfer = transaction.transactionType === 'TRANSFER';
  const isIncoming = isTransfer
    ? transaction.targetAccountId === currentAccountId
    : ['DEPOSIT', 'WELCOME_BONUS', 'REFUND'].includes(transaction.transactionType);
  const counterpartyName = isIncoming
    ? (transaction.senderName || 'Unknown')
    : (transaction.receiverName || transaction.senderName || 'Unknown');

  return (
    <div className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-colors cursor-pointer group">
      <div className="flex items-center gap-4 flex-1">
        <div className={`size-12 rounded-2xl flex items-center justify-center text-white font-bold ${
          isIncoming ? 'bg-green-500' : 'bg-blue-500'
        }`}>
          {counterpartyName?.charAt(0) || 'T'}
        </div>
        <div className="flex-1">
          <p className="font-bold text-slate-800">
            {isIncoming ? 'From' : 'To'} {counterpartyName}
          </p>
          <p className="text-sm text-slate-400">
            {transaction.description || transaction.transactionType} • {formatDateTime(transaction.createdAt.toString())}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className={`font-bold text-lg ${isIncoming ? 'text-green-600' : 'text-slate-800'}`}>
          {isIncoming ? '+' : '-'} {formatCurrency(transaction.amount)}
        </p>
        <p className={`text-xs font-medium rounded-full px-2 py-1 ${statusColor}`}>
          {transaction.status}
        </p>
      </div>
      <ChevronRight className="text-slate-300 group-hover:text-slate-400 ml-4" size={20} />
    </div>
  );
}
