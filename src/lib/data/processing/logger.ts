/**
 * Enhanced styled logger for pipeline operations using chalk
 */
import chalk from "chalk";

/**
 * Log levels
 */
export type LogLevel = "error" | "warn" | "info" | "debug" | "trace";

/**
 * Logger interface
 */
export interface Logger {
  error: (message: string, data?: Record<string, any>) => void;
  warn: (message: string, data?: Record<string, any>) => void;
  info: (message: string, data?: Record<string, any>) => void;
  debug: (message: string, data?: Record<string, any>) => void;
  trace: (message: string, data?: Record<string, any>) => void;
  child: (name: string) => Logger;
}

/**
 * Logger configuration
 */
export interface LoggerConfig {
  minLevel: LogLevel;
  context?: Record<string, string>;
  nameSegments?: string[]; // Changed from name to nameSegments
}

/**
 * Level precedence (lower number = higher priority)
 */
const LEVEL_PRIORITY: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
  trace: 4,
};

/**
 * Level colors for styling log output
 */
const LEVEL_STYLES: Record<LogLevel, (text: string) => string> = {
  error: chalk.bgRed.bold,
  warn: chalk.yellow,
  info: chalk.blue,
  debug: chalk.cyan,
  trace: chalk.gray,
};

/**
 * Available colors for name segments
 */
const NAME_COLORS = [
  chalk.green,
  chalk.magenta,
  chalk.redBright,
  chalk.cyan,
  chalk.yellow,
  chalk.blue,
  chalk.greenBright,
  chalk.yellowBright,
  chalk.blueBright,
  chalk.magentaBright,
  chalk.cyanBright,
  chalk.bgBlue,
  chalk.bgBlueBright,
];

/**
 * Create a new logger
 */
export function createLogger(config: LoggerConfig): Logger {
  const { minLevel, context = {}, nameSegments = [] } = config;

  // Format context for logging
  const contextStr =
    Object.entries(context).length > 0
      ? Object.entries(context)
          .map(([key, value]) => `${key}=${value}`)
          .join(" ")
      : null;

  // Build the prefix with colored segments
  const prefix =
    nameSegments.length > 0
      ? nameSegments
          .map((segment, index) => {
            const color = NAME_COLORS[index % NAME_COLORS.length];
            return color(`[${segment}]`);
          })
          .join("") +
        (contextStr && minLevel === "trace" ? chalk.dim(`[${contextStr}]`) : "")
      : "";

  /**
   * Internal log function
   */
  function log(
    level: LogLevel,
    message: string,
    data?: Record<string, any>
  ): void {
    if (LEVEL_PRIORITY[level] > LEVEL_PRIORITY[minLevel]) return;

    const levelLabel = LEVEL_STYLES[level](`[${level.toUpperCase()}]`);
    let logMessage = `${levelLabel}${prefix} ${message}`;

    if (data) {
      const limitedData = limitObjectDepth(data);
      logMessage += ` ${chalk.dim(JSON.stringify(limitedData))}`;
    }

    switch (level) {
      case "error":
        console.error(logMessage);
        break;
      case "warn":
        console.warn(logMessage);
        break;
      case "info":
        console.info(logMessage);
        break;
      case "debug":
      case "trace":
      default:
        console.debug(logMessage);
    }
  }

  /**
   * Create a child logger with additional name segment
   */
  function child(subName: string): Logger {
    return createLogger({
      minLevel,
      context,
      nameSegments: [...nameSegments, subName],
    });
  }

  return {
    error: (message: string, data?: Record<string, any>) =>
      log("error", message, data),
    warn: (message: string, data?: Record<string, any>) =>
      log("warn", message, data),
    info: (message: string, data?: Record<string, any>) =>
      log("info", message, data),
    debug: (message: string, data?: Record<string, any>) =>
      log("debug", message, data),
    trace: (message: string, data?: Record<string, any>) =>
      log("trace", message, data),
    child,
  };
}

/**
 * Limit object depth for logging
 */
function limitObjectDepth(
  obj: any,
  depth: number = 0,
  maxDepth: number = 3
): any {
  if (depth >= maxDepth) {
    if (Array.isArray(obj)) {
      return obj.length > 0 ? [`${obj.length} items`] : [];
    }
    if (typeof obj === "object" && obj !== null) {
      return "[Object]";
    }
  }

  if (Array.isArray(obj)) {
    if (obj.length > 10) {
      return [
        ...obj
          .slice(0, 5)
          .map((item) => limitObjectDepth(item, depth + 1, maxDepth)),
        `... ${obj.length - 10} more items ...`,
        ...obj
          .slice(-5)
          .map((item) => limitObjectDepth(item, depth + 1, maxDepth)),
      ];
    }
    return obj.map((item) => limitObjectDepth(item, depth + 1, maxDepth));
  }

  if (typeof obj === "object" && obj !== null) {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = limitObjectDepth(value, depth + 1, maxDepth);
    }
    return result;
  }

  return obj;
}
