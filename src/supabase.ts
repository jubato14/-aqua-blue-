/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

const rawUrl = import.meta.env.VITE_SUPABASE_URL;
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(rawUrl) && Boolean(rawKey) && typeof rawUrl === 'string' && rawUrl.startsWith('http');

const validUrl = isSupabaseConfigured ? rawUrl.replace(/\/rest\/v1\/?$/, '') : 'https://placeholder.supabase.co';
const validKey = isSupabaseConfigured ? rawKey : 'placeholder-anon-key';

export const supabase = createClient(validUrl, validKey);

