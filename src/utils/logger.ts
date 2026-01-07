/**
 * Debug Logger Utility
 * 
 * Wraps console methods to only log in development mode (__DEV__).
 * Prevents sensitive debug information from appearing in production builds.
 * 
 * Usage:
 *   import { logger } from '@/utils/logger';
 *   logger.log('MyComponent', 'Some message', data);
 *   logger.error('MyComponent', 'Error occurred', error);
 *   logger.warn('MyComponent', 'Warning message');
 *   logger.info('MyComponent', 'Info message');
 */

type LogLevel = 'log' | 'error' | 'warn' | 'info' | 'debug';

interface LoggerConfig {
  enabled: boolean;
  showTimestamp: boolean;
  showComponent: boolean;
}

const config: LoggerConfig = {
  enabled: __DEV__,
  showTimestamp: true,
  showComponent: true,
};

/**
 * Format log message with optional timestamp and component name
 */
const formatMessage = (level: LogLevel, component: string, message: string): string => {
  const parts: string[] = [];
  
  if (config.showTimestamp) {
    const now = new Date();
    const time = now.toLocaleTimeString('en-US', { hour12: false });
    parts.push(`[${time}]`);
  }
  
  const levelIcon = {
    log: '📝',
    error: '❌',
    warn: '⚠️',
    info: 'ℹ️',
    debug: '🔍',
  }[level];
  
  parts.push(levelIcon);
  
  if (config.showComponent && component) {
    parts.push(`[${component}]`);
  }
  
  parts.push(message);
  
  return parts.join(' ');
};

/**
 * Create a logging function for a specific level
 */
const createLogFn = (level: LogLevel) => {
  return (component: string, message: string, ...args: unknown[]): void => {
    if (!config.enabled) return;
    
    const formattedMessage = formatMessage(level, component, message);
    
    switch (level) {
      case 'error':
        console.error(formattedMessage, ...args);
        break;
      case 'warn':
        console.warn(formattedMessage, ...args);
        break;
      case 'info':
        console.info(formattedMessage, ...args);
        break;
      case 'debug':
        console.debug(formattedMessage, ...args);
        break;
      default:
        console.log(formattedMessage, ...args);
    }
  };
};

/**
 * Logger object with methods for different log levels
 */
export const logger = {
  log: createLogFn('log'),
  error: createLogFn('error'),
  warn: createLogFn('warn'),
  info: createLogFn('info'),
  debug: createLogFn('debug'),
  
  /**
   * Log a performance measurement
   */
  perf: (component: string, operation: string, durationMs: number): void => {
    if (!config.enabled) return;
    console.log(`⏱️ [${component}] ${operation}: ${durationMs.toFixed(2)}ms`);
  },
  
  /**
   * Log network request/response
   */
  network: (method: string, url: string, status?: number): void => {
    if (!config.enabled) return;
    const statusIcon = status && status >= 200 && status < 300 ? '✅' : '❌';
    console.log(`🌐 ${method.toUpperCase()} ${url} ${status ? `${statusIcon} ${status}` : ''}`);
  },
  
  /**
   * Log navigation events
   */
  navigation: (from: string, to: string): void => {
    if (!config.enabled) return;
    console.log(`🧭 Navigation: ${from} → ${to}`);
  },
  
  /**
   * Group related logs together
   */
  group: (label: string, fn: () => void): void => {
    if (!config.enabled) return;
    console.group(label);
    fn();
    console.groupEnd();
  },
  
  /**
   * Log a table of data
   */
  table: (data: unknown[]): void => {
    if (!config.enabled) return;
    console.table(data);
  },
  
  /**
   * Configure logger settings
   */
  configure: (newConfig: Partial<LoggerConfig>): void => {
    Object.assign(config, newConfig);
  },
  
  /**
   * Enable/disable logging
   */
  setEnabled: (enabled: boolean): void => {
    config.enabled = enabled;
  },
};

export default logger;
