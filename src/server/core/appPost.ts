import { reddit } from '@devvit/web/server';

/** Find this subreddit's VerdictLog custom post URL for subreddit menu navigation. */
export async function findAppPostUrl(subredditName: string): Promise<string | undefined> {
  const appUser = await reddit.getAppUser();
  const username = appUser?.username ?? 'verdictlog';
  const posts = await reddit.getPostsByUser({ username, sort: 'new', limit: 50 }).all();
  const match = posts.find(
    (post) => post.subredditName.toLowerCase() === subredditName.toLowerCase()
  );
  return match?.url;
}
