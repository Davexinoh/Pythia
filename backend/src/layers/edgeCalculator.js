const SENSITIVITY = 1.2
const BASE_EDGE_THRESHOLD = 0.06
const MIN_UNCERTAINTY_FACTOR = 1.0

function logOddsShift(impliedProbability, score) {
  if (impliedProbability <= 0 || impliedProbability >= 1) return null

  const logOddsMarket = Math.log(impliedProbability / (1 - impliedProbability))
  const logOddsModel = logOddsMarket + (score * SENSITIVITY)
  const modelProbability = 1 / (1 + Math.exp(-logOddsModel))

  return { logOddsMarket, logOddsModel, modelProbability }
}

function computeUncertaintyFactor(liquidity) {
  const liquidityFactor = Math.min(liquidity / 50000, 1.0)
  const uncertaintyFactor = Math.max(MIN_UNCERTAINTY_FACTOR, 1 + (1 - liquidityFactor))
  return parseFloat(uncertaintyFactor.toFixed(4))
}

function computeDynamicThreshold(errorLog) {
  if (!errorLog || errorLog.length < 5) return BASE_EDGE_THRESHOLD

  const mean = errorLog.reduce((a, b) => a + b, 0) / errorLog.length
  const variance = errorLog.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / errorLog.length
  const std = Math.sqrt(variance)

  const dynamic = mean + std
  return parseFloat(Math.max(BASE_EDGE_THRESHOLD, Math.min(dynamic, 0.20)).toFixed(4))
}

function calculateEdge(market, scoreResult, errorLog) {
  const { implied_probability, liquidity } = market
  const { score, signal_count } = scoreResult

  if (signal_count === 0) {
    return {
      action: 'SKIP',
      reason: 'NO_SIGNALS',
      implied_probability,
      model_probability: null,
      edge: null,
      adjusted_edge: null,
      threshold: null
    }
  }

  const shifted = logOddsShift(implied_probability, score)
  if (!shifted) {
    return {
      action: 'SKIP',
      reason: 'INVALID_PROBABILITY',
      implied_probability,
      model_probability: null,
      edge: null,
      adjusted_edge: null,
      threshold: null
    }
  }

  const { modelProbability } = shifted
  const edge = modelProbability - implied_probability
  const uncertaintyFactor = computeUncertaintyFactor(liquidity)
  const adjustedEdge = edge / uncertaintyFactor
  const threshold = computeDynamicThreshold(errorLog)

  const action = Math.abs(adjustedEdge) >= threshold ? 'PROCEED' : 'SKIP'
  const reason = action === 'SKIP' ? 'EDGE_BELOW_THRESHOLD' : 'EDGE_SUFFICIENT'
  const direction = edge > 0 ? 'YES' : 'NO'

  return {
    action,
    reason,
    direction,
    implied_probability: parseFloat(implied_probability.toFixed(4)),
    model_probability: parseFloat(modelProbability.toFixed(4)),
    edge: parseFloat(edge.toFixed(4)),
    adjusted_edge: parseFloat(adjustedEdge.toFixed(4)),
    uncertainty_factor: uncertaintyFactor,
    threshold,
    score,
    signal_count
  }
}

module.exports = { calculateEdge, computeDynamicThreshold }