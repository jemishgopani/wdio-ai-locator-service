export function log(...args: any[]) {
  // Always log - users need to see what's happening
  console.log('[wdio-ai]', ...args);
}

export function logInfo(...args: any[]) {
  // Always log info level
  console.log('[wdio-ai][INFO]', ...args);
}

export function logWarn(...args: any[]) {
  // Always log warnings
  console.warn('[wdio-ai][WARN]', ...args);
}

export function logError(...args: any[]) {
  // Always log errors
  console.error('[wdio-ai][ERROR]', ...args);
}
