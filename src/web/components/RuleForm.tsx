import { useState, type FormEvent } from 'react';
import type { Severity } from '../../shared/types';
import { MAX_RULE_DESC_LEN, MAX_RULE_NAME_LEN } from '../../shared/validation';
import {
  fieldInlineStyle,
  formInputClass,
  formLabelClass,
  formPanelClass,
  formSelectClass,
  formTextareaClass,
  panelInlineStyle,
  textareaInlineStyle,
} from '../lib/formFieldClasses';

type RuleFormValues = {
  name: string;
  description: string;
  defaultSeverity: Severity;
};

type RuleFormProps = {
  onSubmit: (data: RuleFormValues) => void;
  initialValues?: RuleFormValues;
  loading: boolean;
};

export function RuleForm({ onSubmit, initialValues, loading }: RuleFormProps) {
  const [name, setName] = useState(initialValues?.name ?? '');
  const [description, setDescription] = useState(initialValues?.description ?? '');
  const [defaultSeverity, setDefaultSeverity] = useState<Severity>(
    initialValues?.defaultSeverity ?? 'medium'
  );
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Rule name is required');
      return;
    }
    if (trimmedName.length > MAX_RULE_NAME_LEN) {
      setError(`Rule name must be ${MAX_RULE_NAME_LEN} characters or fewer`);
      return;
    }
    if (description.length > MAX_RULE_DESC_LEN) {
      setError(`Description must be ${MAX_RULE_DESC_LEN} characters or fewer`);
      return;
    }
    setError(null);
    onSubmit({ name: trimmedName, description, defaultSeverity });
  };

  return (
    <form onSubmit={handleSubmit} className={formPanelClass} style={panelInlineStyle}>
      <div>
        <label className={formLabelClass}>Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Spam"
          className={formInputClass}
          style={fieldInlineStyle}
          disabled={loading}
        />
      </div>
      <div>
        <label className={formLabelClass}>Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Optional — when moderators should use this rule"
          className={formTextareaClass}
          style={textareaInlineStyle}
          disabled={loading}
        />
      </div>
      <div>
        <label className={formLabelClass}>Default severity</label>
        <select
          value={defaultSeverity}
          onChange={(e) => setDefaultSeverity(e.target.value as Severity)}
          className={formSelectClass}
          style={fieldInlineStyle}
          disabled={loading}
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </div>
      {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-[#d93900] px-4 py-2 text-sm font-medium text-white hover:bg-[#c23300] disabled:opacity-50 dark:bg-orange-600"
      >
        {loading ? 'Saving…' : 'Save rule'}
      </button>
    </form>
  );
}
