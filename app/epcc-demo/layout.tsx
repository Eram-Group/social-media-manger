'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  LayoutDashboard,
  Share2,
  PenSquare,
  CalendarDays,
  Users,
  FileBarChart,
  Megaphone,
  Inbox,
  Sparkles,
  Headset,
  LifeBuoy,
  Menu,
  X,
} from 'lucide-react';
import { cn } from '@/shadecn/lib/utils';
import { EPCC_ROUTES } from '@/modules/EpccDemo/routes';
import { PostsProvider } from '@/mock-server/posts-store';
import { AiChatProvider } from '@/mock-server/ai-chat-store';
import AiAssistantWidget from '@/modules/EpccDemo/_components/AiAssistantWidget';

const NAV = [
  { to: EPCC_ROUTES.COMMAND_CENTER, label: 'Command Center', icon: LayoutDashboard },
  { to: EPCC_ROUTES.ACCOUNTS, label: 'Accounts', icon: Share2 },
  { to: EPCC_ROUTES.POSTS, label: 'Posts', icon: PenSquare },
  { to: EPCC_ROUTES.CALENDAR, label: 'Calendar', icon: CalendarDays },
  { to: EPCC_ROUTES.REPORTS, label: 'Reports', icon: FileBarChart },
  { to: EPCC_ROUTES.PROMOTION, label: 'Paid Promotion', icon: Megaphone },
  { to: EPCC_ROUTES.INBOX, label: 'Inbox', icon: Inbox },
  { to: EPCC_ROUTES.AI, label: 'AI Assistant', icon: Sparkles },
  { to: EPCC_ROUTES.SUPPORT, label: 'Support', icon: Headset },
];

export default function EpccDemoLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  // Close the mobile drawer whenever the route changes.
  useEffect(() => { setNavOpen(false); }, [pathname]);
  // Scroll the content area back to the top on every route change, so a new
  // page never opens already scrolled down from the previous one.
  useEffect(() => { mainRef.current?.scrollTo({ top: 0 }); }, [pathname]);

  const isActive = (to: string) => pathname === to || pathname.startsWith(`${to}/`);

  return (
    <PostsProvider>
    <AiChatProvider>
    <div className="flex h-screen overflow-hidden bg-surface-background font-Poppins text-text-dark">
      {/* Mobile backdrop */}
      <AnimatePresence>
        {navOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setNavOpen(false)}
            className="fixed inset-0 z-30 bg-black/40 lg:hidden" />
        )}
      </AnimatePresence>

      {/* Sidebar — static on lg, slide-in drawer below lg */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex h-screen w-64 flex-col border-r border-neutral-200 bg-white transition-transform duration-300 lg:static lg:z-auto lg:translate-x-0',
          navOpen ? 'translate-x-0' : '-translate-x-full',
        )}>
        <div className="flex items-center justify-between px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-800 font-Sora text-sm font-bold text-white">EP</div>
            <div className="leading-tight">
              <p className="font-Sora text-sm font-semibold">EP Chamber</p>
              <p className="text-xs text-neutral-500">Social Command Center</p>
            </div>
          </div>
          <button onClick={() => setNavOpen(false)} className="text-neutral-400 hover:text-neutral-700 lg:hidden"><X size={20} /></button>
        </div>

        <nav className="mt-2 flex flex-1 flex-col gap-1 overflow-y-auto px-3">
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              href={to}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                isActive(to) ? 'bg-secondary-200 font-medium text-primary-900' : 'text-neutral-700 hover:bg-neutral-100',
              )}>
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </nav>

        <div className="m-3 rounded-lg bg-primary-100 p-3">
          <p className="flex items-center gap-2 text-xs font-medium text-primary-900"><LifeBuoy size={14} /> 24/7 Support</p>
          <p className="mt-1 text-xs text-neutral-600">Dedicated contact: <span className="font-medium">+966 13 000 0000</span></p>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-neutral-200 bg-white px-4 py-3 sm:px-6 lg:px-8 lg:py-4">
          <div className="flex min-w-0 items-center gap-3">
            <button onClick={() => setNavOpen(true)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-neutral-200 text-neutral-700 hover:bg-neutral-100 lg:hidden" aria-label="Open menu"><Menu size={18} /></button>
            <div className="min-w-0">
              <p className="truncate font-Sora text-sm font-semibold sm:text-base">Eastern Province Chamber of Commerce</p>
              <p className="hidden text-xs text-neutral-500 sm:block">Unified social media platform · Demo (client-side, mock data)</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className="hidden text-sm text-neutral-600 md:block">Sara Al-Otaibi · Social Media Manager</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-800 text-sm font-semibold text-text-dark">SA</div>
          </div>
        </header>

        <main ref={mainRef} className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}>
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <AiAssistantWidget />
    </div>
    </AiChatProvider>
    </PostsProvider>
  );
}
