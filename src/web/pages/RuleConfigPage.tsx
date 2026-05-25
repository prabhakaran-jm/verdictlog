import { useEffect, useState } from 'react';
import { showToast } from '@devvit/web/client';
import type { Rule, Severity } from '../../shared/types';
import { trpc } from '../lib/trpc';
import { RuleForm } from '../components/RuleForm';
import { ErrorBanner } from '../components/ErrorBanner';

export function RuleConfigPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const loadRules = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await trpc.rules.list.query();
      setRules(result.rules);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not load rules';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await trpc.rules.list.query();
        if (active) {
          setRules(result.rules);
        }
      } catch (err) {
        if (active) {
          const message = err instanceof Error ? err.message : 'Could not load rules';
          setError(message);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const handleCreate = async (data: {
    name: string;
    description: string;
    defaultSeverity: Severity;
  }) => {
    setSaving(true);
    try {
      await trpc.rules.create.mutate(data);
      setShowAddForm(false);
      await loadRules();
      await showToast('Rule created');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not create rule';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (data: {
    name: string;
    description: string;
    defaultSeverity: Severity;
  }) => {
    if (!editingRule) return;
    setSaving(true);
    try {
      await trpc.rules.update.mutate({
        id: editingRule.id,
        name: data.name,
        description: data.description,
        defaultSeverity: data.defaultSeverity,
      });
      setEditingRule(null);
      await loadRules();
      await showToast('Rule updated');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not update rule';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleEnabled = async (rule: Rule) => {
    try {
      await trpc.rules.update.mutate({ id: rule.id, enabled: !rule.enabled });
      await loadRules();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not update rule';
      setError(message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await trpc.rules.delete.mutate({ id });
      setConfirmDeleteId(null);
      await loadRules();
      await showToast('Rule deleted');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not delete rule';
      setError(message);
    }
  };

  return (
    <div>
      {error ? <ErrorBanner message={error} onDismiss={() => setError(null)} /> : null}

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Subreddit rules</h2>
        <button
          type="button"
          onClick={() => {
            setShowAddForm(true);
            setEditingRule(null);
          }}
          className="rounded-lg bg-[#d93900] px-4 py-2 text-sm font-medium text-white dark:bg-orange-600"
        >
          Add Rule
        </button>
      </div>

      {showAddForm ? (
        <div className="mb-6">
          <RuleForm onSubmit={(d) => void handleCreate(d)} loading={saving} />
          <button type="button" onClick={() => setShowAddForm(false)} className="mt-2 text-sm underline">
            Cancel
          </button>
        </div>
      ) : null}

      {editingRule ? (
        <div className="mb-6">
          <RuleForm
            initialValues={{
              name: editingRule.name,
              description: editingRule.description,
              defaultSeverity: editingRule.defaultSeverity,
            }}
            onSubmit={(d) => void handleUpdate(d)}
            loading={saving}
          />
          <button type="button" onClick={() => setEditingRule(null)} className="mt-2 text-sm underline">
            Cancel
          </button>
        </div>
      ) : null}

      {loading ? <p className="text-gray-500">Loading rules…</p> : null}

      {!loading && rules.length === 0 ? (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
          <p className="font-medium">Get started</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>Add a rule below (or re-install the app to seed Spam + Civility).</li>
            <li>Click <strong>Enable</strong> — only enabled rules appear in Log Verdict.</li>
            <li>On any post or comment, use ⋯ → <strong>Log Verdict</strong>.</li>
          </ol>
        </div>
      ) : null}

      {!loading && rules.length > 0 && rules.every((r) => !r.enabled) ? (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
          All rules are disabled. Enable at least one rule before using Log Verdict.
        </p>
      ) : null}

      <ul className="space-y-3">
        {rules.map((rule) => (
          <li
            key={rule.id}
            className="rounded-lg border border-gray-200 p-4 dark:border-gray-700 dark:bg-gray-800"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-gray-100">{rule.name}</h3>
                {rule.description ? (
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{rule.description}</p>
                ) : null}
                <p className="mt-1 text-xs text-gray-500">
                  Default severity: {rule.defaultSeverity} · {rule.enabled ? 'Enabled' : 'Disabled'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void handleToggleEnabled(rule)}
                  className="rounded border px-2 py-1 text-xs"
                >
                  {rule.enabled ? 'Disable' : 'Enable'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingRule(rule);
                    setShowAddForm(false);
                  }}
                  className="rounded border px-2 py-1 text-xs"
                >
                  Edit
                </button>
                {confirmDeleteId === rule.id ? (
                  <>
                    <button
                      type="button"
                      onClick={() => void handleDelete(rule.id)}
                      className="rounded bg-red-600 px-2 py-1 text-xs text-white"
                    >
                      Confirm
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(null)}
                      className="rounded border px-2 py-1 text-xs"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(rule.id)}
                    className="rounded border border-red-300 px-2 py-1 text-xs text-red-700"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
