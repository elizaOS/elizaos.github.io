/**
 * Core pipeline types and utilities using functional programming principles
 */
import { PipelineConfig } from "../pipelineConfig";
import { Logger } from "./logger";
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
  dateRange?: { startDate: string; endDate?: string };
}

/**
 * A pipeline step/operation that transforms data with typed context
 */
export type PipelineStep<
  TInput,
  TOutput,
  TContext extends BasePipelineContext = BasePipelineContext
> = (input: TInput, context: TContext) => Promise<TOutput>;

// --- Core utilities ---

/**
 * Pipe operations together, feeding output of one step to input of the next
 */
export function pipe<T1, T2, TContext extends BasePipelineContext>(
  op1: PipelineStep<T1, T2, TContext>
): PipelineStep<T1, T2, TContext>;

export function pipe<T1, T2, T3, TContext extends BasePipelineContext>(
  op1: PipelineStep<T1, T2, TContext>,
  op2: PipelineStep<T2, T3, TContext>
): PipelineStep<T1, T3, TContext>;

export function pipe<T1, T2, T3, T4, TContext extends BasePipelineContext>(
  op1: PipelineStep<T1, T2, TContext>,
  op2: PipelineStep<T2, T3, TContext>,
  op3: PipelineStep<T3, T4, TContext>
): PipelineStep<T1, T4, TContext>;

export function pipe<T1, T2, T3, T4, T5, TContext extends BasePipelineContext>(
  op1: PipelineStep<T1, T2, TContext>,
  op2: PipelineStep<T2, T3, TContext>,
  op3: PipelineStep<T3, T4, TContext>,
  op4: PipelineStep<T4, T5, TContext>
): PipelineStep<T1, T5, TContext>;

export function pipe<TContext extends BasePipelineContext>(
  ...operations: PipelineStep<any, any, TContext>[]
): PipelineStep<any, any, TContext> {
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
  op2: PipelineStep<TInput, T2, TContext>
): PipelineStep<TInput, [T1, T2], TContext>;

export function parallel<
  TInput,
  T1,
  T2,
  T3,
  TContext extends BasePipelineContext
>(
  op1: PipelineStep<TInput, T1, TContext>,
  op2: PipelineStep<TInput, T2, TContext>,
  op3: PipelineStep<TInput, T3, TContext>
): PipelineStep<TInput, [T1, T2, T3], TContext>;

export function parallel<TContext extends BasePipelineContext>(
  ...operations: PipelineStep<any, any, TContext>[]
): PipelineStep<any, any[], TContext> {
  return async (input, context) => {
    return await Promise.all(
      operations.map((operation) => operation(input, context))
    );
  };
}

/**
 * Map a pipeline step over an array of inputs
 */
export function mapStep<TInput, TOutput, TContext extends BasePipelineContext>(
  operation: PipelineStep<TInput, TOutput, TContext>
): PipelineStep<TInput[], TOutput[], TContext> {
  return async (inputs, context) => {
    if (!Array.isArray(inputs)) {
      throw new Error("mapStep requires an array input");
    }

    const results = await pMap(inputs, (item) => operation(item, context), {
      concurrency: 5,
    });

    return results;
  };
}

/**
 * Create a typed pipeline step
 */
export function createStep<
  TInput,
  TOutput,
  TContext extends BasePipelineContext = BasePipelineContext
>(
  name: string,
  transform: (input: TInput, context: TContext) => Promise<TOutput> | TOutput
): PipelineStep<TInput, TOutput, TContext> {
  return async (input, context) => {
    // Log if a logger is available
    context.logger?.debug(`Executing step: ${name}`);
    const stepLogger = context.logger?.child(name);
    // Transform the data
    const output = await transform(input, { ...context, logger: stepLogger });

    context.logger?.debug(`Completed step: ${name}`);

    return output;
  };
}
