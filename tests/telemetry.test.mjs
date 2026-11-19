import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTelemetryLine, TelemetryStreamDecoder, serializeTelemetryCsv } from '../src/platform/telemetry.ts';

test('parses numeric JSON fields and numeric strings with units', () => {
  assert.deepEqual(parseTelemetryLine('{"temp":24.6,"humidity":"51%","label":"warm"}'), [
    { key: 'temp', value: 24.6, unit: '' },
    { key: 'humidity', value: 51, unit: '%' },
  ]);
});

test('parses compact colon and equals pairs including signs and exponents', () => {
  assert.deepEqual(parseTelemetryLine('temp:23.8°C, humidity=51%, voltage:-1.2e1V, current=+2.1mA'), [
    { key: 'temp', value: 23.8, unit: '°C' },
    { key: 'humidity', value: 51, unit: '%' },
    { key: 'voltage', value: -12, unit: 'V' },
    { key: 'current', value: 2.1, unit: 'mA' },
  ]);
});

test('ignores malformed, non-numeric, array and non-finite readings', () => {
  assert.deepEqual(parseTelemetryLine('not a reading'), []);
  assert.deepEqual(parseTelemetryLine('[1,2,3]'), []);
  assert.deepEqual(parseTelemetryLine('{"temp":"hot","bad":1e999}'), []);
  assert.deepEqual(parseTelemetryLine('temp:NaN, humidity:Infinity'), []);
});

test('supports blank and whitespace-only lines', () => {
  assert.deepEqual(parseTelemetryLine('  '), []);
});


test('buffers partial Bluetooth chunks until a complete line arrives', () => {
  const decoder = new TelemetryStreamDecoder();
  assert.deepEqual(decoder.push('{"temp":2'), []);
  assert.deepEqual(decoder.push('4.5,"humidity":51}\r'), [
    { key: 'temp', value: 24.5, unit: '' },
    { key: 'humidity', value: 51, unit: '' },
  ]);
  assert.deepEqual(decoder.push('\n'), []);
});

test('decodes several complete lines in a single serial chunk', () => {
  const decoder = new TelemetryStreamDecoder();
  assert.deepEqual(decoder.push('temp:20C\nhumidity:40%\n'), [
    { key: 'temp', value: 20, unit: 'C' },
    { key: 'humidity', value: 40, unit: '%' },
  ]);
});


test('exports only the selected newest chart window and CSV-escapes channel names', () => {
  const csv = serializeTelemetryCsv([{label:'Room, north',unit:'°C',points:[{at:1000,value:20},{at:2000,value:21},{at:3000,value:22}]}],2);
  assert.match(csv, /^\ufeff"channel","timestamp","value","unit"/);
  assert.ok(csv.includes('"Room, north","1970-01-01T00:00:02.000Z","21","°C"'));
  assert.ok(csv.includes('"Room, north","1970-01-01T00:00:03.000Z","22","°C"'));
  assert.ok(!csv.includes('00.000Z","20"'));
});
