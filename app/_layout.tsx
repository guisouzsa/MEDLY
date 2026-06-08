import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import 'react-native-reanimated'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { CadastroProvider } from '../src/context/CadastroContext'
import { supabase } from '../src/lib/supabase'

export default function RootLayout() {

  useEffect(() => {
    async function setupNotificacoes() {
      try {
        // Importação dinâmica para evitar crash se o módulo nativo não estiver disponível
        const NotifLib = await import('../src/lib/notifications')

        // Inicializa handler, canal Android e categorias de ação
        await NotifLib.inicializarNotificacoes()

        // Pede permissão ao usuário
        const permitido = await NotifLib.pedirPermissaoNotificacoes()
        if (!permitido) {
          console.log('[MEDLY] Permissão de notificações negada')
          return
        }

        // Se estiver logado, reagenda todas as notificações dos próximos 7 dias
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await NotifLib.reagendarTodasNotificacoes(user.id)
        }
      } catch (err) {
        // Silencia qualquer erro de notificações para não travar o app
        console.warn('[MEDLY] Notificações indisponíveis neste ambiente:', err)
      }
    }

    setupNotificacoes()
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