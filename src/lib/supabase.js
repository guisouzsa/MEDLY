import * as Crypto from 'expo-crypto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'
import { Platform } from 'react-native'
import 'react-native-url-polyfill/auto'

// Polyfill global para crypto.getRandomValues no Hermes (Android nativo)
if (typeof global.crypto === 'undefined') {
  global.crypto = {}
}
if (typeof global.crypto.getRandomValues === 'undefined') {
  global.crypto.getRandomValues = (array) => {
    const randomBytes = Crypto.getRandomBytes(array.length)
    for (let i = 0; i < array.length; i++) {
      array[i] = randomBytes[i]
    }
    return array
  }
}

const supabaseUrl = 'https://anklywcqejajskvmwuxv.supabase.co'
const supabaseKey = 'sb_publishable_tRuKY8SCC6Iuvk-xN_BETQ_Gc-7tzL6'

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: Platform.OS === 'web' ? undefined : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})