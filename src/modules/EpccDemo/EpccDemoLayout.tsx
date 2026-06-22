import { NavLink, Outlet, useLocation } from 'react-router-dom';
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
} from 'lucide-react';
import { cn } from '@/shadecn/lib/utils';
import { EPCC_ROUTES } from './routes';
import { PostsProvider } from '@/mock-server/posts-store';
import { AiChatProvider } from '@/mock-server/ai-chat-store';
import AiAssistantWidget from './_components/AiAssistantWidget';

const NAV = [
  { to: EPCC_ROUTES.COMMAND_CENTER, label: 'Command Center', icon: LayoutDashboard },
  { to: EPCC_ROUTES.ACCOUNTS, label: 'Accounts', icon: Share2 },
  { to: EPCC_ROUTES.POSTS, label: 'Posts', icon: PenSquare },
  { to: EPCC_ROUTES.CALENDAR, label: 'Calendar', icon: CalendarDays },
  { to: EPCC_ROUTES.AUDIENCE, label: 'Audience Insights', icon: Users },
  { to: EPCC_ROUTES.REPORTS, label: 'Reports', icon: FileBarChart },
  { to: EPCC_ROUTES.PROMOTION, label: 'Paid Promotion', icon: Megaphone },
  { to: EPCC_ROUTES.INBOX, label: 'Inbox', icon: Inbox },
  { to: EPCC_ROUTES.AI, label: 'AI Assistant', icon: Sparkles },
  { to: EPCC_ROUTES.SUPPORT, label: 'Support', icon: Headset },
];

export default function EpccDemoLayout() {
  const location = useLocation();
  return (
    <PostsProvider>
    <AiChatProvider>
    <div className="flex h-screen overflow-hidden bg-surface-background font-Poppins text-text-dark">
      {/* Sidebar */}
      <aside className="sticky top-0 flex h-screen w-64 flex-col border-r border-neutral-200 bg-white">
        <div className="flex items-center gap-3 px-5 py-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-800 font-Sora text-sm font-bold text-white">
            EP
          </div>
          <div className="leading-tight">
            <p className="font-Sora text-sm font-semibold">EP Chamber</p>
            <p className="text-xs text-neutral-500">Social Command Center</p>
          </div>
        </div>

        <nav className="mt-2 flex flex-1 flex-col gap-1 px-3">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                  isActive
                    ? 'bg-secondary-200 font-medium text-primary-900'
                    : 'text-neutral-700 hover:bg-neutral-100',
                )
              }>
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="m-3 rounded-lg bg-primary-100 p-3">
          <p className="flex items-center gap-2 text-xs font-medium text-primary-900">
            <LifeBuoy size={14} /> 24/7 Support
          </p>
          <p className="mt-1 text-xs text-neutral-600">
            Dedicated contact: <span className="font-medium">+966 13 000 0000</span>
          </p>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between border-b border-neutral-200 bg-white px-8 py-4">
          <div>
            <p className="font-Sora text-base font-semibold">
              Eastern Province Chamber of Commerce
            </p>
            <p className="text-xs text-neutral-500">
              Unified social media platform · Demo (client-side, mock data)
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-neutral-600 sm:block">Sara Al-Otaibi · Social Media Manager</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-800 text-sm font-semibold text-text-dark">
              SA
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-8 py-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}>
              <Outlet />
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
