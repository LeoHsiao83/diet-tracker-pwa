import React, { useState, useEffect, useMemo, useRef, useLayoutEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import { 
  Utensils, Settings as SettingsIcon, TrendingUp, Activity, 
  Trash2, Heart, Camera, RefreshCw, ChevronDown, UserPlus, 
  Cloud, CloudOff, PieChart, Lock, LogOut
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

const DEFAULT_PROFILE = { height: 170, weight: 70, goalWeight: 65, age: 30, gender: 'male', activityFactor: 1.375 };
const MEAL_TAGS = ["早餐", "午餐", "晚餐", "下午茶", "點心", "消夜"];

const formatNum = (num) => {
  if (num === null || num === undefined || num === '') return 0;
  const n = parseFloat(num);
  return isNaN(n) ? 0 : Math.round(n * 100) / 100;
};
const getLocalISODate = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().split('T')[0];
};

const SafeVal = ({ val, suffix = '' }) => <span>{formatNum(val)}{suffix}</span>;
const ProgressBar = ({ current, max, color = "bg-progress-bar", label, showText = true, height = "h-2.5" }) => {
  const p = Math.min(100, Math.max(0, ((Number(current)||0) / (Number(max)||1)) * 100));
  return (
    <div className="mb-2">
      {showText && <div className="flex justify-between text-xs mb-1 text-gray-600"><span>{label}</span><span>{formatNum(current)}/{formatNum(max)}</span></div>}
      <div className={`w-full bg-gray-100 rounded-full ${height}`}><div className={`${color} ${height} rounded-full transition-all duration-500`} style={{ width: `${p}%` }}></div></div>
    </div>
  );
};

const WeightChart = ({ logs }) => {
  const containerRef = useRef(null);
  const data = useMemo(() => {
    return logs.filter(l => l.type === 'Weight')
      .map(l => ({ 
        date: new Date(l.date), 
        val: formatNum(l.calories || parseFloat(l.value)), 
        dateStr: new Date(l.date).toLocaleDateString(undefined, {month:'numeric', day:'numeric'})
      }))
      .filter(d => !isNaN(d.val) && d.val > 0)
      .sort((a, b) => a.date - b.date); 
  }, [logs]);

  useLayoutEffect(() => {
    if (containerRef.current) setTimeout(() => { if (containerRef.current) containerRef.current.scrollLeft = containerRef.current.scrollWidth; }, 100);
  }, [data]);

  if (data.length < 2) return <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-4 h-[250px] flex flex-col justify-center items-center text-gray-400"><TrendingUp size={32} className="mb-2 opacity-30"/><span className="text-sm">紀錄至少兩筆體重以顯示趨勢</span></div>;
  const minW = Math.min(...data.map(d=>d.val)), maxW = Math.max(...data.map(d=>d.val));

  return (
    <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-4">
      <h3 className="font-bold text-gray-700 mb-2 flex items-center gap-2 text-sm"><TrendingUp size={16}/> 體重趨勢</h3>
      <div ref={containerRef} className="overflow-x-auto no-scrollbar relative" style={{ scrollBehavior: 'smooth' }}>
        <div style={{ width: Math.max(data.length * 50, 300), height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f5" />
              <XAxis dataKey="dateStr" tick={{fontSize: 10, fill: '#9ca3af'}} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis domain={[minW-1, maxW+1]} tick={{fontSize: 10, fill: '#9ca3af'}} axisLine={false} tickLine={false} width={40} />
              <RechartsTooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
              <Line type="monotone" dataKey="val" stroke="#88c0a8" strokeWidth={3} dot={{r:4}} activeDot={{r:6}} animationDuration={1000} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

const NutritionHistoryChart = ({ logs, targets }) => {
  const containerRef = useRef(null);
  const dailyData = useMemo(() => {
    const groups = {};
    logs.filter(l => l.type !== 'Weight').forEach(l => {
      const d = new Date(l.date).toLocaleDateString(undefined, {month:'numeric', day:'numeric'});
      if (!groups[d]) groups[d] = { date: new Date(l.date), d, cal: 0, pro: 0 };
      groups[d].cal += (Number(l.calories)||0); groups[d].pro += (Number(l.protein)||0);
    });
    return Object.values(groups).sort((a, b) => a.date - b.date);
  }, [logs]);

  useLayoutEffect(() => { if (containerRef.current) setTimeout(() => { if (containerRef.current) containerRef.current.scrollLeft = containerRef.current.scrollWidth; }, 100); }, [dailyData]);
  if (dailyData.length === 0) return null;

  const chartHeight = 140, padding = 20, barWidth = 20, gap = 30, pointWidth = barWidth + gap, width = Math.max(300, dailyData.length * pointWidth + padding * 2);
  const getCalY = (v) => chartHeight - padding - (v / Math.max(targets.targetCalories * 1.2, ...dailyData.map(d => d.cal))) * (chartHeight - 2 * padding);
  const getProY = (v) => chartHeight - padding - (v / Math.max(targets.macros.protein * 1.2, ...dailyData.map(d => d.pro))) * (chartHeight - 2 * padding);

  return (
    <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-4 overflow-hidden">
      <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2 text-sm"><Activity size={16}/> 每日攝取統計</h3>
      <div ref={containerRef} className="overflow-x-auto no-scrollbar relative">
        <div style={{ width: width }}>
          <div className="mb-6">
            <div className="text-xs text-gray-500 mb-1 ml-2 font-bold">熱量</div>
            <svg width={width} height={chartHeight} className="block">
              <line x1="0" y1={getCalY(targets.targetCalories)} x2={width} y2={getCalY(targets.targetCalories)} stroke="#9ca3af" strokeWidth="1" strokeDasharray="4 2" />
              {dailyData.map((d, i) => <rect key={i} x={padding + i * pointWidth - barWidth/2} y={getCalY(d.cal)} width={barWidth} height={chartHeight - padding - getCalY(d.cal)} fill={d.cal <= targets.targetCalories ? "#88c0a8" : "#f87171"} rx="2" />)}
            </svg>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1 ml-2 font-bold">蛋白質</div>
            <svg width={width} height={chartHeight} className="block">
              <line x1="0" y1={getProY(targets.macros.protein)} x2={width} y2={getProY(targets.macros.protein)} stroke="#9ca3af" strokeWidth="1" strokeDasharray="4 2" />
              {dailyData.map((d, i) => {
                const x = padding + i * pointWidth, y = getProY(d.pro);
                return <g key={i}><rect x={x - barWidth/2} y={y} width={barWidth} height={chartHeight - padding - y} fill={d.pro >= targets.macros.protein ? "#60a5fa" : "#fbbf24"} rx="2" /><text x={x} y={chartHeight - 5} textAnchor="middle" fontSize="10" fill="#999">{d.d}</text></g>
              })}
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [isLocked, setIsLocked] = useState(true);
  const [pinInput, setPinInput] = useState('');
  
  // 🌟 新增 geminiKey 到設定狀態中
  const [config, setConfig] = useState({ gasUrl: '', geminiKey: '' });
  
  const [view, setView] = useState('dashboard');
  const [dashboardTab, setDashboardTab] = useState('today');
  const [notification, setNotification] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  
  const [userList, setUserList] = useState(() => { const saved = localStorage.getItem('app_user_list'); return saved ? JSON.parse(saved) : ['預設使用者']; });
  const [currentUser, setCurrentUser] = useState(() => { return localStorage.getItem('app_current_user') || '預設使用者'; });
  const [newUserParams, setNewUserParams] = useState('');
  
  const [logDate, setLogDate] = useState(getLocalISODate());
  const [mealForm, setMealForm] = useState({ name: '', calories: '', carbs: '', protein: '', fat: '', note: '', tag: '' });
  const [weightInput, setWeightInput] = useState('');
  const fileInputRef = useRef(null);

  const [expandedLogId, setExpandedLogId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterStartDate, setFilterStartDate] = useState('');
  const [isManageFavMode, setIsManageFavMode] = useState(false);
  const pageSize = 15;

  const allLogs = useLiveQuery(() => db.logs.where('userName').equals(currentUser).reverse().sortBy('date'), [currentUser]) || [];
  const profiles = useLiveQuery(() => db.profiles.toArray(), []) || [];
  const favorites = useLiveQuery(() => db.favorites.where('userName').equals(currentUser).toArray(), [currentUser]) || [];
  const syncQueueCount = useLiveQuery(() => db.syncQueue.count(), []) || 0;
  
  const currentProfile = profiles.find(p => p.userName === currentUser) || DEFAULT_PROFILE;
  const pendingCount = allLogs.filter(l => l.syncStatus === 0).length + favorites.filter(f => f.syncStatus === 0).length + syncQueueCount;

  const fLogs = useMemo(() => {
    let f = allLogs;
    if (filterStartDate) { const d = new Date(filterStartDate); d.setHours(23,59,59,999); f = f.filter(l => new Date(l.date) <= d); }
    return f;
  }, [allLogs, filterStartDate]);
  const currentLogs = fLogs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const tStats = useMemo(() => {
    const todayStr = getLocalISODate();
    return allLogs.filter(l => l.date.includes(todayStr) && l.type !== 'Weight')
      .reduce((a, c) => ({ calories: a.calories + c.calories, carbs: a.carbs + c.carbs, protein: a.protein + c.protein, fat: a.fat + c.fat }), { calories: 0, carbs: 0, protein: 0, fat: 0 });
  }, [allLogs]);

  const nTargets = useMemo(() => {
    const p = currentProfile;
    let bmr = (10 * p.weight) + (6.25 * p.height) - (5 * p.age) + (p.gender === 'male' ? 5 : -161);
    const tdee = Math.round(bmr * p.activityFactor);
    const target = Math.max(1200, tdee - 500);
    return { targetCalories: target, macros: { carbs: Math.round(target*0.4/4), protein: Math.round(target*0.3/4), fat: Math.round(target*0.3/9) } };
  }, [currentProfile]);

  useEffect(() => {
    const savedPin = localStorage.getItem('app_secure_pin');
    const savedGasUrl = localStorage.getItem('app_gas_url');
    const savedGeminiKey = localStorage.getItem('app_gemini_key'); // 讀取 API Key
    
    if (savedPin) setIsLocked(false);
    if (savedGasUrl || savedGeminiKey) {
      setConfig({ gasUrl: savedGasUrl || '', geminiKey: savedGeminiKey || '' });
    }
  }, []);

  const handleUnlock = () => {
    if (pinInput.trim() === '') return alert('請輸入密碼');
    localStorage.setItem('app_secure_pin', pinInput);
    setIsLocked(false);
  };

  const handleClearPin = async () => {
    if(!confirm("確定要登出並清除本地快取嗎？\n(未同步的資料將會遺失)")) return;
    localStorage.removeItem('app_secure_pin');
    setPinInput('');
    setIsLocked(true);
    await db.logs.clear();
    await db.favorites.clear();
    await db.profiles.clear();
    await db.syncQueue.clear();
    showNotification("已清除本地密碼與快取，請重新登入", "success");
  };

  const showNotification = (msg, type = "success") => { setNotification({ msg, type }); setTimeout(() => setNotification(null), 3000); };
  const handleUserChange = (newUser) => { setCurrentUser(newUser); localStorage.setItem('app_current_user', newUser); };

  // --- GAS 資料庫雙向同步邏輯 (維持不變) ---
  const handleSync = async () => {
    const gasUrl = localStorage.getItem('app_gas_url');
    const pin = localStorage.getItem('app_secure_pin');
    if (!gasUrl) return showNotification("請先至「設定」填寫 GAS 網址", "error");
    
    setIsSyncing(true);
    try {
      const queueItems = await db.syncQueue.toArray();
      if (queueItems.length > 0) {
        alert(`🚨 [偵測到刪除佇列]\n即將傳送 ${queueItems.length} 筆刪除任務到 GAS！`);
      }

      for (const item of queueItems) {
        const payload = { action: item.action, pin, ...item.payload };
        const res = await fetch(gasUrl, { method: 'POST', body: JSON.stringify(payload) });
        const result = await res.json();
        
        if (result.status === 'success' || result.message === 'Not found') { 
          await db.syncQueue.delete(item.id); 
          alert(`✅ [刪除成功] GAS 已執行刪除。\n項目: ${payload.Value || payload.name}`);
        } else {
          alert(`❌ [刪除失敗] GAS 發生錯誤:\n${JSON.stringify(result)}`);
        }
      }

      const pendingLogs = await db.logs.where('syncStatus').equals(0).toArray();
      for (const log of pendingLogs) {
        const payload = { action: 'addLog', pin, userName: log.userName, date: log.date.split('T')[0], type: log.type, itemName: log.value, calories: log.calories, carbs: log.carbs, protein: log.protein, fat: log.fat, note: log.note };
        const res = await fetch(gasUrl, { method: 'POST', body: JSON.stringify(payload) });
        if ((await res.json()).status === 'success') await db.logs.update(log.id, { syncStatus: 1 });
      }
      
      const pendingFavs = await db.favorites.where('syncStatus').equals(0).toArray();
      for (const fav of pendingFavs) {
        const payload = { action: 'addFavorite', pin, userName: fav.userName, itemName: fav.name, tag: fav.tag, calories: fav.calories, carbs: fav.carbs, protein: fav.protein, fat: fav.fat };
        const res = await fetch(gasUrl, { method: 'POST', body: JSON.stringify(payload) });
        if ((await res.json()).status === 'success') await db.favorites.update(fav.id, { syncStatus: 1 });
      }

      const pullRes = await fetch(`${gasUrl}?action=getLogs&userName=${encodeURIComponent(currentUser)}&pin=${pin}&page=1&pageSize=300`);
      const pullData = await pullRes.json();
      
      if (pullData.status === 'success') {
        const fetchedUsers = pullData.users || ['預設使用者'];
        setUserList(fetchedUsers); localStorage.setItem('app_user_list', JSON.stringify(fetchedUsers));
        if (currentUser === '預設使用者' && fetchedUsers.length > 1) {
          handleUserChange(fetchedUsers.find(u => u !== '預設使用者'));
          showNotification(`偵測到使用者，請再點一次同步！`, "success"); setIsSyncing(false); return; 
        }

        await db.logs.where('syncStatus').equals(1).delete();
        await db.logs.bulkAdd(pullData.data.map(item => ({ userName: currentUser, date: item.Date, type: item.Type, value: String(item.Value), calories: Number(item.Calories)||0, carbs: Number(item.Carbs)||0, protein: Number(item.Protein)||0, fat: Number(item.Fat)||0, note: item.Note||'', syncStatus: 1 })));
        
        await db.favorites.where('syncStatus').equals(1).delete();
        await db.favorites.bulkAdd((pullData.favorites||[]).map(item => ({ userName: currentUser, name: item.name, tag: item.tag, calories: Number(item.calories)||0, carbs: Number(item.carbs)||0, protein: Number(item.protein)||0, fat: Number(item.fat)||0, syncStatus: 1 })));

        if (pullData.profile && Object.keys(pullData.profile).length > 0) {
          await db.profiles.put({ userName: currentUser, ...pullData.profile, syncStatus: 1 });
        }
        showNotification("雲端同步完成！");
      }
    } catch (error) { 
      showNotification("同步異常: " + error.message, "error"); 
    } finally { setIsSyncing(false); }
  };

  const submitLog = async (type, data) => {
    const targetDate = logDate ? new Date(logDate + 'T12:00:00') : new Date();
    const logValue = type === 'Weight' ? data.value : (data.tag ? `[${data.tag}] ${data.name}` : data.name);
    await db.logs.add({ userName: currentUser, date: targetDate.toISOString(), type, value: String(logValue), calories: Number(data.calories||data.value)||0, carbs: Number(data.carbs)||0, protein: Number(data.protein)||0, fat: Number(data.fat)||0, note: data.note||'', syncStatus: 0 });
    if (type === 'Weight') await db.profiles.put({ ...currentProfile, userName: currentUser, weight: Number(data.value), syncStatus: 0 });
    
    showNotification("已記錄於本地"); setView('dashboard'); setMealForm({ name: '', calories: '', carbs: '', protein: '', fat: '', note: '', tag: '' }); setWeightInput('');
  };

  const deleteLogLocally = async (id) => {
    if(!confirm('確定要刪除這筆資料嗎？(將在下次同步時更新雲端)')) return;
    const logToDelete = await db.logs.get(id);
    
    if (logToDelete) {
      if (logToDelete.syncStatus === 1) {
        const parsedDate = logToDelete.date.split('T')[0];
        await db.syncQueue.add({
          action: 'deleteLog',
          payload: { userName: currentUser, Date: parsedDate, Value: logToDelete.value },
          timestamp: Date.now()
        });
        alert(`🗑️ 已記錄刪除任務！\n目標: ${logToDelete.value}\n日期: ${parsedDate}\n請點擊右上角「同步」按鈕來發送給雲端。`);
      }
      await db.logs.delete(id);
      showNotification("已從本地移除");
    }
  };

  const addToFavorites = async () => {
    if (!mealForm.name) return;
    await db.favorites.add({ userName: currentUser, name: mealForm.name, tag: mealForm.tag, calories: Number(mealForm.calories), carbs: Number(mealForm.carbs), protein: Number(mealForm.protein), fat: Number(mealForm.fat), syncStatus: 0 });
    showNotification("已加入常用清單");
  };

  const deleteFavorite = async (id, name) => {
    if(!confirm(`移除常用: ${name}?`)) return;
    const favToDelete = await db.favorites.get(id);
    if (favToDelete) {
      if (favToDelete.syncStatus === 1) {
        await db.syncQueue.add({ action: 'deleteFavorite', payload: { userName: currentUser, name: favToDelete.name }, timestamp: Date.now() });
      }
      await db.favorites.delete(id);
      showNotification("已移除常用");
    }
  };

  const saveProfile = async (p) => {
    await db.profiles.put({ ...p, userName: currentUser, syncStatus: 0 });
    showNotification("個人資料已更新");
  };

// 🚀 全新前端直連架構：直接用手機呼叫 Gemini API (防廢話強化版)
  const handleImageAnalysis = async (e, type) => {
    const geminiKey = localStorage.getItem('app_gemini_key');
    if(!geminiKey) return showNotification("請先至設定填寫 Gemini API Key", "error");

    const file = e.target.files[0]; 
    if (!file) return;

    e.target.value = ''; 
    setAnalyzing(true);

    const reader = new FileReader(); 
    reader.readAsDataURL(file);
    reader.onloadend = async () => {
      const base64 = reader.result.split(',')[1];
      
      // 🛑 防護 1：嚴格限制 AI 的輸出格式，禁止任何問候語
      const prompt = type === 'meal' 
        ? "請擔任專業營養師。你的任務是計算圖片中『所有食物』的總營養成分，無論是否有營養標示。1. 有標示：讀取數值。若寫『本包裝含X份』請將每份數值乘X。2. 無標示(如茶葉蛋)：估算數值。3. 最終加總。⚠️ 警告：請絕對只輸出純 JSON 格式，嚴禁包含任何問候語、解釋或 Markdown 標記。格式範例：{\"name\": \"食物A+食物B\", \"calories\": 100, \"carbs\": 10, \"protein\": 10, \"fat\": 10, \"note\": \"計算細節\"}"
        : "辨識體重計數字。⚠️ 警告：只輸出純 JSON 格式，嚴禁其他文字。格式：{\"weight\": 0.0}";

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }, { inline_data: { mimeType: file.type, data: base64 } }] }]
          })
        });

        if (!response.ok) {
           const errData = await response.json();
           throw new Error(`伺服器錯誤: ${errData.error?.message || response.status}`);
        }

        const data = await response.json();
        
        if (data.candidates && data.candidates[0].content) {
          const aiText = data.candidates[0].content.parts[0].text;
          
          // 🛑 防護 2：使用正規表達式，精準挖出大括號 { } 裡面的內容，無視其他廢話
          const match = aiText.match(/\{[\s\S]*\}/);
          if (!match) throw new Error("找不到有效的 JSON 資料");
          
          const jsonText = match[0];
          const json = JSON.parse(jsonText);
          
          if(type==='meal') {
             setMealForm(p=>({...p, ...json, name: json.name||"未命名", calories:json.calories||0}));
          } else if(json.weight) {
             setWeightInput(json.weight);
          }
          
          showNotification(`AI 分析完成`);
        } else {
          alert("❌ AI 辨識失敗：回傳格式異常");
        }
      } catch(e) { 
        console.error(e);
        alert("🚨 AI 處理錯誤：" + e.message);
      } finally {
        setAnalyzing(false);
      }
    };
  };

  if (isLocked) {
    return (
      <div className="min-h-screen bg-[#f0f7f4] flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm text-center animate-fade-in">
          <div className="bg-theme-main w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-white"><Lock size={32} /></div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">飲控賽巴斯欽</h2>
          <p className="text-gray-500 text-sm mb-6">離線優先・極速存取</p>
          <input type="password" value={pinInput} onChange={e => setPinInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleUnlock()} placeholder="請輸入系統 PIN 碼" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl mb-4 text-center tracking-widest text-lg focus:outline-none focus:border-theme-main"/>
          <button onClick={handleUnlock} className="w-full py-3 bg-theme-main text-white font-bold rounded-xl shadow hover:bg-theme-hover transition-colors mb-4">解鎖進入</button>
          <button onClick={handleClearPin} className="text-xs text-gray-400 hover:text-red-500 underline flex items-center justify-center gap-1 w-full"><LogOut size={12} /> 清除已記憶的密碼與快取</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto min-h-screen pb-10 relative">
      <div className="flex justify-between items-center p-6 pb-2">
        <div className="flex items-center gap-2"><div className="bg-theme-main p-2 rounded-lg text-white"><Utensils size={20}/></div><span className="font-bold text-gray-800">賽巴斯欽 PWA</span></div>
        <div className="flex gap-3 items-center">
          <button onClick={handleSync} disabled={isSyncing} className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-full font-bold transition-all ${isSyncing ? 'bg-gray-100 text-gray-400' : pendingCount > 0 ? 'bg-yellow-100 text-yellow-700 shadow-sm' : 'bg-green-50 text-green-600'}`}>
            {isSyncing ? <RefreshCw size={14} className="animate-spin" /> : pendingCount > 0 ? <CloudOff size={14}/> : <Cloud size={14}/>}
            {isSyncing ? '同步中...' : pendingCount > 0 ? `${pendingCount} 筆待處理` : '已同步'}
          </button>
          <button onClick={() => setView('settings')} className="text-gray-400 hover:text-gray-600"><SettingsIcon size={24}/></button>
          <button onClick={handleClearPin} className="text-gray-400 hover:text-red-500 ml-1" title="登出 / 清除快取"><LogOut size={22}/></button>
        </div>
      </div>

      <div className="p-4 pt-0">
        {view === 'dashboard' && (
          <div className="space-y-4 animate-fade-in">
            <div className="gradient-theme text-white p-6 rounded-2xl shadow-lg sticky top-0 z-10">
              <div className="flex justify-between items-start">
                <div><h2 className="text-2xl font-bold mb-1">概況 ({currentUser})</h2><p className="text-white text-opacity-80 text-sm">目標: <SafeVal val={currentProfile.goalWeight}/>kg (目前: <SafeVal val={currentProfile.weight}/>kg)</p></div>
                <div className="text-right"><div className="text-3xl font-bold"><SafeVal val={Math.max(0, formatNum(nTargets.targetCalories - tStats.calories))}/></div><div className="text-xs text-white text-opacity-80">剩餘 (kcal)</div></div>
              </div>
            </div>

            <div className="flex bg-white rounded-xl p-1 shadow-sm border border-gray-100">
              {['today', 'history', 'record'].map(t => (<button key={t} onClick={() => setDashboardTab(t)} className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${dashboardTab === t ? 'bg-theme-main text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}>{t === 'today' ? '今日狀態' : t === 'history' ? '歷史數據' : '新增紀錄'}</button>))}
            </div>

            {dashboardTab === 'today' && (
              <div className="animate-fade-in space-y-4">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100"><h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2 text-sm"><Utensils size={16}/> 今日剩餘額度 (預算)</h3><div className="grid grid-cols-3 gap-2 text-center text-xs"><div className="bg-gray-50 p-3 rounded"><div className="text-gray-500 mb-1">蛋白質餘額</div><div className={`font-bold text-lg ${(nTargets.macros.protein - tStats.protein) < 0 ? 'text-red-500' : 'text-blue-500'}`}>{formatNum(nTargets.macros.protein - tStats.protein)}g</div></div><div className="bg-gray-50 p-3 rounded"><div className="text-gray-500 mb-1">碳水餘額</div><div className={`font-bold text-lg ${(nTargets.macros.carbs - tStats.carbs) < 0 ? 'text-red-500' : 'text-yellow-600'}`}>{formatNum(nTargets.macros.carbs - tStats.carbs)}g</div></div><div className="bg-gray-50 p-3 rounded"><div className="text-gray-500 mb-1">脂肪餘額</div><div className={`font-bold text-lg ${(nTargets.macros.fat - tStats.fat) < 0 ? 'text-red-500' : 'text-red-500'}`}>{formatNum(nTargets.macros.fat - tStats.fat)}g</div></div></div></div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100"><h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2"><PieChart size={20}/> 攝取進度</h3><ProgressBar current={tStats.calories} max={nTargets.targetCalories} label="熱量 (Kcal)" color={tStats.calories>nTargets.targetCalories?"bg-red-400":"bg-progress-bar"} height="h-3"/><div className="mt-4 space-y-3"><ProgressBar current={tStats.protein} max={nTargets.macros.protein} label="蛋白質 (g)" color="bg-blue-400" height="h-2"/><ProgressBar current={tStats.carbs} max={nTargets.macros.carbs} label="碳水化合物 (g)" color="bg-yellow-400" height="h-2"/><ProgressBar current={tStats.fat} max={nTargets.macros.fat} label="脂肪 (g)" color="bg-red-400" height="h-2"/></div></div>
              </div>
            )}

            {dashboardTab === 'history' && (
              <div className="animate-fade-in space-y-4">
                <WeightChart logs={allLogs} />
                <NutritionHistoryChart logs={allLogs} targets={nTargets} />
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  <div className="flex justify-between items-center mb-4"><div className="flex items-baseline gap-2"><h3 className="font-bold text-gray-700">最近紀錄</h3><span className="text-xs text-gray-400">({fLogs.length}筆)</span></div><div className="flex items-center gap-2"><span className="text-xs text-gray-500">篩選</span><input type="date" value={filterStartDate} onChange={e=>{setFilterStartDate(e.target.value);setCurrentPage(1)}} className="text-xs border rounded p-1"/></div></div>
                  <div className="space-y-3">
                    {currentLogs.map((l, i) => (
                      <div key={l.id} className={`border rounded-lg p-3 text-sm transition-all ${l.type!=='Weight'?'hover:bg-gray-50 cursor-pointer':''} ${expandedLogId===i?'bg-gray-50 border-theme-main':''}`} onClick={()=>l.type!=='Weight'&&setExpandedLogId(expandedLogId===i?null:i)}>
                        <div className="flex justify-between items-center">
                          <div><div className="font-medium flex items-center gap-1">{l.syncStatus === 0 && <span className="w-2 h-2 rounded-full bg-yellow-400"></span>}{l.type!=='Weight' ? l.value : `${formatNum(l.calories || l.value)} kg`}</div><div className="text-xs text-gray-400">{new Date(l.date).toLocaleDateString()}</div></div>
                          <div className="flex items-center gap-3">{l.type!=='Weight'&&<span className="text-xs text-gray-600 font-bold">{formatNum(l.calories)} kcal</span>}{l.type!=='Weight' && <ChevronDown size={16} className={`transition-transform ${expandedLogId===i?'rotate-180':''}`}/>}<button onClick={(e) => { e.stopPropagation(); deleteLogLocally(l.id); }} className="text-gray-300 hover:text-red-500 p-1"><Trash2 size={16}/></button></div>
                        </div>
                        {expandedLogId===i && l.type!=='Weight' && (
                          <div className="mt-3 pt-3 border-t border-gray-200 animate-fade-in">
                            <div className="grid grid-cols-3 gap-2 mb-2"><div className="bg-white p-2 rounded text-center border border-gray-100"><div className="text-[10px] text-gray-500">蛋白質</div><div className="font-bold text-blue-600">{formatNum(l.protein)}g</div></div><div className="bg-white p-2 rounded text-center border border-gray-100"><div className="text-[10px] text-gray-500">碳水</div><div className="font-bold text-yellow-600">{formatNum(l.carbs)}g</div></div><div className="bg-white p-2 rounded text-center border border-gray-100"><div className="text-[10px] text-gray-500">脂肪</div><div className="font-bold text-red-500">{formatNum(l.fat)}g</div></div></div>
                            {l.note && <div className="text-xs text-gray-500 bg-yellow-50 p-2 rounded">備註: {l.note}</div>}
                          </div>
                        )}
                      </div>
                    ))}
                    {fLogs.length===0 && <div className="text-center text-gray-400 py-4">無紀錄</div>}
                    {fLogs.length>0 && (
                      <div className="flex justify-between items-center mt-4">
                        <button onClick={()=>setCurrentPage(p=>Math.max(1,p-1))} disabled={currentPage===1} className="px-3 py-1 bg-gray-100 rounded text-xs">上一頁</button>
                        <span className="text-xs text-gray-500">{currentPage} / {Math.ceil(fLogs.length / pageSize)}</span>
                        <button onClick={()=>setCurrentPage(p=>Math.min(Math.ceil(fLogs.length / pageSize), p+1))} disabled={currentPage*pageSize >= fLogs.length} className="px-3 py-1 bg-gray-100 rounded text-xs">下一頁</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {dashboardTab === 'record' && (
              <div className="grid grid-cols-1 gap-4 animate-fade-in">
                <button onClick={() => setView('addMeal')} className="bg-white p-6 rounded-2xl shadow-sm hover:border-theme-main border border-gray-100 flex flex-col items-center justify-center gap-3 h-40"><div className="bg-gray-50 p-4 rounded-full text-theme-main"><Utensils size={32}/></div><span className="text-lg font-medium">紀錄飲食</span><span className="text-xs text-gray-400">拍照、常用或手動輸入</span></button>
                <button onClick={() => setView('addWeight')} className="bg-white p-6 rounded-2xl shadow-sm hover:border-blue-300 border border-gray-100 flex flex-col items-center justify-center gap-3 h-40"><div className="bg-blue-50 p-4 rounded-full text-blue-400"><RefreshCw size={32}/></div><span className="text-lg font-medium">紀錄體重</span><span className="text-xs text-gray-400">追蹤體重變化趨勢</span></button>
              </div>
            )}
          </div>
        )}

        {view === 'addMeal' && (
          <div className="bg-white min-h-[400px] rounded-2xl shadow-lg p-6 relative animate-fade-in">
            <button onClick={() => setView('dashboard')} className="absolute top-4 left-4 text-gray-400"><ChevronDown className="rotate-90"/></button>
            <h2 className="text-xl font-bold text-center mb-6">紀錄飲食</h2>
            
            <div className="mb-4"><label className="text-xs text-gray-500 mb-1 block">日期</label><input type="date" value={logDate} onChange={e=>setLogDate(e.target.value)} className="w-full p-2 bg-gray-50 rounded border border-gray-200 focus:outline-none"/></div>
            
            <div className="mb-6"><input type="file" className="hidden" ref={fileInputRef} onChange={e=>handleImageAnalysis(e,'meal')}/><button onClick={()=>fileInputRef.current.click()} disabled={analyzing} className="w-full py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl shadow flex justify-center items-center gap-2">{analyzing?'AI 分析中...':<><Camera/> 拍照辨識</>}</button></div>
            
            <div className="mb-6"><div className="flex justify-between items-center mb-2"><label className="text-xs text-gray-500 font-bold">常用清單</label><button onClick={()=>setIsManageFavMode(!isManageFavMode)} className={`text-xs px-2 py-1 rounded ${isManageFavMode ? 'bg-red-100 text-red-500' : 'text-gray-400 bg-gray-100'}`}>{isManageFavMode ? '完成管理' : '管理'}</button></div><div className="flex gap-2 flex-wrap max-h-32 overflow-y-auto">{favorites.length === 0 && <span className="text-xs text-gray-300">無紀錄</span>}{favorites.map((fav, idx) => (<div key={idx} className="relative group"><button onClick={() => !isManageFavMode && setMealForm({ name: fav.name, calories: fav.calories, carbs: fav.carbs, protein: fav.protein, fat: fav.fat, note: '', tag: fav.tag })} className={`px-3 py-1 rounded-full text-xs border ${isManageFavMode ? 'border-red-200 bg-red-50 text-red-400' : 'border-theme-main text-theme-main bg-white hover:bg-green-50'}`}>{fav.name}</button>{isManageFavMode && (<button onClick={()=>deleteFavorite(fav.id, fav.name)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 w-4 h-4 flex items-center justify-center text-[10px]">×</button>)}</div>))}</div></div>

            <div className="space-y-4">
              <div><label className="text-xs text-gray-500">餐點類型</label><div className="flex gap-2 flex-wrap">{MEAL_TAGS.map(t=><button key={t} onClick={()=>setMealForm(p=>({...p,tag:p.tag===t?'':t}))} className={`px-3 py-1 rounded-full text-xs ${mealForm.tag===t?'bg-theme-main text-white':'bg-gray-100'}`}>{t}</button>)}</div></div>
              <div><label className="text-xs text-gray-500 mb-1 block">食物名稱</label><input type="text" value={mealForm.name} onChange={e=>setMealForm({...mealForm,name:e.target.value})} className="w-full p-3 bg-gray-50 rounded focus:outline-none" placeholder="例如: 雞腿便當"/></div>
              <div className="grid grid-cols-2 gap-4"><div><label className="text-xs text-gray-500 mb-1 block">熱量 (kcal)</label><input type="number" value={mealForm.calories} onChange={e=>setMealForm({...mealForm,calories:e.target.value})} className="p-3 bg-gray-50 rounded w-full focus:outline-none" placeholder="0"/></div><div><label className="text-xs text-gray-500 mb-1 block">碳水 (g)</label><input type="number" value={mealForm.carbs} onChange={e=>setMealForm({...mealForm,carbs:e.target.value})} className="p-3 bg-gray-50 rounded w-full focus:outline-none" placeholder="0"/></div><div><label className="text-xs text-gray-500 mb-1 block">蛋白質 (g)</label><input type="number" value={mealForm.protein} onChange={e=>setMealForm({...mealForm,protein:e.target.value})} className="p-3 bg-gray-50 rounded w-full focus:outline-none" placeholder="0"/></div><div><label className="text-xs text-gray-500 mb-1 block">脂肪 (g)</label><input type="number" value={mealForm.fat} onChange={e=>setMealForm({...mealForm,fat:e.target.value})} className="p-3 bg-gray-50 rounded w-full focus:outline-none" placeholder="0"/></div></div>
              {mealForm.note && <div className="bg-yellow-50 p-3 rounded text-xs text-yellow-800">{mealForm.note}</div>}
              <div className="flex gap-3"><button onClick={addToFavorites} className="px-4 py-3 bg-gray-200 text-gray-600 rounded-xl font-bold whitespace-nowrap flex items-center gap-1"><Heart size={16}/> 加入常用</button><button onClick={()=>submitLog('Meal', mealForm)} className="flex-1 py-3 bg-theme-main text-white rounded-xl shadow font-bold">確認紀錄</button></div>
            </div>
          </div>
        )}

        {view === 'addWeight' && (
          <div className="bg-white min-h-[400px] rounded-2xl shadow-lg p-6 relative animate-fade-in">
            <button onClick={() => setView('dashboard')} className="absolute top-4 left-4 text-gray-400"><ChevronDown className="rotate-90"/></button>
            <h2 className="text-xl font-bold text-center mb-6">紀錄體重</h2>
            <div className="mb-4"><label className="text-xs text-gray-500 mb-1 block">日期</label><input type="date" value={logDate} onChange={e=>setLogDate(e.target.value)} className="w-full p-2 bg-gray-50 rounded border border-gray-200"/></div>
            <div className="mb-6"><input type="file" className="hidden" ref={fileInputRef} onChange={e=>handleImageAnalysis(e,'weight')}/><button onClick={()=>fileInputRef.current.click()} disabled={analyzing} className="w-full py-3 bg-blue-50 text-blue-500 rounded-xl border border-blue-200 flex justify-center items-center gap-2">{analyzing?'AI 讀取中...':'📸 拍照辨識'}</button></div>
            <div className="text-center py-8"><input type="number" value={weightInput} onChange={e=>setWeightInput(e.target.value)} placeholder="0.0" className="text-6xl font-bold text-center w-full border-none focus:outline-none"/><div className="text-gray-400 mt-2">kg</div></div>
            <button onClick={()=>submitLog('Weight', {value: weightInput})} className="w-full py-3 rounded-xl shadow font-bold bg-blue-500 text-white">更新體重</button>
          </div>
        )}

        {view === 'settings' && (
          <div className="bg-white min-h-[400px] rounded-2xl shadow-lg p-6 relative animate-fade-in">
            <button onClick={() => setView('dashboard')} className="absolute top-4 left-4 text-gray-400"><ChevronDown className="rotate-90"/></button>
            <h2 className="text-xl font-bold text-center mb-6">系統設定</h2>
            
            <div className="space-y-6">
              <div className="border-b pb-4"><h3 className="font-bold text-sm text-gray-700 mb-3 flex items-center gap-2"><UserPlus size={16}/> 使用者管理</h3><div className="space-y-3 bg-gray-50 p-3 rounded"><div className="flex gap-2"><select value={currentUser} onChange={e=>handleUserChange(e.target.value)} className="w-full p-2 bg-white rounded text-sm focus:outline-none">{userList.map(u=><option key={u} value={u}>{u}</option>)}</select></div><div className="flex gap-2"><input type="text" placeholder="新名字..." value={newUserParams} onChange={e=>setNewUserParams(e.target.value)} className="w-full p-2 bg-white rounded text-sm focus:outline-none"/><button onClick={()=>{if(newUserParams){setUserList(p=>[...p,newUserParams]); handleUserChange(newUserParams); setNewUserParams('');}}} className="px-3 bg-theme-main text-white rounded text-xs flex items-center gap-1 whitespace-nowrap"><UserPlus size={12}/> 新增</button></div></div></div>
              
              <div className="border-b pb-4">
                <h3 className="font-bold text-sm text-gray-700 mb-3 flex items-center gap-2"><Cloud size={16}/> 雲端連線設定</h3>
                
                <label className="text-xs text-gray-500 mb-1 block">GAS 雲端資料庫網址</label>
                <input type="text" value={config.gasUrl} onChange={e=>setConfig({...config, gasUrl: e.target.value})} className="w-full p-2 bg-gray-50 rounded text-xs mb-3 focus:outline-none" placeholder="https://script.google.com/macros/s/..."/>
                
                <label className="text-xs text-gray-500 mb-1 block">Gemini API 金鑰 (僅儲存於本機)</label>
                <input type="password" value={config.geminiKey} onChange={e=>setConfig({...config, geminiKey: e.target.value})} className="w-full p-2 bg-gray-50 rounded text-xs mb-3 focus:outline-none" placeholder="AIzaSy..."/>
                
                <button onClick={()=>{
                  localStorage.setItem('app_gas_url', config.gasUrl);
                  localStorage.setItem('app_gemini_key', config.geminiKey);
                  showNotification("設定已儲存");
                }} className="w-full py-2 bg-gray-800 text-white rounded text-xs font-bold">儲存設定</button>
              </div>

              <div>
                <h3 className="font-bold text-sm text-gray-700 mb-3">個人資料 ({currentUser})</h3>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div><label className="text-xs text-gray-500 mb-1 block">身高 (cm)</label><input type="number" value={currentProfile.height} onChange={e=>saveProfile({...currentProfile, height: Number(e.target.value)})} className="w-full p-2 bg-gray-50 rounded focus:outline-none"/></div>
                  <div><label className="text-xs text-gray-500 mb-1 block">年齡</label><input type="number" value={currentProfile.age} onChange={e=>saveProfile({...currentProfile, age: Number(e.target.value)})} className="w-full p-2 bg-gray-50 rounded focus:outline-none"/></div>
                  <div><label className="text-xs text-gray-500 mb-1 block">目前體重 (kg)</label><input type="number" value={currentProfile.weight} onChange={e=>saveProfile({...currentProfile, weight: Number(e.target.value)})} className="w-full p-2 bg-gray-50 rounded border-2 border-theme-main focus:outline-none"/></div>
                  <div><label className="text-xs text-gray-500 mb-1 block">目標體重 (kg)</label><input type="number" value={currentProfile.goalWeight} onChange={e=>saveProfile({...currentProfile, goalWeight: Number(e.target.value)})} className="w-full p-2 bg-gray-50 rounded focus:outline-none"/></div>
                  <div><label className="text-xs text-gray-500 mb-1 block">性別</label><select value={currentProfile.gender} onChange={e=>saveProfile({...currentProfile, gender: e.target.value})} className="w-full p-2 bg-gray-50 rounded focus:outline-none"><option value="male">男</option><option value="female">女</option></select></div>
                </div>
                <div><label className="text-xs text-gray-500 mb-1 block">活動量</label><select value={currentProfile.activityFactor} onChange={e=>saveProfile({...currentProfile, activityFactor: Number(e.target.value)})} className="w-full p-2 bg-gray-50 rounded mb-3 focus:outline-none"><option value="1.2">久坐 (1.2)</option><option value="1.375">輕度 (1.375)</option><option value="1.55">中度 (1.55)</option><option value="1.725">高度 (1.725)</option></select></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {notification && (
        <div className={`fixed bottom-4 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-full shadow-xl text-white text-sm font-bold z-50 ${notification.type === 'error' ? 'bg-red-500' : 'bg-gray-800'}`}>
          {notification.msg}
        </div>
      )}
    </div>
  );
}
