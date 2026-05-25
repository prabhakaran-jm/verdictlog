import { initTRPC, TRPCError } from '@trpc/server';
import { z } from 'zod';
import { context } from '@devvit/web/server';
import {
  createRule,
  deleteRule,
  listRules,
  RuleNotFoundError,
  updateRule,
} from './core/rules';
import {
  getRetentionSettings,
  saveRetentionSettings,
} from './core/settings';
import {
  deleteVerdict,
  getCaseFile,
  getPriorCount,
  VerdictForbiddenError,
  VerdictNotFoundError,
} from './core/verdict';
import { consumePendingPage } from './core/nav';
import { validateUsername } from '../shared/validation';
import { isModerator } from './middleware/isModerator';
const severitySchema = z.enum(['low', 'medium', 'high']);

const t = initTRPC.create();

const modGuardProcedure = t.procedure.use(async ({ next }) => {
  if (!(await isModerator())) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Forbidden' });
  }
  return next({
    ctx: {
      subredditId: context.subredditId,
      subredditName: context.subredditName,
    },
  });
});

const verdictRouter = t.router({
  getCaseFile: modGuardProcedure
    .input(z.object({ username: z.string() }))
    .query(async ({ input, ctx }) => {
      const validation = validateUsername(input.username);
      if (!validation.ok) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: validation.message });
      }
      try {
        const verdicts = await getCaseFile(input.username, ctx.subredditId);
        return { verdicts };
      } catch (error) {
        console.error('getCaseFile failed:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Search could not be completed',
        });
      }
    }),

  delete: modGuardProcedure
    .input(z.object({ verdictId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      try {
        await deleteVerdict(input.verdictId, ctx.subredditId);
        return { success: true as const };
      } catch (error) {
        if (error instanceof VerdictNotFoundError) {
          throw new TRPCError({ code: 'NOT_FOUND', message: error.message });
        }
        if (error instanceof VerdictForbiddenError) {
          throw new TRPCError({ code: 'FORBIDDEN', message: error.message });
        }
        throw error;
      }
    }),

  getPriorCount: modGuardProcedure
    .input(z.object({ username: z.string() }))
    .query(async ({ input, ctx }) => {
      const validation = validateUsername(input.username);
      if (!validation.ok) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: validation.message });
      }
      try {
        return await getPriorCount(input.username, ctx.subredditId);
      } catch (error) {
        console.error('getPriorCount failed:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Could not load prior verdict count',
        });
      }
    }),
});

const rulesRouter = t.router({
  list: modGuardProcedure.query(async ({ ctx }) => {
    const rules = await listRules(ctx.subredditId);
    return { rules };
  }),

  create: modGuardProcedure
    .input(
      z.object({
        name: z.string(),
        description: z.string().optional(),
        defaultSeverity: severitySchema,
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const rule = await createRule(input, ctx.subredditId);
        return { rule };
      } catch (error) {
        if (error instanceof Error) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: error.message });
        }
        throw error;
      }
    }),

  update: modGuardProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        description: z.string().optional(),
        defaultSeverity: severitySchema.optional(),
        enabled: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...patch } = input;
      try {
        const rule = await updateRule(id, patch, ctx.subredditId);
        return { rule };
      } catch (error) {
        if (error instanceof RuleNotFoundError) {
          throw new TRPCError({ code: 'NOT_FOUND', message: error.message });
        }
        if (error instanceof Error) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: error.message });
        }
        throw error;
      }
    }),

  delete: modGuardProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      try {
        return await deleteRule(input.id, ctx.subredditId);
      } catch (error) {
        if (error instanceof RuleNotFoundError) {
          throw new TRPCError({ code: 'NOT_FOUND', message: error.message });
        }
        throw error;
      }
    }),
});

const uiRouter = t.router({
  consumePendingPage: modGuardProcedure.query(async ({ ctx }) => {
    const page = await consumePendingPage(ctx.subredditId);
    return { page };
  }),
});

const settingsRouter = t.router({
  get: modGuardProcedure.query(async ({ ctx }) => {
    const settings = await getRetentionSettings(ctx.subredditId);
    return { retentionDays: settings.retentionDays };
  }),

  save: modGuardProcedure
    .input(z.object({ retentionDays: z.number() }))
    .mutation(async ({ input, ctx }) => {
      try {
        await saveRetentionSettings(input.retentionDays, ctx.subredditId);
        return { success: true as const };
      } catch (error) {
        if (error instanceof Error) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: error.message });
        }
        throw error;
      }
    }),
});

export const appRouter = t.router({
  verdict: verdictRouter,
  rules: rulesRouter,
  settings: settingsRouter,
  ui: uiRouter,
});

export type AppRouter = typeof appRouter;
