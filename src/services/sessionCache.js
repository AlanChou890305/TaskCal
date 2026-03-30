import { supabase } from "./supabaseClient";

/**
 * 共享的 session promise，避免多個 hook 各自呼叫 getSession()
 * getSession() 在 native 是 local keychain 讀取（快），但仍然是 async，
 * 共享 promise 避免重複的 async 開銷
 */
let cachedSessionPromise = null;

export const getSharedSession = () => {
  if (!cachedSessionPromise) {
    cachedSessionPromise = supabase.auth.getSession().then(({ data }) => {
      return data?.session || null;
    });
  }
  return cachedSessionPromise;
};

export const clearSessionCache = () => {
  cachedSessionPromise = null;
};
