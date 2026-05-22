const SIMULATION_MODE = process.env.SIMULATION_MODE !== 'false'
const BUILDER_CODE = process.env.POLYMARKET_BUILDER_CODE || 'pythia-builder'

const executionLog = []

function buildTradeRecord(market, edgeResult, riskResult, status, txHash) {
  return {
    execution_id: 'exec_' + Date.now() + '_' + market.market_id,
    timestamp: new Date().toISOString(),
    market_id: market.market_id,
    question: market.question,
    direction: riskResult.direction,
    implied_probability: edgeResult.implied_probability,
    model_probability: edgeResult.model_probability,
    edge: edgeResult.edge,
    adjusted_edge: edgeResult.adjusted_edge,
    bet_size_usdc: riskResult.kelly.bet_size_usdc,
    cluster_key: riskResult.cluster_key,
    builder_code: BUILDER_CODE,
    simulation: SIMULATION_MODE,
    status,
    tx_hash: txHash || null
  }
}

async function executeOrder(market, edgeResult, riskResult) {
  if (SIMULATION_MODE) {
    console.log('[executionLayer] SIMULATION — would execute:')
    console.log('  Market:', market.question.slice(0, 50))
    console.log('  Direction:', riskResult.direction)
    console.log('  Amount: $' + riskResult.kelly.bet_size_usdc + ' USDC')
    console.log('  Builder code:', BUILDER_CODE)

    const record = buildTradeRecord(market, edgeResult, riskResult, 'SIMULATED', null)
    executionLog.push(record)
    return record
  }

  // Live mode — Polymarket CLOB order placement
  // TODO: wire Circle Wallets + Polymarket API key for live execution
  console.log('[executionLayer] LIVE MODE — not yet wired')
  const record = buildTradeRecord(market, edgeResult, riskResult, 'PENDING_LIVE', null)
  executionLog.push(record)
  return record
}

async function skipOrder(market, reason, scoreResult, edgeResult) {
  const record = {
    execution_id: 'skip_' + Date.now() + '_' + market.market_id,
    timestamp: new Date().toISOString(),
    market_id: market.market_id,
    question: market.question,
    status: 'SKIPPED',
    reason,
    score: scoreResult?.score || null,
    edge: edgeResult?.edge || null,
    adjusted_edge: edgeResult?.adjusted_edge || null,
    simulation: SIMULATION_MODE
  }

  executionLog.push(record)
  return record
}

async function invalidateMarket(market, reason) {
  const record = {
    execution_id: 'inv_' + Date.now() + '_' + market.market_id,
    timestamp: new Date().toISOString(),
    market_id: market.market_id,
    question: market.question,
    status: 'INVALIDATED',
    reason,
    simulation: SIMULATION_MODE
  }

  executionLog.push(record)
  return record
}

function getExecutionLog() {
  return executionLog
}

module.exports = { executeOrder, skipOrder, invalidateMarket, getExecutionLog }