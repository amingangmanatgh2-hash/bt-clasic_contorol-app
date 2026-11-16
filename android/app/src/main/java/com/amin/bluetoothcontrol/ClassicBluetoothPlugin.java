package com.amin.bluetoothcontrol;

import android.Manifest;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothSocket;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(name = "ClassicBluetooth", permissions = {
    @Permission(alias = "nearby", strings = { Manifest.permission.BLUETOOTH_SCAN, Manifest.permission.BLUETOOTH_CONNECT }),
    @Permission(alias = "location", strings = { Manifest.permission.ACCESS_FINE_LOCATION })
})
public class ClassicBluetoothPlugin extends Plugin {
    private static final String TAG = "ClassicBluetooth";
    private static final UUID SPP_UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB");
    private final ExecutorService io = Executors.newSingleThreadExecutor();
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Map<String, BluetoothDevice> found = new HashMap<>();
    private BluetoothSocket socket;
    private InputStream input;
    private OutputStream output;
    private volatile boolean reading = false;
    private BroadcastReceiver scanReceiver;
    private PluginCall scanCall;

    private BluetoothAdapter adapter() { return BluetoothAdapter.getDefaultAdapter(); }
    private boolean permissionOk(String alias) { return getPermissionState(alias) == com.getcapacitor.PermissionState.GRANTED; }
    private void requestAlias(String alias, PluginCall call, String callback) { requestPermissionForAlias(alias, call, callback); }

    @PluginMethod public void getPairedDevices(PluginCall call) {
        if (Build.VERSION.SDK_INT >= 31 && !permissionOk("nearby")) { requestAlias("nearby", call, "pairedPermissionResult"); return; }
        resolvePaired(call);
    }
    @PermissionCallback private void pairedPermissionResult(PluginCall call) { resolvePaired(call); }
    private void resolvePaired(PluginCall call) {
        BluetoothAdapter adapter = adapter();
        if (adapter == null) { call.reject("این دستگاه از Bluetooth Classic پشتیبانی نمی‌کند."); return; }
        try {
            JSArray devices = new JSArray();
            Set<BluetoothDevice> bonded = adapter.getBondedDevices();
            if (bonded != null) for (BluetoothDevice device : bonded) devices.put(deviceObject(device));
            JSObject result = new JSObject(); result.put("devices", devices); call.resolve(result);
        } catch (Exception error) { call.reject("مجوز بلوتوث داده نشد. مجوز دستگاه‌های نزدیک را فعال کنید.", error); }
    }

