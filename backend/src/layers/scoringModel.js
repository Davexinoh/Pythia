const SIGNAL_WEIGHTS = {
  regulatory: 0.35,
  event_proximity: 0.30,
  liquidity: 0.25,
  media_amplification: 0.10
}

const DECAY_HALF_LIVES = {
  regulatory: 72,
  event_proximity: 24,
  liquidity: 6,
  media_amplification: 3
}

const SENTIMENT_DIRECTION = {
  YES: 1,
  NO: -1,
  NEUTRAL: 0
}

function freshnessDecay(freshness_hours, signal_type) {
  const halfLife = DECAY_HALF_LIVES[signal_type] || 24
  return Math.pow(0.5, freshness_hours / halfLife)
}

function computeScore(signals) {
  if (!signals || signals.length === 0) {
    return { score: 0, breakdown: [], signal_count: 0, dominant_sentiment: 'NEUTRAL' }
  }

  let weightedSum = 0
  let totalWeight = 0
  const breakdown = []

  for (const signal of signals) {
    const baseWeight = SIGNAL_WEIGHTS[signal.signal_type] || 0.10
    const decay = freshnessDecay(signal.freshness_hours, signal.signal_type)
    const direction = SENTIMENT_DIRECTION[signal.sentiment] || 0
    const contribution = baseWeight * decay * direction

    weightedSum += contribution
    totalWeight += baseWeight * decay

    breakdown.push({
      signal_type: signal.signal_type,
      sentiment: signal.sentiment,
      entity: signal.entity,
      base_weight: baseWeight,
      decay: parseFloat(decay.toFixed(4)),
      direction,
      contribution: parseFloat(contribution.toFixed(4)),
      article_title: signal.article_title
    })
  }

  // Normalize to [-1, +1] — don't clamp at max
  const rawScore = totalWeight > 0 ? weightedSum / totalWeight : 0
  const score = Math.max(-1, Math.min(1, rawScore))

  return {
    score: parseFloat(score.toFixed(4)),
    breakdown,
    signal_count: signals.length,
    dominant_sentiment: score > 0.05 ? 'YES' : score < -0.05 ? 'NO' : 'NEUTRAL'
  }
}

function trackDistribution(signal_type, score, distributionLog) {
  if (!distributionLog[signal_type]) distributionLog[signal_type] = []
  const log = distributionLog[signal_type]
  log.push(score)
  if (log.length > 100) log.shift()
  if (log.length < 5) return null
  const mean = log.reduce((a, b) => a + b, 0) / log.length
  const variance = log.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / log.length
  return { signal_type, mean: parseFloat(mean.toFixed(4)), variance: parseFloat(variance.toFixed(4)) }
}

module.exports = { computeScore, trackDistribution }
