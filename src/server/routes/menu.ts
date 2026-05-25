import { Hono, type Context } from 'hono';
import type { Form, UiResponse } from '@devvit/web/shared';
import { context, reddit } from '@devvit/web/server';
import { modGuard } from '../middleware/modGuard';
import { DECISION_TEMPLATES, filterEnabledRules } from '../../shared/validation';
import { findAppPostUrl } from '../core/appPost';
import { listRules } from '../core/rules';
import { getPriorCount } from '../core/verdict';
import { setPendingPage, type PendingPage } from '../core/nav';
import type { ContentType } from '../../shared/types';

export const menu = new Hono();

menu.use('*', modGuard);

function formatPriorAge(createdAt: number): string {
  const diffMs = Date.now() - createdAt;
  const days = Math.floor(diffMs / 86400000);
  if (days > 0) {
    return `${days}d ago`;
  }
  const hours = Math.floor(diffMs / 3600000);
  if (hours > 0) {
    return `${hours}h ago`;
  }
  const minutes = Math.floor(diffMs / 60000);
  if (minutes > 0) {
    return `${minutes}m ago`;
  }
  return 'just now';
}

function buildPriorBanner(
  priorCount: number,
  priorRuleName?: string,
  priorSeverity?: string,
  priorCreatedAt?: number
): string {
  if (priorCount <= 0) {
    return 'No prior verdicts for this user';
  }
  if (priorRuleName && priorSeverity && priorCreatedAt !== undefined) {
    return `${priorCount} prior verdict(s) — most recent: ${priorRuleName} / ${priorSeverity} / ${formatPriorAge(priorCreatedAt)}`;
  }
  return `${priorCount} prior verdict(s)`;
}

function permalinkUrl(permalink: string): string {
  if (permalink.startsWith('http')) {
    return permalink;
  }
  return `https://reddit.com${permalink}`;
}

menu.post('/log-verdict', async (c) => {
  const subredditId = context.subredditId;

  let username: string;
  let authorId: string | undefined;
  let contentType: ContentType;
  let contentId: string;
  let permalink: string;

  if (context.commentId) {
    const comment = await reddit.getCommentById(context.commentId);
    username = comment.authorName;
    authorId = comment.authorId;
    contentType = 'comment';
    contentId = comment.id;
    permalink = permalinkUrl(comment.permalink);
  } else if (context.postId) {
    const post = await reddit.getPostById(context.postId);
    username = post.authorName ?? '';
    authorId = post.authorId;
    contentType = 'post';
    contentId = post.id;
    permalink = permalinkUrl(post.permalink);
  } else {
    return c.json<UiResponse>({ showToast: 'No post or comment in context' }, 400);
  }

  if (!username) {
    return c.json<UiResponse>({ showToast: 'Could not resolve content author' }, 400);
  }

  const prior = await getPriorCount(username, subredditId);
  const rules = filterEnabledRules(await listRules(subredditId));

  const ruleOptions =
    rules.length > 0
      ? rules.map((rule) => ({ label: rule.name, value: rule.id }))
      : [{ label: 'No rules configured', value: '' }];

  const form: Form = {
    title: 'Log Verdict',
    description: buildPriorBanner(
      prior.count,
      prior.mostRecent?.ruleName,
      prior.mostRecent?.severity,
      prior.mostRecent?.createdAt
    ),
    acceptLabel: 'Log Verdict',
    fields: [
      {
        type: 'select',
        name: 'ruleId',
        label: 'Rule',
        required: true,
        options: ruleOptions,
      },
      {
        type: 'select',
        name: 'severity',
        label: 'Severity',
        required: true,
        options: [
          { label: 'Low', value: 'low' },
          { label: 'Medium', value: 'medium' },
          { label: 'High', value: 'high' },
        ],
      },
      {
        type: 'select',
        name: 'decisionTemplate',
        label: 'Decision template',
        required: true,
        options: DECISION_TEMPLATES.map((template) => ({
          label: template,
          value: template,
        })),
      },
      {
        type: 'paragraph',
        name: 'reason',
        label: 'Reason (max 500 characters, no newlines)',
        required: true,
      },
      { type: 'string', name: 'username', label: 'Username', disabled: true, defaultValue: username },
      {
        type: 'string',
        name: 'authorId',
        label: 'Author ID',
        disabled: true,
        defaultValue: authorId ?? '',
      },
      { type: 'string', name: 'contentType', label: 'Content type', disabled: true, defaultValue: contentType },
      { type: 'string', name: 'contentId', label: 'Content ID', disabled: true, defaultValue: contentId },
      { type: 'string', name: 'permalink', label: 'Permalink', disabled: true, defaultValue: permalink },
      { type: 'string', name: 'timestamp', label: 'Timestamp', disabled: true, defaultValue: String(Date.now()) },
      { type: 'string', name: 'priorCount', label: 'Prior count', disabled: true, defaultValue: String(prior.count) },
      {
        type: 'string',
        name: 'priorRuleName',
        label: 'Prior rule',
        disabled: true,
        defaultValue: prior.mostRecent?.ruleName ?? '',
      },
      {
        type: 'string',
        name: 'priorSeverity',
        label: 'Prior severity',
        disabled: true,
        defaultValue: prior.mostRecent?.severity ?? '',
      },
      {
        type: 'string',
        name: 'priorCreatedAt',
        label: 'Prior created at',
        disabled: true,
        defaultValue: prior.mostRecent ? String(prior.mostRecent.createdAt) : '',
      },
    ],
  };

  return c.json<UiResponse>({
    showForm: {
      name: 'logVerdictForm',
      form,
      data: {
        username,
        authorId: authorId ?? '',
        contentType,
        contentId,
        permalink,
        timestamp: String(Date.now()),
        priorCount: String(prior.count),
        priorRuleName: prior.mostRecent?.ruleName ?? '',
        priorSeverity: prior.mostRecent?.severity ?? '',
        priorCreatedAt: prior.mostRecent ? String(prior.mostRecent.createdAt) : '',
      },
    },
  });
});

async function openAppPage(c: Context, page: PendingPage) {
  const postUrl = await findAppPostUrl(context.subredditName);
  if (!postUrl) {
    return c.json<UiResponse>(
      { showToast: 'VerdictLog post not found in this subreddit. Open the verdictlog post instead.' },
      400
    );
  }
  await setPendingPage(context.subredditId, page);
  return c.json<UiResponse>({ navigateTo: postUrl });
}

menu.post('/open-search', (c) => openAppPage(c, 'search'));

menu.post('/open-rules', (c) => openAppPage(c, 'rules'));

menu.post('/open-settings', (c) => openAppPage(c, 'settings'));
