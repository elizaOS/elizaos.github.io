'use server';

import { getUserPullRequests } from './queries';
import { PullRequestData } from '@/lib/data/types';

export async function fetchUserPullRequestsAction(
  username: string,
  status?: 'OPEN' | 'MERGED' | 'CLOSED',
  page?: number,
  pageSize?: number,
): Promise<{ pullRequests: PullRequestData[]; totalCount: number }> {
  return getUserPullRequests(username, status, page, pageSize);
}
