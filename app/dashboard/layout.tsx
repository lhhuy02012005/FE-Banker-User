"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { LayoutDashboard, ReceiptCent, CreditCard, LogOut, Bell, Fingerprint, Sparkles, ChevronDown, Clock3, CheckCheck, X, Inbox } from 'lucide-react';
import { biometricUtils } from '../lib/webauthn';
import { authService } from '../services/auth.service';
import { getDeviceId } from '../lib/axios';
import { userService } from '../services/user.service';
import { connectNotificationSocket } from '../lib/notification-socket';

type AppNotification = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  seen: boolean;
  type?: string;
  amount?: string | number;
  transactionId?: string;
};

const NOTIFICATION_STORAGE_KEY = 'banker_notifications';
const MAX_NOTIFICATIONS = 20;

const readStoredNotifications = (): AppNotification[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(NOTIFICATION_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AppNotification[];
    if (!Array.isArray(parsed)) return [];

    // Remove duplicate ids while preserving order (most recent first)
    const seen = new Set<string>();
    const deduped: AppNotification[] = [];
    for (const item of parsed) {
      if (!item || !item.id) continue;
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      deduped.push(item);
    }
    return deduped;
  } catch { return []; }
};

const buildNotification = (payload: any): AppNotification => ({
  id: payload.transactionId || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  title: payload.title || payload.eventType || 'NeoBank Update',
  body: payload.body || payload.content || 'You have a new update.',
  createdAt: new Date().toISOString(),
  seen: false,
  type: payload.eventType || payload.type,
  amount: payload.amount,
  transactionId: payload.transactionId,
});

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isReady, setIsReady] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notificationPage, setNotificationPage] = useState(1);
  const notificationPanelRef = useRef<HTMLDivElement>(null);
  
  const NOTIFICATIONS_PER_PAGE = 5;

  const handleQuickSetup = useCallback(async () => {
    try {
      const challengeRes = await authService.getChallenge();
      const userProfile = await userService.getMyProfile();
      const result = await biometricUtils.register(challengeRes.data.challenge, userProfile.data?.phoneNumber || 'user');
      await authService.enableBiometric({
        deviceId: getDeviceId(),
        deviceName: result.deviceName || navigator.userAgent,
        publicKey: result.publicKey,
        credentialId: result.credentialId,
      });
      localStorage.setItem('biometric_enabled', 'true');
      toast.success('Biometric activated!');
    } catch (error) { toast.error('Setup failed'); }
  }, []);

  const checkBiometricSetup = useCallback(async () => {
    const isSupported = await biometricUtils.isSupported();
    if (isSupported && localStorage.getItem('biometric_enabled') !== 'true') {
      toast((t) => (
        <div className="flex flex-col gap-3 p-1">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-xl text-white"><Fingerprint size={24} /></div>
            <div><p className="font-bold">Secure Your Account</p></div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => toast.dismiss(t.id)} className="text-xs text-slate-400">Later</button>
            <button onClick={() => { toast.dismiss(t.id); void handleQuickSetup(); }} className="px-3 py-1.5 text-xs bg-slate-900 text-white rounded-lg">Enable</button>
          </div>
        </div>
      ), { position: 'bottom-right' });
    }
  }, [handleQuickSetup]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return router.push('/auth/login');
    const initialize = async () => {
      try {
        const profileRes = await userService.getMyProfile();
        setIsReady(true);
        void checkBiometricSetup();
        if (profileRes.data?.id) {
          connectNotificationSocket(token, profileRes.data.id, (payload) => {
            window.dispatchEvent(new CustomEvent('banker:notification', { detail: payload }));
          });
        }
      } catch { router.push('/auth/login'); }
    };
    void initialize();
  }, [router, checkBiometricSetup]);

  useEffect(() => {
    setNotifications(readStoredNotifications());
    const handleIncoming = (e: any) => {
      const next = buildNotification(e.detail);
      setNotifications((prev) => {
        // ensure we don't have duplicates: remove any with same id, then prepend
        const filtered = prev.filter((p) => p.id !== next.id);
        return [next, ...filtered].slice(0, MAX_NOTIFICATIONS);
      });
    };

    window.addEventListener('banker:notification', handleIncoming);
    return () => window.removeEventListener('banker:notification', handleIncoming);
  }, []);

  useEffect(() => {
    localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(notifications));
  }, [notifications]);

  if (!isReady) return <div className="min-h-screen bg-white" />;

  const unreadCount = notifications.filter(n => !n.seen).length;
  const totalPages = Math.ceil(notifications.length / NOTIFICATIONS_PER_PAGE);
  const startIdx = (notificationPage - 1) * NOTIFICATIONS_PER_PAGE;
  const endIdx = startIdx + NOTIFICATIONS_PER_PAGE;
  const paginatedNotifications = notifications.slice(startIdx, endIdx);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-slate-100 p-6 hidden lg:flex flex-col">
        <div className="flex items-center gap-3 px-2 mb-10">
          <div className="size-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg"><span className="text-white font-black text-xl">N</span></div>
          <span className="text-xl font-bold">NeoBank</span>
        </div>
        <nav className="flex-1 space-y-2">
          <NavItem icon={<LayoutDashboard size={20}/>} label="Overview" active={pathname === '/dashboard'} href="/dashboard" />
          <NavItem icon={<Sparkles size={20}/>} label="Campaigns" active={pathname.startsWith('/dashboard/campaign')} href="/dashboard/campaign" />
          <NavItem icon={<ReceiptCent size={20}/>} label="Transactions" active={pathname.startsWith('/dashboard/transactions')} href="/dashboard/transactions" />
          <NavItem icon={<CreditCard size={20}/>} label="My Cards" active={pathname.startsWith('/dashboard/profile')} href="/dashboard/profile" />
        </nav>
        <button onClick={() => {localStorage.clear(); router.push('/auth/login');}} className="flex items-center gap-3 p-4 text-red-500 hover:bg-red-50 rounded-2xl font-medium"><LogOut size={20}/> Logout</button>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-8 shrink-0 z-40">
          <h2 className="font-bold text-slate-800 text-lg">Good afternoon, Huy!</h2>
          <div className="relative flex items-center gap-4" ref={notificationPanelRef}>
            <button
              onClick={() => {setIsNotificationOpen(!isNotificationOpen); if (!isNotificationOpen) setNotificationPage(1); setNotifications(prev => prev.map(n => ({...n, seen: true})));}}
              className={`relative flex items-center gap-2 rounded-full border px-4 py-2.5 transition-all ${isNotificationOpen ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-500'}`}
            >
              <Bell size={18} />
              <ChevronDown size={16} className={isNotificationOpen ? 'rotate-180' : ''} />
              {unreadCount > 0 && <span className="absolute -top-1 -right-1 size-5 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center border-2 border-white">{unreadCount}</span>}
            </button>

            {/* Notification Panel - FIX CỐT LÕI TẠI ĐÂY */}
            {isNotificationOpen && (
              <div className="absolute right-0 top-full mt-3 w-96 rounded-3xl border border-slate-200 bg-white shadow-2xl overflow-hidden z-[9999]">
                <div className="bg-slate-900 text-white p-5"> {/* Đổi sang màu Solid đậm, không dùng Gradient hay Blur */}
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-xs uppercase tracking-widest text-slate-400 font-bold">Notifications</p>
                    <button onClick={() => setIsNotificationOpen(false)} className="hover:bg-white/10 p-1 rounded-lg"><X size={16} /></button>
                  </div>
                  <h3 className="text-lg font-bold">Recent activity</h3>
                </div>

                <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50">
                  <p className="text-sm font-semibold text-slate-600">{notifications.length} total</p>
                  <button onClick={() => {setNotifications([]); setNotificationPage(1);}} className="text-xs font-bold text-blue-600 hover:underline">Clear all</button>
                </div>

                <div className="max-h-96 overflow-y-auto bg-white">
                  {notifications.length === 0 ? (
                    <div className="py-12 text-center text-slate-400">
                        <Inbox size={32} className="mx-auto mb-2 opacity-20" />
                        <p className="text-sm">No new alerts</p>
                    </div>
                  ) : (
                    paginatedNotifications.map((n) => (
                      <div key={n.id} className={`px-5 py-4 border-b border-slate-50 flex gap-4 hover:bg-slate-50 transition-colors ${!n.seen ? 'bg-blue-50/50' : ''}`}>
                        <div className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${!n.seen ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                          {n.type?.includes('TRANSFER') ? <ReceiptCent size={18}/> : <Bell size={18} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-900 text-sm truncate">{n.title}</p>
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.body}</p>
                          <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-400">
                             <Clock3 size={10} /> {new Date(n.createdAt).toLocaleTimeString()}
                             {n.amount && <span className="text-blue-600 font-bold ml-auto">{n.amount}</span>}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {notifications.length > 0 && (
                  <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                    <button
                      onClick={() => setNotificationPage(p => Math.max(1, p - 1))}
                      disabled={notificationPage === 1}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      ← Previous
                    </button>
                    <span className="text-xs font-medium text-slate-600">
                      {notificationPage} / {totalPages}
                    </span>
                    <button
                      onClick={() => setNotificationPage(p => Math.min(totalPages, p + 1))}
                      disabled={notificationPage === totalPages}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      Next →
                    </button>
                  </div>
                )}
              </div>
            )}
            <div className="size-10 bg-blue-600 rounded-full border-2 border-white shadow-sm overflow-hidden">
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=Huy`} alt="avatar" />
            </div>
          </div>
        </header>
        <section className="flex-1 overflow-y-auto p-8">{children}</section>
      </main>
    </div>
  );
}

function NavItem({ icon, label, active = false, href = '#' }: any) {
  return (
    <Link href={href} className={`flex items-center gap-3 p-4 rounded-2xl transition-all font-medium ${active ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}>
      {icon} {label}
    </Link>
  );
}