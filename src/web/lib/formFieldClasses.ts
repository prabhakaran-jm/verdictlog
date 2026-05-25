import type { CSSProperties } from 'react';

/** Class hooks for layout; borders/fill use inline styles (Reddit iframe strips input borders). */

export const formLabelClass = 'vl-label';

export const formInputClass = 'vl-field';

export const formSelectClass = 'vl-field vl-select';

export const formTextareaClass = 'vl-field vl-textarea';

export const formPanelClass = 'vl-panel space-y-3';

/** Inline styles win over Tailwind preflight + parent resets in the Reddit webview. */
export const fieldInlineStyle: CSSProperties = {
  boxSizing: 'border-box',
  width: '100%',
  padding: '8px 12px',
  borderWidth: 2,
  borderStyle: 'solid',
  borderColor: '#374151',
  borderRadius: 8,
  backgroundColor: '#ffffff',
  color: '#111827',
  boxShadow: '0 0 0 1px #374151, inset 0 1px 2px rgba(0, 0, 0, 0.08)',
  fontSize: 16,
  lineHeight: 1.5,
};

export const textareaInlineStyle: CSSProperties = {
  ...fieldInlineStyle,
  minHeight: 80,
  resize: 'vertical',
};

export const panelInlineStyle: CSSProperties = {
  padding: 16,
  borderWidth: 2,
  borderStyle: 'solid',
  borderColor: '#6b7280',
  borderRadius: 8,
  backgroundColor: '#f3f4f6',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
};
