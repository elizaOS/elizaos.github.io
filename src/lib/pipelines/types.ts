/**
 * Core pipeline types and utilities using functional programming principles
 */
import { PipelineConfig } from "./pipelineConfig";
import { Logger } from "../logger";
import pMap from "p-map";

// --- Core types ---

/**
 * Result of a pipeline operation
 */
export interface PipelineResult<T> {
  data: T;
}

/**
 * Basic context fields needed by all pipeline steps
 */
export interface BasePipelineContext {
  /** Required pipeline configuration */
  config: PipelineConfig;
  /** Logger for this pipeline */
  logger?: Logger;
}

/**
 * Extended context with common fields for repository operations
 */
export interface RepoPipelineContext extends BasePipelineContext {
  /** Repository ID to filter processing */
  repoId?: string;
  /** Date range for filtering data */
  dateRange?: { startDate?: string; endDate?: string };
}

/**
 * A pipeline step/operation that transforms data with typed context
 */
export type PipelineStep<
  TInput,
  TOutput,
  TContext extends BasePipelineContext = BasePipelineContext,
> = (input: TInput, context: TContext) => Promise<TOutput> | TOutput;

// --- Core utilities ---

/**
 * Pipe operations together, feeding output of one step to input of the next
 */
export function pipe<T1, T2, TContext extends BasePipelineContext>(
  op1: PipelineStep<T1, T2, TContext>,
): PipelineStep<T1, T2, TContext>;

export function pipe<T1, T2, T3, TContext extends BasePipelineContext>(
  op1: PipelineStep<T1, T2, TContext>,
  op2: PipelineStep<T2, T3, TContext>,
): PipelineStep<T1, T3, TContext>;

export function pipe<T1, T2, T3, T4, TContext extends BasePipelineContext>(
  op1: PipelineStep<T1, T2, TContext>,
  op2: PipelineStep<T2, T3, TContext>,
  op3: PipelineStep<T3, T4, TContext>,
): PipelineStep<T1, T4, TContext>;

export function pipe<T1, T2, T3, T4, T5, TContext extends BasePipelineContext>(
  op1: PipelineStep<T1, T2, TContext>,
  op2: PipelineStep<T2, T3, TContext>,
  op3: PipelineStep<T3, T4, TContext>,
  op4: PipelineStep<T4, T5, TContext>,
): PipelineStep<T1, T5, TContext>;

export function pipe<
  T1,
  T2,
  T3,
  T4,
  T5,
  T6,
  TContext extends BasePipelineContext,
>(
  op1: PipelineStep<T1, T2, TContext>,
  op2: PipelineStep<T2, T3, TContext>,
  op3: PipelineStep<T3, T4, TContext>,
  op4: PipelineStep<T4, T5, TContext>,
  op5: PipelineStep<T5, T6, TContext>,
): PipelineStep<T1, T6, TContext>;

export function pipe<TContext extends BasePipelineContext>(
  ...operations: Array<PipelineStep<unknown, unknown, TContext>>
): PipelineStep<unknown, unknown, TContext> {
  return async (input, context) => {
    let lastResult = input;

    for (const operation of operations) {
      lastResult = await operation(lastResult, context);
    }

    return lastResult;
  };
}

/**
 * Execute multiple pipeline steps in parallel and combine their results
 */
export function parallel<TInput, T1, T2, TContext extends BasePipelineContext>(
  op1: PipelineStep<TInput, T1, TContext>,
  op2: PipelineStep<TInput, T2, TContext>,
): PipelineStep<TInput, [T1, T2], TContext>;

export function parallel<
  TInput,
  T1,
  T2,
  T3,
  TContext extends BasePipelineContext,
>(
  op1: PipelineStep<TInput, T1, TContext>,
  op2: PipelineStep<TInput, T2, TContext>,
  op3: PipelineStep<TInput, T3, TContext>,
): PipelineStep<TInput, [T1, T2, T3], TContext>;

export function parallel<TContext extends BasePipelineContext>(
  ...operations: PipelineStep<unknown, unknown, TContext>[]
): PipelineStep<unknown, unknown[], TContext> {
  return async (input, context) => {
    return await Promise.all(
      operations.map((operation) => operation(input, context)),
    );
  };
}

