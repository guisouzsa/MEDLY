import { router, Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import 'react-native-reanimated'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { CadastroProvider } from '../src/context/CadastroContext'
import { supabase } from '../src/lib/supabase'

export default function RootLayout() {

  useEffect(() => {
    // Listener de sessão — redireciona se token expirar ou usuário deslogar
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        router.replace('/auth')
      }
      if (event === 'TOKEN_REFRESHED' && !session) {
        router.replace('/auth')
      }
    })

    async function setupNotificacoes() {
      try {
        const NotifLib = await import('../src/lib/notifications')
        await NotifLib.inicializarNotificacoes()
        const permitido = await NotifLib.pedirPermissaoNotificacoes()
        if (!permitido) {
          console.log('[MEDLY] Permissão de notificações negada')
          return
        }
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await NotifLib.reagendarTodasNotificacoes(user.id)
        }
      } catch (err) {
        console.warn('[MEDLY] Notificações indisponíveis neste ambiente:', err)
      }
    }

    setupNotificacoes()

    return () => subscription.unsubscribe()
  }, [])

  return (
    <SafeAreaProvider>
      <CadastroProvider>
        <Stack>
          <Stack.Screen name="auth" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modulos" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" options={{ headerShown: false }} />
        </Stack>
        <StatusBar style="dark" />
      </CadastroProvider>
    </SafeAreaProvider>
  )
}