    import { createClient } from '@supabase/supabase-js';

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://rmkwzkdjsrmvngyybmbr.supabase.co';
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

    if (!supabaseAnonKey) {
        console.error('Warning: Missing VITE_SUPABASE_ANON_KEY environment variable');
    }

    export const supabase = createClient(supabaseUrl, supabaseAnonKey);
