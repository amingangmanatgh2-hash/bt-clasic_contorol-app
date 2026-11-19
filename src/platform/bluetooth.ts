import { invoke, isTauri } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { registerPlugin } from '@capacitor/core';

export type BluetoothDevice = { name: string; address: string; detail?: string };
export type BluetoothEvent = { data: string };
type BluetoothStatus = { connected: boolean; message?: string };
type AndroidBluetooth = {
  getPairedDevices(): Promise<{ devices: BluetoothDevice[] }>;
  startDiscovery(): Promise<{ devices: BluetoothDevice[] }>;
  stopDiscovery(): Promise<void>;
  connect(options: { address: string }): Promise<{ name: string }>;
  disconnect(): Promise<void>;
  send(options: { data: string }): Promise<void>;
  addListener(eventName: 'dataReceived', listener: (event: BluetoothEvent) => void): Promise<{ remove: () => void }>;
  addListener(eventName: 'connectionChanged', listener: (event: BluetoothStatus) => void): Promise<{ remove: () => void }>;
};
const androidBluetooth = registerPlugin<AndroidBluetooth>('ClassicBluetooth');

const isDesktop = () => typeof window !== 'undefined' && isTauri();
export const platform = isDesktop() ? 'windows' : (/(android)/i.test(navigator.userAgent) ? 'android' : 'web');

function listenTauri<T>(event: string, callback: (payload: T) => void) {
  let active = true;
  let unlisten: (() => void) | undefined;
  void listen<T>(event, message => callback(message.payload)).then(remove => {
    if (active) unlisten = remove;
    else remove();
  });
  return () => { active = false; unlisten?.(); };
}

export const bt = {
  async devices(): Promise<BluetoothDevice[]> {
    if (isDesktop()) return invoke<BluetoothDevice[]>('list_bluetooth_devices');
    if (platform === 'android') return (await androidBluetooth.getPairedDevices()).devices;
    throw new Error('در پیش‌نمایش مرورگر امکان دسترسی مستقیم بلوتوث وجود ندارد. نسخه Android یا Windows را اجرا کنید.');
  },
  async discover(): Promise<BluetoothDevice[]> {
    if (isDesktop()) return invoke<BluetoothDevice[]>('list_bluetooth_devices');
    if (platform === 'android') return (await androidBluetooth.startDiscovery()).devices;
    throw new Error('اسکن بلوتوث در پیش‌نمایش مرورگر در دسترس نیست.');
  },
  connect(address: string) {
    return isDesktop() ? invoke<{ name: string }>('connect_bluetooth', { address }) : androidBluetooth.connect({ address });
  },
  disconnect() {
    return isDesktop() ? invoke<void>('disconnect_bluetooth') : androidBluetooth.disconnect();
  },
  send(data: string) {
    return isDesktop() ? invoke<void>('send_bluetooth', { data }) : androidBluetooth.send({ data });
  },
  onData(callback: (event: BluetoothEvent) => void) {
    if (isDesktop()) return listenTauri<BluetoothEvent>('bt:data', callback);
    if (platform === 'android') { let handle: { remove: () => void } | undefined; androidBluetooth.addListener('dataReceived', callback).then(h => handle = h); return () => handle?.remove(); }
    return () => {};
  },
  onStatus(callback: (event: BluetoothStatus) => void) {
    if (isDesktop()) return listenTauri<BluetoothStatus>('bt:status', callback);
    if (platform === 'android') { let handle: { remove: () => void } | undefined; androidBluetooth.addListener('connectionChanged', callback).then(h => handle = h); return () => handle?.remove(); }
    return () => {};
  }
};
