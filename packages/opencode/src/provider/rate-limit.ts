export class TokenBucket {
  private tokens: number
  private maxTokens: number
  private refillInterval: number
  private lastRefill: number

  constructor(maxPerMinute: number) {
    this.maxTokens = maxPerMinute
    this.tokens = maxPerMinute
    this.refillInterval = 60000 / maxPerMinute
    this.lastRefill = Date.now()
  }

  private refill() {
    const now = Date.now()
    const elapsed = now - this.lastRefill
    const newTokens = Math.floor(elapsed / this.refillInterval)
    if (newTokens > 0) {
      this.tokens = Math.min(this.maxTokens, this.tokens + newTokens)
      this.lastRefill = now
    }
  }

  tryAcquire(count = 1): boolean {
    this.refill()
    if (this.tokens >= count) {
      this.tokens -= count
      return true
    }
    return false
  }

  async acquire(count = 1): Promise<void> {
    while (!this.tryAcquire(count)) {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
  }

  get currentTokens(): number {
    return this.tokens
  }

  get maxTokensValue(): number {
    return this.maxTokens
  }

  setMaxPerMinute(rpm: number) {
    this.refill()
    this.maxTokens = rpm
    this.refillInterval = 60000 / rpm
    if (this.tokens > rpm) this.tokens = rpm
  }
}

const buckets = new Map<string, TokenBucket>()

export function getOrCreateBucket(key: string, maxPerMinute: number): TokenBucket {
  let bucket = buckets.get(key)
  if (!bucket) {
    bucket = new TokenBucket(maxPerMinute)
    buckets.set(key, bucket)
  }
  return bucket
}

export function acquireToken(key: string, maxPerMinute: number): Promise<void> {
  return getOrCreateBucket(key, maxPerMinute).acquire()
}

export function setRateLimit(key: string, rpm: number): void {
  const bucket = buckets.get(key)
  if (bucket) {
    bucket.setMaxPerMinute(rpm)
  } else {
    buckets.set(key, new TokenBucket(rpm))
  }
}

export function getRateLimit(key: string): { rpm: number; available: number } | undefined {
  const bucket = buckets.get(key)
  if (!bucket) return undefined
  return { rpm: bucket.maxTokensValue, available: bucket.currentTokens }
}

export function getAllRateLimits(): Record<string, { rpm: number; available: number; unlimited: boolean }> {
  const result: Record<string, { rpm: number; available: number; unlimited: boolean }> = {}
  for (const [key, bucket] of buckets) {
    result[key] = { rpm: bucket.maxTokensValue, available: bucket.currentTokens, unlimited: bucket.maxTokensValue >= 1_000_000 }
  }
  return result
}

export function deleteRateLimit(key: string): void {
  buckets.delete(key)
}
