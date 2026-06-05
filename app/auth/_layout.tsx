import { Stack } from 'expo-router'
import { CadastroProvider } from '../../src/context/CadastroContext'

export default function AuthLayout() {
  return (
    <CadastroProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="cadastro" />
        <Stack.Screen name="cadastro-foto" />
      </Stack>
    </CadastroProvider>
  )
}