use serde::Serialize;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager, State};
use windows::{
    core::HSTRING,
    Devices::{
        Bluetooth::{BluetoothCacheMode, BluetoothDevice},
        Bluetooth::Rfcomm::RfcommServiceId,
        Enumeration::DeviceInformation,
    },
    Networking::Sockets::{SocketProtectionLevel, StreamSocket},
    Storage::Streams::{DataReader, DataWriter, InputStreamOptions},
};

struct ActiveConnection {
    socket: StreamSocket,
    writer: DataWriter,
}

#[derive(Default)]
struct BluetoothState(Mutex<Option<ActiveConnection>>);

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct BluetoothDeviceInfo {
    name: String,
    address: String,
    detail: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ConnectedDevice {
    name: String,
}

fn win_error(error: impl std::fmt::Display) -> String {
    format!("Bluetooth operation failed: {error}")
}

#[tauri::command]
async fn list_bluetooth_devices() -> Result<Vec<BluetoothDeviceInfo>, String> {
    let selector = BluetoothDevice::GetDeviceSelector().map_err(win_error)?;
    let devices = DeviceInformation::FindAllAsyncAqsFilter(&selector)
        .map_err(win_error)?
        .await
        .map_err(win_error)?;

    let mut result = Vec::new();
    for index in 0..devices.Size().map_err(win_error)? {
        let info = devices.GetAt(index).map_err(win_error)?;
        let id = info.Id().map_err(win_error)?.to_string();
        let name = info.Name().map_err(win_error)?.to_string();
        if id.is_empty() || name.is_empty() {
            continue;
        }
        result.push(BluetoothDeviceInfo {
            detail: id.clone(),
            name,
            address: id,
        });
    }
    Ok(result)
}

fn start_reader(app: AppHandle, socket: StreamSocket) {
    tauri::async_runtime::spawn(async move {
        let reader = match socket.InputStream().and_then(|stream| DataReader::CreateDataReader(&stream)) {
            Ok(reader) => reader,
            Err(error) => {
                let _ = app.emit("bt:status", serde_json::json!({"connected": false, "message": win_error(error)}));
                return;
            }
        };
        let _ = reader.SetInputStreamOptions(InputStreamOptions::Partial);
        loop {
            let count = match reader.LoadAsync(512) {
                Ok(operation) => match operation.await {
                    Ok(count) => count,
                    Err(_) => break,
                },
                Err(_) => break,
            };
            if count == 0 {
                break;
            }
            match reader.ReadString(count) {
                Ok(data) if !data.is_empty() => {
                    let _ = app.emit("bt:data", serde_json::json!({"data": data.to_string()}));
                }
                Ok(_) => {}
                Err(_) => break,
            }
        }
        let _ = app.emit("bt:status", serde_json::json!({"connected": false}));
    });
}

#[tauri::command]
async fn connect_bluetooth(
    app: AppHandle,
    state: State<'_, BluetoothState>,
    address: String,
) -> Result<ConnectedDevice, String> {
    if let Some(previous) = state.0.lock().map_err(win_error)?.take() {
        let _ = previous.socket.Close();
    }

    let device = BluetoothDevice::FromIdAsync(&HSTRING::from(address))
        .map_err(win_error)?
        .await
        .map_err(win_error)?;
    let name = device.Name().map_err(win_error)?.to_string();
    let services = device
        .GetRfcommServicesAsync(BluetoothCacheMode::Uncached)
        .map_err(win_error)?
        .await
        .map_err(win_error)?;
    let serial_uuid = RfcommServiceId::SerialPort()
        .map_err(win_error)?
        .Uuid()
        .map_err(win_error)?;
    let service_list = services.Services().map_err(win_error)?;
    let mut socket = None;

    for index in 0..service_list.Size().map_err(win_error)? {
        let service = service_list.GetAt(index).map_err(win_error)?;
        if service.ServiceId().map_err(win_error)?.Uuid().map_err(win_error)? != serial_uuid {
            continue;
        }
        let candidate = StreamSocket::new().map_err(win_error)?;
        let host = service.ConnectionHostName().map_err(win_error)?;
        let service_name = service.ConnectionServiceName().map_err(win_error)?;
        candidate
            .ConnectAsync(&host, &service_name, SocketProtectionLevel::PlainSocket)
            .map_err(win_error)?
            .get()
            .map_err(win_error)?;
        socket = Some(candidate);
        break;
    }

    let socket = socket.ok_or_else(|| "The paired device does not expose the Bluetooth Serial Port (SPP) service. Check that it is an HC-05/HC-06 or another RFCOMM SPP device.".to_string())?;
    let output = socket.OutputStream().map_err(win_error)?;
    let writer = DataWriter::CreateDataWriter(&output).map_err(win_error)?;
    let reader_socket = socket.clone();
    let mut guard = state.0.lock().map_err(win_error)?;
    *guard = Some(ActiveConnection { socket, writer });
    drop(guard);

    start_reader(app.clone(), reader_socket);
    let _ = app.emit("bt:status", serde_json::json!({"connected": true}));
    Ok(ConnectedDevice { name })
}

#[tauri::command]
async fn disconnect_bluetooth(app: AppHandle, state: State<'_, BluetoothState>) -> Result<(), String> {
    if let Some(connection) = state.0.lock().map_err(win_error)?.take() {
        connection.socket.Close().map_err(win_error)?;
    }
    let _ = app.emit("bt:status", serde_json::json!({"connected": false}));
    Ok(())
}

#[tauri::command]
async fn send_bluetooth(state: State<'_, BluetoothState>, data: String) -> Result<(), String> {
    let writer = state
        .0
        .lock()
        .map_err(win_error)?
        .as_ref()
        .map(|connection| connection.writer.clone())
        .ok_or_else(|| "Connect to a Bluetooth device first.".to_string())?;
    writer.WriteString(&HSTRING::from(data)).map_err(win_error)?;
    writer.StoreAsync().map_err(win_error)?.await.map_err(win_error)?;
    writer.FlushAsync().map_err(win_error)?.await.map_err(win_error)?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(BluetoothState::default())
        .invoke_handler(tauri::generate_handler![
            list_bluetooth_devices,
            connect_bluetooth,
            disconnect_bluetooth,
            send_bluetooth
        ])
        .run(tauri::generate_context!())
        .expect("error while running AMIN Bluetooth Control");
}
