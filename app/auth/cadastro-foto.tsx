import { Feather } from '@expo/vector-icons'
import { decode } from 'base64-arraybuffer'
import * as FileSystem from 'expo-file-system'
import * as ImagePicker from 'expo-image-picker'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useState } from 'react'
import {
  Dimensions, Image, Platform,
  ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import ModalAlerta from '../../src/components/ModalAlerta'
import { useCadastro } from '../../src/context/CadastroContext'
import { supabase } from '../../src/lib/supabase'

const { width } = Dimensions.get('window')
const CARD_W = Math.min(width * 0.88, 420)

export default function CadastroFoto() {
  const { dados, setFotoUri, setErroEmail, limpar } = useCadastro()
  const [carregando, setCarregando] = useState(false)
  const [modal, setModal] = useState({ visivel: false, titulo: '', mensagem: '' })

  function mostrarModal(titulo: string, mensagem: string) {
    setModal({ visivel: true, titulo, mensagem })
  }

  async function escolherFoto() {
    const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permissao.granted) {
      mostrarModal('Permissão necessária', 'Precisamos acessar suas fotos para continuar.')
      return
    }
    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8,
    })
    if (!resultado.canceled) setFotoUri(resultado.assets[0].uri)
  }

  async function finalizar(pularFoto = false) {
    if (carregando) return
    setCarregando(true)

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: dados.email.trim().replace(/[^a-zA-Z0-9@._+-]/g, ''),
      password: dados.senha,
      options: { data: { nome: dados.nome.trim() } },
    })

    if (authError) {
      setCarregando(false)

      const msg = authError.message.toLowerCase()

      if (msg.includes('already registered') || msg.includes('user already registered')) {
        setErroEmail('Este e-mail já está cadastrado')
        router.back()
        return
      }

      if (msg.includes('invalid') || msg.includes('format') || msg.includes('email')) {
        mostrarModal('E-mail inválido', 'Verifique o e-mail digitado e tente novamente.')
        return
      }

      if (msg.includes('database') || msg.includes('server') || msg.includes('unexpected')) {
        mostrarModal('Erro no servidor', 'Ocorreu um problema. Tente novamente em alguns instantes.')
        return
      }

      mostrarModal('Não foi possível criar a conta', 'Verifique seus dados e tente novamente.')
      return
    }

    const user = authData.session?.user ?? authData.user
    if (!user) {
      setCarregando(false)
      mostrarModal('Erro no servidor', 'Ocorreu um problema. Tente novamente em alguns instantes.')
      return
    }

    let fotoUrl: string | null = null

    if (dados.fotoUri && !pularFoto) {
      try {
        let fileName = ''
        let uploadData: any
        let contentType = 'image/jpeg'

        if (Platform.OS === 'web') {
          const response = await fetch(dados.fotoUri)
          const blob = await response.blob()
          const ext = blob.type.split('/')[1] ?? 'jpg'
          fileName = `${user.id}.${ext}`
          uploadData = blob
          contentType = blob.type
        } else {
          const parts = dados.fotoUri.split('.')
          const extRaw = parts.length > 1 ? parts.pop()?.toLowerCase() : 'jpg'
          const ext = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extRaw || '') ? extRaw : 'jpg'
          fileName = `${user.id}.${ext}`
          const base64 = await FileSystem.readAsStringAsync(dados.fotoUri, { encoding: FileSystem.EncodingType.Base64 })
          uploadData = decode(base64)
          contentType = `image/${ext === 'jpg' ? 'jpeg' : ext}`
        }

        const { data: upload, error: uploadError } = await supabase.storage.from('avatares')
          .upload(fileName, uploadData, { contentType, upsert: true })

        if (upload) {
          const { data: urlData } = supabase.storage.from('avatares').getPublicUrl(fileName)
          fotoUrl = `${urlData.publicUrl}?t=${Date.now()}`
        }
      } catch (e) {
        console.log('CATCH UPLOAD:', e)
      }
    }

    const { error: perfilError } = await supabase.from('perfis').upsert({
      id: user.id,
      nome: dados.nome.trim(),
      email: dados.email.trim(),
      foto_url: fotoUrl,
    })

    if (perfilError) {
      console.error('Erro ao salvar perfil:', perfilError.message)
    }

    limpar()
    setCarregando(false)
    router.replace('/(tabs)' as any)
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity style={styles.voltar} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color="#6B49AD" />
        </TouchableOpacity>

        <View style={styles.centro}>
          <Image source={require('../../assets/images/logo.png')} style={styles.logo} resizeMode="contain" />
          <Text style={styles.titulo}>FOTO DE PERFIL</Text>
          <Text style={styles.subtitulo}>Opcional — você pode pular esta etapa</Text>
        </View>

        <View style={[styles.card, { width: CARD_W }]}>
          <TouchableOpacity style={styles.fotoArea} onPress={escolherFoto} activeOpacity={0.8}>
            {dados.fotoUri ? (
              <Image source={{ uri: dados.fotoUri }} style={styles.fotoPreview} />
            ) : (
              <View style={styles.fotoPlaceholder}>
                <Feather name="camera" size={42} color="#6B49AD" />
                <Text style={styles.fotoPlaceholderTexto}>Toque para escolher</Text>
              </View>
            )}
          </TouchableOpacity>

          {!!dados.fotoUri && (
            <View style={styles.acoesFoto}>
              <TouchableOpacity style={styles.botaoMudar} onPress={escolherFoto}>
                <Feather name="image" size={14} color="#6B49AD" />
                <Text style={styles.botaoMudarTexto}>Mudar foto</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.botaoRemover} onPress={() => setFotoUri('')}>
                <Feather name="trash-2" size={14} color="#dc2626" />
                <Text style={styles.botaoRemoverTexto}>Remover</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <TouchableOpacity onPress={() => finalizar(false)} activeOpacity={0.85}
          style={[styles.botaoWrapper, { width: CARD_W }]} disabled={carregando}>
          <LinearGradient colors={['#5E44A7', '#481D94', '#301971']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={[styles.botao, carregando && { opacity: 0.7 }]}>
            <Text style={styles.botaoTexto}>
              {carregando ? 'CRIANDO CONTA...' : 'FINALIZAR CADASTRO'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.botaoPularWrapper, { width: CARD_W }]}
          onPress={() => finalizar(true)} disabled={carregando}>
          <Text style={styles.botaoPularTexto}>Pular esta etapa</Text>
        </TouchableOpacity>
      </ScrollView>

      <ModalAlerta
        visivel={modal.visivel}
        titulo={modal.titulo}
        mensagem={modal.mensagem}
        onFechar={() => setModal(m => ({ ...m, visivel: false }))}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  scroll: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 48, backgroundColor: '#fff' },
  voltar: { alignSelf: 'flex-start', marginLeft: 8, marginBottom: 16, padding: 4 },
  centro: { alignItems: 'center', marginBottom: 24 },
  logo: { width: 200, height: 120, marginBottom: 8 },
  titulo: { fontSize: 24, fontWeight: '800', color: '#301971', letterSpacing: 3, marginBottom: 4 },
  subtitulo: { fontSize: 14, color: '#6B49AD' },
  card: { backgroundColor: '#fff', borderRadius: 24, paddingHorizontal: 24, paddingVertical: 28, shadowColor: '#6B49AD', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 8, marginBottom: 24, alignItems: 'center' },
  fotoArea: { marginBottom: 16 },
  fotoPreview: { width: 160, height: 160, borderRadius: 80, borderWidth: 3, borderColor: '#6B49AD' },
  fotoPlaceholder: { width: 160, height: 160, borderRadius: 80, borderWidth: 2, borderColor: '#6B49AD', borderStyle: 'dashed', backgroundColor: '#F5F0FF', justifyContent: 'center', alignItems: 'center', gap: 10 },
  fotoPlaceholderTexto: { color: '#6B49AD', fontSize: 13, fontWeight: '600' },
  acoesFoto: { flexDirection: 'row', gap: 12 },
  botaoMudar: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 14, borderWidth: 1.5, borderColor: '#6B49AD', borderRadius: 60 },
  botaoMudarTexto: { color: '#6B49AD', fontSize: 13, fontWeight: '600' },
  botaoRemover: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 14, borderWidth: 1.5, borderColor: '#dc2626', borderRadius: 60 },
  botaoRemoverTexto: { color: '#dc2626', fontSize: 13, fontWeight: '600' },
  botaoWrapper: { shadowColor: '#301971', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 10, marginBottom: 14 },
  botao: { borderRadius: 60, paddingVertical: 18, alignItems: 'center' },
  botaoTexto: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 2 },
  botaoPularWrapper: { borderWidth: 1.5, borderColor: '#6B49AD', borderRadius: 60, paddingVertical: 16, alignItems: 'center' },
  botaoPularTexto: { color: '#6B49AD', fontSize: 15, fontWeight: '700', letterSpacing: 1 },
})