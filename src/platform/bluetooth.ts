import { registerPlugin } from '@capacitor/core';

export type BluetoothDevice = { name: string; address: string; detail?: string };
export type BluetoothEvent = { data: string };
type AndroidBluetooth = {
  getPairedDevices(): Promise<{ devices: BluetoothDevice[] }>;
  startDiscovery(): Promise<{ devices: BluetoothDevice[] }>;
  stopDiscovery(): Promise<void>;
  connect(options: { address: string }): Promise<{ name: string }>;
  disconnect(): Promise<void>;
  send(options: { data: string }): Promise<void>;
  addListener(eventName: 'dataReceived', listener: (event: BluetoothEvent) => void): Promise<{ remove: () => void }>;
  addListener(eventName: 'connectionChanged', listener: (event: { connected: boolean; message?: string }) => void): Promise<{ remove: () => void }>;
};
const androidBluetooth = registerPlugin<AndroidBluetooth>('ClassicBluetooth');

declare global {
  interface Window {
    aminBluetooth?: {
      listPorts: () => Promise<BluetoothDevice[]>;
      connect: (address: string) => Promise<{ name: string }>;
      disconnect: () => Promise<void>;
      send: (data: string) => Promise<void>;
      onData: (callback: (event: BluetoothEvent) => void) => () => void;
      onStatus: (callback: (event: { connected: boolean; message?: string }) => void) => () => void;
      platform: 'windows';
    };
  }
}

export const platform = window.aminBluetooth ? 'windows' : (/(android)/i.test(navigator.userAgent) ? 'android' : 'web');
export const bt = {
  async devices(): Promise<BluetoothDevice[]> {
    if (window.aminBluetooth) return window.aminBluetooth.listPorts();
    if (platform === 'android') return (await androidBluetooth.getPairedDevices()).devices;
    throw new Error('در پیش‌نمایش مرورگر امکان دسترسی مستقیم بلوتوث وجود ندارد. نسخه Android یا Windows را اجرا کنید.');
  },
  async discover(): Promise<BluetoothDevice[]> {
    if (window.aminBluetooth) return window.aminBluetooth.listPorts();
    if (platform === 'android') return (await androidBluetooth.startDiscovery()).devices;
    throw new Error('اسکن بلوتوث در پیش‌نمایش مرورگر در دسترس نیست.');
  },
  connect(address: string) {
    return window.aminBluetooth ? window.aminBluetooth.connect(address) : androidBluetooth.connect({ address });
  },
  disconnect() { return window.aminBluetooth ? window.aminBluetooth.disconnect() : androidBluetooth.disconnect(); },
  send(data: string) { return window.aminBluetooth ? window.aminBluetooth.send(data) : androidBluetooth.send({ data }); },
  onData(callback: (event: BluetoothEvent) => void) {
    if (window.aminBluetooth) return window.aminBluetooth.onData(callback);
    if (platform === 'android') { let handle: { remove: () => void } | undefined; androidBluetooth.addListener('dataReceived', callback).then(h => handle = h); return () => handle?.remove(); }
    return () => {};
  },
  onStatus(callback: (event: { connected: boolean; message?: string }) => void) {
    if (window.aminBluetooth) return window.aminBluetooth.onStatus(callback);
    if (platform === 'android') { let handle: { remove: () => void } | undefined; androidBluetooth.addListener('connectionChanged', callback).then(h => handle = h); return () => handle?.remove(); }
    return () => {};
  }
};
