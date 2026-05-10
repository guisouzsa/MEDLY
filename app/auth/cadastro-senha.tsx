import { router } from 'expo-router'
import { useState } from 'react'
import { KeyboardAvoidingView, Platform, StyleSheet } from 'react-native'
import BotaoGrande from '../../src/components/BotaoGrande'
import CampoGrande from '../../src/components/CampoGrande'
import TelaEtapa from '../../src/components/TelaEtapa'
import { useCadastro } from '../../src/context/CadastroContext'

export default function CadastroSenha() {
  const { dados, setSenha } = useCadastro()
  const [confirmar, setConfirmar] = useState('')
  const [erro, setErro] = useState('')

  function avancar() {
    if (dados.senha.length < 6) {
      setErro('A senha precisa ter pelo menos 6 caracteres')
      return
    }
    if (dados.senha !== confirmar) {
      setErro('As senhas não são iguais')
      return
    }
    setErro('')
    router.push('/auth/cadastro-foto')
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <TelaEtapa
        titulo="Crie uma senha"
        subtitulo="Mínimo de 6 caracteres. Anote para não esquecer!"
        onVoltar={() => router.back()}
        etapa={3}
        totalEtapas={4}
      >
        <CampoGrande
          label="Senha"
          value={dados.senha}
          onChangeText={(t) => { setSenha(t); setErro('') }}
          placeholder="••••••••"
          secureTextEntry
        />

        <CampoGrande
          label="Confirmar senha"
          value={confirmar}
          onChangeText={(t) => { setConfirmar(t); setErro('') }}
          placeholder="••••••••"
          secureTextEntry
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