import './index.css';

import { requestExpandedMode } from '@devvit/web/client';
import { context } from '@devvit/web/client';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

export function Splash() {
  return (
    <div className="flex relative flex-col justify-center items-center min-h-screen gap-4 bg-white dark:bg-gray-900">
      <div className="flex flex-col items-center gap-2 px-4 text-center">
        <h1 className="text-2xl font-bold text-[#d93900] dark:text-orange-500">VerdictLog</h1>
        <p className="text-base text-gray-600 dark:text-gray-300">
          Every mod action gets a reason. Every appeal gets an answer.
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {context.username ? `Hey ${context.username}` : 'Moderator tools'}
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Log why in 5 seconds · Recall it in 2 · Answer appeals fairly
        </p>
      </div>
      <button
        type="button"
        className="flex items-center justify-center bg-[#d93900] dark:bg-orange-600 text-white w-auto h-10 rounded-full cursor-pointer transition-colors px-6 hover:bg-[#c23300] dark:hover:bg-orange-700"
        onClick={(e) => requestExpandedMode(e.nativeEvent, 'game')}
      >
        Open VerdictLog
      </button>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Splash />
  </StrictMode>
);
