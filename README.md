# AMIN Bluetooth Control

**Control Everything With One Touch**

اپلیکیشن چندسکویی برای کنترل آردوینو با Bluetooth Classic SPP. رابط React/TypeScript در Android و Windows یکسان است؛ اتصال رادیویی از API بومی هر سیستم‌عامل انجام می‌شود.

## معماری ارتباط

- **Android:** افزونه بومی Capacitor در `android/app/src/main/java/.../ClassicBluetoothPlugin.java` از Android Bluetooth API، RFCOMM و UUID استاندارد SPP (`00001101-0000-1000-8000-00805F9B34FB`) استفاده می‌کند. جست‌وجو، فهرست دستگاه‌های جفت‌شده، مجوز Nearby devices و خواندن/نوشتن جریانی پشتیبانی می‌شوند.
- **Windows:** Electron با `serialport` به پورت مجازی COM مربوط به پروفایل Bluetooth SPP وصل می‌شود. ماژول را در Windows Bluetooth settings جفت کنید، پورت خروجی SPP را پیدا کنید و در برنامه انتخاب کنید.
- **HC-05/HC-06:** از Bluetooth Classic SPP پشتیبانی می‌شود؛ **Bluetooth LE پشتیبانی نمی‌شود**. نرخ سریال Windows برابر 9600 baud است (تنظیم رایج پیش‌فرض HC-05/HC-06). متن/بایت‌های UTF-8 دقیقاً همان‌طور که در دکمه تعریف شده ارسال می‌شوند؛ برنامه newline اضافه نمی‌کند.
- **مرورگر:** صرفاً پیش‌نمایش UI است و عمداً ادعای اتصال Bluetooth ندارد.

دستگاه‌های HC-05/HC-06 معمولاً باید ابتدا از تنظیمات سیستم‌عامل جفت شوند (PIN متداول ماژول‌ها 1234 یا 0000 است؛ از تنظیمات خود ماژول تبعیت کنید). در Android مجوز Bluetooth/Nearby devices و برای اسکن در نسخه‌های قدیمی‌تر مجوز مکان لازم است. در Windows پورت‌های سریال موجود فهرست می‌شوند؛ اگر COM Bluetooth SPP ساخته نشده باشد، ابتدا جفت‌سازی/تنظیمات Bluetooth ویندوز را کامل کنید.

## قابلیت‌ها

- دکمه‌های اولیه روشن (`1`) و خاموش (`0`)، دکمه‌های سفارشی با نام، متن ارسالی، رنگ، آیکون و اندازه.
- افزودن صفحه‌های کنترل مستقل، جابه‌جایی ترتیب دکمه‌ها، ویرایش و حذف.
- ساخت سناریوهای چندفرمانی با مکث قابل تنظیم؛ اجرا فقط با اقدام کاربر شروع می‌شود، امکان توقف دارد و فرمان‌ها با پایان‌خط انتخاب‌شده ارسال می‌شوند. در قطع اتصال، ادامهٔ سناریو لغو می‌شود.
- ثبت خودکار تنظیمات، صفحات، دکمه‌ها و تاریخچه در فضای ذخیره‌سازی همان نصب برنامه.
- مانیتور سریال زنده با زمان‌سنج هر داده، جست‌وجو، توقف/ادامهٔ نمایش بدون توقف ثبت تاریخچه، پاک‌کردن نمایش و خروجی TXT.
- داشبورد تله‌متری زنده: شناسایی خودکار کانال‌های عددی، نمودار ۹۰ نمونهٔ اخیر، کمینه/بیشینه، آستانهٔ هشدار قابل تنظیم و خروجی CSV. داده‌ها به‌صورت JSON هر خط یا زوج‌های `key:value` / `key=value` با LF پایانی فرستاده شوند؛ نمونه: `{"temperature":23.8,"humidity":"48%"}` یا `temperature:23.8°C, humidity:48%`.
- ارسال فرمان متنی از داشبورد یا خود مانیتور با انتخاب پایان‌خط None/LF/CR/CRLF.
- جست‌وجو، پاک‌کردن و خروجی CSV از تاریخچه.
- خروجی/بازیابی پشتیبان JSON نسخهٔ ۴ شامل صفحه‌ها، دکمه‌ها، سناریوها، تله‌متری و تنظیمات؛ پشتیبان‌های نسخه‌های ۱ تا ۳ هم قابل بازیابی‌اند.
- توقف اضطراری با متن قابل تنظیم (پیش‌فرض `STOP`). **این پیام تضمین توقف سخت‌افزار نیست**؛ Firmware آردوینو باید فرمان انتخابی را تشخیص دهد و رفتار ایمن مناسب داشته باشد.

## اجرا و توسعه

نیازمندی‌ها: Node.js 20+ و npm؛ برای اجرای آزمون‌های parser، Node.js 22+. برای Android، Android Studio/SDK و JDK 21. برای Windows EXE، Windows 10/11 (ساخت بومی Windows توصیه می‌شود).

```bash
npm ci
npm run dev              # پیش‌نمایش وب (بدون دسترسی Bluetooth)
npm run build            # ساخت UI وب
npm run test:telemetry   # آزمون‌های تجزیهٔ دادهٔ سنسورها
npm run electron:dev     # اجرای نسخه دسکتاپ
```

### Android APK

```bash
npm ci
npm run android:sync
cd android
./gradlew assembleDebug
```

خروجی قابل نصب توسعه‌ای: `android/app/build/outputs/apk/debug/app-debug.apk`. برای انتشار عمومی، نسخه release را با keystore شخصی امضا کنید.

### Windows EXE Installer

در Windows:

```powershell
npm ci
npm run electron:dist
```

Installer NSIS x64 در `release/` تولید می‌شود. جفت‌سازی ماژول و ساخت پورت COM خروجی Bluetooth SPP در تنظیمات Windows انجام می‌شود.

## انتشار در GitHub Releases

از **Actions → Build and publish installers → Run workflow** استفاده و نسخهٔ انتشار، مثلاً `v2.0.0`، را وارد کنید. Workflow هر دو نصاب را می‌سازد و پس از موفقیت هر دو، آن‌ها را در یک GitHub Release می‌گذارد. اگر تگ انتشار از قبل وجود داشته باشد، فایل‌های قبلی دست‌نخورده می‌مانند. APK نسخه debug و قابل نصب است؛ نسخه Android برای توزیع عمومی با keystore شخصی امضا شود. Windows EXE نیز امضای کد ندارد. در کنار Release، دو artifact موقت با مهلت 14 روز نگه‌داری می‌شوند.

## ساختار

- `src/ui/` رابط کاربری و استایل‌های واکنش‌گرا
- `src/platform/bluetooth.ts` انتخاب backend سیستم‌عامل
- `android/` پروژه native Capacitor و پیاده‌سازی Bluetooth Classic
- `electron/` فرایند اصلی امن Electron، preload محدود و ارتباط COM
- `.github/workflows/build-installers.yml` ساخت خروجی‌های Android و Windows
