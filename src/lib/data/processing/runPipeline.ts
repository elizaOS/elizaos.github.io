import { PipelineConfig } from "../pipelineConfig";
import { BasePipelineContext, PipelineStep } from "./types";

/**
 * Pipeline runner - executes a pipeline with config
 */

export function runPipeline<
  TInput,
  TOutput,
  TContext extends BasePipelineContext
>(
  pipeline: PipelineStep<TInput, TOutput, TContext>,
  input: TInput,
  context: TContext,
  config: PipelineConfig
) {
  // Add the config to the context
  const fullContext = { ...context, config } as TContext;

  fullContext.logger?.info("Running pipeline", {
    hasConfig: Boolean(config),
  });

  const startTime = Date.now();

  // Run the pipeline
  return pipeline(input, fullContext)
    .then((result) => {
      const duration = Date.now() - startTime;

      fullContext.logger?.info("Pipeline completed", {
        durationMs: duration,
      });

      return result;
    })
    .catch((error) => {
      if (error instanceof Error) {
        fullContext.logger?.error("Pipeline failed", {
          error: error.message,
          stack: error.stack,
        });
      } else {
        fullContext.logger?.error("Pipeline failed with unknown error");
      }
      throw error;
    });
}
