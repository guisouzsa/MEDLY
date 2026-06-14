import 'expo-crypto'
import { router, Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import 'react-native-reanimated'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { CadastroProvider } from '../src/context/CadastroContext'
import { supabase } from '../src/lib/supabase'

export default function RootLayout() {

  useEffect(() => {
    // Listener de sessão — redireciona APENAS se o token expirar ou o usuário deslogar
    // Não interceptamos SIGNED_IN para não conflitar com a navegação do login/cadastro
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, _session) => {
      if (event === 'SIGNED_OUT') {
        // Pequeno delay para garantir que o navigator está montado
        setTimeout(() => router.replace('/auth'), 100)
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
          <Stack.Screen name="modulos" options={{ headerShown: false, presentation: 'transparentModal', contentStyle: { backgroundColor: 'transparent' } }} />
          <Stack.Screen name="+not-found" options={{ headerShown: false }} />
        </Stack>
        <StatusBar style="dark" />
      </CadastroProvider>
    </SafeAreaProvider>
  )
}