import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { EPCC_ROUTES } from '@/modules/EpccDemo/routes';
import EpccDemoLayout from '@/modules/EpccDemo/EpccDemoLayout';
import CommandCenter from '@/modules/EpccDemo/screens/CommandCenter';
import EpccAccounts from '@/modules/EpccDemo/screens/Accounts';
import CalendarView from '@/modules/EpccDemo/screens/CalendarView';
import AudienceInsights from '@/modules/EpccDemo/screens/AudienceInsights';
import EpccReports from '@/modules/EpccDemo/screens/Reports';
import Promotion from '@/modules/EpccDemo/screens/Promotion';
import AiAssistant from '@/modules/EpccDemo/screens/AiAssistant';
import PostsAnalytics from '@/modules/EpccDemo/screens/PostsAnalytics';
import PostDetail from '@/modules/EpccDemo/screens/PostDetail';
import Inbox from '@/modules/EpccDemo/screens/Inbox';
import Support from '@/modules/EpccDemo/screens/Support';

const router = createBrowserRouter([
  // root → the demo
  { path: '/', element: <Navigate to={EPCC_ROUTES.COMMAND_CENTER} replace /> },
  {
    path: EPCC_ROUTES.ROOT,
    element: <EpccDemoLayout />,
    children: [
      { index: true, element: <Navigate to={EPCC_ROUTES.COMMAND_CENTER} replace /> },
      { path: EPCC_ROUTES.COMMAND_CENTER, element: <CommandCenter /> },
      { path: EPCC_ROUTES.ACCOUNTS, element: <EpccAccounts /> },
      { path: EPCC_ROUTES.COMPOSER, element: <Navigate to={EPCC_ROUTES.POSTS} replace /> },
      { path: EPCC_ROUTES.CALENDAR, element: <CalendarView /> },
      { path: EPCC_ROUTES.POSTS, element: <PostsAnalytics /> },
      { path: EPCC_ROUTES.POST_DETAIL, element: <PostDetail /> },
      { path: EPCC_ROUTES.AUDIENCE, element: <AudienceInsights /> },
      { path: EPCC_ROUTES.REPORTS, element: <EpccReports /> },
      { path: EPCC_ROUTES.PROMOTION, element: <Promotion /> },
      { path: EPCC_ROUTES.INBOX, element: <Inbox /> },
      { path: EPCC_ROUTES.AI, element: <AiAssistant /> },
      { path: EPCC_ROUTES.SUPPORT, element: <Support /> },
    ],
  },
  { path: '*', element: <Navigate to={EPCC_ROUTES.COMMAND_CENTER} replace /> },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
