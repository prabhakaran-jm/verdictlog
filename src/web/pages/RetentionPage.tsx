import { useEffect, useState, type FormEvent } from 'react';
import { showToast } from '@devvit/web/client';
import { trpc } from '../lib/trpc';
import {
  DEFAULT_RETENTION_DAYS,
  MAX_RETENTION_DAYS,
  MIN_RETENTION_DAYS,
  validateRetentionDays,
} from '../../shared/validation';
import { ErrorBanner } from '../components/ErrorBanner';

export function RetentionPage() {
  const [retentionDays, setRetentionDays] = useState(DEFAULT_RETENTION_DAYS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const result = await trpc.settings.get.query();
        setRetentionDays(result.retentionDays);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Could not load settings';
        setError(message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const validation = validateRetentionDays(retentionDays);
    if (!validation.ok) {
      setFieldError(validation.message);
      return;
    }
    setFieldError(null);
    setSaving(true);
    setError(null);
    try {
      await trpc.settings.save.mutate({ retentionDays });
      await showToast('Retention settings saved');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not save settings';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h2 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">Retention settings</h2>
      <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
        Verdicts expire automatically after this many days. Changes apply only to new verdicts.
      </p>

      {error ? <ErrorBanner message={error} onDismiss={() => setError(null)} /> : null}

      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : (
        <form onSubmit={(e) => void handleSubmit(e)} className="max-w-sm space-y-4">
          <div>
            <label htmlFor="retentionDays" className="mb-1 block text-sm font-medium">
              Retention period (days)
            </label>
            <input
              id="retentionDays"
              type="number"
              min={MIN_RETENTION_DAYS}
              max={MAX_RETENTION_DAYS}
              value={retentionDays}
              onChange={(e) => setRetentionDays(Number(e.target.value))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
              disabled={saving}
            />
            {fieldError ? (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{fieldError}</p>
            ) : (
              <p className="mt-1 text-xs text-gray-500">
                Between {MIN_RETENTION_DAYS} and {MAX_RETENTION_DAYS} days. Default is {DEFAULT_RETENTION_DAYS}{' '}
                days.
              </p>
            )}
          </div>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-[#d93900] px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-orange-600"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </form>
      )}
    </div>
  );
}
