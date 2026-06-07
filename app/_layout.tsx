import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import 'react-native-reanimated'
import { CadastroProvider } from '../src/context/CadastroContext'
import {
  inicializarNotificacoes,
  pedirPermissaoNotificacoes,
  reagendarTodasNotificacoes,
} from '../src/lib/notifications'
import { supabase } from '../src/lib/supabase'

export default function RootLayout() {

  useEffect(() => {
    async function setupNotificacoes() {
      try {
        // Inicializa handler, canal Android e categorias de ação
        await inicializarNotificacoes()

        // Pede permissão ao usuário
        const permitido = await pedirPermissaoNotificacoes()
        if (!permitido) {
          console.log('[MEDLY] Permissão de notificações negada')
          return
        }

        // Se estiver logado, reagenda todas as notificações dos próximos 7 dias
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await reagendarTodasNotificacoes(user.id)
        }
      } catch (err) {
        console.error('[MEDLY] Erro ao configurar notificações:', err)
      }
    }

    setupNotificacoes()
  }, [])

  return (
    <CadastroProvider>
      <Stack>
      <Stack.Screen name="auth" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="modulos" options={{ headerShown: false }} />
      <Stack.Screen name="+not-found" options={{ headerShown: false }} />
    </Stack>
      <StatusBar style="dark" />
    </CadastroProvider>
  )
}