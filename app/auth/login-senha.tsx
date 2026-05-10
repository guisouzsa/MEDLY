import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { KeyboardAvoidingView, Platform, StyleSheet } from 'react-native'
import BotaoGrande from '../../src/components/BotaoGrande'
import CampoGrande from '../../src/components/CampoGrande'
import TelaEtapa from '../../src/components/TelaEtapa'
import { supabase } from '../../src/lib/supabase'

export default function LoginSenha() {
  const { email } = useLocalSearchParams<{ email: string }>()
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function entrar() {
    if (senha.length < 6) {
      setErro('A senha precisa ter pelo menos 6 caracteres')
      return
    }
    setErro('')
    setCarregando(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })

    setCarregando(false)

    if (error) {
      setErro('Email ou senha incorretos')
      return
    }

    router.replace('/(tabs)' as any)
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <TelaEtapa
        titulo="Digite sua senha"
        subtitulo={`Entrando com\n${email}`}
        onVoltar={() => router.back()}
        etapa={2}
        totalEtapas={2}
      >
        <CampoGrande
          label="Senha"
          value={senha}
          onChangeText={(t) => { setSenha(t); setErro('') }}
          placeholder="••••••••"
          secureTextEntry
          erro={erro}
        />

        <BotaoGrande texto="Entrar" onPress={entrar} carregando={carregando} />
      </TelaEtapa>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
})