package com.amin.bluetoothcontrol;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ClassicBluetoothPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
