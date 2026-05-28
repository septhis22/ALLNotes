export interface MetricReport {
  type: 'send' | 'receive';
  updateHash: string;
  clientId: string;
  timestamp: number;
  payloadSize: number;
}

export class TelemetryMonitor {
  private backendUrl: string;
  private clientId: string;

  constructor(clientId: string, backendUrl: string) {
    this.clientId = clientId;
    this.backendUrl = backendUrl;
  }

  // A quick synchronous hash to uniquely identify an update buffer
  private hashUpdate(update: Uint8Array): string {
    let hash = 5381;
    for (let i = 0; i < update.length; i++) {
        hash = ((hash << 5) + hash) + update[i]; /* hash * 33 + c */
    }
    return Math.abs(hash).toString(16) + '-' + update.length;
  }

  public logSent(update: Uint8Array) {
    const report: MetricReport = {
      type: 'send',
      updateHash: this.hashUpdate(update),
      clientId: this.clientId,
      timestamp: Date.now(),
      payloadSize: update.byteLength
    };
    this.sendReport(report);
  }

  public logReceived(update: Uint8Array, renderCallback?: () => void) {
    const report: MetricReport = {
      type: 'receive',
      updateHash: this.hashUpdate(update),
      clientId: this.clientId,
      timestamp: Date.now(),
      payloadSize: update.byteLength
    };

    if (renderCallback) {
       renderCallback();
       requestAnimationFrame(() => {
          report.timestamp = Date.now();
          this.sendReport(report);
       });
    } else {
       this.sendReport(report);
    }
  }

  private sendReport(report: MetricReport) {
    fetch(`${this.backendUrl}/telemetry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(report),
    }).catch(() => {});
  }
}
