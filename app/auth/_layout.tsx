import { Stack } from 'expo-router'
import { CadastroProvider } from '../../src/context/CadastroContext'

export default function AuthLayout() {
  return (
    <CadastroProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </CadastroProvider>
  )
}