import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Bluetooth, BluetoothConnected, Check,
  ChevronDown, CircleHelp, Clock3, Command, Cpu, Edit2, Ellipsis, Grid2X2, History, House,
  Languages, Lightbulb, ListPlus, LoaderCircle, Menu, MessageSquareText, Plus, Radio, Search,
  Settings2, ShieldAlert, SlidersHorizontal, Sparkles, Trash2, Wifi, X, Zap
} from 'lucide-react';
import { bt, platform, type BluetoothDevice } from '../platform/bluetooth';

type Control = { id: string; name: string; payload: string; color: string; icon: string; size: 'normal'|'wide'|'large' };
type ControlPage = { id: string; name: string; controls: Control[] };
type Entry = { id: string; payload: string; target: string; time: string; direction: 'sent'|'received' };
type Lang = 'fa'|'en';
const colors = ['#d6ff5f','#4edbb1','#48a7ff','#bd91ff','#ff748b','#ffb65c','#e7edf8','#48d7e8'];
const iconChoices = ['⚡','💡','🌀','🔒','🚪','💧','🌡️','⚙️','🚀','🔔','🛠️','✨'];
const initialPages: ControlPage[] = [{ id: 'main', name: 'کنترل اصلی', controls: [
  { id:'ready-1', name:'روشن', payload:'1', color:'#d6ff5f', icon:'⚡', size:'normal' },
  { id:'ready-0', name:'خاموش', payload:'0', color:'#ff748b', icon:'⏻', size:'normal' },
] }];
const initialHistory: Entry[] = [];
const text = {
  fa: { dashboard:'داشبورد', pages:'صفحه‌ها', history:'تاریخچه', settings:'تنظیمات', tagline:'Control Everything With One Touch', workspace:'فضای کنترل', live:'اتصال زنده', connect:'اتصال بلوتوث', connected:'متصل', disconnected:'قطع اتصال', controller:'کنترلر بلوتوث', paired:'دستگاه‌های بلوتوث', pick:'دستگاه جفت‌شده را انتخاب کنید', refresh:'جست‌وجو', emptyDevices:'دستگاهی پیدا نشد', pairHint:'ابتدا HC-05 یا HC-06 را از تنظیمات بلوتوث گوشی/ویندوز جفت کنید.', controlTitle:'دکمه‌های کنترل', controlHint:'برای ارسال فرمان روی هر دکمه بزنید.', add:'دکمه جدید', emergency:'توقف اضطراری', emergencyHint:'ارسال فرمان توقف', commands:'فرمان‌های امروز', received:'دریافتی از آردوینو', sent:'ارسال‌شده', noHistory:'هنوز فرمانی ارسال نشده', console:'مانیتور سریال', consoleHint:'داده‌های دریافتی در لحظه نمایش داده می‌شوند', addPage:'صفحه جدید', edit:'ویرایش', delete:'حذف', name:'نام دکمه', payload:'متن ارسالی', color:'رنگ', icon:'آیکون', size:'اندازه دکمه', save:'ذخیره دکمه', cancel:'انصراف', normal:'معمولی', wide:'عریض', large:'بزرگ', newPage:'نام صفحه جدید', makePage:'ساخت صفحه', send:'ارسال', noPages:'صفحه‌ای وجود ندارد', language:'زبان برنامه', bluetooth:'اتصال بلوتوث', platform:'نسخه برنامه', android:'Android · Bluetooth Classic SPP', windows:'Windows · Bluetooth COM Port', preview:'پیش‌نمایش وب · بدون سخت‌افزار بلوتوث', connectedTo:'متصل به', connectionError:'اتصال ناموفق بود', sendError:'ارسال فرمان انجام نشد', sentOK:'فرمان ارسال شد', emergencySent:'فرمان توقف اضطراری ارسال شد', noDevice:'ابتدا به دستگاه بلوتوث متصل شوید', settingsTitle:'تنظیمات و راهنما', transport:'روش ارتباطی', transportHint:'HC-05/HC-06 با پروفایل Bluetooth Classic SPP کار می‌کنند؛ Bluetooth LE پشتیبانی نمی‌شود.', receiveTitle:'دریافت اطلاعات', receiveHint:'داده‌های دریافتی از سریال بلوتوث در پنل مانیتور و تاریخچه نشان داده می‌شوند.', windowsHint:'در ویندوز، ماژول را در تنظیمات سیستم جفت کنید و پورت COM خروجی Bluetooth SPP را انتخاب کنید.', androidHint:'در Android 12 به بعد، مجوز دستگاه‌های نزدیک هنگام اتصال گرفته می‌شود.', stopWarning:'متن فرمان توقف را مطابق Firmware آردوینو تنظیم کنید؛ برنامه توقف سخت‌افزار را تضمین نمی‌کند.', editTitle:'تنظیم دکمه', createTitle:'ساخت دکمه جدید', confirmDelete:'این دکمه حذف شود؟', saved:'ذخیره خودکار فعال است', bytes:'کاراکتر', search:'جست‌وجو در تاریخچه', clear:'پاک‌کردن تاریخچه', noMatches:'موردی پیدا نشد', connectionRequired:'برای ارسال فرمان به دستگاه متصل شوید', online:'آماده فرمان', offline:'منتظر اتصال', scanBusy:'در حال جست‌وجو…', portEmpty:'پورت COM بلوتوثی پیدا نشد', reorder:'ترتیب', group:'همه صفحه‌ها', quickCommand:'ارسال سریع', quickHint:'فرمان دلخواه را مستقیم بفرستید', lineEnding:'پایان خط', noEnding:'بدون پایان خط', lf:'LF', cr:'CR', crlf:'CRLF', emergencyPayload:'فرمان توقف اضطراری', backup:'پشتیبان‌گیری', restore:'بازیابی پشتیبان', backupHint:'صفحه‌ها، دکمه‌ها و تنظیمات را به فایل JSON ذخیره یا بازیابی کنید.', exportHistory:'خروجی CSV', backupDone:'فایل پشتیبان آماده شد', historyDone:'تاریخچه صادر شد', restoreDone:'پشتیبان بازیابی شد', invalidBackup:'فایل پشتیبان معتبر نیست' },
  en: { dashboard:'Dashboard', pages:'Pages', history:'History', settings:'Settings', tagline:'Control Everything With One Touch', workspace:'Control workspace', live:'Live connection', connect:'Connect Bluetooth', connected:'Connected', disconnected:'Disconnected', controller:'Bluetooth controller', paired:'Bluetooth devices', pick:'Select a paired device', refresh:'Search', emptyDevices:'No devices found', pairHint:'First pair your HC-05 or HC-06 in your phone/Windows Bluetooth settings.', controlTitle:'Control buttons', controlHint:'Tap a button to send its command.', add:'New button', emergency:'Emergency stop', emergencyHint:'Send stop command', commands:'Commands today', received:'Received from Arduino', sent:'Sent', noHistory:'No commands sent yet', console:'Serial monitor', consoleHint:'Incoming data appears here in real time', addPage:'New page', edit:'Edit', delete:'Delete', name:'Button name', payload:'Payload', color:'Color', icon:'Icon', size:'Button size', save:'Save button', send:'Send', cancel:'Cancel', normal:'Regular', wide:'Wide', large:'Large', newPage:'New page name', makePage:'Create page', noPages:'No pages', language:'App language', bluetooth:'Bluetooth connection', platform:'App build', android:'Android · Bluetooth Classic SPP', windows:'Windows · Bluetooth COM Port', preview:'Web preview · no Bluetooth hardware', connectedTo:'Connected to', connectionError:'Connection failed', sendError:'Command could not be sent', sentOK:'Command sent', emergencySent:'Emergency stop command sent', noDevice:'Connect to a Bluetooth device first', settingsTitle:'Settings & help', transport:'Transport', transportHint:'HC-05/HC-06 use Bluetooth Classic SPP; Bluetooth LE is not supported.', receiveTitle:'Receive data', receiveHint:'Incoming Bluetooth serial data is shown in the monitor and history.', windowsHint:'On Windows, pair the module in system settings, then select its Bluetooth SPP outgoing COM port.', androidHint:'On Android 12+, nearby-device permission is requested when connecting.', stopWarning:'Set the stop command to match your Arduino firmware. The app cannot guarantee a hardware stop.', editTitle:'Edit button', createTitle:'Create a button', confirmDelete:'Delete this button?', saved:'Auto-save is on', bytes:'characters', search:'Search history', clear:'Clear history', noMatches:'No matches found', connectionRequired:'Connect to send commands', online:'Ready to control', offline:'Waiting for connection', scanBusy:'Searching…', portEmpty:'No Bluetooth COM ports found', reorder:'Order', group:'All pages', quickCommand:'Quick send', quickHint:'Send a custom command directly', lineEnding:'Line ending', noEnding:'None', lf:'LF', cr:'CR', crlf:'CRLF', emergencyPayload:'Emergency command', backup:'Backup', restore:'Restore backup', backupHint:'Export or restore pages, buttons, and settings as a JSON file.', exportHistory:'Export CSV', backupDone:'Backup file is ready', historyDone:'History exported', restoreDone:'Backup restored', invalidBackup:'Invalid backup file' }
};
const load = <T,>(key: string, fallback: T): T => { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) as T : fallback; } catch { return fallback; } };
const stamp = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

