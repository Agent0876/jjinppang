import fs from 'node:fs';

/**
 * Caches for file system operations to avoid redundant synchronous I/O
 * during module resolution. Call clearResolverCache() when files change.
 */
const existsCache = new Map<string, boolean>();
const statIsFileCache = new Map<string, boolean>();
const realpathCache = new Map<string, string>();

/**
 * Cached version of fs.existsSync — avoids redundant disk checks during a single build
 */
export function cachedExistsSync(p: string): boolean {
  const cached = existsCache.get(p);
  if (cached !== undefined) return cached;
  const exists = fs.existsSync(p);
  existsCache.set(p, exists);
  return exists;
}

/**
 * Checks both existence and isFile() in one cached operation
 */
export function cachedIsFile(p: string): boolean {
  const cached = statIsFileCache.get(p);
  if (cached !== undefined) return cached;
  try {
    const result = fs.existsSync(p) && fs.statSync(p).isFile();
    statIsFileCache.set(p, result);
    return result;
  } catch {
    statIsFileCache.set(p, false);
    return false;
  }
}

/**
 * Cached version of fs.realpathSync
 */
export function cachedRealpathSync(p: string): string {
  const cached = realpathCache.get(p);
  if (cached !== undefined) return cached;
  const resolved = fs.realpathSync(p);
  realpathCache.set(p, resolved);
  return resolved;
}

/**
 * Clears all resolver caches. Call when files change (e.g. HMR invalidation).
 */
export function clearResolverCache(): void {
  existsCache.clear();
  statIsFileCache.clear();
  realpathCache.clear();
}
