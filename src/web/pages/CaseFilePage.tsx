import { useState } from 'react';
import { showToast } from '@devvit/web/client';
import type { Verdict } from '../../shared/types';
import { trpc } from '../lib/trpc';
import { formatCaseFileSummary } from '../lib/formatCaseFileSummary';
import { SearchBar } from '../components/SearchBar';
import { VerdictCard } from '../components/VerdictCard';
import { EmptyState } from '../components/EmptyState';
import { ErrorBanner } from '../components/ErrorBanner';

export function CaseFilePage() {
  const [username, setUsername] = useState<string | null>(null);
  const [verdicts, setVerdicts] = useState<Verdict[]>([]);
  const [subredditName, setSubredditName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fallbackSummary, setFallbackSummary] = useState<string | null>(null);

  const handleSearch = async (searchUsername: string) => {
    setLoading(true);
    setError(null);
    setUsername(searchUsername);
    setFallbackSummary(null);
    try {
      const result = await trpc.verdict.getCaseFile.query({ username: searchUsername });
      setVerdicts(result.verdicts);
      setSubredditName(result.verdicts[0]?.subredditName ?? '');
    } catch (err) {
      setVerdicts([]);
      const message = err instanceof Error ? err.message : 'Search could not be completed';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (verdictId: string) => {
    try {
      await trpc.verdict.delete.mutate({ verdictId });
      setVerdicts((prev) => prev.filter((v) => v.id !== verdictId));
      await showToast('Verdict deleted');
    } catch {
      await showToast('Deletion failed');
    }
  };

  const copyCaseFile = async () => {
    if (!username || verdicts.length === 0) return;
    const name = subredditName || verdicts[0]!.subredditName;
    const summary = formatCaseFileSummary(name, username, verdicts);
    try {
      await navigator.clipboard.writeText(summary);
      await showToast('Case file copied to clipboard');
      setFallbackSummary(null);
    } catch {
      setFallbackSummary(summary);
    }
  };

  return (
    <div>
      <SearchBar onSearch={(u) => void handleSearch(u)} loading={loading} />

      {error ? <ErrorBanner message={error} onDismiss={() => setError(null)} /> : null}

      {!loading && username && verdicts.length === 0 && !error ? (
        <EmptyState message={`No verdicts found for u/${username}`} />
      ) : null}

      {verdicts.length > 0 ? (
        <>
          <div className="mb-4 mt-6">
            <button
              type="button"
              onClick={() => void copyCaseFile()}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
            >
              Copy Case File Summary
            </button>
          </div>
          {fallbackSummary ? (
            <div className="mb-4">
              <p className="mb-1 text-sm text-red-600">Copy failed — select text below:</p>
              <textarea readOnly value={fallbackSummary} className="h-48 w-full rounded border p-2 font-mono text-xs" />
              <button type="button" onClick={() => setFallbackSummary(null)} className="mt-2 text-sm underline">
                Dismiss
              </button>
            </div>
          ) : null}
          <ul className="space-y-4">
            {verdicts.map((verdict) => (
              <li key={verdict.id}>
                <VerdictCard verdict={verdict} onDelete={(id) => void handleDelete(id)} />
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}
