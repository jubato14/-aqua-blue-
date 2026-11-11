/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(
  // Remove /rest/v1/ suffix if it exists as standard setup expects root URL
  supabaseUrl ? supabaseUrl.replace(/\/rest\/v1\/?$/, '') : '',
  supabaseAnonKey || ''
);

export const isSupabaseConfigured = Boolean(supabaseUrl) && Boolean(supabaseAnonKey) && supabaseUrl.startsWith('http');
