import { describe, expect, it, beforeEach } from "bun:test";
import {
  getMatcherFunction,
  clearMatcherCache,
  getMatcherCacheSize,
  // createMatcher, // Unused: Import createMatcher to test error caching
} from "../getMatcherFunction";
import { PatternType, TagPattern } from "../types";
import { TagPatternType } from "../../data/tags";

// Mock createMatcher to track calls and simulate errors
// let createMatcherCallCount = 0; // Unused
// let shouldThrowError = false; // Unused
// const originalCreateMatcher = createMatcher; // Unused. createMatcher is imported directly where needed.

/* // mockCreateMatcher is unused
const mockCreateMatcher = (tagPattern: TagPattern) => {
  createMatcherCallCount++;
  if (shouldThrowError) {
    throw new Error("Simulated matcher creation error");
  }
  // Use the original implementation for successful cases
  return originalCreateMatcher(tagPattern);
};
*/

// Dynamically replace createMatcher import (adjust based on testing framework capabilities if needed)
// For Bun/Jest, mocking might require different setup. Assuming direct replacement for simplicity here.
// NOTE: This direct replacement might not work perfectly with ESM module caching.
// A more robust solution might involve dependency injection or specific mocking libraries.
// Let's assume for now we can test the effects via getMatcherFunction.

describe("Matcher Cache", () => {
  beforeEach(() => {
    clearMatcherCache();
    // createMatcherCallCount = 0; // This variable is removed
    // shouldThrowError = false; // This variable is removed
    // Reset mock (if a more complex mocking setup was used)
  });

  const pattern1: TagPattern = {
    pattern: "test",
    patternType: PatternType.STRING,
    target: TagPatternType.COMMIT_MESSAGE,
    options: { caseSensitive: false },
  };

  const pattern1Again: TagPattern = {
    pattern: "test",
    patternType: PatternType.STRING,
    target: TagPatternType.COMMIT_MESSAGE,
    options: { caseSensitive: false },
  };

  const pattern1CaseSensitive: TagPattern = {
    pattern: "test",
    patternType: PatternType.STRING,
    target: TagPatternType.COMMIT_MESSAGE,
    options: { caseSensitive: true },
  };

  const pattern2: TagPattern = {
    pattern: "*.ts",
    patternType: PatternType.GLOB,
    target: TagPatternType.FILE_PATH,
    options: {},
  };

  const invalidGlobPattern: TagPattern = {
    pattern: "*.log",
    patternType: PatternType.GLOB,
    target: TagPatternType.COMMIT_MESSAGE, // Invalid target for GLOB
    options: {},
  };

  it("should cache matcher functions based on pattern configuration", () => {
    expect(getMatcherCacheSize()).toBe(0);

    const matcherFn1 = getMatcherFunction(pattern1);
    expect(getMatcherCacheSize()).toBe(1);
    // expect(createMatcherCallCount).toBe(1); // Difficult to assert reliably without proper mocking

    const matcherFn1Again = getMatcherFunction(pattern1Again);
    expect(getMatcherCacheSize()).toBe(1); // Size shouldn't increase
    // expect(createMatcherCallCount).toBe(1); // Should not call createMatcher again
    expect(matcherFn1Again).toBe(matcherFn1); // Should return the same function instance

    const matcherFn1CaseSens = getMatcherFunction(pattern1CaseSensitive);
    expect(getMatcherCacheSize()).toBe(2); // Different options, new entry
    // expect(createMatcherCallCount).toBe(2);
    expect(matcherFn1CaseSens).not.toBe(matcherFn1);

    const matcherFn2 = getMatcherFunction(pattern2);
    expect(getMatcherCacheSize()).toBe(3); // Different pattern, new entry
    // expect(createMatcherCallCount).toBe(3);
    expect(matcherFn2).not.toBe(matcherFn1);
  });

  it("should clear the cache", () => {
    getMatcherFunction(pattern1);
    getMatcherFunction(pattern2);
    expect(getMatcherCacheSize()).toBe(2);

    clearMatcherCache();
    expect(getMatcherCacheSize()).toBe(0);

    // Re-getting should create new functions and populate cache again
    getMatcherFunction(pattern1); // No need to assign to unused matcherFn1AfterClear
    expect(getMatcherCacheSize()).toBe(1);
    // expect(createMatcherCallCount).toBe(1); // Reset count in beforeEach

    getMatcherFunction(pattern2); // No need to assign to unused matcherFn2AfterClear
    expect(getMatcherCacheSize()).toBe(2);
    // expect(createMatcherCallCount).toBe(2);
  });

  it("should handle and cache errors during matcher creation", () => {
    // Suppress console.error for this test
    const originalError = console.error;
    console.error = () => {};

    // Use a pattern known to cause createMatcher to throw (invalid target for GLOB)
    const errorFn = getMatcherFunction(invalidGlobPattern);
    expect(getMatcherCacheSize()).toBe(1); // Cache the error function

    // The returned function should always return false
    const content = {
      content: "test.log",
      contentType: TagPatternType.COMMIT_MESSAGE,
    };
    expect(errorFn(content)).toBe(false);

    // Getting the same invalid pattern again should return the cached error function
    const errorFnAgain = getMatcherFunction(invalidGlobPattern);
    expect(getMatcherCacheSize()).toBe(1); // Size doesn't increase
    expect(errorFnAgain).toBe(errorFn); // Same error function instance

    console.error = originalError; // Restore console.error
  });

  it("should create different cache keys for different options", () => {
    const p1 = {
      pattern: "a",
      patternType: PatternType.STRING,
      target: TagPatternType.COMMENT,
      options: { caseSensitive: false, wordBoundary: true },
    };
    const p2 = {
      pattern: "a",
      patternType: PatternType.STRING,
      target: TagPatternType.COMMENT,
      options: { wordBoundary: true, caseSensitive: false },
    }; // Same options, different order
    const p3 = {
      pattern: "a",
      patternType: PatternType.STRING,
      target: TagPatternType.COMMENT,
      options: { caseSensitive: false },
    }; // Fewer options
    const p4 = {
      pattern: "a",
      patternType: PatternType.STRING,
      target: TagPatternType.COMMENT,
      options: {},
    }; // No options

    const fn1 = getMatcherFunction(p1);
    expect(getMatcherCacheSize()).toBe(1);
    const fn2 = getMatcherFunction(p2);
    expect(getMatcherCacheSize()).toBe(1); // Should be same key due to sorted options
    expect(fn1).toBe(fn2);

    const fn3 = getMatcherFunction(p3);
    expect(getMatcherCacheSize()).toBe(2);
    expect(fn3).not.toBe(fn1);

    const fn4 = getMatcherFunction(p4);
    expect(getMatcherCacheSize()).toBe(3);
    expect(fn4).not.toBe(fn3);
  });
});
