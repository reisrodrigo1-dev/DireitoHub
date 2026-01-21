/**
 * Resilience patterns: retry with backoff, circuit breaker
 */

const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 5000, 30000]; // ms
const RATE_LIMIT_DELAY = 60000; // 1 minute

/**
 * Exponential backoff retry with circuit breaker
 */
async function retryWithBackoff(asyncFn, context = 'operation', maxRetries = MAX_RETRIES) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 ${context} - Attempt ${attempt}/${maxRetries}`);
      return await asyncFn();
    } catch (error) {
      lastError = error;
      
      // Rate limit = wait extra long
      if (error.code === 429 || error.status === 429) {
        console.warn(`⏸️ Rate limited. Waiting ${RATE_LIMIT_DELAY}ms...`);
        await sleep(RATE_LIMIT_DELAY);
        continue;
      }
      
      // Timeout = retry quickly
      if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
        if (attempt < maxRetries) {
          const delay = RETRY_DELAYS[attempt - 1] || 30000;
          console.warn(`🔄 Timeout on ${context}, retrying in ${delay}ms`);
          await sleep(delay);
          continue;
        }
      }
      
      // Parse error or bad request = don't retry
      if (error.status === 400 || error.status === 404) {
        console.error(`❌ ${context} - Permanent error:`, error.message);
        throw error;
      }
      
      // Other errors = retry with backoff
      if (attempt < maxRetries) {
        const delay = RETRY_DELAYS[attempt - 1] || 30000;
        console.warn(`⏳ ${context} failed, retrying in ${delay}ms`);
        await sleep(delay);
      }
    }
  }
  
  throw new Error(`${context} failed after ${maxRetries} retries: ${lastError?.message}`);
}

/**
 * Circuit breaker - stops execution after N failures
 * Prevents cascading failures
 */
class CircuitBreaker {
  constructor(failureThreshold = 5, resetTimeout = 300000) { // 5 min
    this.failureThreshold = failureThreshold;
    this.resetTimeout = resetTimeout;
    this.failures = 0;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.lastFailureTime = null;
  }
  
  async execute(asyncFn) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN - retrying later');
      }
    }
    
    try {
      const result = await asyncFn();
      if (this.state === 'HALF_OPEN') {
        this.state = 'CLOSED';
        this.failures = 0;
      }
      return result;
    } catch (error) {
      this.failures++;
      this.lastFailureTime = Date.now();
      
      if (this.failures >= this.failureThreshold) {
        this.state = 'OPEN';
        console.error(
          `🔴 Circuit breaker OPEN after ${this.failures} failures`
        );
      }
      throw error;
    }
  }
}

/**
 * Track errors in Firestore for analysis
 */
async function logError(db, error, context) {
  try {
    await db.collection('error_tracking').add({
      timestamp: new Date(),
      errorType: error.code || 'unknown',
      message: error.message,
      context,
      resolved: false,
      retryCount: 0
    });
  } catch (logError) {
    console.error('Failed to log error:', logError);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export { retryWithBackoff, CircuitBreaker, logError, sleep };
