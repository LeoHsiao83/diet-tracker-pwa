// src/db.js
import Dexie from 'dexie';

// 建立本地資料庫實體 (只能宣告一次)
export const db = new Dexie('DietTrackerDB');

// 🛑 版本升級為 2，確保建立 syncQueue 表格
db.version(2).stores({
  logs: '++id, [userName+date], userName, date, type, syncStatus',
  favorites: '++id, [userName+name], userName, name, tag, syncStatus',
  profiles: 'userName, syncStatus',
  syncQueue: '++id, timestamp'
});

// 資料庫初始化的輔助函數
export const initDB = async () => {
  try {
    await db.open();
    console.log('✅ 本地資料庫 Dexie.js 已成功啟動 (v2)');
  } catch (err) {
    console.error('❌ 資料庫啟動失敗:', err);
  }
};