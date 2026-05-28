interface MetricReport {
  type: 'send' | 'receive';
  updateHash: string;
  clientId: string;
  timestamp: number;
  payloadSize: number;
}

export class TelemetryAggregator {
  // Store sent timestamps keyed by: clientId -> updateHash -> timestamp
  private sentTimestamps: Map<string, Map<string, number>> = new Map();
  private latencies: number[] = [];
  private payloadSizes: number[] = [];
  private totalSyncs = 0;

  public logReport = (report: MetricReport) => {
    if (report.type === 'send') {
      let clientMap = this.sentTimestamps.get(report.clientId);
      if (!clientMap) {
        clientMap = new Map();
        this.sentTimestamps.set(report.clientId, clientMap);
      }
      // Store to pair up later
      clientMap.set(report.updateHash, report.timestamp);
      
    } else if (report.type === 'receive') {
      // Find the sender. We assume cross-client sync, so check other clients.
      let sentTimestamp: number | undefined;
      let senderId = 'unknown';

      // Very simple O(N) scan across clients to find who sent this update
      // A more robust implementation might include senderId directly in the payload
      for (const [sId, clientMap] of this.sentTimestamps.entries()) {
        if (sId !== report.clientId && clientMap.has(report.updateHash)) {
          sentTimestamp = clientMap.get(report.updateHash);
          senderId = sId;
          // Optionally delete after receive if 1-to-1, or keep if 1-to-many
          break; 
        }
      }

      if (sentTimestamp) {
        const latencyMs = report.timestamp - sentTimestamp;
        // Ignore negative latencies potentially caused by clock skew across different physical machines
        // But for local test, it works perfectly.
        if (latencyMs < 0) return;

        this.latencies.push(latencyMs);
        this.payloadSizes.push(report.payloadSize);
        this.totalSyncs++;

        const sumLatency = this.latencies.reduce((a, b) => a + b, 0);
        const avgLatency = sumLatency / this.totalSyncs;
        console.log(`[Telemetry] Synced update of ${report.payloadSize} bytes in ${latencyMs}ms. Avg latency: ${avgLatency.toFixed(2)}ms`);
      }
    }
  };

  public getDashboardStats = () => {
    if (this.totalSyncs === 0) {
      return { message: 'No telemetry data yet' };
    }

    const sortedLatencies = [...this.latencies].sort((a, b) => a - b);
    const sumLatency = sortedLatencies.reduce((a, b) => a + b, 0);
    const avgLatency = sumLatency / this.totalSyncs;
    const minLatency = sortedLatencies[0];
    const maxLatency = sortedLatencies[sortedLatencies.length - 1];
    const p95Latency = sortedLatencies[Math.floor(sortedLatencies.length * 0.95)];
    
    const sumPayload = this.payloadSizes.reduce((a, b) => a + b, 0);
    const avgPayload = sumPayload / this.payloadSizes.length;

    return {
      totalUpdates: this.totalSyncs,
      latency: {
        averageMs: avgLatency.toFixed(2),
        minMs: minLatency,
        maxMs: maxLatency,
        p95Ms: p95Latency
      },
      payload: {
        averageSizeBytes: avgPayload.toFixed(2),
        totalBytes: sumPayload
      }
    };
  };
}
