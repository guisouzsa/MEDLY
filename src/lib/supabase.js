import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'
import 'react-native-url-polyfill/auto'

const supabaseUrl = 'https://anklywcqejajskvmwuxv.supabase.co'
const supabaseKey = 'sb_publishable_tRuKY8SCC6Iuvk-xN_BETQ_Gc-7tzL6'

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})