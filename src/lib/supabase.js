import { createClient } from '@supabase/supabase-js'
import { Platform } from 'react-native'
import 'react-native-url-polyfill/auto'

const supabaseUrl = 'https://anklywcqejajskvmwuxv.supabase.co'
const supabaseKey = 'sb_publishable_tRuKY8SCC6Iuvk-xN_BETQ_Gc-7tzL6'

const getStorage = async () => {
  if (Platform.OS === 'web') return undefined;
  const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
  return AsyncStorage;
};

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: Platform.OS === 'web' ? undefined : require('@react-native-async-storage/async-storage').default,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})