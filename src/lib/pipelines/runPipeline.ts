import { BasePipelineContext, PipelineStep } from "./types";

/**
 * Pipeline runner - executes a pipeline with config
 */

export function runPipeline<
  TInput,
  TOutput,
  TContext extends BasePipelineContext,
>(
  pipeline: PipelineStep<TInput, TOutput, TContext>,
  input: TInput,
  context: TContext,
) {
  context.logger?.info("Running pipeline");

  const startTime = Date.now();

  // Run the pipeline and ensure result is a Promise
  return Promise.resolve(pipeline(input, context))
    .then((result: TOutput) => {
      const duration = Date.now() - startTime;

      context.logger?.info("Pipeline completed", {
        durationMs: duration,
      });

      return result;
    })
    .catch((error: unknown) => {
      if (error instanceof Error) {
        context.logger?.error("Pipeline failed", {
          error: error.message,
          stack: error.stack,
        });
      } else {
        context.logger?.error("Pipeline failed with unknown error", {
          error,
        });
      }
      throw error;
    });
}
