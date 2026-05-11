import { Feather } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { router } from 'expo-router'
import { useState } from 'react'
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import BotaoGrande from '../../src/components/BotaoGrande'
import TelaEtapa from '../../src/components/TelaEtapa'
import { useCadastro } from '../../src/context/CadastroContext'
import { supabase } from '../../src/lib/supabase'

export default function CadastroFoto() {
  const { dados, setFotoUri, limpar } = useCadastro()
  const [carregando, setCarregando] = useState(false)

  async function escolherFoto() {
    const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permissao.granted) {
      Alert.alert('Permissão necessária', 'Precisamos acessar suas fotos para continuar.')
      return
    }
    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
    })
    if (!resultado.canceled) {
      setFotoUri(resultado.assets[0].uri)
    }
  }

  async function finalizar(pularFoto = false) {
    if (carregando) return // evita duplo clique
    setCarregando(true)

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: dados.email,
      password: dados.senha,
      options: {
        data: { nome: dados.nome.trim() },
      },
    })

    if (authError) {
      setCarregando(false)
      let msg = 'Não foi possível criar a conta. Tente novamente.'
      if (authError.message.includes('already registered')) {
        msg = 'Este email já está cadastrado.'
      } else if (authError.status === 429) {
        msg = 'Muitas tentativas. Aguarde alguns minutos e tente novamente.'
      }
      Alert.alert('Erro', msg)
      return
    }

    const user = authData.session?.user ?? authData.user

    if (!user) {
      setCarregando(false)
      Alert.alert('Erro', 'Não foi possível criar a conta. Tente novamente.')
      return
    }

    let fotoUrl: string | null = null

    if (!pularFoto && dados.fotoUri) {
      const ext = dados.fotoUri.split('.').pop() ?? 'jpg'
      const fileName = `${user.id}.${ext}`
      const formData = new FormData()
      formData.append('file', { uri: dados.fotoUri, name: fileName, type: `image/${ext}` } as any)

      const { data: upload } = await supabase.storage
        .from('avatares')
        .upload(fileName, formData, { upsert: true })

      if (upload) {
        const { data: urlData } = supabase.storage.from('avatares').getPublicUrl(fileName)
        fotoUrl = urlData.publicUrl
      }
    }

    await supabase.from('perfis').upsert({
      id: user.id,
      nome: dados.nome.trim(),
      email: dados.email,
      foto_url: fotoUrl,
    })

    limpar()
    setCarregando(false)
    router.replace('/(tabs)' as any)
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <TelaEtapa
        titulo="Adicione uma foto"
        subtitulo="Sua foto aparece no perfil. Você pode pular esta etapa."
        onVoltar={() => router.back()}
        etapa={4}
        totalEtapas={4}
      >
        <TouchableOpacity style={styles.areaFoto} onPress={escolherFoto} activeOpacity={0.8}>
          {dados.fotoUri ? (
            <Image source={{ uri: dados.fotoUri }} style={styles.foto} />
          ) : (
            <View style={styles.semFoto}>
              <Feather name="camera" size={48} color="#9163cb" />
              <Text style={styles.semFotoTexto}>Toque para escolher uma foto</Text>
            </View>
          )}
        </TouchableOpacity>

        <BotaoGrande
          texto="Criar minha conta"
          onPress={() => finalizar(false)}
          carregando={carregando}
        />

        <BotaoGrande
          texto="Pular esta etapa"
          variante="secundario"
          onPress={() => finalizar(true)}
          carregando={carregando}
        />
      </TelaEtapa>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1 },
  areaFoto: { alignSelf: 'center', marginBottom: 40 },
  foto: {
    width: 180, height: 180, borderRadius: 90,
    borderWidth: 4, borderColor: '#9163cb',
  },
  semFoto: {
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: '#ede8fa', borderWidth: 3,
    borderColor: '#d6b9ff', borderStyle: 'dashed',
    justifyContent: 'center', alignItems: 'center', gap: 12,
  },
  semFotoTexto: {
    color: '#6b49ad', fontSize: 15,
    textAlign: 'center', paddingHorizontal: 20,
  },
})