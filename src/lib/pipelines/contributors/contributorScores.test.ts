import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  calculateContributorScore,
  aggregateContributorScores,
  normalizeContributorScores,
  rankContributors,
  filterContributorsByThreshold,
  ContributorScore,
  ContributorMetrics
} from './contributorScores'

describe('contributorScores', () => {
  let mockContributorMetrics: ContributorMetrics[]

  beforeEach(() => {
    mockContributorMetrics = [
      {
        username: 'alice',
        commits: 50,
        linesAdded: 1000,
        linesDeleted: 200,
        pullRequests: 15,
        reviews: 25,
        issues: 5,
        daysActive: 30
      },
      {
        username: 'bob',
        commits: 30,
        linesAdded: 800,
        linesDeleted: 150,
        pullRequests: 10,
        reviews: 20,
        issues: 3,
        daysActive: 25
      },
      {
        username: 'charlie',
        commits: 100,
        linesAdded: 2000,
        linesDeleted: 500,
        pullRequests: 25,
        reviews: 50,
        issues: 10,
        daysActive: 45
      }
    ]
  })

  describe('calculateContributorScore', () => {
    it('should calculate score correctly for typical contributor', () => {
      const metrics = mockContributorMetrics[0]
      const score = calculateContributorScore(metrics)
      
      expect(score).toBeTypeOf('number')
      expect(score).toBeGreaterThan(0)
      expect(score.username).toBe('alice')
    })

    it('should handle contributor with zero commits', () => {
      const zeroCommitMetrics: ContributorMetrics = {
        username: 'inactive',
        commits: 0,
        linesAdded: 0,
        linesDeleted: 0,
        pullRequests: 0,
        reviews: 0,
        issues: 0,
        daysActive: 0
      }
      
      const score = calculateContributorScore(zeroCommitMetrics)
      expect(score.score).toBe(0)
      expect(score.username).toBe('inactive')
    })

    it('should weight commits appropriately', () => {
      const highCommitMetrics = { ...mockContributorMetrics[0], commits: 200 }
      const lowCommitMetrics = { ...mockContributorMetrics[0], commits: 10 }
      
      const highScore = calculateContributorScore(highCommitMetrics)
      const lowScore = calculateContributorScore(lowCommitMetrics)
      
      expect(highScore.score).toBeGreaterThan(lowScore.score)
    })

    it('should weight pull requests appropriately', () => {
      const highPRMetrics = { ...mockContributorMetrics[0], pullRequests: 50 }
      const lowPRMetrics = { ...mockContributorMetrics[0], pullRequests: 1 }
      
      const highScore = calculateContributorScore(highPRMetrics)
      const lowScore = calculateContributorScore(lowPRMetrics)
      
      expect(highScore.score).toBeGreaterThan(lowScore.score)
    })

    it('should weight reviews appropriately', () => {
      const highReviewMetrics = { ...mockContributorMetrics[0], reviews: 100 }
      const lowReviewMetrics = { ...mockContributorMetrics[0], reviews: 1 }
      
      const highScore = calculateContributorScore(highReviewMetrics)
      const lowScore = calculateContributorScore(lowReviewMetrics)
      
      expect(highScore.score).toBeGreaterThan(lowScore.score)
    })

    it('should handle negative values gracefully', () => {
      const negativeMetrics: ContributorMetrics = {
        username: 'negative',
        commits: -5,
        linesAdded: -100,
        linesDeleted: -50,
        pullRequests: -2,
        reviews: -10,
        issues: -1,
        daysActive: -5
      }
      
      const score = calculateContributorScore(negativeMetrics)
      expect(score.score).toBeGreaterThanOrEqual(0)
    })

    it('should handle extremely large values', () => {
      const extremeMetrics: ContributorMetrics = {
        username: 'extreme',
        commits: Number.MAX_SAFE_INTEGER,
        linesAdded: Number.MAX_SAFE_INTEGER,
        linesDeleted: Number.MAX_SAFE_INTEGER,
        pullRequests: Number.MAX_SAFE_INTEGER,
        reviews: Number.MAX_SAFE_INTEGER,
        issues: Number.MAX_SAFE_INTEGER,
        daysActive: Number.MAX_SAFE_INTEGER
      }
      
      const score = calculateContributorScore(extremeMetrics)
      expect(score.score).toBeFinite()
      expect(score.score).not.toBeNaN()
    })

    it('should maintain username in result', () => {
      const metrics = mockContributorMetrics[0]
      const score = calculateContributorScore(metrics)
      
      expect(score.username).toBe(metrics.username)
    })

    it('should handle floating point precision correctly', () => {
      const precisionMetrics: ContributorMetrics = {
        username: 'precision',
        commits: 33,
        linesAdded: 333,
        linesDeleted: 33,
        pullRequests: 3,
        reviews: 33,
        issues: 3,
        daysActive: 33
      }
      
      const score = calculateContributorScore(precisionMetrics)
      expect(Number.isFinite(score.score)).toBe(true)
      expect(score.score).not.toBeNaN()
    })
  })

  describe('aggregateContributorScores', () => {
    it('should aggregate scores for all contributors', () => {
      const scores = aggregateContributorScores(mockContributorMetrics)
      
      expect(scores).toHaveLength(3)
      expect(scores.every(score => typeof score.score === 'number')).toBe(true)
      expect(scores.map(s => s.username)).toContain('alice')
      expect(scores.map(s => s.username)).toContain('bob')
      expect(scores.map(s => s.username)).toContain('charlie')
    })

    it('should handle empty array', () => {
      const scores = aggregateContributorScores([])
      
      expect(scores).toEqual([])
    })

    it('should handle single contributor', () => {
      const singleContributor = [mockContributorMetrics[0]]
      const scores = aggregateContributorScores(singleContributor)
      
      expect(scores).toHaveLength(1)
      expect(scores[0].username).toBe('alice')
    })

    it('should preserve all usernames', () => {
      const scores = aggregateContributorScores(mockContributorMetrics)
      const usernames = scores.map(s => s.username)
      
      expect(usernames).toContain('alice')
      expect(usernames).toContain('bob')
      expect(usernames).toContain('charlie')
      expect(new Set(usernames)).toHaveProperty('size', 3)
    })

    it('should handle duplicate usernames by aggregating', () => {
      const duplicateMetrics = [
        mockContributorMetrics[0],
        { ...mockContributorMetrics[0], commits: 20 }
      ]
      
      const scores = aggregateContributorScores(duplicateMetrics)
      const aliceScores = scores.filter(s => s.username === 'alice')
      
      expect(aliceScores).toHaveLength(1)
    })

    it('should handle large datasets efficiently', () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        username: `user${i}`,
        commits: Math.floor(Math.random() * 100),
        linesAdded: Math.floor(Math.random() * 1000),
        linesDeleted: Math.floor(Math.random() * 500),
        pullRequests: Math.floor(Math.random() * 50),
        reviews: Math.floor(Math.random() * 100),
        issues: Math.floor(Math.random() * 20),
        daysActive: Math.floor(Math.random() * 365)
      }))
      
      const start = Date.now()
      const scores = aggregateContributorScores(largeDataset)
      const end = Date.now()
      
      expect(scores).toHaveLength(1000)
      expect(end - start).toBeLessThan(1000) // Should complete within 1 second
    })
  })

  describe('normalizeContributorScores', () => {
    let rawScores: ContributorScore[]

    beforeEach(() => {
      rawScores = aggregateContributorScores(mockContributorMetrics)
    })

    it('should normalize scores to 0-100 range', () => {
      const normalized = normalizeContributorScores(rawScores)
      
      expect(normalized.every(score => score.normalizedScore >= 0)).toBe(true)
      expect(normalized.every(score => score.normalizedScore <= 100)).toBe(true)
    })

    it('should maintain relative ordering', () => {
      const normalized = normalizeContributorScores(rawScores)
      const sortedRaw = [...rawScores].sort((a, b) => b.score - a.score)
      const sortedNormalized = [...normalized].sort((a, b) => b.normalizedScore - a.normalizedScore)
      
      expect(sortedNormalized.map(s => s.username)).toEqual(sortedRaw.map(s => s.username))
    })

    it('should handle single score', () => {
      const singleScore = [rawScores[0]]
      const normalized = normalizeContributorScores(singleScore)
      
      expect(normalized).toHaveLength(1)
      expect(normalized[0].normalizedScore).toBe(100)
    })

    it('should handle empty array', () => {
      const normalized = normalizeContributorScores([])
      
      expect(normalized).toEqual([])
    })

    it('should handle all equal scores', () => {
      const equalScores: ContributorScore[] = [
        { username: 'user1', score: 50 },
        { username: 'user2', score: 50 },
        { username: 'user3', score: 50 }
      ]
      
      const normalized = normalizeContributorScores(equalScores)
      
      expect(normalized.every(score => score.normalizedScore === 100)).toBe(true)
    })

    it('should assign highest score 100', () => {
      const normalized = normalizeContributorScores(rawScores)
      const maxNormalized = Math.max(...normalized.map(s => s.normalizedScore))
      
      expect(maxNormalized).toBe(100)
    })

    it('should preserve original score values', () => {
      const normalized = normalizeContributorScores(rawScores)
      
      normalized.forEach(norm => {
        const original = rawScores.find(raw => raw.username === norm.username)
        expect(norm.score).toBe(original?.score)
      })
    })

    it('should handle zero scores correctly', () => {
      const scoresWithZero: ContributorScore[] = [
        { username: 'user1', score: 100 },
        { username: 'user2', score: 0 },
        { username: 'user3', score: 50 }
      ]
      
      const normalized = normalizeContributorScores(scoresWithZero)
      
      expect(normalized.find(s => s.username === 'user1')?.normalizedScore).toBe(100)
      expect(normalized.find(s => s.username === 'user2')?.normalizedScore).toBe(0)
      expect(normalized.find(s => s.username === 'user3')?.normalizedScore).toBe(50)
    })
  })

  describe('rankContributors', () => {
    let contributorScores: ContributorScore[]

    beforeEach(() => {
      contributorScores = [
        { username: 'alice', score: 85 },
        { username: 'bob', score: 92 },
        { username: 'charlie', score: 78 }
      ]
    })

    it('should rank contributors by score descending', () => {
      const ranked = rankContributors(contributorScores)
      
      expect(ranked[0].username).toBe('bob')
      expect(ranked[0].rank).toBe(1)
      expect(ranked[1].username).toBe('alice')
      expect(ranked[1].rank).toBe(2)
      expect(ranked[2].username).toBe('charlie')
      expect(ranked[2].rank).toBe(3)
    })

    it('should handle tied scores correctly', () => {
      const tiedScores: ContributorScore[] = [
        { username: 'alice', score: 85 },
        { username: 'bob', score: 85 },
        { username: 'charlie', score: 78 }
      ]
      
      const ranked = rankContributors(tiedScores)
      
      expect(ranked[0].rank).toBe(1)
      expect(ranked[1].rank).toBe(1)
      expect(ranked[2].rank).toBe(3)
    })

    it('should handle empty array', () => {
      const ranked = rankContributors([])
      
      expect(ranked).toEqual([])
    })

    it('should handle single contributor', () => {
      const singleContributor = [contributorScores[0]]
      const ranked = rankContributors(singleContributor)
      
      expect(ranked).toHaveLength(1)
      expect(ranked[0].rank).toBe(1)
      expect(ranked[0].username).toBe('alice')
    })

    it('should preserve all score data', () => {
      const ranked = rankContributors(contributorScores)
      
      ranked.forEach(rankedContributor => {
        const original = contributorScores.find(c => c.username === rankedContributor.username)
        expect(rankedContributor.score).toBe(original?.score)
        expect(rankedContributor.username).toBe(original?.username)
      })
    })

    it('should handle multiple tied groups', () => {
      const multiTiedScores: ContributorScore[] = [
        { username: 'alice', score: 90 },
        { username: 'bob', score: 90 },
        { username: 'charlie', score: 80 },
        { username: 'diana', score: 80 },
        { username: 'eve', score: 70 }
      ]
      
      const ranked = rankContributors(multiTiedScores)
      
      expect(ranked.filter(c => c.rank === 1)).toHaveLength(2)
      expect(ranked.filter(c => c.rank === 3)).toHaveLength(2)
      expect(ranked.filter(c => c.rank === 5)).toHaveLength(1)
    })

    it('should maintain stable sort for identical scores', () => {
      const identicalScores: ContributorScore[] = [
        { username: 'alice', score: 80 },
        { username: 'bob', score: 80 },
        { username: 'charlie', score: 80 }
      ]
      
      const ranked = rankContributors(identicalScores)
      
      expect(ranked.every(c => c.rank === 1)).toBe(true)
    })
  })

  describe('filterContributorsByThreshold', () => {
    let contributorScores: ContributorScore[]

    beforeEach(() => {
      contributorScores = [
        { username: 'alice', score: 85 },
        { username: 'bob', score: 92 },
        { username: 'charlie', score: 45 },
        { username: 'diana', score: 30 }
      ]
    })

    it('should filter contributors above threshold', () => {
      const filtered = filterContributorsByThreshold(contributorScores, 50)
      
      expect(filtered).toHaveLength(2)
      expect(filtered.map(c => c.username)).toContain('alice')
      expect(filtered.map(c => c.username)).toContain('bob')
      expect(filtered.map(c => c.username)).not.toContain('charlie')
      expect(filtered.map(c => c.username)).not.toContain('diana')
    })

    it('should include contributors at exact threshold', () => {
      const filtered = filterContributorsByThreshold(contributorScores, 85)
      
      expect(filtered.map(c => c.username)).toContain('alice')
      expect(filtered.map(c => c.username)).toContain('bob')
    })

    it('should handle threshold of 0', () => {
      const filtered = filterContributorsByThreshold(contributorScores, 0)
      
      expect(filtered).toHaveLength(4)
    })

    it('should handle threshold above all scores', () => {
      const filtered = filterContributorsByThreshold(contributorScores, 100)
      
      expect(filtered).toEqual([])
    })

    it('should handle empty array', () => {
      const filtered = filterContributorsByThreshold([], 50)
      
      expect(filtered).toEqual([])
    })

    it('should handle negative threshold', () => {
      const filtered = filterContributorsByThreshold(contributorScores, -10)
      
      expect(filtered).toHaveLength(4)
    })

    it('should preserve original objects', () => {
      const filtered = filterContributorsByThreshold(contributorScores, 50)
      
      filtered.forEach(filteredContributor => {
        const original = contributorScores.find(c => c.username === filteredContributor.username)
        expect(filteredContributor).toEqual(original)
      })
    })

    it('should handle decimal thresholds', () => {
      const scoresWithDecimals: ContributorScore[] = [
        { username: 'alice', score: 85.5 },
        { username: 'bob', score: 85.4 }
      ]
      
      const filtered = filterContributorsByThreshold(scoresWithDecimals, 85.45)
      
      expect(filtered).toHaveLength(1)
      expect(filtered[0].username).toBe('alice')
    })

    it('should maintain original order when filtering', () => {
      const filtered = filterContributorsByThreshold(contributorScores, 50)
      
      expect(filtered[0].username).toBe('alice') // Original order maintained
      expect(filtered[1].username).toBe('bob')
    })
  })

  describe('integration tests', () => {
    it('should handle complete pipeline from metrics to ranked results', () => {
      const scores = aggregateContributorScores(mockContributorMetrics)
      const normalized = normalizeContributorScores(scores)
      const ranked = rankContributors(normalized)
      const filtered = filterContributorsByThreshold(ranked, 50)
      
      expect(filtered.length).toBeGreaterThan(0)
      expect(filtered.every(c => c.rank)).toBe(true)
      expect(filtered.every(c => c.normalizedScore >= 50)).toBe(true)
      expect(filtered[0].rank).toBeLessThanOrEqual(filtered[filtered.length - 1].rank)
    })

    it('should handle edge case with minimal data', () => {
      const minimalMetrics: ContributorMetrics[] = [{
        username: 'minimal',
        commits: 1,
        linesAdded: 1,
        linesDeleted: 0,
        pullRequests: 0,
        reviews: 0,
        issues: 0,
        daysActive: 1
      }]
      
      const scores = aggregateContributorScores(minimalMetrics)
      const normalized = normalizeContributorScores(scores)
      const ranked = rankContributors(normalized)
      
      expect(ranked).toHaveLength(1)
      expect(ranked[0].rank).toBe(1)
      expect(ranked[0].normalizedScore).toBe(100)
    })

    it('should maintain data consistency through complete pipeline', () => {
      const originalUsernames = mockContributorMetrics.map(m => m.username)
      
      const scores = aggregateContributorScores(mockContributorMetrics)
      const normalized = normalizeContributorScores(scores)
      const ranked = rankContributors(normalized)
      
      expect(ranked.map(r => r.username).sort()).toEqual(originalUsernames.sort())
      
      // Check that all properties are preserved
      ranked.forEach(rankedContributor => {
        expect(rankedContributor.username).toBeDefined()
        expect(rankedContributor.score).toBeDefined()
        expect(rankedContributor.normalizedScore).toBeDefined()
        expect(rankedContributor.rank).toBeDefined()
      })
    })

    it('should handle workflow with filtering at different stages', () => {
      const scores = aggregateContributorScores(mockContributorMetrics)
      const preFilterScores = filterContributorsByThreshold(scores, 0) // No filtering
      const normalized = normalizeContributorScores(preFilterScores)
      const postFilterNormalized = filterContributorsByThreshold(normalized, 50)
      const ranked = rankContributors(postFilterNormalized)
      
      expect(ranked.every(c => c.normalizedScore >= 50)).toBe(true)
      expect(ranked.every(c => c.rank >= 1)).toBe(true)
    })
  })

  describe('error handling and edge cases', () => {
    it('should handle undefined metrics gracefully', () => {
      expect(() => calculateContributorScore(undefined as any)).not.toThrow()
    })

    it('should handle null values in metrics', () => {
      const nullMetrics: ContributorMetrics = {
        username: 'test',
        commits: null as any,
        linesAdded: null as any,
        linesDeleted: null as any,
        pullRequests: null as any,
        reviews: null as any,
        issues: null as any,
        daysActive: null as any
      }
      
      expect(() => calculateContributorScore(nullMetrics)).not.toThrow()
    })

    it('should handle non-numeric string values', () => {
      const stringMetrics: ContributorMetrics = {
        username: 'test',
        commits: 'invalid' as any,
        linesAdded: 'invalid' as any,
        linesDeleted: 'invalid' as any,
        pullRequests: 'invalid' as any,
        reviews: 'invalid' as any,
        issues: 'invalid' as any,
        daysActive: 'invalid' as any
      }
      
      expect(() => calculateContributorScore(stringMetrics)).not.toThrow()
    })

    it('should handle missing username', () => {
      const noUsernameMetrics = {
        ...mockContributorMetrics[0],
        username: undefined as any
      }
      
      const score = calculateContributorScore(noUsernameMetrics)
      expect(score.username).toBeDefined()
    })

    it('should handle infinity values', () => {
      const infinityMetrics: ContributorMetrics = {
        username: 'infinity',
        commits: Infinity,
        linesAdded: Infinity,
        linesDeleted: Infinity,
        pullRequests: Infinity,
        reviews: Infinity,
        issues: Infinity,
        daysActive: Infinity
      }
      
      const score = calculateContributorScore(infinityMetrics)
      expect(Number.isFinite(score.score) || score.score === 0).toBe(true)
    })

    it('should handle NaN values', () => {
      const nanMetrics: ContributorMetrics = {
        username: 'nan',
        commits: NaN,
        linesAdded: NaN,
        linesDeleted: NaN,
        pullRequests: NaN,
        reviews: NaN,
        issues: NaN,
        daysActive: NaN
      }
      
      const score = calculateContributorScore(nanMetrics)
      expect(score.score).not.toBeNaN()
    })

    it('should handle mixed valid and invalid data', () => {
      const mixedMetrics: ContributorMetrics[] = [
        mockContributorMetrics[0], // Valid
        {
          username: 'invalid',
          commits: NaN,
          linesAdded: null as any,
          linesDeleted: 'invalid' as any,
          pullRequests: undefined as any,
          reviews: Infinity,
          issues: -1,
          daysActive: 0
        }
      ]
      
      expect(() => aggregateContributorScores(mixedMetrics)).not.toThrow()
      const scores = aggregateContributorScores(mixedMetrics)
      expect(scores).toHaveLength(2)
      expect(scores.every(s => s.username)).toBe(true)
    })
  })

  describe('performance tests', () => {
    it('should handle large contributor datasets efficiently', () => {
      const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
        username: `contributor_${i}`,
        commits: Math.floor(Math.random() * 1000),
        linesAdded: Math.floor(Math.random() * 10000),
        linesDeleted: Math.floor(Math.random() * 5000),
        pullRequests: Math.floor(Math.random() * 100),
        reviews: Math.floor(Math.random() * 200),
        issues: Math.floor(Math.random() * 50),
        daysActive: Math.floor(Math.random() * 365)
      }))
      
      const start = Date.now()
      const scores = aggregateContributorScores(largeDataset)
      const normalized = normalizeContributorScores(scores)
      const ranked = rankContributors(normalized)
      const filtered = filterContributorsByThreshold(ranked, 50)
      const end = Date.now()
      
      expect(scores).toHaveLength(10000)
      expect(normalized).toHaveLength(10000)
      expect(ranked).toHaveLength(10000)
      expect(filtered.length).toBeLessThanOrEqual(10000)
      expect(end - start).toBeLessThan(5000) // Should complete within 5 seconds
    })

    it('should have consistent performance across multiple runs', () => {
      const dataset = Array.from({ length: 1000 }, (_, i) => ({
        username: `user_${i}`,
        commits: Math.floor(Math.random() * 100),
        linesAdded: Math.floor(Math.random() * 1000),
        linesDeleted: Math.floor(Math.random() * 500),
        pullRequests: Math.floor(Math.random() * 50),
        reviews: Math.floor(Math.random() * 100),
        issues: Math.floor(Math.random() * 20),
        daysActive: Math.floor(Math.random() * 365)
      }))
      
      const times: number[] = []
      
      for (let i = 0; i < 5; i++) {
        const start = Date.now()
        aggregateContributorScores(dataset)
        const end = Date.now()
        times.push(end - start)
      }
      
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length
      const maxTime = Math.max(...times)
      const minTime = Math.min(...times)
      
      expect(maxTime - minTime).toBeLessThan(avgTime * 2) // Performance should be consistent
    })
  })

  describe('type safety and validation', () => {
    it('should preserve type information through transformations', () => {
      const scores = aggregateContributorScores(mockContributorMetrics)
      const normalized = normalizeContributorScores(scores)
      const ranked = rankContributors(normalized)
      
      // Type assertions to ensure TypeScript compilation
      expect(scores.every(s => typeof s.username === 'string')).toBe(true)
      expect(scores.every(s => typeof s.score === 'number')).toBe(true)
      expect(normalized.every(s => typeof s.normalizedScore === 'number')).toBe(true)
      expect(ranked.every(r => typeof r.rank === 'number')).toBe(true)
    })

    it('should handle partial ContributorMetrics objects', () => {
      const partialMetrics = {
        username: 'partial',
        commits: 10
        // Missing other properties
      } as Partial<ContributorMetrics>
      
      expect(() => calculateContributorScore(partialMetrics as ContributorMetrics)).not.toThrow()
    })
  })
})