export default function App() {
  const [lang, setLang] = useState<Lang>(() => load<Lang>('amin-lang','fa'));
  const t = text[lang]; const rtl = lang === 'fa';
  const [pages, setPages] = useState<ControlPage[]>(() => load('amin-pages', initialPages));
  const [activePage, setActivePage] = useState('main');
  const [history, setHistory] = useState<Entry[]>(() => load('amin-history', initialHistory));
  const [emergencyCommand, setEmergencyCommand] = useState<string>(() => load('amin-emergency-command', 'STOP'));
  const [lineEnding, setLineEnding] = useState<'none'|'lf'|'cr'|'crlf'>(() => load<'none'|'lf'|'cr'|'crlf'>('amin-line-ending', 'none'));
  const [commandDraft, setCommandDraft] = useState('');
  const [currentView, setCurrentView] = useState<'dashboard'|'history'|'settings'>('dashboard');
  const [connected, setConnected] = useState(false);
  const [deviceName, setDeviceName] = useState('');
  const [devices, setDevices] = useState<BluetoothDevice[]>([]);
  const [modal, setModal] = useState<'devices'|'control'|'page'|null>(null);
  const [editing, setEditing] = useState<Control|null>(null);
  const [draft, setDraft] = useState<Control>({ id:'', name:'', payload:'', color:colors[0], icon:'⚡', size:'normal' });
  const [newPageName, setNewPageName] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');
  const [filter, setFilter] = useState('');
  const [mobileMenu, setMobileMenu] = useState(false);
  const [receivedCount, setReceivedCount] = useState(0);
  const active = pages.find(p => p.id === activePage) ?? pages[0];
  const allControls = useMemo(() => pages.flatMap(p => p.controls), [pages]);

  useEffect(() => { document.documentElement.lang = lang; document.documentElement.dir = rtl ? 'rtl' : 'ltr'; localStorage.setItem('amin-lang', JSON.stringify(lang)); }, [lang,rtl]);
  useEffect(() => { localStorage.setItem('amin-pages', JSON.stringify(pages)); }, [pages]);
  useEffect(() => { localStorage.setItem('amin-history', JSON.stringify(history.slice(0,400))); }, [history]);
  useEffect(() => { localStorage.setItem('amin-emergency-command', JSON.stringify(emergencyCommand)); }, [emergencyCommand]);
  useEffect(() => { localStorage.setItem('amin-line-ending', JSON.stringify(lineEnding)); }, [lineEnding]);
  const notify = useCallback((message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2600); }, []);
  const addEntry = useCallback((direction: Entry['direction'], payload: string, target = deviceName) => {
    setHistory(prev => [{ id: crypto.randomUUID(), direction, payload, target, time: new Date().toISOString() }, ...prev].slice(0,400));
    if (direction === 'received') setReceivedCount(n => n + 1);
  }, [deviceName]);
  useEffect(() => {
    const offData = bt.onData(({data}) => { if (data) addEntry('received', data); });
    const offStatus = bt.onStatus(({connected: state, message}) => { setConnected(state); if (!state) setDeviceName(''); if (message) notify(message); });
    return () => { offData(); offStatus(); };
  }, [addEntry,notify]);

  const openDevices = async () => {
    setModal('devices'); setBusy(true); setDevices([]);
    try { setDevices(await bt.devices()); }
    catch (err) { notify(err instanceof Error ? err.message : t.connectionError); }
    finally { setBusy(false); }
  };
  const scanDevices = async () => {
    setBusy(true); setDevices([]);
    try { setDevices(await bt.discover()); }
    catch (err) { notify(err instanceof Error ? err.message : t.connectionError); }
    finally { setBusy(false); }
  };
  const connect = async (device: BluetoothDevice) => {
    setBusy(true);
    try { const result = await bt.connect(device.address); setConnected(true); setDeviceName(result.name || device.name); setModal(null); notify(`${t.connectedTo} ${result.name || device.name}`); }
    catch (err) { notify(err instanceof Error ? err.message : t.connectionError); }
    finally { setBusy(false); }
  };
  const disconnect = async () => { try { await bt.disconnect(); setConnected(false); setDeviceName(''); } catch (e) { notify(e instanceof Error ? e.message : t.connectionError); } };
  const send = async (payload: string): Promise<boolean> => {
    if (!connected) { notify(t.noDevice); return false; }
    try { await bt.send(payload); addEntry('sent', payload); return true; }
    catch (err) { notify(err instanceof Error ? err.message : t.sendError); return false; }
  };
  const openNewControl = () => { setEditing(null); setDraft({ id:'', name:'', payload:'', color:colors[0], icon:'⚡', size:'normal' }); setModal('control'); };
  const openEditControl = (control: Control) => { setEditing(control); setDraft({...control}); setModal('control'); };
  const saveControl = (event: React.FormEvent) => {
    event.preventDefault(); if (!draft.name.trim() || !draft.payload.trim() || !active) return;
    const value = { ...draft, id: editing?.id ?? crypto.randomUUID(), name:draft.name.trim() };
    setPages(prev => prev.map(p => p.id !== active.id ? p : { ...p, controls: editing ? p.controls.map(c => c.id === editing.id ? value : c) : [...p.controls, value] })); setModal(null); notify(t.saved);
  };
  const deleteControl = (control: Control) => { if (window.confirm(t.confirmDelete)) setPages(prev => prev.map(p => ({...p, controls:p.controls.filter(c => c.id !== control.id)}))); };
  const moveControl = (index: number, offset: number) => { if (!active) return; const next = [...active.controls]; const target = index + offset; if (target < 0 || target >= next.length) return; [next[index],next[target]]=[next[target],next[index]]; setPages(prev => prev.map(p => p.id === active.id ? {...p,controls:next} : p)); };
  const createPage = (e: React.FormEvent) => { e.preventDefault(); const page = {id:crypto.randomUUID(),name:newPageName.trim() || `${lang==='fa'?'صفحه':'Page'} ${pages.length + 1}`,controls:[]}; setPages(prev => [...prev,page]); setActivePage(page.id); setNewPageName(''); setModal(null); };
  const deletePage = () => { if (pages.length <= 1 || !active) return; if (window.confirm(`${active.name}؟`)) { const next=pages.filter(p=>p.id!==active.id);setPages(next);setActivePage(next[0].id); } };
  const nav = (view: 'dashboard'|'history'|'settings') => { setCurrentView(view); setMobileMenu(false); };
  const formatTime = (iso:string) => new Date(iso).toLocaleTimeString(lang === 'fa' ? 'fa-IR' : 'en-US', {hour:'2-digit',minute:'2-digit'});
  const downloadText = (filename: string, content: string, type: string) => {
    const url = URL.createObjectURL(new Blob([content], {type})); const link = document.createElement('a');
    link.href = url; link.download = filename; document.body.appendChild(link); link.click(); link.remove(); window.setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  const exportHistoryCsv = () => {
    const quote = (value: string) => `"${value.replace(/"/g,'""')}"`;
    const rows = [['direction','command','device','timestamp'], ...history.map(item => [item.direction,item.payload,item.target,item.time])];
    downloadText('amin-command-history.csv', '\ufeff'+rows.map(row=>row.map(quote).join(',')).join('\r\n'), 'text/csv;charset=utf-8'); notify(t.historyDone);
  };
  const exportBackup = () => {
    const backup = { schemaVersion:1, exportedAt:new Date().toISOString(), lang, pages, history, settings:{emergencyCommand,lineEnding} };
    downloadText('amin-bluetooth-backup.json', JSON.stringify(backup,null,2), 'application/json'); notify(t.backupDone);
  };
  const restoreBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file=event.target.files?.[0]; if(!file) return;
    try {
      const data=JSON.parse(await file.text());
      if(data.schemaVersion!==1 || !Array.isArray(data.pages) || data.pages.length===0 || data.pages.some((p:any)=>typeof p.name!=='string'||!Array.isArray(p.controls))) throw new Error('invalid');
      const restoredPages=data.pages as ControlPage[]; setPages(restoredPages); setActivePage(restoredPages[0].id);
      if(Array.isArray(data.history)) setHistory(data.history.slice(0,400));
      if(data.settings?.emergencyCommand && typeof data.settings.emergencyCommand==='string') setEmergencyCommand(data.settings.emergencyCommand);
      if(['none','lf','cr','crlf'].includes(data.settings?.lineEnding)) setLineEnding(data.settings.lineEnding);
      if(data.lang==='fa'||data.lang==='en') setLang(data.lang);
      notify(t.restoreDone);
    } catch { notify(t.invalidBackup); }
    event.target.value='';
  };
  const sendQuickCommand = async (event: React.FormEvent) => {
    event.preventDefault(); if(!commandDraft.trim()) return;
    const suffix=lineEnding==='lf'?'\n':lineEnding==='cr'?'\r':lineEnding==='crlf'?'\r\n':'';
    if(await send(commandDraft+suffix)) setCommandDraft('');
  };

  return <div className={`app-shell ${rtl?'rtl':'ltr'}`}>
    <aside className={`sidebar ${mobileMenu?'show':''}`}>
      <div className="brand"><div className="brand-mark"><Bluetooth size={21}/></div><div><strong>AMIN<span>.</span></strong><small>BLUETOOTH CONTROL</small></div><button className="icon-btn close-mobile" onClick={()=>setMobileMenu(false)}><X size={18}/></button></div>
      <div className="side-label">{t.workspace}</div>
      <nav className="side-nav">
        <button className={currentView==='dashboard'?'selected':''} onClick={()=>nav('dashboard')}><House size={17}/>{t.dashboard}</button>
        <button className={currentView==='history'?'selected':''} onClick={()=>nav('history')}><History size={17}/>{t.history}<span className="nav-count">{history.length}</span></button>
        <div className="nav-separator"/><button className="nav-pages-title" onClick={()=>nav('dashboard')}><Grid2X2 size={17}/>{t.pages}<button className="mini-add" title={t.addPage} onClick={e=>{e.stopPropagation();setModal('page')}}><Plus size={15}/></button></button>
        <div className="page-list">{pages.map(page=><button key={page.id} className={`page-link ${activePage===page.id&&currentView==='dashboard'?'page-active':''}`} onClick={()=>{setActivePage(page.id);nav('dashboard')}}><span className="page-dot"/>{page.name}<span className="page-n">{page.controls.length}</span></button>)}</div>
        <div className="nav-separator"/><button className={currentView==='settings'?'selected':''} onClick={()=>nav('settings')}><Settings2 size={17}/>{t.settings}</button>
      </nav>
      <div className="side-bottom"><div className="side-status"><span className={`status-led ${connected?'on':''}`}/><div><b>{connected?t.connected:t.disconnected}</b><small>{connected?deviceName:t.offline}</small></div><span className="signal-icon"><Wifi size={16}/></span></div><div className="brand-footer">AMIN CONTROL <span>v1.1</span></div></div>
    </aside>

    <main className="main-area">
      <header className="topbar"><div className="topbar-title"><button className="icon-btn mobile-menu" onClick={()=>setMobileMenu(!mobileMenu)}><Menu size={20}/></button><div><div className="eyebrow"><span className="eyebrow-dot"/> {t.live}</div><h1>{currentView==='dashboard'?t.dashboard:currentView==='history'?t.history:t.settingsTitle}</h1></div></div><div className="topbar-actions"><button className="lang-btn" onClick={()=>setLang(lang==='fa'?'en':'fa')}><Languages size={16}/>{lang==='fa'?'EN':'فا'}</button><button className={`connection-button ${connected?'is-connected':''}`} onClick={connected?disconnect:openDevices}>{connected?<><BluetoothConnected size={16}/>{t.connected}<span className="button-dot"/></>:<><Bluetooth size={16}/>{t.connect}</>}</button><div className="avatar">A</div></div></header>
      <div className="content">
        {currentView==='dashboard' && <>
          <section className="welcome-row"><div><div className="date-label"><span className="tiny-pulse"/>{connected?t.online:t.offline}</div><h2>{t.controller}<span className="heading-period">.</span></h2><p>{t.tagline}</p></div><div className="welcome-chip"><Cpu size={16}/><span>HC-05 <i>/</i> HC-06</span></div></section>
          <section className="connection-card"><div className="connection-art"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className={`bluetooth-orb ${connected?'orb-live':''}`}><Bluetooth size={34}/><span className="orb-wave"/></div></div><div className="connection-copy"><div className="card-overline"><span className={`status-led ${connected?'on':''}`}/>{t.bluetooth}</div><h3>{connected?deviceName:t.disconnected}</h3><p>{connected?t.connectedTo+' '+deviceName:t.pairHint}</p></div><button className={`primary-action ${connected?'disconnect-action':''}`} onClick={connected?disconnect:openDevices}>{connected?<><BluetoothConnected size={17}/>{t.disconnected}</>:<><Bluetooth size={17}/>{t.connect}<ArrowLeft size={16}/></>}</button><div className="connection-meta"><span className="meta-icon"><Radio size={15}/></span><div><b>{connected?'SPP · RFCOMM':'SPP · Classic'}</b><small>{connected?'9600 baud':'HC-05 / HC-06'}</small></div><span className="meta-separator"/><span className={`meta-state ${connected?'state-on':''}`}><i/>{connected?t.connected:t.disconnected}</span></div></section>
          <section className="stats-row"><div className="stat-card"><div className="stat-icon icon-lime"><Command size={17}/></div><div><small>{t.commands}</small><strong>{history.filter(h=>h.direction==='sent').length.toLocaleString(lang==='fa'?'fa-IR':'en-US')}</strong></div><div className="stat-spark">{[9,15,12,21,16,27,20].map((n,i)=><i key={i} style={{height:n}}/>)}</div></div><div className="stat-card"><div className="stat-icon icon-blue"><MessageSquareText size={17}/></div><div><small>{t.received}</small><strong>{receivedCount.toLocaleString(lang==='fa'?'fa-IR':'en-US')}</strong></div><div className="receive-live"><span className="tiny-pulse"/> LIVE</div></div><div className="stat-card"><div className="stat-icon icon-purple"><Grid2X2 size={17}/></div><div><small>{t.controlTitle}</small><strong>{allControls.length.toLocaleString(lang==='fa'?'fa-IR':'en-US')}</strong></div><div className="stat-caption">{pages.length} {lang==='fa'?'صفحه':'pages'}</div></div></section>
          <div className="section-heading"><div><div className="section-kicker"><span className="section-line"/>{active?.name ?? t.controlTitle}</div><h3>{t.controlTitle}</h3><p>{t.controlHint}</p></div><div className="section-actions">{pages.length>1&&<button className="soft-button" onClick={deletePage}><Trash2 size={15}/></button>}<button className="soft-button" onClick={()=>setModal('page')}><Plus size={16}/>{t.addPage}</button><button className="add-button" onClick={openNewControl}><Plus size={17}/>{t.add}</button></div></div>
          <section className="controls-grid">{active?.controls.map((control,index)=><article key={control.id} className={`control-card size-${control.size}`} style={{'--control-color':control.color} as React.CSSProperties}><div className="control-top"><div className="control-glyph">{control.icon}</div><div className="control-utilities"><button aria-label={t.reorder} onClick={()=>moveControl(index,-1)} disabled={index===0}><ArrowUp size={14}/></button><button aria-label={t.reorder} onClick={()=>moveControl(index,1)} disabled={index===active.controls.length-1}><ArrowDown size={14}/></button><button aria-label={t.edit} onClick={()=>openEditControl(control)}><Edit2 size={14}/></button><button aria-label={t.delete} onClick={()=>deleteControl(control)}><Trash2 size={14}/></button></div></div><button className="control-send" onClick={()=>send(control.payload)}><span><b>{control.name}</b><small>{control.payload}</small></span><span className="send-circle"><ArrowLeft size={16}/></span></button><div className="control-accent"/></article>)}<button className="new-control-card" onClick={openNewControl}><span className="new-plus"><Plus size={20}/></span><b>{t.add}</b><small>{t.payload}</small></button></section>
          <div className="bottom-panels"><section className="panel serial-panel"><div className="panel-head"><div><span className="panel-icon"><Activity size={16}/></span><div><h3>{t.console}</h3><p>{t.consoleHint}</p></div></div><span className="live-tag"><i/> LIVE</span></div><div className="terminal"><div className="terminal-toolbar"><span/><span/><span/><i>Bluetooth SPP {connected?'· '+deviceName:'· --'}</i><Ellipsis size={16}/></div><div className={`terminal-body ${history.some(item=>item.direction==='received')?'has-lines':''}`}>{history.filter(item=>item.direction==='received').slice(0,4).reverse().map(item=><div className="terminal-line" key={item.id}><time>{formatTime(item.time)}</time><span className="terminal-prefix">RX</span><code>{item.payload}</code></div>)}{!history.some(item=>item.direction==='received')&&<div className="terminal-empty"><div className="terminal-wave"><span/><span/><span/><span/><span/><span/><span/></div><p>{connected?t.consoleHint:t.connectionRequired}</p><small>9600 baud <b>·</b> 8N1</small></div>}</div></div><form className="quick-command" onSubmit={sendQuickCommand}><input value={commandDraft} onChange={e=>setCommandDraft(e.target.value)} placeholder={t.quickHint} aria-label={t.quickCommand}/><select value={lineEnding} onChange={e=>setLineEnding(e.target.value as 'none'|'lf'|'cr'|'crlf')} aria-label={t.lineEnding}><option value="none">{t.noEnding}</option><option value="lf">LF</option><option value="cr">CR</option><option value="crlf">CRLF</option></select><button className="add-button" type="submit"><ArrowLeft size={14}/>{t.send}</button></form></section><section className="panel recent-panel"><div className="panel-head"><div><span className="panel-icon"><Clock3 size={16}/></span><div><h3>{t.history}</h3><p>{t.sent} · {history.length}</p></div></div><button className="text-link" onClick={()=>nav('history')}>{t.history}<ArrowLeft size={14}/></button></div><div className="recent-list">{history.slice(0,3).map(item=><div className="recent-item" key={item.id}><div className={`recent-mark ${item.direction}`}><Zap size={14}/></div><div className="recent-command"><b>{item.direction==='sent'?t.sent:t.received}</b><small>{item.target||'Bluetooth'}</small></div><code>{item.payload}</code><time>{formatTime(item.time)}</time></div>)}{history.length===0&&<div className="recent-empty"><Clock3 size={20}/><span>{t.noHistory}</span></div>}</div></section></div>
          <section className="emergency-bar"><div className="emergency-icon"><ShieldAlert size={19}/></div><div><b>{t.emergency}</b><small>{t.emergencyHint} <span>·</span> {emergencyCommand}</small></div><button disabled={!emergencyCommand.trim()} onClick={async()=>{if(await send(emergencyCommand))notify(t.emergencySent);}}><ShieldAlert size={16}/>{t.emergency}<ArrowLeft size={15}/></button></section>
        </>}
        {currentView==='history' && <section className="page-view"><div className="page-view-head"><div><div className="section-kicker"><span className="section-line"/>{t.live}</div><h2>{t.history}</h2><p>{t.consoleHint}</p></div><div className="section-actions"><button className="soft-button" onClick={exportHistoryCsv}><ListPlus size={15}/>{t.exportHistory}</button><button className="soft-button" onClick={()=>{setHistory([]);notify(t.clear)}}><Trash2 size={15}/>{t.clear}</button></div></div><div className="history-tools"><div className="search-field"><Search size={17}/><input placeholder={t.search} value={filter} onChange={e=>setFilter(e.target.value)}/></div><span>{history.length} {t.commands}</span></div><div className="history-table"><div className="history-table-head"><span>{t.payload}</span><span>{t.platform}</span><span>{t.sent}</span></div>{history.filter(item=>item.payload.toLowerCase().includes(filter.toLowerCase())||item.target.toLowerCase().includes(filter.toLowerCase())).map(item=><div className="history-row" key={item.id}><div className="history-payload"><span className={`history-dot ${item.direction}`}/><code>{item.payload}</code><small>{item.direction==='sent'?t.sent:t.received}</small></div><span>{item.target||'—'}</span><time>{new Date(item.time).toLocaleString(lang==='fa'?'fa-IR':'en-US')}</time></div>)}{history.length===0&&<div className="empty-table"><History size={23}/>{t.noHistory}</div>}{history.length>0&&history.filter(i=>i.payload.toLowerCase().includes(filter.toLowerCase())).length===0&&<div className="empty-table">{t.noMatches}</div>}</div></section>}
        {currentView==='settings' && <section className="page-view"><div className="page-view-head"><div><div className="section-kicker"><span className="section-line"/>{t.workspace}</div><h2>{t.settingsTitle}</h2><p>{t.saved}</p></div></div><div className="settings-grid"><article className="settings-card"><span className="settings-icon"><Languages size={18}/></span><div><h3>{t.language}</h3><p>{lang==='fa'?'فارسی':'English'}</p></div><button className="soft-button" onClick={()=>setLang(lang==='fa'?'en':'fa')}>{lang==='fa'?'English':'فارسی'}<ArrowLeft size={14}/></button></article><article className="settings-card"><span className="settings-icon"><Bluetooth size={18}/></span><div><h3>{t.bluetooth}</h3><p>{connected?deviceName:t.disconnected}</p></div><button className="soft-button" onClick={connected?disconnect:openDevices}>{connected?t.disconnected:t.connect}</button></article><article className="settings-card settings-emergency"><span className="settings-icon"><ShieldAlert size={18}/></span><div className="settings-detail"><h3>{t.emergencyPayload}</h3><p>{t.stopWarning}</p></div><input className="settings-inline-input" value={emergencyCommand} onChange={e=>setEmergencyCommand(e.target.value)} maxLength={64} aria-label={t.emergencyPayload}/></article><article className="settings-card settings-backup"><span className="settings-icon"><Command size={18}/></span><div className="settings-detail"><h3>{t.backup}</h3><p>{t.backupHint}</p></div><div className="settings-tools"><button className="soft-button" onClick={exportBackup}><ArrowDown size={14}/>{t.backup}</button><label className="soft-button" htmlFor="backup-import"><ArrowUp size={14}/>{t.restore}<input id="backup-import" type="file" accept="application/json,.json" onChange={restoreBackup}/></label></div></article><article className="settings-card settings-info"><span className="settings-icon"><Radio size={18}/></span><div><h3>{t.transport}</h3><p>{t.transportHint}</p><p>{platform==='android'?t.androidHint:platform==='windows'?t.windowsHint:t.preview}</p></div></article><article className="settings-card settings-info"><span className="settings-icon"><MessageSquareText size={18}/></span><div><h3>{t.receiveTitle}</h3><p>{t.receiveHint}</p></div></article><article className="settings-card settings-info warning-card"><span className="settings-icon"><CircleHelp size={18}/></span><div><h3>{t.emergency}</h3><p>{t.stopWarning}</p></div></article></div></section>}
        <footer className="app-footer"><span>AMIN BLUETOOTH CONTROL <i>·</i> 1.1.0</span><span>{t.tagline}</span></footer>
      </div>
    </main>

    {mobileMenu&&<div className="scrim" onClick={()=>setMobileMenu(false)}/>}
    {modal==='devices'&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setModal(null)}}><section className="modal device-modal"><div className="modal-head"><div><span className="modal-icon"><Bluetooth size={19}/></span><div><h3>{t.paired}</h3><p>{t.pick}</p></div></div><button className="icon-btn" onClick={()=>setModal(null)}><X size={19}/></button></div><div className="device-list">{busy?<div className="modal-loading"><LoaderCircle size={23}/><span>{t.scanBusy}</span></div>:devices.length===0?<div className="device-empty"><Bluetooth size={24}/><b>{t.emptyDevices}</b><p>{platform==='windows'?t.portEmpty:t.pairHint}</p></div>:devices.map(device=><button key={device.address} className="device-option" onClick={()=>connect(device)}><div className="device-icon"><Bluetooth size={18}/></div><div><b>{device.name||'Bluetooth device'}</b><small>{device.detail||device.address}</small></div><ArrowLeft size={16}/></button>)}</div><div className="modal-footer"><span><i/> {platform==='windows'?t.windows:platform==='android'?t.android:t.preview}</span><button className="soft-button" onClick={scanDevices} disabled={busy}>{busy?<LoaderCircle className="spin" size={15}/>:<Search size={15}/>} {t.refresh}</button></div></section></div>}
    {modal==='control'&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setModal(null)}}><form className="modal edit-modal" onSubmit={saveControl}><div className="modal-head"><div><span className="modal-icon"><SlidersHorizontal size={18}/></span><div><h3>{editing?t.editTitle:t.createTitle}</h3><p>{active?.name}</p></div></div><button type="button" className="icon-btn" onClick={()=>setModal(null)}><X size={19}/></button></div><label className="field-label">{t.name}<input autoFocus value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})} placeholder={lang==='fa'?'مثلاً چراغ اتاق':'e.g. Room light'} required maxLength={28}/></label><label className="field-label">{t.payload}<textarea value={draft.payload} onChange={e=>setDraft({...draft,payload:e.target.value})} placeholder="1" required maxLength={256} rows={3}/><small>{draft.payload.length} / 256 {t.bytes}</small></label><div className="field-label">{t.color}<div className="color-options">{colors.map(color=><button type="button" key={color} className={`color-option ${draft.color===color?'picked':''}`} style={{'--swatch':color} as React.CSSProperties} onClick={()=>setDraft({...draft,color})}>{draft.color===color&&<Check size={14}/>}</button>)}</div></div><div className="field-label">{t.icon}<div className="icon-options">{iconChoices.map(icon=><button type="button" key={icon} className={`icon-option ${draft.icon===icon?'picked':''}`} onClick={()=>setDraft({...draft,icon})}>{icon}</button>)}</div></div><div className="field-label">{t.size}<div className="size-options">{(['normal','wide','large'] as const).map(size=><button type="button" className={draft.size===size?'picked':''} key={size} onClick={()=>setDraft({...draft,size})}>{t[size]}</button>)}</div></div><div className="modal-actions"><button type="button" className="soft-button" onClick={()=>setModal(null)}>{t.cancel}</button><button className="add-button" type="submit"><Check size={16}/>{t.save}</button></div></form></div>}
    {modal==='page'&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setModal(null)}}><form className="modal page-modal" onSubmit={createPage}><div className="modal-head"><div><span className="modal-icon"><Grid2X2 size={18}/></span><div><h3>{t.addPage}</h3><p>{t.group}</p></div></div><button type="button" className="icon-btn" onClick={()=>setModal(null)}><X size={19}/></button></div><label className="field-label">{t.newPage}<input autoFocus value={newPageName} onChange={e=>setNewPageName(e.target.value)} placeholder={lang==='fa'?'مثلاً نورپردازی':'e.g. Lighting'} maxLength={30}/></label><div className="modal-actions"><button type="button" className="soft-button" onClick={()=>setModal(null)}>{t.cancel}</button><button className="add-button" type="submit"><Plus size={16}/>{t.makePage}</button></div></form></div>}
    {toast&&<div className="toast"><span><Check size={15}/></span>{toast}</div>}
  </div>;
}
