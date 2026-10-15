import { ChatSession } from './types';

const DB_NAME = 'astrachat_db';
const DB_VERSION = 1;
const STORE_NAME = 'chats';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this environment'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open database'));
  });
}

export async function getAllChats(): Promise<ChatSession[]> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const chats: ChatSession[] = request.result || [];
        // Sort newest first by updatedAt
        chats.sort((a, b) => b.updatedAt - a.updatedAt);
        resolve(chats);
      };

      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Error fetching chats from IndexedDB:', err);
    return [];
  }
}

export async function getChat(id: string): Promise<ChatSession | null> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Error getting chat:', err);
    return null;
  }
}

export async function saveChat(chat: ChatSession): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(chat);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Error saving chat to IndexedDB:', err);
    throw err;
  }
}

export async function deleteChat(id: string): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Error deleting chat from IndexedDB:', err);
    throw err;
  }
}

export async function deleteAllChats(): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Error clearing chats from IndexedDB:', err);
    throw err;
  }
}

export async function importChats(chats: ChatSession[]): Promise<number> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      let count = 0;

      transaction.oncomplete = () => resolve(count);
      transaction.onerror = () => reject(transaction.error);

      for (const chat of chats) {
        if (chat && chat.id && Array.isArray(chat.messages)) {
          store.put(chat);
          count++;
        }
      }
    });
  } catch (err) {
    console.error('Error importing chats:', err);
    throw err;
  }
}
