const MAX_POSITION_SIZE = 0.15
const MAX_CLUSTER_EXPOSURE = 0.40
const MAX_OPEN_POSITIONS = 5
const KELLY_FRACTION = 0.5

function kellyBetSize(adjustedEdge, impliedProbability, portfolioValue) {
  const absEdge = Math.abs(adjustedEdge)
  const p = 0.5 + absEdge
  const q = 1 - p
  const b = 1

  const kelly = (p * b - q) / b
  const halfKelly = Math.max(0, kelly * KELLY_FRACTION)
  const capped = Math.min(halfKelly, MAX_POSITION_SIZE)
  const betSize = capped * portfolioValue

  return {
    kelly_fraction: parseFloat(kelly.toFixed(4)),
    half_kelly: parseFloat(halfKelly.toFixed(4)),
    capped_fraction: parseFloat(capped.toFixed(4)),
    bet_size_usdc: parseFloat(betSize.toFixed(2))
  }
}

function getClusterKey(market) {
  const question = (market.question || '').toLowerCase()

  if (question.includes('btc') || question.includes('bitcoin')) return 'bitcoin'
  if (question.includes('eth') || question.includes('ethereum')) return 'ethereum'
  if (question.includes('sol') || question.includes('solana')) return 'solana'
  if (question.includes('trump')) return 'trump'
  if (question.includes('election')) return 'election'
  if (question.includes('fed') || question.includes('rate')) return 'macro_rates'
  if (question.includes('nba')) return 'nba'
  if (question.includes('nfl')) return 'nfl'
  if (question.includes('nhl')) return 'nhl'
  if (question.includes('fifa') || question.includes('world cup')) return 'fifa'
  if (question.includes('gta')) return 'gta_vi'

  // Use category as fallback — much more specific than 'unknown'
  return market.category?.toLowerCase().replace(' ', '_') || 'general'
}

function checkRisk(market, edgeResult, openPositions, portfolioValue) {
  const checks = []
  let passed = true

  // Check 1 — open position count
  if (openPositions.length >= MAX_OPEN_POSITIONS) {
    checks.push({ check: 'POSITION_COUNT', passed: false, reason: 'Max ' + MAX_OPEN_POSITIONS + ' open positions reached' })
    passed = false
  } else {
    checks.push({ check: 'POSITION_COUNT', passed: true, reason: openPositions.length + '/' + MAX_OPEN_POSITIONS + ' positions open' })
  }

  // Check 2 — kelly sizing
  const kelly = kellyBetSize(edgeResult.adjusted_edge, edgeResult.implied_probability, portfolioValue)
  checks.push({ check: 'MARKET_CAP', passed: true, reason: 'Size ' + (kelly.capped_fraction * 100).toFixed(1) + '% within ' + (MAX_POSITION_SIZE * 100) + '% limit' })

  // Check 3 — cluster exposure
  const clusterKey = getClusterKey(market)
  const clusterPositions = openPositions.filter(p => p.cluster_key === clusterKey)
  const clusterExposure = clusterPositions.reduce((sum, p) => sum + p.size_fraction, 0)

  if (clusterExposure + kelly.capped_fraction > MAX_CLUSTER_EXPOSURE) {
    checks.push({ check: 'CLUSTER_EXPOSURE', passed: false, reason: 'Cluster "' + clusterKey + '" would exceed ' + (MAX_CLUSTER_EXPOSURE * 100) + '% cap' })
    passed = false
  } else {
    checks.push({ check: 'CLUSTER_EXPOSURE', passed: true, reason: 'Cluster "' + clusterKey + '" exposure OK' })
  }

  return {
    passed,
    checks,
    cluster_key: clusterKey,
    kelly,
    direction: edgeResult.direction,
    action: passed ? 'EXECUTE' : 'SKIP',
    reason: passed ? 'ALL_CHECKS_PASSED' : checks.find(c => !c.passed)?.reason
  }
}

module.exports = { checkRisk, getClusterKey }
