import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { fetchAllContributors } from './fetchAllContributors';
import { Octokit } from '@octokit/rest';
import { getAuthToken } from '../../auth/getAuthToken';

// Mock external dependencies
jest.mock('@octokit/rest');
jest.mock('../../auth/getAuthToken');

const mockGetAuthToken = getAuthToken as jest.MockedFunction<typeof getAuthToken>;
const mockOctokit = Octokit as jest.MockedClass<typeof Octokit>;

describe('fetchAllContributors', () => {
  let mockOctokitInstance: jest.Mocked<Octokit>;
  let mockListContributors: jest.MockedFunction<any>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup Octokit mock
    mockListContributors = jest.fn();
    mockOctokitInstance = {
      rest: {
        repos: {
          listContributors: mockListContributors
        }
      }
    } as any;
    
    mockOctokit.mockImplementation(() => mockOctokitInstance);
    mockGetAuthToken.mockResolvedValue('mock-auth-token');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Happy Path Scenarios', () => {
    it('should fetch contributors successfully with valid repository data', async () => {
      const mockContributors = [
        { 
          id: 1, 
          login: 'user1', 
          contributions: 25, 
          avatar_url: 'https://avatar1.com',
          html_url: 'https://github.com/user1',
          type: 'User'
        },
        { 
          id: 2, 
          login: 'user2', 
          contributions: 15, 
          avatar_url: 'https://avatar2.com',
          html_url: 'https://github.com/user2',
          type: 'User'
        }
      ];

      mockListContributors
        .mockResolvedValueOnce({ data: mockContributors })
        .mockResolvedValueOnce({ data: [] });

      const result = await fetchAllContributors('owner', 'repo');

      expect(result).toEqual(mockContributors);
      expect(mockGetAuthToken).toHaveBeenCalledTimes(1);
      expect(mockOctokit).toHaveBeenCalledWith({ auth: 'mock-auth-token' });
      expect(mockListContributors).toHaveBeenCalledTimes(2);
      expect(mockListContributors).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        per_page: 100,
        page: 1
      });
    });

    it('should handle empty contributors list successfully', async () => {
      mockListContributors.mockResolvedValueOnce({ data: [] });

      const result = await fetchAllContributors('owner', 'repo');

      expect(result).toEqual([]);
      expect(Array.isArray(result)).toBe(true);
      expect(mockListContributors).toHaveBeenCalledTimes(1);
    });

    it('should handle single contributor successfully', async () => {
      const mockContributor = [
        { 
          id: 1, 
          login: 'solo-dev', 
          contributions: 100, 
          avatar_url: 'https://avatar.com',
          html_url: 'https://github.com/solo-dev',
          type: 'User'
        }
      ];

      mockListContributors
        .mockResolvedValueOnce({ data: mockContributor })
        .mockResolvedValueOnce({ data: [] });

      const result = await fetchAllContributors('owner', 'repo');

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('login', 'solo-dev');
      expect(result[0]).toHaveProperty('contributions', 100);
    });

    it('should handle paginated results correctly', async () => {
      const firstPageContributors = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        login: `user${i + 1}`,
        contributions: 10,
        avatar_url: `https://avatar${i + 1}.com`,
        html_url: `https://github.com/user${i + 1}`,
        type: 'User'
      }));

      const secondPageContributors = Array.from({ length: 50 }, (_, i) => ({
        id: i + 101,
        login: `user${i + 101}`,
        contributions: 5,
        avatar_url: `https://avatar${i + 101}.com`,
        html_url: `https://github.com/user${i + 101}`,
        type: 'User'
      }));

      mockListContributors
        .mockResolvedValueOnce({ data: firstPageContributors })
        .mockResolvedValueOnce({ data: secondPageContributors })
        .mockResolvedValueOnce({ data: [] });

      const result = await fetchAllContributors('owner', 'repo');

      expect(result).toHaveLength(150);
      expect(mockListContributors).toHaveBeenCalledTimes(3);
      expect(mockListContributors).toHaveBeenNthCalledWith(1, {
        owner: 'owner',
        repo: 'repo',
        per_page: 100,
        page: 1
      });
      expect(mockListContributors).toHaveBeenNthCalledWith(2, {
        owner: 'owner',
        repo: 'repo',
        per_page: 100,
        page: 2
      });
      expect(mockListContributors).toHaveBeenNthCalledWith(3, {
        owner: 'owner',
        repo: 'repo',
        per_page: 100,
        page: 3
      });
    });

    it('should handle multiple pages with exactly 100 contributors per page', async () => {
      const createPage = (startId: number) => Array.from({ length: 100 }, (_, i) => ({
        id: startId + i,
        login: `user${startId + i}`,
        contributions: 10,
        avatar_url: `https://avatar${startId + i}.com`,
        html_url: `https://github.com/user${startId + i}`,
        type: 'User'
      }));

      mockListContributors
        .mockResolvedValueOnce({ data: createPage(1) })
        .mockResolvedValueOnce({ data: createPage(101) })
        .mockResolvedValueOnce({ data: createPage(201) })
        .mockResolvedValueOnce({ data: [] });

      const result = await fetchAllContributors('owner', 'repo');

      expect(result).toHaveLength(300);
      expect(mockListContributors).toHaveBeenCalledTimes(4);
    });
  });

  describe('Edge Cases', () => {
    it('should handle repository with special characters in name', async () => {
      const mockContributors = [
        { id: 1, login: 'user1', contributions: 5, avatar_url: 'https://avatar1.com' }
      ];

      mockListContributors
        .mockResolvedValueOnce({ data: mockContributors })
        .mockResolvedValueOnce({ data: [] });

      const result = await fetchAllContributors('org-name', 'repo-with-dashes_and_underscores.js');

      expect(result).toEqual(mockContributors);
      expect(mockListContributors).toHaveBeenCalledWith({
        owner: 'org-name',
        repo: 'repo-with-dashes_and_underscores.js',
        per_page: 100,
        page: 1
      });
    });

    it('should handle very long repository names', async () => {
      const longOwner = 'a'.repeat(39); // GitHub max is 39 chars
      const longRepo = 'b'.repeat(100);
      const mockContributors = [];

      mockListContributors.mockResolvedValueOnce({ data: mockContributors });

      const result = await fetchAllContributors(longOwner, longRepo);

      expect(result).toEqual([]);
      expect(mockListContributors).toHaveBeenCalledWith({
        owner: longOwner,
        repo: longRepo,
        per_page: 100,
        page: 1
      });
    });

    it('should handle contributors with minimal data', async () => {
      const mockContributors = [
        { id: 1, login: 'user1', contributions: 0 },
        { id: 2, login: 'user2', type: 'User' }, // Missing contributions
        { login: 'user3', contributions: 1, type: 'User' } // Missing id
      ];

      mockListContributors
        .mockResolvedValueOnce({ data: mockContributors })
        .mockResolvedValueOnce({ data: [] });

      const result = await fetchAllContributors('owner', 'repo');

      expect(result).toEqual(mockContributors);
      expect(result).toHaveLength(3);
    });

    it('should handle contributors with null/undefined values', async () => {
      const mockContributors = [
        { id: 1, login: 'user1', contributions: 5, avatar_url: null },
        { id: 2, login: null, contributions: 3, avatar_url: 'https://avatar.com' },
        { id: 3, login: 'user3', contributions: undefined, avatar_url: 'https://avatar3.com' }
      ];

      mockListContributors
        .mockResolvedValueOnce({ data: mockContributors })
        .mockResolvedValueOnce({ data: [] });

      const result = await fetchAllContributors('owner', 'repo');

      expect(result).toEqual(mockContributors);
    });

    it('should handle maximum realistic number of contributors', async () => {
      // Simulate 1000 contributors across 10 pages
      const pages = Array.from({ length: 10 }, (_, pageIndex) => {
        return Array.from({ length: 100 }, (_, i) => ({
          id: pageIndex * 100 + i + 1,
          login: `user${pageIndex * 100 + i + 1}`,
          contributions: Math.floor(Math.random() * 100) + 1,
          avatar_url: `https://avatar${pageIndex * 100 + i + 1}.com`,
          type: 'User'
        }));
      });

      // Mock all pages plus final empty page
      pages.forEach(page => {
        mockListContributors.mockResolvedValueOnce({ data: page });
      });
      mockListContributors.mockResolvedValueOnce({ data: [] });

      const result = await fetchAllContributors('owner', 'repo');

      expect(result).toHaveLength(1000);
      expect(mockListContributors).toHaveBeenCalledTimes(11);
    });

    it('should handle contributors with mixed user types', async () => {
      const mockContributors = [
        { id: 1, login: 'human-user', contributions: 50, type: 'User' },
        { id: 2, login: 'bot-user', contributions: 25, type: 'Bot' },
        { id: 3, login: 'org-user', contributions: 10, type: 'Organization' }
      ];

      mockListContributors
        .mockResolvedValueOnce({ data: mockContributors })
        .mockResolvedValueOnce({ data: [] });

      const result = await fetchAllContributors('owner', 'repo');

      expect(result).toHaveLength(3);
      expect(result.find(c => c.type === 'User')).toBeDefined();
      expect(result.find(c => c.type === 'Bot')).toBeDefined();
      expect(result.find(c => c.type === 'Organization')).toBeDefined();
    });
  });

  describe('Error Handling and Failure Conditions', () => {
    it('should handle authentication token retrieval failure', async () => {
      mockGetAuthToken.mockRejectedValueOnce(new Error('GITHUB_TOKEN environment variable is required'));

      await expect(fetchAllContributors('owner', 'repo'))
        .rejects
        .toThrow('GITHUB_TOKEN environment variable is required');

      expect(mockOctokit).not.toHaveBeenCalled();
      expect(mockListContributors).not.toHaveBeenCalled();
    });

    it('should handle Octokit initialization failure', async () => {
      mockOctokit.mockImplementationOnce(() => {
        throw new Error('Failed to initialize Octokit');
      });

      await expect(fetchAllContributors('owner', 'repo'))
        .rejects
        .toThrow('Failed to initialize Octokit');
    });

    it('should handle 404 repository not found error', async () => {
      const notFoundError = new Error('Not Found');
      (notFoundError as any).status = 404;
      mockListContributors.mockRejectedValueOnce(notFoundError);

      await expect(fetchAllContributors('nonexistent', 'repo'))
        .rejects
        .toThrow('Not Found');
    });

    it('should handle 403 forbidden access error', async () => {
      const forbiddenError = new Error('Forbidden');
      (forbiddenError as any).status = 403;
      mockListContributors.mockRejectedValueOnce(forbiddenError);

      await expect(fetchAllContributors('private-owner', 'private-repo'))
        .rejects
        .toThrow('Forbidden');
    });

    it('should handle API rate limit exceeded error', async () => {
      const rateLimitError = new Error('API rate limit exceeded');
      (rateLimitError as any).status = 403;
      (rateLimitError as any).response = {
        headers: { 'x-ratelimit-remaining': '0' }
      };
      mockListContributors.mockRejectedValueOnce(rateLimitError);

      await expect(fetchAllContributors('owner', 'repo'))
        .rejects
        .toThrow('API rate limit exceeded');
    });

    it('should handle 500 server error', async () => {
      const serverError = new Error('Internal Server Error');
      (serverError as any).status = 500;
      mockListContributors.mockRejectedValueOnce(serverError);

      await expect(fetchAllContributors('owner', 'repo'))
        .rejects
        .toThrow('Internal Server Error');
    });

    it('should handle network timeout errors', async () => {
      const timeoutError = new Error('Request timeout');
      timeoutError.name = 'TimeoutError';
      mockListContributors.mockRejectedValueOnce(timeoutError);

      await expect(fetchAllContributors('owner', 'repo'))
        .rejects
        .toThrow('Request timeout');
    });

    it('should handle partial pagination failure', async () => {
      const firstPageContributors = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        login: `user${i + 1}`,
        contributions: 10,
        avatar_url: `https://avatar${i + 1}.com`,
        type: 'User'
      }));

      mockListContributors
        .mockResolvedValueOnce({ data: firstPageContributors })
        .mockRejectedValueOnce(new Error('Second page failed'));

      await expect(fetchAllContributors('owner', 'repo'))
        .rejects
        .toThrow('Second page failed');

      expect(mockListContributors).toHaveBeenCalledTimes(2);
    });

    it('should handle malformed response data', async () => {
      mockListContributors.mockResolvedValueOnce({ data: null });

      await expect(fetchAllContributors('owner', 'repo'))
        .rejects
        .toThrow();
    });

    it('should handle undefined response data', async () => {
      mockListContributors.mockResolvedValueOnce({ data: undefined });

      await expect(fetchAllContributors('owner', 'repo'))
        .rejects
        .toThrow();
    });

    it('should handle response with missing data property', async () => {
      mockListContributors.mockResolvedValueOnce({});

      await expect(fetchAllContributors('owner', 'repo'))
        .rejects
        .toThrow();
    });
  });

  describe('Input Validation', () => {
    it('should handle empty string inputs', async () => {
      mockListContributors.mockResolvedValueOnce({ data: [] });

      const result = await fetchAllContributors('', '');

      expect(mockListContributors).toHaveBeenCalledWith({
        owner: '',
        repo: '',
        per_page: 100,
        page: 1
      });
      expect(result).toEqual([]);
    });

    it('should handle whitespace-only inputs', async () => {
      mockListContributors.mockResolvedValueOnce({ data: [] });

      const result = await fetchAllContributors('   ', '   ');

      expect(mockListContributors).toHaveBeenCalledWith({
        owner: '   ',
        repo: '   ',
        per_page: 100,
        page: 1
      });
      expect(result).toEqual([]);
    });

    it('should handle special characters in owner and repo names', async () => {
      const specialOwner = 'owner-with_special.chars';
      const specialRepo = 'repo-with_special.chars';
      mockListContributors.mockResolvedValueOnce({ data: [] });

      const result = await fetchAllContributors(specialOwner, specialRepo);

      expect(mockListContributors).toHaveBeenCalledWith({
        owner: specialOwner,
        repo: specialRepo,
        per_page: 100,
        page: 1
      });
      expect(result).toEqual([]);
    });

    it('should handle unicode characters in repository names', async () => {
      const unicodeOwner = 'owner-测试';
      const unicodeRepo = 'repo-тест';
      mockListContributors.mockResolvedValueOnce({ data: [] });

      const result = await fetchAllContributors(unicodeOwner, unicodeRepo);

      expect(mockListContributors).toHaveBeenCalledWith({
        owner: unicodeOwner,
        repo: unicodeRepo,
        per_page: 100,
        page: 1
      });
      expect(result).toEqual([]);
    });
  });

  describe('Authentication and Authorization', () => {
    it('should pass authentication token to Octokit', async () => {
      const testToken = 'ghp_test_token_123';
      mockGetAuthToken.mockResolvedValueOnce(testToken);
      mockListContributors.mockResolvedValueOnce({ data: [] });

      await fetchAllContributors('owner', 'repo');

      expect(mockGetAuthToken).toHaveBeenCalledTimes(1);
      expect(mockOctokit).toHaveBeenCalledWith({ auth: testToken });
    });

    it('should handle different token formats', async () => {
      const tokenFormats = [
        'ghp_classic_token',
        'github_pat_token',
        'ghs_installation_token'
      ];

      for (const token of tokenFormats) {
        jest.clearAllMocks();
        mockGetAuthToken.mockResolvedValueOnce(token);
        mockListContributors.mockResolvedValueOnce({ data: [] });

        await fetchAllContributors('owner', 'repo');

        expect(mockOctokit).toHaveBeenCalledWith({ auth: token });
      }
    });

    it('should handle authentication failure gracefully', async () => {
      const authError = new Error('Bad credentials');
      (authError as any).status = 401;
      mockListContributors.mockRejectedValueOnce(authError);

      await expect(fetchAllContributors('owner', 'repo'))
        .rejects
        .toThrow('Bad credentials');
    });
  });

  describe('Performance and Resource Management', () => {
    it('should handle concurrent requests properly', async () => {
      const mockContributors = [
        { id: 1, login: 'user1', contributions: 5, avatar_url: 'https://avatar1.com' }
      ];

      mockListContributors
        .mockResolvedValue({ data: mockContributors })
        .mockResolvedValue({ data: [] });

      const promises = [
        fetchAllContributors('owner1', 'repo1'),
        fetchAllContributors('owner2', 'repo2'),
        fetchAllContributors('owner3', 'repo3')
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      expect(mockGetAuthToken).toHaveBeenCalledTimes(3);
      expect(mockOctokit).toHaveBeenCalledTimes(3);
      results.forEach(result => {
        expect(result).toEqual(mockContributors);
      });
    });

    it('should handle large dataset efficiently', async () => {
      // Create 5 pages of 100 contributors each
      const pages = Array.from({ length: 5 }, (_, pageIndex) => {
        return Array.from({ length: 100 }, (_, i) => ({
          id: pageIndex * 100 + i + 1,
          login: `user${pageIndex * 100 + i + 1}`,
          contributions: Math.floor(Math.random() * 1000),
          avatar_url: `https://avatar${pageIndex * 100 + i + 1}.com`,
          type: 'User',
          // Add some additional data to test memory handling
          url: `https://api.github.com/users/user${pageIndex * 100 + i + 1}`,
          html_url: `https://github.com/user${pageIndex * 100 + i + 1}`
        }));
      });

      pages.forEach(page => {
        mockListContributors.mockResolvedValueOnce({ data: page });
      });
      mockListContributors.mockResolvedValueOnce({ data: [] });

      const result = await fetchAllContributors('owner', 'repo');

      expect(result).toHaveLength(500);
      expect(mockListContributors).toHaveBeenCalledTimes(6);
    });

    it('should handle memory efficiently with sparse data', async () => {
      const sparseContributors = Array.from({ length: 50 }, (_, i) => ({
        id: i + 1,
        login: `user${i + 1}`,
        contributions: i % 10 === 0 ? 1000 : 1, // Sparse contribution distribution
        avatar_url: i % 5 === 0 ? `https://avatar${i + 1}.com` : null,
        type: 'User'
      }));

      mockListContributors
        .mockResolvedValueOnce({ data: sparseContributors })
        .mockResolvedValueOnce({ data: [] });

      const result = await fetchAllContributors('owner', 'repo');

      expect(result).toHaveLength(50);
      expect(result.filter(c => c.avatar_url !== null)).toHaveLength(10);
      expect(result.filter(c => c.contributions === 1000)).toHaveLength(5);
    });
  });

  describe('Data Integrity and Validation', () => {
    it('should preserve contributor data structure', async () => {
      const mockContributors = [
        {
          id: 12345,
          login: 'testuser',
          contributions: 42,
          avatar_url: 'https://avatars.githubusercontent.com/u/12345?v=4',
          url: 'https://api.github.com/users/testuser',
          html_url: 'https://github.com/testuser',
          type: 'User',
          site_admin: false,
          gravatar_id: '',
          followers_url: 'https://api.github.com/users/testuser/followers',
          following_url: 'https://api.github.com/users/testuser/following{/other_user}',
          gists_url: 'https://api.github.com/users/testuser/gists{/gist_id}',
          starred_url: 'https://api.github.com/users/testuser/starred{/owner}{/repo}',
          subscriptions_url: 'https://api.github.com/users/testuser/subscriptions',
          organizations_url: 'https://api.github.com/users/testuser/orgs',
          repos_url: 'https://api.github.com/users/testuser/repos',
          events_url: 'https://api.github.com/users/testuser/events{/privacy}',
          received_events_url: 'https://api.github.com/users/testuser/received_events'
        }
      ];

      mockListContributors
        .mockResolvedValueOnce({ data: mockContributors })
        .mockResolvedValueOnce({ data: [] });

      const result = await fetchAllContributors('owner', 'repo');

      expect(result[0]).toEqual(expect.objectContaining({
        id: expect.any(Number),
        login: expect.any(String),
        contributions: expect.any(Number),
        avatar_url: expect.any(String),
        type: expect.any(String),
        site_admin: expect.any(Boolean),
        url: expect.any(String),
        html_url: expect.any(String)
      }));
    });

    it('should handle mixed data types gracefully', async () => {
      const mockContributors = [
        { id: 1, login: 'user1', contributions: 42 },
        { id: '2', login: 'user2', contributions: '15' }, // String values
        { id: 3, login: 'user3', contributions: 0 },
        { id: 4, login: 'user4', contributions: null }
      ];

      mockListContributors
        .mockResolvedValueOnce({ data: mockContributors })
        .mockResolvedValueOnce({ data: [] });

      const result = await fetchAllContributors('owner', 'repo');

      expect(result).toHaveLength(4);
      expect(result[0].contributions).toBe(42);
      expect(result[1].contributions).toBe('15');
      expect(result[2].contributions).toBe(0);
      expect(result[3].contributions).toBe(null);
    });

    it('should maintain order of contributors across pages', async () => {
      const firstPage = [
        { id: 1, login: 'user1', contributions: 100 },
        { id: 2, login: 'user2', contributions: 90 }
      ];
      const secondPage = [
        { id: 3, login: 'user3', contributions: 80 },
        { id: 4, login: 'user4', contributions: 70 }
      ];

      mockListContributors
        .mockResolvedValueOnce({ data: firstPage })
        .mockResolvedValueOnce({ data: secondPage })
        .mockResolvedValueOnce({ data: [] });

      const result = await fetchAllContributors('owner', 'repo');

      expect(result).toHaveLength(4);
      expect(result[0].login).toBe('user1');
      expect(result[1].login).toBe('user2');
      expect(result[2].login).toBe('user3');
      expect(result[3].login).toBe('user4');
    });

    it('should handle duplicate contributors across pages', async () => {
      const contributor = { id: 1, login: 'user1', contributions: 100 };
      const firstPage = [contributor];
      const secondPage = [contributor]; // Duplicate

      mockListContributors
        .mockResolvedValueOnce({ data: firstPage })
        .mockResolvedValueOnce({ data: secondPage })
        .mockResolvedValueOnce({ data: [] });

      const result = await fetchAllContributors('owner', 'repo');

      // Should include duplicates as returned by API
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(contributor);
      expect(result[1]).toEqual(contributor);
    });
  });

  describe('Edge Cases with Pagination', () => {
    it('should handle exactly 100 contributors (single full page)', async () => {
      const contributors = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        login: `user${i + 1}`,
        contributions: 10,
        avatar_url: `https://avatar${i + 1}.com`,
        type: 'User'
      }));

      mockListContributors
        .mockResolvedValueOnce({ data: contributors })
        .mockResolvedValueOnce({ data: [] });

      const result = await fetchAllContributors('owner', 'repo');

      expect(result).toHaveLength(100);
      expect(mockListContributors).toHaveBeenCalledTimes(2);
    });

    it('should handle exactly 101 contributors (just over one page)', async () => {
      const firstPage = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        login: `user${i + 1}`,
        contributions: 10,
        type: 'User'
      }));

      const secondPage = [{
        id: 101,
        login: 'user101',
        contributions: 10,
        type: 'User'
      }];

      mockListContributors
        .mockResolvedValueOnce({ data: firstPage })
        .mockResolvedValueOnce({ data: secondPage })
        .mockResolvedValueOnce({ data: [] });

      const result = await fetchAllContributors('owner', 'repo');

      expect(result).toHaveLength(101);
      expect(mockListContributors).toHaveBeenCalledTimes(3);
    });

    it('should handle inconsistent page sizes', async () => {
      const firstPage = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        login: `user${i + 1}`,
        contributions: 10,
        type: 'User'
      }));

      const secondPage = Array.from({ length: 25 }, (_, i) => ({
        id: i + 101,
        login: `user${i + 101}`,
        contributions: 10,
        type: 'User'
      }));

      mockListContributors
        .mockResolvedValueOnce({ data: firstPage })
        .mockResolvedValueOnce({ data: secondPage })
        .mockResolvedValueOnce({ data: [] });

      const result = await fetchAllContributors('owner', 'repo');

      expect(result).toHaveLength(125);
      expect(mockListContributors).toHaveBeenCalledTimes(3);
    });
  });
});