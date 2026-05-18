export type Severity = 'low' | 'medium' | 'high';

export type ContentType = 'post' | 'comment';

export type Verdict = {
  id: string;
  subredditId: string;
  subredditName: string;
  username: string;
  authorId?: string;
  contentType: ContentType;
  contentId: string;
  permalink: string;
  ruleId: string;
  ruleName: string;
  severity: Severity;
  decisionTemplate: string;
  reason: string;
  actingMod: string;
  createdAt: number;
  expiresAt: number;
};

export type Rule = {
  id: string;
  subredditId: string;
  name: string;
  description: string;
  defaultSeverity: Severity;
  enabled: boolean;
  createdAt: number;
};

export type RetentionSettings = {
  subredditId: string;
  retentionDays: number;
  updatedAt: number;
};
