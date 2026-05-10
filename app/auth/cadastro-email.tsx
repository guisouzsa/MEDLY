import { router } from 'expo-router'
import { useState } from 'react'
import { KeyboardAvoidingView, Platform, StyleSheet } from 'react-native'
import BotaoGrande from '../../src/components/BotaoGrande'
import CampoGrande from '../../src/components/CampoGrande'
import TelaEtapa from '../../src/components/TelaEtapa'
import { useCadastro } from '../../src/context/CadastroContext'

export default function CadastroNome() {
  const { dados, setNome } = useCadastro()
  const [erro, setErro] = useState('')

  function avancar() {
    if (dados.nome.trim().length < 2) {
      setErro('Digite seu nome completo')
      return
    }
    setErro('')
    router.push('/auth/cadastro-email')
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <TelaEtapa
        titulo="Como você se chama?"
        subtitulo="Seu primeiro nome ou nome completo"
        onVoltar={() => router.back()}
        etapa={1}
        totalEtapas={4}
      >
        <CampoGrande
          label="Nome"
          value={dados.nome}
          onChangeText={(t) => { setNome(t); setErro('') }}
          placeholder="Ex: Maria Aparecida"
          autoCapitalize="words"
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