const { addTrace, getTraces, getStats } = require('../store')

function logTrace(executionRecord, signals, scoreResult, edgeResult, riskResult) {
  const trace = {
    execution_id: executionRecord.execution_id,
    timestamp: executionRecord.timestamp,
    market_id: executionRecord.market_id,
    question: executionRecord.question,
    status: executionRecord.status,
    reason: executionRecord.reason || null,
    wallet_address: executionRecord.wallet_address || null,

    market_data: {
      implied_probability: executionRecord.implied_probability || null,
      model_probability: executionRecord.model_probability || null,
      edge: executionRecord.edge || null,
      adjusted_edge: executionRecord.adjusted_edge || null,
      direction: executionRecord.direction || null
    },

    decision: {
      score: scoreResult?.score || null,
      dominant_sentiment: scoreResult?.dominant_sentiment || null,
      signal_count: scoreResult?.signal_count || 0,
      threshold: edgeResult?.threshold || null,
      uncertainty_factor: edgeResult?.uncertainty_factor || null,
      bet_size_usdc: executionRecord.bet_size_usdc || null,
      cluster_key: executionRecord.cluster_key || null,
      builder_code: executionRecord.builder_code || null
    },

    signals: (signals || []).map(s => ({
      signal_type: s.signal_type,
      sentiment: s.sentiment,
      entity: s.entity,
      event_type: s.event_type,
      freshness_hours: s.freshness_hours,
      article_title: s.article_title
    })),

    risk_checks: riskResult?.checks || [],
    simulation: true,
    tx_hash: executionRecord.tx_hash || null
  }

  addTrace(trace)
  console.log('[traceLogger] Logged ' + trace.status + ' — ' + trace.execution_id)
  return trace
}

module.exports = { logTrace, getTraces, getStats }
