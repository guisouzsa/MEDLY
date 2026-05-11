import { router } from 'expo-router'
import { useState } from 'react'
import { KeyboardAvoidingView, Platform, StyleSheet } from 'react-native'
import BotaoGrande from '../../src/components/BotaoGrande'
import CampoGrande from '../../src/components/CampoGrande'
import TelaEtapa from '../../src/components/TelaEtapa'
import { useCadastro } from '../../src/context/CadastroContext'

export default function CadastroEmail() {
  const { dados, setEmail } = useCadastro()
  const [erro, setErro] = useState('')

  function avancar() {
    const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dados.email)
    if (!emailValido) {
      setErro('Digite um e-mail válido')
      return
    }
    setErro('')
    router.push('/auth/cadastro-senha')
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <TelaEtapa
        titulo="Qual é o seu e-mail?"
        subtitulo="Você usará ele para entrar no app"
        onVoltar={() => router.back()}
        etapa={2}
        totalEtapas={4}
      >
        <CampoGrande
          label="E-mail"
          value={dados.email}
          onChangeText={(t) => { setEmail(t); setErro('') }}
          placeholder="Ex: maria@gmail.com"
          keyboardType="email-address"
          autoCapitalize="none"
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