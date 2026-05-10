import { router } from 'expo-router'
import { useState } from 'react'
import { KeyboardAvoidingView, Platform, StyleSheet } from 'react-native'
import BotaoGrande from '../../src/components/BotaoGrande'
import CampoGrande from '../../src/components/CampoGrande'
import TelaEtapa from '../../src/components/TelaEtapa'

export default function LoginEmail() {
  const [email, setEmail] = useState('')
  const [erro, setErro] = useState('')

  function avancar() {
    const limpo = email.trim().toLowerCase()
    if (!limpo.includes('@') || !limpo.includes('.')) {
      setErro('Digite um email válido')
      return
    }
    setErro('')
    router.push({ pathname: '/auth/login-senha', params: { email: limpo } })
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <TelaEtapa
        titulo="Qual é o seu email?"
        subtitulo="Digite o email que você usou para criar a conta"
        onVoltar={() => router.back()}
        etapa={1}
        totalEtapas={2}
      >
        <CampoGrande
          label="Email"
          value={email}
          onChangeText={(t) => { setEmail(t); setErro('') }}
          placeholder="seu@email.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          erro={erro}
        />

        <BotaoGrande texto="Continuar" onPress={avancar} />
      </TelaEtapa>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
})