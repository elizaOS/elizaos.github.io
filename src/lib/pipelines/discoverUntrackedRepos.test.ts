import { describe, it, expect } from "bun:test";
import { calculateActivityScore } from "./discoverUntrackedRepos";

describe("calculateActivityScore", () => {
  it("should return 0 for archived repo with no activity", () => {
    const score = calculateActivityScore(0, 0, 0, 0, 0, 0, 0, null, true);
    expect(score).toBe(0);
  });

  it("should handle null lastUpdatedAt without throwing", () => {
    const score = calculateActivityScore(10, 5, 1, 0, 0, 0, 0, null, false);
    expect(score).toBeGreaterThan(0);
    expect(Number.isNaN(score)).toBe(false);
  });

  it("should handle invalid date string without throwing", () => {
    const score = calculateActivityScore(
      10,
      5,
      1,
      0,
      0,
      0,
      0,
      "invalid-date",
      false,
    );
    expect(score).toBeGreaterThan(0);
    expect(Number.isNaN(score)).toBe(false);
  });

  it("should apply recency bonus only with activity", () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // With activity: should get recency bonus
    const scoreWithActivity = calculateActivityScore(
      10,
      5,
      1,
      0,
      0,
      0,
      0,
      yesterday,
      false,
    );

    // Without activity: no recency bonus
    const scoreWithoutActivity = calculateActivityScore(
      10,
      5,
      0,
      0,
      0,
      0,
      0,
      yesterday,
      false,
    );

    expect(scoreWithActivity).toBeGreaterThan(scoreWithoutActivity);
  });

  it("should apply archive penalty of 50%", () => {
    const scoreNormal = calculateActivityScore(
      10,
      5,
      1,
      1,
      0,
      1,
      0,
      null,
      false,
    );
    const scoreArchived = calculateActivityScore(
      10,
      5,
      1,
      1,
      0,
      1,
      0,
      null,
      true,
    );

    expect(scoreArchived).toBeCloseTo(scoreNormal * 0.5, 2);
  });

  it("should use log scale for stars to prevent big repo dominance", () => {
    // Repo with 1000 stars
    const bigRepoScore = calculateActivityScore(
      1000,
      0,
      0,
      0,
      0,
      0,
      0,
      null,
      false,
    );

    // Repo with 10,000 stars (10x more)
    const hugeRepoScore = calculateActivityScore(
      10000,
      0,
      0,
      0,
      0,
      0,
      0,
      null,
      false,
    );

    // Score should NOT increase 10x (log scale effect)
    const scoreRatio = hugeRepoScore / bigRepoScore;
    expect(scoreRatio).toBeLessThan(2); // Much less than 10x
  });

  it("should weight open PRs highest", () => {
    const scoreOpenPR = calculateActivityScore(
      0,
      0,
      1,
      0,
      0,
      0,
      0,
      null,
      false,
    );
    const scoreMergedPR = calculateActivityScore(
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      null,
      false,
    );
    const scoreClosedPR = calculateActivityScore(
      0,
      0,
      0,
      0,
      1,
      0,
      0,
      null,
      false,
    );

    expect(scoreOpenPR).toBe(3); // weight: 3
    expect(scoreMergedPR).toBe(2); // weight: 2
    expect(scoreClosedPR).toBe(1); // weight: 1
  });

  it("should apply recency bonus that decays over 14 days", () => {
    const today = new Date().toISOString();
    const sevenDaysAgo = new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const fourteenDaysAgo = new Date(
      Date.now() - 14 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const fifteenDaysAgo = new Date(
      Date.now() - 15 * 24 * 60 * 60 * 1000,
    ).toISOString();

    const scoreToday = calculateActivityScore(
      0,
      0,
      1,
      0,
      0,
      0,
      0,
      today,
      false,
    );
    const scoreSevenDays = calculateActivityScore(
      0,
      0,
      1,
      0,
      0,
      0,
      0,
      sevenDaysAgo,
      false,
    );
    const scoreFourteenDays = calculateActivityScore(
      0,
      0,
      1,
      0,
      0,
      0,
      0,
      fourteenDaysAgo,
      false,
    );
    const scoreFifteenDays = calculateActivityScore(
      0,
      0,
      1,
      0,
      0,
      0,
      0,
      fifteenDaysAgo,
      false,
    );

    // Today should have max bonus (14 points)
    expect(scoreToday).toBeGreaterThan(scoreSevenDays);

    // Seven days should have ~7 points bonus
    expect(scoreSevenDays).toBeGreaterThan(scoreFourteenDays);

    // After 14 days, no bonus
    expect(scoreFourteenDays).toBeCloseTo(scoreFifteenDays, 1);
  });

  it("should not apply recency bonus without activity", () => {
    const today = new Date().toISOString();

    // No activity = no recency bonus
    const score = calculateActivityScore(100, 50, 0, 0, 0, 0, 0, today, false);

    // Should only have star/watcher score, no recency bonus
    const expectedScore = Math.log1p(100) * 1.0 + Math.log1p(50) * 1.5;
    expect(score).toBeCloseTo(expectedScore, 2);
  });
});
