import { Hono } from 'hono';
import type { UiResponse } from '@devvit/web/shared';
import { context, reddit } from '@devvit/web/server';
import { modGuard } from '../middleware/modGuard';
import { createVerdict } from '../core/verdict';
import { getRetentionSettings } from '../core/settings';
import { listRules } from '../core/rules';
import {
  DECISION_TEMPLATES,
  validateReason,
} from '../../shared/validation';
import type { ContentType, Severity } from '../../shared/types';

type LogVerdictFormValues = {
  ruleId?: unknown;
  severity?: unknown;
  decisionTemplate?: unknown;
  reason?: unknown;
  username?: unknown;
  authorId?: unknown;
  contentType?: unknown;
  contentId?: unknown;
  permalink?: unknown;
};

/** Devvit select fields submit as string[]; other fields may be numbers or { value } objects. */
function coerceFormString(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (Array.isArray(value)) {
    return coerceFormString(value[0]);
  }
  if (typeof value === 'string') {
    return value.trim();
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (typeof value === 'object' && 'value' in value) {
    return coerceFormString((value as { value: unknown }).value);
  }
  return '';
}

export const forms = new Hono();

forms.use('*', modGuard);

forms.post('/log-verdict-submit', async (c) => {
  const raw = await c.req.json<LogVerdictFormValues>();
  const values = {
    ruleId: coerceFormString(raw.ruleId),
    severity: coerceFormString(raw.severity),
    decisionTemplate: coerceFormString(raw.decisionTemplate),
    reason: coerceFormString(raw.reason),
    username: coerceFormString(raw.username),
    authorId: coerceFormString(raw.authorId),
    contentType: coerceFormString(raw.contentType),
    contentId: coerceFormString(raw.contentId),
    permalink: coerceFormString(raw.permalink),
  };

  const missing: string[] = [];
  if (!values.ruleId) missing.push('ruleId');
  if (!values.severity) missing.push('severity');
  if (!values.decisionTemplate) missing.push('decisionTemplate');
  if (!values.reason) missing.push('reason');

  if (missing.length > 0) {
    return c.json<UiResponse>(
      { showToast: `Missing required fields: ${missing.join(', ')}` },
      400
    );
  }

  const reason = values.reason;
  const reasonValidation = validateReason(reason);
  if (!reasonValidation.ok) {
    return c.json<UiResponse>({ showToast: reasonValidation.message }, 400);
  }

  const severity = values.severity as Severity;
  if (severity !== 'low' && severity !== 'medium' && severity !== 'high') {
    return c.json<UiResponse>({ showToast: 'Invalid severity' }, 400);
  }

  if (!DECISION_TEMPLATES.includes(values.decisionTemplate)) {
    return c.json<UiResponse>({ showToast: 'Invalid decision template' }, 400);
  }

  const contentType = values.contentType as ContentType;
  if (contentType !== 'post' && contentType !== 'comment') {
    return c.json<UiResponse>({ showToast: 'Invalid content type' }, 400);
  }

  if (!values.username || !values.contentId || !values.permalink) {
    return c.json<UiResponse>({ showToast: 'Missing content context' }, 400);
  }

  const subredditId = context.subredditId;
  const rules = await listRules(subredditId);
  const rule = rules.find((r) => r.id === values.ruleId);
  if (!rule) {
    return c.json<UiResponse>({ showToast: 'Selected rule not found' }, 400);
  }

  const actingMod = await reddit.getCurrentUsername();
  if (!actingMod) {
    return c.json<UiResponse>({ showToast: 'Could not resolve moderator username' }, 400);
  }

  const retention = await getRetentionSettings(subredditId);

  await createVerdict(
    {
      subredditName: context.subredditName,
      username: values.username,
      ...(values.authorId ? { authorId: values.authorId } : {}),
      contentType,
      contentId: values.contentId,
      permalink: values.permalink,
      ruleId: rule.id,
      ruleName: rule.name,
      severity,
      decisionTemplate: values.decisionTemplate,
      reason,
      actingMod,
    },
    subredditId,
    retention.retentionDays
  );

  return c.json<UiResponse>({ showToast: 'Verdict logged' });
});
