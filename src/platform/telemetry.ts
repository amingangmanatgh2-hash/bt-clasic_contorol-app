export type TelemetryReading = { key: string; value: number; unit: string };

const numericValue = (raw: unknown): { value: number; unit: string } | null => {
  if (typeof raw === 'number') return Number.isFinite(raw) ? { value: raw, unit: '' } : null;
  if (typeof raw !== 'string') return null;
  const match = raw.trim().match(/^([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)\s*([^\s,;]*)$/);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? { value, unit: match[2] ?? '' } : null;
};

/** Parse one newline-delimited JSON object or comma/semicolon separated key:value readings. */
export function parseTelemetryLine(line: string): TelemetryReading[] {
  const source = line.trim();
  if (!source) return [];

  try {
    const record: unknown = JSON.parse(source);
    if (record && typeof record === 'object' && !Array.isArray(record)) {
      return Object.entries(record as Record<string, unknown>).flatMap(([key, raw]) => {
        const reading = numericValue(raw);
        return key.trim() && reading ? [{ key: key.trim(), ...reading }] : [];
      });
    }
  } catch {
    // Not JSON; try the compact text protocol below.
  }

  return source.split(/[,;]\s*/).flatMap(token => {
    const match = token.match(/^(.{1,48}?)\s*[:=]\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)\s*([^\s,;]*)$/);
    if (!match) return [];
    const value = Number(match[2]);
    const key = match[1].trim();
    return key && Number.isFinite(value) ? [{ key, value, unit: match[3] ?? '' }] : [];
  });
}


/** Buffers arbitrary Bluetooth chunks and emits readings only for complete LF/CR-delimited lines. */
export class TelemetryStreamDecoder {
  private buffer = '';

  push(chunk: string): TelemetryReading[] {
    const combined = (this.buffer + chunk).replace(/\0/g, '');
    const lines = combined.split(/\r\n|\n|\r/);
    this.buffer = lines.pop() ?? '';
    if (this.buffer.length > 8192) this.buffer = this.buffer.slice(-8192);
    return lines.flatMap(parseTelemetryLine);
  }

  reset() { this.buffer = ''; }
}

export function serializeTelemetryCsv(metrics: Array<{ label: string; unit: string; points: TelemetryPoint[] }>, sampleWindow: number): string {
  const quote = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const rows = [['channel', 'timestamp', 'value', 'unit'], ...metrics.flatMap(metric => metric.points.slice(-sampleWindow).map(point => [metric.label, new Date(point.at).toISOString(), String(point.value), metric.unit]))];
  return '\ufeff' + rows.map(row => row.map(quote).join(',')).join('\r\n');
}

type TelemetryPoint = { at: number; value: number };
