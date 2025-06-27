import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { fetchWalletAddresses, WalletAddress, FetchWalletAddressesOptions } from './fetchWalletAddresses';

// Mock external dependencies
jest.mock('axios');
jest.mock('../../../utils/logger');
jest.mock('../../../utils/cache');

import axios from 'axios';
import { logger } from '../../../utils/logger';
import { cache } from '../../../utils/cache';

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedLogger = logger as jest.Mocked<typeof logger>;
const mockedCache = cache as jest.Mocked<typeof cache>;

describe('fetchWalletAddresses', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedCache.get.mockResolvedValue(null);
    mockedCache.set.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Happy Path Scenarios', () => {
    it('should fetch wallet addresses successfully with default options', async () => {
      const mockWalletAddresses: WalletAddress[] = [
        {
          address: '0x1234567890123456789012345678901234567890',
          balance: '1000000000000000000',
          lastActivity: new Date('2023-01-01'),
          type: 'EOA'
        },
        {
          address: '0x9876543210987654321098765432109876543210',
          balance: '2000000000000000000',
          lastActivity: new Date('2023-01-02'),
          type: 'Contract'
        }
      ];

      mockedAxios.get.mockResolvedValue({
        data: { addresses: mockWalletAddresses },
        status: 200
      });

      const result = await fetchWalletAddresses();

      expect(result).toEqual(mockWalletAddresses);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/api/wallet-addresses'),
        expect.objectContaining({
          timeout: 30000,
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      );
    });

    it('should fetch wallet addresses with custom options', async () => {
      const options: FetchWalletAddressesOptions = {
        limit: 50,
        offset: 10,
        minBalance: '1000000000000000000',
        includeContracts: false,
        sortBy: 'balance',
        sortOrder: 'desc'
      };

      const mockWalletAddresses: WalletAddress[] = [
        {
          address: '0x1111111111111111111111111111111111111111',
          balance: '5000000000000000000',
          lastActivity: new Date('2023-01-03'),
          type: 'EOA'
        }
      ];

      mockedAxios.get.mockResolvedValue({
        data: { addresses: mockWalletAddresses },
        status: 200
      });

      const result = await fetchWalletAddresses(options);

      expect(result).toEqual(mockWalletAddresses);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('limit=50'),
        expect.any(Object)
      );
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('offset=10'),
        expect.any(Object)
      );
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('minBalance=1000000000000000000'),
        expect.any(Object)
      );
    });

    it('should return cached results when available', async () => {
      const cachedAddresses: WalletAddress[] = [
        {
          address: '0x2222222222222222222222222222222222222222',
          balance: '3000000000000000000',
          lastActivity: new Date('2023-01-04'),
          type: 'EOA'
        }
      ];

      mockedCache.get.mockResolvedValue(cachedAddresses);

      const result = await fetchWalletAddresses();

      expect(result).toEqual(cachedAddresses);
      expect(mockedAxios.get).not.toHaveBeenCalled();
      expect(mockedCache.get).toHaveBeenCalledWith(
        expect.stringContaining('wallet-addresses')
      );
    });

    it('should handle pagination correctly', async () => {
      const options: FetchWalletAddressesOptions = {
        limit: 2,
        offset: 0
      };

      const mockPage1: WalletAddress[] = [
        {
          address: '0x3333333333333333333333333333333333333333',
          balance: '1000000000000000000',
          lastActivity: new Date('2023-01-05'),
          type: 'EOA'
        },
        {
          address: '0x4444444444444444444444444444444444444444',
          balance: '2000000000000000000',
          lastActivity: new Date('2023-01-06'),
          type: 'EOA'
        }
      ];

      mockedAxios.get.mockResolvedValue({
        data: { addresses: mockPage1, hasMore: true, total: 100 },
        status: 200
      });

      const result = await fetchWalletAddresses(options);

      expect(result).toEqual(mockPage1);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('limit=2&offset=0'),
        expect.any(Object)
      );
    });

    it('should handle filtering by wallet type', async () => {
      const options: FetchWalletAddressesOptions = {
        walletType: 'Contract',
        includeContracts: true
      };

      const mockContractAddresses: WalletAddress[] = [
        {
          address: '0x5555555555555555555555555555555555555555',
          balance: '10000000000000000000',
          lastActivity: new Date('2023-01-07'),
          type: 'Contract'
        }
      ];

      mockedAxios.get.mockResolvedValue({
        data: { addresses: mockContractAddresses },
        status: 200
      });

      const result = await fetchWalletAddresses(options);

      expect(result).toEqual(mockContractAddresses);
      expect(result.every(addr => addr.type === 'Contract')).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty response gracefully', async () => {
      mockedAxios.get.mockResolvedValue({
        data: { addresses: [] },
        status: 200
      });

      const result = await fetchWalletAddresses();

      expect(result).toEqual([]);
      expect(mockedLogger.info).toHaveBeenCalledWith(
        'No wallet addresses found'
      );
    });

    it('should handle null/undefined response data', async () => {
      mockedAxios.get.mockResolvedValue({
        data: null,
        status: 200
      });

      const result = await fetchWalletAddresses();

      expect(result).toEqual([]);
      expect(mockedLogger.warn).toHaveBeenCalledWith(
        'Received null or undefined response data'
      );
    });

    it('should handle malformed address data', async () => {
      const malformedData = {
        data: {
          addresses: [
            {
              address: 'invalid-address',
              balance: 'not-a-number',
              lastActivity: 'invalid-date',
              type: 'UNKNOWN'
            }
          ]
        },
        status: 200
      };

      mockedAxios.get.mockResolvedValue(malformedData);

      const result = await fetchWalletAddresses();

      expect(result).toEqual([]);
      expect(mockedLogger.error).toHaveBeenCalledWith(
        'Invalid wallet address format detected',
        expect.any(Object)
      );
    });

    it('should handle very large limit values', async () => {
      const options: FetchWalletAddressesOptions = {
        limit: 10000
      };

      mockedAxios.get.mockResolvedValue({
        data: { addresses: [] },
        status: 200
      });

      const result = await fetchWalletAddresses(options);

      expect(result).toEqual([]);
      expect(mockedLogger.warn).toHaveBeenCalledWith(
        'Large limit value detected, consider pagination'
      );
    });

    it('should handle negative offset values', async () => {
      const options: FetchWalletAddressesOptions = {
        offset: -10
      };

      await expect(fetchWalletAddresses(options)).rejects.toThrow(
        'Offset cannot be negative'
      );
    });

    it('should handle invalid balance format', async () => {
      const options: FetchWalletAddressesOptions = {
        minBalance: 'invalid-balance'
      };

      await expect(fetchWalletAddresses(options)).rejects.toThrow(
        'Invalid balance format'
      );
    });

    it('should handle zero-balance wallets correctly', async () => {
      const zeroBalanceAddresses: WalletAddress[] = [
        {
          address: '0x6666666666666666666666666666666666666666',
          balance: '0',
          lastActivity: new Date('2023-01-08'),
          type: 'EOA'
        }
      ];

      mockedAxios.get.mockResolvedValue({
        data: { addresses: zeroBalanceAddresses },
        status: 200
      });

      const result = await fetchWalletAddresses();

      expect(result).toEqual(zeroBalanceAddresses);
      expect(result[0].balance).toBe('0');
    });
  });

  describe('Error Handling', () => {
    it('should handle network timeout errors', async () => {
      const timeoutError = new Error('Network timeout');
      timeoutError.name = 'ECONNABORTED';

      mockedAxios.get.mockRejectedValue(timeoutError);

      await expect(fetchWalletAddresses()).rejects.toThrow(
        'Request timeout while fetching wallet addresses'
      );

      expect(mockedLogger.error).toHaveBeenCalledWith(
        'Network timeout error',
        timeoutError
      );
    });

    it('should handle HTTP 404 errors', async () => {
      const notFoundError = {
        response: {
          status: 404,
          data: { message: 'Endpoint not found' }
        }
      };

      mockedAxios.get.mockRejectedValue(notFoundError);

      await expect(fetchWalletAddresses()).rejects.toThrow(
        'Wallet addresses endpoint not found'
      );
    });

    it('should handle HTTP 500 errors', async () => {
      const serverError = {
        response: {
          status: 500,
          data: { message: 'Internal server error' }
        }
      };

      mockedAxios.get.mockRejectedValue(serverError);

      await expect(fetchWalletAddresses()).rejects.toThrow(
        'Server error while fetching wallet addresses'
      );

      expect(mockedLogger.error).toHaveBeenCalledWith(
        'HTTP 500 error',
        serverError
      );
    });

    it('should handle rate limiting (HTTP 429)', async () => {
      const rateLimitError = {
        response: {
          status: 429,
          headers: { 'retry-after': '60' },
          data: { message: 'Too many requests' }
        }
      };

      mockedAxios.get.mockRejectedValue(rateLimitError);

      await expect(fetchWalletAddresses()).rejects.toThrow(
        'Rate limited, retry after 60 seconds'
      );
    });

    it('should handle authentication errors (HTTP 401)', async () => {
      const authError = {
        response: {
          status: 401,
          data: { message: 'Unauthorized' }
        }
      };

      mockedAxios.get.mockRejectedValue(authError);

      await expect(fetchWalletAddresses()).rejects.toThrow(
        'Authentication required'
      );
    });

    it('should handle authorization errors (HTTP 403)', async () => {
      const forbiddenError = {
        response: {
          status: 403,
          data: { message: 'Forbidden' }
        }
      };

      mockedAxios.get.mockRejectedValue(forbiddenError);

      await expect(fetchWalletAddresses()).rejects.toThrow(
        'Access forbidden'
      );
    });

    it('should handle JSON parsing errors', async () => {
      const parseError = new SyntaxError('Unexpected token in JSON');
      
      mockedAxios.get.mockRejectedValue(parseError);

      await expect(fetchWalletAddresses()).rejects.toThrow(
        'Failed to parse response data'
      );
    });

    it('should handle cache errors gracefully', async () => {
      const cacheError = new Error('Cache connection failed');
      mockedCache.get.mockRejectedValue(cacheError);

      const mockWalletAddresses: WalletAddress[] = [
        {
          address: '0x7777777777777777777777777777777777777777',
          balance: '1000000000000000000',
          lastActivity: new Date('2023-01-07'),
          type: 'EOA'
        }
      ];

      mockedAxios.get.mockResolvedValue({
        data: { addresses: mockWalletAddresses },
        status: 200
      });

      const result = await fetchWalletAddresses();

      expect(result).toEqual(mockWalletAddresses);
      expect(mockedLogger.warn).toHaveBeenCalledWith(
        'Cache error, falling back to API call',
        cacheError
      );
    });

    it('should handle connection refused errors', async () => {
      const connectionError = new Error('Connection refused');
      connectionError.code = 'ECONNREFUSED';

      mockedAxios.get.mockRejectedValue(connectionError);

      await expect(fetchWalletAddresses()).rejects.toThrow(
        'Unable to connect to wallet service'
      );
    });
  });

  describe('Performance and Reliability', () => {
    it('should implement retry logic for transient failures', async () => {
      const transientError = {
        response: {
          status: 503,
          data: { message: 'Service temporarily unavailable' }
        }
      };

      const mockWalletAddresses: WalletAddress[] = [
        {
          address: '0x8888888888888888888888888888888888888888',
          balance: '1000000000000000000',
          lastActivity: new Date('2023-01-08'),
          type: 'EOA'
        }
      ];

      mockedAxios.get
        .mockRejectedValueOnce(transientError)
        .mockRejectedValueOnce(transientError)
        .mockResolvedValue({
          data: { addresses: mockWalletAddresses },
          status: 200
        });

      const result = await fetchWalletAddresses();

      expect(result).toEqual(mockWalletAddresses);
      expect(mockedAxios.get).toHaveBeenCalledTimes(3);
      expect(mockedLogger.info).toHaveBeenCalledWith(
        'Retry attempt 2 successful'
      );
    });

    it('should fail after maximum retry attempts', async () => {
      const persistentError = {
        response: {
          status: 503,
          data: { message: 'Service unavailable' }
        }
      };

      mockedAxios.get.mockRejectedValue(persistentError);

      await expect(fetchWalletAddresses()).rejects.toThrow(
        'Maximum retry attempts exceeded'
      );

      expect(mockedAxios.get).toHaveBeenCalledTimes(4); // Initial + 3 retries
    });

    it('should set appropriate cache TTL for different data types', async () => {
      const mockWalletAddresses: WalletAddress[] = [
        {
          address: '0x9999999999999999999999999999999999999999',
          balance: '1000000000000000000',
          lastActivity: new Date('2023-01-09'),
          type: 'Contract'
        }
      ];

      mockedAxios.get.mockResolvedValue({
        data: { addresses: mockWalletAddresses },
        status: 200
      });

      await fetchWalletAddresses();

      expect(mockedCache.set).toHaveBeenCalledWith(
        expect.any(String),
        mockWalletAddresses,
        300 // 5 minutes TTL for wallet addresses
      );
    });

    it('should handle concurrent requests efficiently', async () => {
      const mockWalletAddresses: WalletAddress[] = [
        {
          address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          balance: '1000000000000000000',
          lastActivity: new Date('2023-01-10'),
          type: 'EOA'
        }
      ];

      mockedAxios.get.mockResolvedValue({
        data: { addresses: mockWalletAddresses },
        status: 200
      });

      const promises = Array(5).fill(null).map(() => fetchWalletAddresses());
      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result).toEqual(mockWalletAddresses);
      });

      // Should only make one API call due to request deduplication
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });

    it('should handle memory pressure with large datasets', async () => {
      const largeDataset = Array(10000).fill(null).map((_, index) => ({
        address: `0x${'a'.repeat(40)}${index.toString().padStart(4, '0')}`,
        balance: (Math.random() * 1000000000000000000).toString(),
        lastActivity: new Date(),
        type: index % 2 === 0 ? 'EOA' : 'Contract'
      }));

      mockedAxios.get.mockResolvedValue({
        data: { addresses: largeDataset },
        status: 200
      });

      const result = await fetchWalletAddresses({ limit: 10000 });

      expect(result).toHaveLength(10000);
      expect(mockedLogger.warn).toHaveBeenCalledWith(
        'Large dataset detected, consider streaming or pagination'
      );
    });
  });

  describe('Input Validation', () => {
    it('should validate address format in filter options', async () => {
      const options: FetchWalletAddressesOptions = {
        filterByAddress: 'invalid-eth-address'
      };

      await expect(fetchWalletAddresses(options)).rejects.toThrow(
        'Invalid Ethereum address format'
      );
    });

    it('should validate date range filters', async () => {
      const options: FetchWalletAddressesOptions = {
        fromDate: new Date('2023-01-10'),
        toDate: new Date('2023-01-01') // End date before start date
      };

      await expect(fetchWalletAddresses(options)).rejects.toThrow(
        'End date must be after start date'
      );
    });

    it('should validate sort options', async () => {
      const options: FetchWalletAddressesOptions = {
        sortBy: 'invalid-field' as any
      };

      await expect(fetchWalletAddresses(options)).rejects.toThrow(
        'Invalid sort field'
      );
    });

    it('should validate limit boundaries', async () => {
      const options: FetchWalletAddressesOptions = {
        limit: 0
      };

      await expect(fetchWalletAddresses(options)).rejects.toThrow(
        'Limit must be greater than 0'
      );

      const options2: FetchWalletAddressesOptions = {
        limit: 10001
      };

      await expect(fetchWalletAddresses(options2)).rejects.toThrow(
        'Limit cannot exceed 10000'
      );
    });

    it('should accept valid Ethereum addresses', async () => {
      const options: FetchWalletAddressesOptions = {
        filterByAddress: '0x742c4f3e10C82c7bf03db5e1A87F0f0e27E7B527'
      };

      const mockWalletAddresses: WalletAddress[] = [
        {
          address: '0x742c4f3e10C82c7bf03db5e1A87F0f0e27E7B527',
          balance: '1000000000000000000',
          lastActivity: new Date('2023-01-11'),
          type: 'EOA'
        }
      ];

      mockedAxios.get.mockResolvedValue({
        data: { addresses: mockWalletAddresses },
        status: 200
      });

      const result = await fetchWalletAddresses(options);

      expect(result).toEqual(mockWalletAddresses);
    });

    it('should validate balance threshold format', async () => {
      const validOptions: FetchWalletAddressesOptions = {
        minBalance: '1000000000000000000' // 1 ETH in wei
      };

      const mockWalletAddresses: WalletAddress[] = [
        {
          address: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
          balance: '2000000000000000000',
          lastActivity: new Date('2023-01-12'),
          type: 'EOA'
        }
      ];

      mockedAxios.get.mockResolvedValue({
        data: { addresses: mockWalletAddresses },
        status: 200
      });

      const result = await fetchWalletAddresses(validOptions);

      expect(result).toEqual(mockWalletAddresses);
    });
  });

  describe('Data Transformation', () => {
    it('should properly transform API response to WalletAddress objects', async () => {
      const apiResponse = {
        data: {
          addresses: [
            {
              wallet_address: '0xcccccccccccccccccccccccccccccccccccccccc',
              balance_wei: '1000000000000000000',
              last_activity_timestamp: '2023-01-11T10:00:00Z',
              address_type: 'externally_owned_account'
            }
          ]
        },
        status: 200
      };

      mockedAxios.get.mockResolvedValue(apiResponse);

      const result = await fetchWalletAddresses();

      expect(result).toEqual([
        {
          address: '0xcccccccccccccccccccccccccccccccccccccccc',
          balance: '1000000000000000000',
          lastActivity: new Date('2023-01-11T10:00:00Z'),
          type: 'EOA'
        }
      ]);
    });

    it('should handle balance conversion from different units', async () => {
      const apiResponse = {
        data: {
          addresses: [
            {
              wallet_address: '0xdddddddddddddddddddddddddddddddddddddddd',
              balance_eth: '1.5',
              last_activity_timestamp: '2023-01-12T10:00:00Z',
              address_type: 'contract'
            }
          ]
        },
        status: 200
      };

      mockedAxios.get.mockResolvedValue(apiResponse);

      const result = await fetchWalletAddresses();

      expect(result[0].balance).toBe('1500000000000000000'); // 1.5 ETH in wei
    });

    it('should normalize different address type formats', async () => {
      const apiResponse = {
        data: {
          addresses: [
            {
              wallet_address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
              balance_wei: '1000000000000000000',
              last_activity_timestamp: '2023-01-13T10:00:00Z',
              address_type: 'smart_contract'
            }
          ]
        },
        status: 200
      };

      mockedAxios.get.mockResolvedValue(apiResponse);

      const result = await fetchWalletAddresses();

      expect(result[0].type).toBe('Contract');
    });

    it('should handle missing optional fields gracefully', async () => {
      const apiResponse = {
        data: {
          addresses: [
            {
              wallet_address: '0xffffffffffffffffffffffffffffffffffffffff',
              balance_wei: '1000000000000000000'
              // Missing last_activity_timestamp and address_type
            }
          ]
        },
        status: 200
      };

      mockedAxios.get.mockResolvedValue(apiResponse);

      const result = await fetchWalletAddresses();

      expect(result).toEqual([
        {
          address: '0xffffffffffffffffffffffffffffffffffffffff',
          balance: '1000000000000000000',
          lastActivity: null,
          type: 'Unknown'
        }
      ]);
    });
  });

  describe('Monitoring and Logging', () => {
    it('should log successful API calls with timing metrics', async () => {
      const mockWalletAddresses: WalletAddress[] = [
        {
          address: '0x1010101010101010101010101010101010101010',
          balance: '1000000000000000000',
          lastActivity: new Date('2023-01-13'),
          type: 'EOA'
        }
      ];

      mockedAxios.get.mockResolvedValue({
        data: { addresses: mockWalletAddresses },
        status: 200
      });

      await fetchWalletAddresses();

      expect(mockedLogger.info).toHaveBeenCalledWith(
        'Successfully fetched wallet addresses',
        expect.objectContaining({
          count: 1,
          duration: expect.any(Number)
        })
      );
    });

    it('should log cache hit/miss statistics', async () => {
      mockedCache.get.mockResolvedValue(null);

      const mockWalletAddresses: WalletAddress[] = [
        {
          address: '0x2020202020202020202020202020202020202020',
          balance: '1000000000000000000',
          lastActivity: new Date('2023-01-14'),
          type: 'EOA'
        }
      ];

      mockedAxios.get.mockResolvedValue({
        data: { addresses: mockWalletAddresses },
        status: 200
      });

      await fetchWalletAddresses();

      expect(mockedLogger.debug).toHaveBeenCalledWith('Cache miss for wallet addresses');
    });

    it('should track API response times', async () => {
      const mockWalletAddresses: WalletAddress[] = [
        {
          address: '0x3030303030303030303030303030303030303030',
          balance: '1000000000000000000',
          lastActivity: new Date('2023-01-15'),
          type: 'EOA'
        }
      ];

      mockedAxios.get.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            data: { addresses: mockWalletAddresses },
            status: 200
          }), 100)
        )
      );

      await fetchWalletAddresses();

      expect(mockedLogger.info).toHaveBeenCalledWith(
        'API response time',
        expect.objectContaining({
          duration: expect.any(Number),
          endpoint: expect.stringContaining('wallet-addresses')
        })
      );
    });

    it('should log query parameters for debugging', async () => {
      const options: FetchWalletAddressesOptions = {
        limit: 25,
        offset: 5,
        sortBy: 'balance'
      };

      const mockWalletAddresses: WalletAddress[] = [];

      mockedAxios.get.mockResolvedValue({
        data: { addresses: mockWalletAddresses },
        status: 200
      });

      await fetchWalletAddresses(options);

      expect(mockedLogger.debug).toHaveBeenCalledWith(
        'Fetching wallet addresses with options',
        options
      );
    });
  });

  describe('Security and Compliance', () => {
    it('should sanitize sensitive data in logs', async () => {
      const sensitiveOptions: FetchWalletAddressesOptions = {
        apiKey: 'secret-api-key-12345',
        filterByAddress: '0x4040404040404040404040404040404040404040'
      };

      const mockWalletAddresses: WalletAddress[] = [];

      mockedAxios.get.mockResolvedValue({
        data: { addresses: mockWalletAddresses },
        status: 200
      });

      await fetchWalletAddresses(sensitiveOptions);

      expect(mockedLogger.debug).toHaveBeenCalledWith(
        'Fetching wallet addresses with options',
        expect.objectContaining({
          apiKey: '[REDACTED]',
          filterByAddress: '0x4040404040404040404040404040404040404040'
        })
      );
    });

    it('should validate API response structure to prevent injection attacks', async () => {
      const maliciousResponse = {
        data: {
          addresses: [
            {
              address: '0x5050505050505050505050505050505050505050',
              balance: '1000000000000000000',
              lastActivity: new Date('2023-01-16'),
              type: 'EOA',
              maliciousScript: '<script>alert("xss")</script>'
            }
          ]
        },
        status: 200
      };

      mockedAxios.get.mockResolvedValue(maliciousResponse);

      const result = await fetchWalletAddresses();

      expect(result[0]).not.toHaveProperty('maliciousScript');
      expect(mockedLogger.warn).toHaveBeenCalledWith(
        'Unexpected fields detected in API response, sanitizing data'
      );
    });
  });
});