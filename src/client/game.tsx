import './index.css';

import { TRPCClientError } from '@trpc/client';
import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { NavBar, type AppPage } from '../web/components/NavBar';
import { CaseFilePage } from '../web/pages/CaseFilePage';
import { RuleConfigPage } from '../web/pages/RuleConfigPage';
import { RetentionPage } from '../web/pages/RetentionPage';
import { trpc } from '../web/lib/trpc';

function getInitialPage(): AppPage {
  const params = new URLSearchParams(window.location.search);
  const page = params.get('page');
  if (page === 'rules' || page === 'settings') {
    return page;
  }
  return 'search';
}

export function App() {
  const [page, setPage] = useState<AppPage>(getInitialPage);
  const [accessState, setAccessState] = useState<'loading' | 'allowed' | 'denied'>('loading');

  useEffect(() => {
    void (async () => {
      try {
        await trpc.settings.get.query();
        setAccessState('allowed');
      } catch (err) {
        if (err instanceof TRPCClientError && err.data?.code === 'FORBIDDEN') {
          setAccessState('denied');
          return;
        }
        setAccessState('allowed');
      }

      try {
        const { page: pendingPage } = await trpc.ui.consumePendingPage.query();
        if (pendingPage === 'rules' || pendingPage === 'settings' || pendingPage === 'search') {
          setPage(pendingPage);
        }
      } catch {
        // Non-fatal: fall back to URL param / default search tab
      }
    })();
  }, []);

  if (accessState === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <p className="text-gray-600 dark:text-gray-400">Loading VerdictLog…</p>
      </div>
    );
  }

  if (accessState === 'denied') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-gray-50 px-4 dark:bg-gray-900">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Access denied</h1>
        <p className="text-center text-gray-600 dark:text-gray-400">
          VerdictLog is only available to subreddit moderators.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100">
      <header className="border-b border-gray-200 bg-white px-4 py-4 dark:border-gray-800 dark:bg-gray-950">
        <h1 className="text-xl font-bold text-[#d93900] dark:text-orange-500">VerdictLog</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Every mod action gets a reason. Every appeal gets an answer.
        </p>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6">
        <NavBar currentPage={page} onNavigate={setPage} />
        {page === 'search' ? <CaseFilePage /> : null}
        {page === 'rules' ? <RuleConfigPage /> : null}
        {page === 'settings' ? <RetentionPage /> : null}
      </main>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
