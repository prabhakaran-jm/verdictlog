import { useState } from 'react';
import { showToast } from '@devvit/web/client';
import type { Verdict } from '../../shared/types';
import { formTextareaClass, textareaInlineStyle } from '../lib/formFieldClasses';
import { formatAppealSummary } from '../lib/formatAppealSummary';
import { formatTimestamp } from '../lib/formatTimestamp';

type VerdictCardProps = {
  verdict: Verdict;
  onDelete: (id: string) => void;
};

export function VerdictCard({ verdict, onDelete }: VerdictCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [fallbackSummary, setFallbackSummary] = useState<string | null>(null);

  const copySummary = async () => {
    const summary = formatAppealSummary(verdict);
    try {
      await navigator.clipboard.writeText(summary);
      await showToast('Appeal summary copied to clipboard');
      setFallbackSummary(null);
    } catch {
      setFallbackSummary(summary);
    }
  };

  return (
    <article className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <span className="font-medium text-gray-900 dark:text-gray-100">{verdict.ruleName}</span>
        <span>·</span>
        <span className="uppercase">{verdict.severity}</span>
        <span>·</span>
        <span>{formatTimestamp(verdict.createdAt)}</span>
      </div>

      <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">{verdict.decisionTemplate}</p>
      <p className="mt-2 text-sm text-gray-900 dark:text-gray-100">{verdict.reason}</p>

      <dl className="mt-3 grid gap-1 text-xs text-gray-500 dark:text-gray-400">
        <div>
          <dt className="inline font-medium">Acting mod: </dt>
          <dd className="inline">u/{verdict.actingMod}</dd>
        </div>
        <div>
          <dt className="inline font-medium">Content: </dt>
          <dd className="inline">
            {verdict.contentType} —{' '}
            <a
              href={verdict.permalink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#d93900] underline dark:text-orange-400"
            >
              link
            </a>
          </dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void copySummary()}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
        >
          Copy Appeal Summary
        </button>
        {!confirmDelete ? (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
          >
            Delete
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => {
                onDelete(verdict.id);
                setConfirmDelete(false);
              }}
              className="rounded-lg bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700"
            >
              Confirm delete
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600"
            >
              Cancel
            </button>
          </>
        )}
      </div>

      {fallbackSummary ? (
        <div className="mt-3">
          <p className="mb-1 text-xs text-red-600 dark:text-red-400">Copy failed — select text below:</p>
          <textarea
            readOnly
            value={fallbackSummary}
            className={`${formTextareaClass} h-40 font-mono text-xs`}
            style={textareaInlineStyle}
          />
          <button
            type="button"
            onClick={() => setFallbackSummary(null)}
            className="mt-2 text-sm underline"
          >
            Dismiss
          </button>
        </div>
      ) : null}
    </article>
  );
}