/**
 * Execute multiple pipeline steps sequentially with the same input and combine their results
 */
export function sequence<TInput, T1, T2, TContext extends BasePipelineContext>(
  op1: PipelineStep<TInput, T1, TContext>,
  op2: PipelineStep<TInput, T2, TContext>,
): PipelineStep<TInput, [T1, T2], TContext>;

export function sequence<
  TInput,
  T1,
  T2,
  T3,
  TContext extends BasePipelineContext,
>(
  op1: PipelineStep<TInput, T1, TContext>,
  op2: PipelineStep<TInput, T2, TContext>,
  op3: PipelineStep<TInput, T3, TContext>,
): PipelineStep<TInput, [T1, T2, T3], TContext>;

export function sequence<TContext extends BasePipelineContext>(
  ...operations: PipelineStep<unknown, unknown, TContext>[]
): PipelineStep<unknown, unknown[], TContext> {
  return async (input, context) => {
    const results = [];

    for (const operation of operations) {
      results.push(await operation(input, context));
    }

    return results;
  };
}

/**
 * Map a pipeline step over an array of inputs with adaptive concurrency
 */
export function mapStep<TInput, TOutput, TContext extends BasePipelineContext>(
  operation: PipelineStep<TInput, TOutput, TContext>,
  options?: { adaptiveConcurrency?: boolean; defaultConcurrency?: number },
): PipelineStep<TInput[], TOutput[], TContext> {
  return async (inputs, context) => {
    if (!Array.isArray(inputs)) {
      throw new Error("mapStep requires an array input");
    }
    if (!inputs.length) {
      return [];
    }

    // Get concurrency level from context if available and adaptive concurrency is enabled
    let concurrency = options?.defaultConcurrency || 5;

    if (
      options?.adaptiveConcurrency &&
      "github" in context &&
      context.github &&
      typeof context.github === "object" &&
      "getConcurrencyManager" in context.github &&
      typeof context.github.getConcurrencyManager === "function"
    ) {
      const concurrencyManager = context.github.getConcurrencyManager();
      if (
        concurrencyManager &&
        typeof concurrencyManager === "object" &&
        "getCurrentLevel" in concurrencyManager &&
        typeof concurrencyManager.getCurrentLevel === "function"
      ) {
        concurrency = concurrencyManager.getCurrentLevel();

        context.logger?.info(
          `Using adaptive concurrency level: ${concurrency}`,
          {
            shouldReduceLoad:
              "shouldReduceLoad" in concurrencyManager &&
              typeof concurrencyManager.shouldReduceLoad === "function"
                ? concurrencyManager.shouldReduceLoad()
                : undefined,
            maxLevel:
              "maxLevel" in concurrencyManager
                ? concurrencyManager.maxLevel
                : undefined,
          },
        );
      }
    }

    const results = await pMap(
      inputs,
      async (item, index) => {
        // Check for graceful shutdown before processing each item
        if (
          global.process &&
          (global.process as { gracefulShutdown?: boolean }).gracefulShutdown
        ) {
          context.logger?.warn(
            `Graceful shutdown requested. Skipping remaining items after ${index}/${inputs.length}`,
          );
          throw new Error("GRACEFUL_SHUTDOWN");
        }
        return await operation(item, context);
      },
      {
        concurrency: Math.max(1, concurrency), // Ensure at least 1 concurrent operation
        stopOnError: false, // Continue processing other items even if one fails
      },
    );

    return results.filter((r) => r !== null); // Filter out any null results from interrupted operations
  };
}

/**
 * Create a typed pipeline step
 */
export function createStep<
  TInput,
  TOutput,
  TContext extends BasePipelineContext = BasePipelineContext,
>(
  name: string,
  transform: (input: TInput, context: TContext) => Promise<TOutput> | TOutput,
): PipelineStep<TInput, TOutput, TContext> {
  return async (input, context) => {
    // Log if a logger is available
    context.logger?.trace(`Executing step: ${name}`);
    const stepLogger = context.logger?.child(name);
    // Transform the data
    const output = await transform(input, { ...context, logger: stepLogger });

    context.logger?.trace(`Completed step: ${name}`);

    return output;
  };
}