    @PluginMethod public void startDiscovery(PluginCall call) {
        String alias = Build.VERSION.SDK_INT >= 31 ? "nearby" : "location";
        if (!permissionOk(alias)) { requestAlias(alias, call, "scanPermissionResult"); return; }
        beginDiscovery(call);
    }
    @PermissionCallback private void scanPermissionResult(PluginCall call) { beginDiscovery(call); }
    private void beginDiscovery(PluginCall call) {
        BluetoothAdapter adapter = adapter();
        if (adapter == null) { call.reject("این دستگاه از Bluetooth Classic پشتیبانی نمی‌کند."); return; }
        if (!adapter.isEnabled()) { call.reject("بلوتوث گوشی خاموش است. ابتدا آن را روشن کنید."); return; }
        if (scanReceiver != null) { try { getContext().unregisterReceiver(scanReceiver); } catch (Exception ignored) {} scanReceiver = null; }
        found.clear(); scanCall = call;
        try { Set<BluetoothDevice> bonded = adapter.getBondedDevices(); if (bonded != null) for (BluetoothDevice device : bonded) found.put(device.getAddress(), device); } catch (SecurityException ignored) {}
        scanReceiver = new BroadcastReceiver() {
            @Override public void onReceive(Context context, Intent intent) {
                String action = intent.getAction();
                if (BluetoothDevice.ACTION_FOUND.equals(action)) {
                    BluetoothDevice device = intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE);
                    if (device != null) found.put(device.getAddress(), device);
                } else if (BluetoothAdapter.ACTION_DISCOVERY_FINISHED.equals(action)) finishDiscovery();
            }
        };
        IntentFilter filter = new IntentFilter(); filter.addAction(BluetoothDevice.ACTION_FOUND); filter.addAction(BluetoothAdapter.ACTION_DISCOVERY_FINISHED);
        if (Build.VERSION.SDK_INT >= 33) getContext().registerReceiver(scanReceiver, filter, Context.RECEIVER_EXPORTED); else getContext().registerReceiver(scanReceiver, filter);
        try {
            if (adapter.isDiscovering()) adapter.cancelDiscovery();
            if (!adapter.startDiscovery()) {
                if (scanReceiver != null) { try { getContext().unregisterReceiver(scanReceiver); } catch (Exception ignored) {} scanReceiver = null; }
                scanCall = null; call.reject("جست‌وجوی بلوتوث شروع نشد. بلوتوث را بررسی کنید."); return;
            }
            handler.postDelayed(this::finishDiscovery, 12000);
        } catch (SecurityException error) {
            if (scanReceiver != null) { try { getContext().unregisterReceiver(scanReceiver); } catch (Exception ignored) {} scanReceiver = null; }
            scanCall = null; call.reject("مجوز جست‌وجوی بلوتوث داده نشد.", error);
        }
    }
    private void finishDiscovery() {
        if (scanCall == null) return;
        try { BluetoothAdapter adapter = adapter(); if (adapter != null && adapter.isDiscovering()) adapter.cancelDiscovery(); } catch (Exception ignored) {}
        if (scanReceiver != null) { try { getContext().unregisterReceiver(scanReceiver); } catch (Exception ignored) {} scanReceiver = null; }
        JSONArray list = new JSONArray();
        for (BluetoothDevice device : found.values()) try { list.put(deviceObject(device)); } catch (Exception ignored) {}
        JSObject response = new JSObject(); response.put("devices", list);
        PluginCall pending = scanCall; scanCall = null; pending.resolve(response);
    }
    private JSObject deviceObject(BluetoothDevice device) throws JSONException {
        JSObject json = new JSObject();
        String name = "Bluetooth device";
        try { if (device.getName() != null && !device.getName().trim().isEmpty()) name = device.getName(); } catch (SecurityException ignored) {}
        json.put("name", name); json.put("address", device.getAddress()); json.put("detail", device.getAddress()); return json;
    }
    @PluginMethod public void stopDiscovery(PluginCall call) {
        try { BluetoothAdapter adapter = adapter(); if (adapter != null && adapter.isDiscovering()) adapter.cancelDiscovery(); } catch (Exception ignored) {}
        if (scanCall != null) finishDiscovery();
        call.resolve();
    }

    @PluginMethod public void connect(PluginCall call) {
        if (Build.VERSION.SDK_INT >= 31 && !permissionOk("nearby")) { requestAlias("nearby", call, "connectPermissionResult"); return; }
        connectInternal(call);
    }
    @PermissionCallback private void connectPermissionResult(PluginCall call) { connectInternal(call); }
    private void connectInternal(PluginCall call) {
        String address = call.getString("address");
        if (address == null || address.isEmpty()) { call.reject("دستگاه انتخاب‌شده معتبر نیست."); return; }
        BluetoothAdapter adapter = adapter();
        if (adapter == null) { call.reject("این دستگاه از Bluetooth Classic پشتیبانی نمی‌کند."); return; }
        if (!adapter.isEnabled()) { call.reject("بلوتوث گوشی خاموش است. ابتدا آن را روشن کنید."); return; }
        io.execute(() -> {
            closeSocket();
            try {
                BluetoothDevice device = adapter.getRemoteDevice(address);
                if (adapter.isDiscovering()) adapter.cancelDiscovery();
                BluetoothSocket newSocket = device.createRfcommSocketToServiceRecord(SPP_UUID);
                newSocket.connect(); socket = newSocket; input = newSocket.getInputStream(); output = newSocket.getOutputStream(); reading = true;
                String deviceName = "HC-05 / HC-06";
                try { if (device.getName() != null) deviceName = device.getName(); } catch (SecurityException ignored) {}
                JSObject result = new JSObject(); result.put("name", deviceName); call.resolve(result);
                JSObject state = new JSObject(); state.put("connected", true); notifyListeners("connectionChanged", state);
                Thread reader = new Thread(this::readLoop, "amin-bt-reader");
                reader.setDaemon(true);
                reader.start();
            } catch (Exception error) {
                closeSocket(); Log.e(TAG, "RFCOMM connection failed", error);
                call.reject("اتصال برقرار نشد. ماژول را در تنظیمات بلوتوث جفت کنید و از روشن بودن آن مطمئن شوید.", error);
                JSObject state = new JSObject(); state.put("connected", false); state.put("message", "اتصال برقرار نشد؛ جفت‌سازی HC-05/HC-06 را بررسی کنید."); notifyListeners("connectionChanged", state);
            }
        });
    }
    private void readLoop() {
        byte[] buffer = new byte[1024];
        while (reading && input != null) {
            try {
                int count = input.read(buffer);
                if (count < 0) break;
                String chunk = new String(buffer, 0, count, java.nio.charset.StandardCharsets.UTF_8);
                JSObject event = new JSObject(); event.put("data", chunk); notifyListeners("dataReceived", event);
            } catch (IOException error) { break; }
        }
        if (reading) { closeSocket(); JSObject state = new JSObject(); state.put("connected", false); notifyListeners("connectionChanged", state); }
    }
    @PluginMethod public void send(PluginCall call) {
        String data = call.getString("data", "");
        io.execute(() -> {
            try { if (output == null || socket == null || !socket.isConnected()) throw new IOException("اتصال بلوتوث برقرار نیست."); output.write(data.getBytes(java.nio.charset.StandardCharsets.UTF_8)); output.flush(); call.resolve(); }
            catch (Exception error) { call.reject("ارسال انجام نشد. اتصال بلوتوث و دستگاه را بررسی کنید.", error); }
        });
    }
    @PluginMethod public void disconnect(PluginCall call) {
        io.execute(() -> { closeSocket(); call.resolve(); JSObject state = new JSObject(); state.put("connected", false); notifyListeners("connectionChanged", state); });
    }
    private synchronized void closeSocket() {
        reading = false;
        try { if (input != null) input.close(); } catch (Exception ignored) {}
        try { if (output != null) output.close(); } catch (Exception ignored) {}
        try { if (socket != null) socket.close(); } catch (Exception ignored) {}
        input = null; output = null; socket = null;
    }
    @Override protected void handleOnDestroy() { closeSocket(); io.shutdownNow(); super.handleOnDestroy(); }
}
