/**
 * Judicial Search Cache
 * Local storage of search results to avoid repeated queries
 * Stores results with TTL (time-to-live) for staleness control
 */

import fs from 'fs';
import path from 'path';

const CACHE_DIR = './cache/judicial-search';
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

export class JudicialSearchCache {
  constructor() {
    this.cacheDir = CACHE_DIR;
    this.initializeCache();
  }

  /**
   * Initialize cache directory
   */
  initializeCache() {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
      console.log(`📁 Cache directory created: ${this.cacheDir}`);
    }
  }

  /**
   * Generate cache key from search parameters
   */
  generateKey(name, source = 'all') {
    // Normalize name: lowercase, remove extra spaces
    const normalized = name.trim().toLowerCase().replace(/\s+/g, '_');
    return `${source}_${normalized}`;
  }

  /**
   * Get cached search results
   */
  getFromCache(name, source = 'all') {
    try {
      const key = this.generateKey(name, source);
      const cachePath = path.join(this.cacheDir, `${key}.json`);

      if (!fs.existsSync(cachePath)) {
        return null; // Not cached
      }

      const cacheData = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));

      // Check if cache is still valid (not expired)
      const now = Date.now();
      const age = now - cacheData.timestamp;

      if (age > CACHE_TTL) {
        console.log(`⏰ Cache expired for "${name}". Deleting...`);
        fs.unlinkSync(cachePath);
        return null;
      }

      const ageHours = Math.floor(age / (60 * 60 * 1000));
      console.log(`💾 Retrieved from cache: "${name}" (${ageHours}h old, ${cacheData.results.length} cases)`);

      return cacheData.results;

    } catch (error) {
      console.error('Error reading cache:', error.message);
      return null;
    }
  }

  /**
   * Save search results to cache
   */
  saveToCache(name, results, source = 'all') {
    try {
      const key = this.generateKey(name, source);
      const cachePath = path.join(this.cacheDir, `${key}.json`);

      const cacheData = {
        name: name.trim(),
        source: source,
        timestamp: Date.now(),
        expiresAt: Date.now() + CACHE_TTL,
        results: results || [],
        resultCount: results ? results.length : 0
      };

      fs.writeFileSync(cachePath, JSON.stringify(cacheData, null, 2), 'utf-8');

      console.log(`💾 Cached "${name}" (${results.length} cases) - Expires in 7 days`);

      return true;

    } catch (error) {
      console.error('Error writing cache:', error.message);
      return false;
    }
  }

  /**
   * Get combined cache stats
   */
  getCacheStats() {
    try {
      if (!fs.existsSync(this.cacheDir)) {
        return { totalCached: 0, cacheDir: this.cacheDir };
      }

      const files = fs.readdirSync(this.cacheDir);
      const stats = {
        totalCached: files.length,
        cacheDir: this.cacheDir,
        cachedSearches: []
      };

      files.forEach(file => {
        try {
          const filePath = path.join(this.cacheDir, file);
          const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
          const age = Date.now() - data.timestamp;
          const ageHours = Math.floor(age / (60 * 60 * 1000));

          stats.cachedSearches.push({
            name: data.name,
            source: data.source,
            resultCount: data.resultCount,
            ageHours: ageHours,
            expiresInHours: Math.floor((data.expiresAt - Date.now()) / (60 * 60 * 1000))
          });
        } catch (error) {
          console.error(`Error reading cache file ${file}:`, error.message);
        }
      });

      return stats;

    } catch (error) {
      console.error('Error getting cache stats:', error.message);
      return { error: error.message };
    }
  }

  /**
   * Clear old cache entries (older than TTL)
   */
  clearExpiredCache() {
    try {
      if (!fs.existsSync(this.cacheDir)) {
        return { cleared: 0 };
      }

      const files = fs.readdirSync(this.cacheDir);
      let clearedCount = 0;

      files.forEach(file => {
        try {
          const filePath = path.join(this.cacheDir, file);
          const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
          const age = Date.now() - data.timestamp;

          if (age > CACHE_TTL) {
            fs.unlinkSync(filePath);
            clearedCount++;
            console.log(`🗑️  Deleted expired cache: ${file}`);
          }
        } catch (error) {
          // Ignore errors
        }
      });

      return { cleared: clearedCount };

    } catch (error) {
      console.error('Error clearing cache:', error.message);
      return { error: error.message };
    }
  }

  /**
   * Clear all cache
   */
  clearAllCache() {
    try {
      if (!fs.existsSync(this.cacheDir)) {
        return { cleared: 0 };
      }

      const files = fs.readdirSync(this.cacheDir);
      files.forEach(file => {
        fs.unlinkSync(path.join(this.cacheDir, file));
      });

      console.log(`🗑️  Cleared ${files.length} cache entries`);
      return { cleared: files.length };

    } catch (error) {
      console.error('Error clearing cache:', error.message);
      return { error: error.message };
    }
  }
}

export const judicialSearchCache = new JudicialSearchCache();
export default JudicialSearchCache;
