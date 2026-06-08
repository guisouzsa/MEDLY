import { Feather } from '@expo/vector-icons'
import * as FileSystem from 'expo-file-system'
import * as ImagePicker from 'expo-image-picker'
import { decode } from 'base64-arraybuffer'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import {
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
  Modal,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import ModalAlerta from '../../src/components/ModalAlerta'
import { supabase } from '../../src/lib/supabase'

const { width } = Dimensions.get('window')
const CARD_W = Math.min(width * 0.88, 420)

export default function Perfil() {
  const [usuarioId, setUsuarioId] = useState<string | null>(null)
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [fotoUri, setFotoUri] = useState<string | null>(null)
  const [fotoUrlOriginal, setFotoUrlOriginal] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [carregandoDados, setCarregandoDados] = useState(true)
  const [modal, setModal] = useState({ visivel: false, titulo: '', mensagem: '' })
  const [modalDeletarVisivel, setModalDeletarVisivel] = useState(false)

  function mostrarModal(titulo: string, mensagem: string) {
    setModal({ visivel: true, titulo, mensagem })
  }

  useEffect(() => {
    async function carregarPerfil() {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) {
          router.replace('/auth')
          return
        }
        setUsuarioId(user.id)
        setEmail(user.email ?? '')

        const { data: perfil, error: dbError } = await supabase
          .from('perfis')
          .select('nome, foto_url')
          .eq('id', user.id)
          .single()

        if (dbError) {
          console.log('Erro ao carregar perfil do DB:', dbError.message)
        }

        if (perfil) {
          setNome(perfil.nome ?? '')
          if (perfil.foto_url) {
            setFotoUri(perfil.foto_url)
            setFotoUrlOriginal(perfil.foto_url)
          }
        }
      } catch (e) {
        console.log('Catch carregarPerfil:', e)
      } finally {
        setCarregandoDados(false)
      }
    }
    carregarPerfil()
  }, [])

  async function escolherFoto() {
    const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permissao.granted) {
      mostrarModal('Permissão necessária', 'Precisamos acessar suas fotos para continuar.')
      return
    }
    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    })
    if (!resultado.canceled) {
      setFotoUri(resultado.assets[0].uri)
    }
  }

  async function removerFoto() {
    setFotoUri(null)
  }

  async function salvar() {
    if (!usuarioId) return
    if (!nome.trim()) {
      mostrarModal('Nome obrigatório', 'Por favor, preencha o seu nome.')
      return
    }
    if (!email.trim()) {
      mostrarModal('E-mail obrigatório', 'Por favor, preencha o seu e-mail.')
      return
    }

    setCarregando(true)

    try {
      let finalFotoUrl = fotoUri

      // Se a foto foi alterada ou removida
      if (fotoUri !== fotoUrlOriginal) {
        // 1. Se foi removida (fotoUri é null)
        if (fotoUri === null) {
          finalFotoUrl = null
          if (fotoUrlOriginal) {
            try {
              const urlParts = fotoUrlOriginal.split('/avatares/')
              if (urlParts.length > 1) {
                const fileNameWithQuery = urlParts[1]
                const fileName = fileNameWithQuery.split('?')[0]
                await supabase.storage.from('avatares').remove([fileName])
              }
            } catch (e) {
              console.log('Erro ao deletar foto do storage:', e)
            }
          }
        }
        // 2. Se uma nova foto local foi selecionada
        else if (fotoUri.startsWith('file://') || fotoUri.startsWith('ph://') || fotoUri.startsWith('content://') || Platform.OS === 'web') {
          let fileName = ''
          let uploadData: any
          let contentType = 'image/jpeg'

          if (Platform.OS === 'web') {
            const response = await fetch(fotoUri)
            const blob = await response.blob()
            const ext = blob.type.split('/')[1] ?? 'jpg'
            fileName = `${usuarioId}.${ext}`
            uploadData = blob
            contentType = blob.type
          } else {
            const parts = fotoUri.split('.')
            const extRaw = parts.length > 1 ? parts.pop()?.toLowerCase() : 'jpg'
            const ext = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extRaw || '') ? extRaw : 'jpg'
            fileName = `${usuarioId}.${ext}`
            const base64 = await FileSystem.readAsStringAsync(fotoUri, { encoding: FileSystem.EncodingType.Base64 })
            uploadData = decode(base64)
            contentType = `image/${ext === 'jpg' ? 'jpeg' : ext}`
          }

          const { data: upload, error: uploadError } = await supabase.storage
            .from('avatares')
            .upload(fileName, uploadData, { contentType, upsert: true })

          if (uploadError) {
            throw new Error(`Upload da foto falhou: ${uploadError.message}`)
          }

          if (upload) {
            const { data: urlData } = supabase.storage.from('avatares').getPublicUrl(fileName)
            finalFotoUrl = `${urlData.publicUrl}?t=${Date.now()}`
          }
        }
      }

      // Atualizar tabela perfis
      const { error: dbError } = await supabase
        .from('perfis')
        .update({
          nome: nome.trim(),
          email: email.trim(),
          foto_url: finalFotoUrl,
        })
        .eq('id', usuarioId)

      if (dbError) {
        throw dbError
      }

      setFotoUrlOriginal(finalFotoUrl)
      setFotoUri(finalFotoUrl)
      mostrarModal('Sucesso', 'Perfil atualizado com sucesso!')
    } catch (error: any) {
      console.log('Erro ao salvar perfil:', error)
      mostrarModal('Erro ao salvar', error.message || 'Ocorreu um erro ao atualizar suas informações.')
    } finally {
      setCarregando(false)
    }
  }

  function confirmarDeletarConta() {
    setModalDeletarVisivel(true)
  }

  async function deletarConta() {
    if (!usuarioId) return
    setCarregando(true)
    setModalDeletarVisivel(false)
    try {
      // 1. Apaga do banco (se não houver RPC de exclusão total configurada, no mínimo os dados são apagados)
      const { error: dbError } = await supabase.from('perfis').delete().eq('id', usuarioId)
      if (dbError) throw dbError

      // 2. Tenta chamar uma RPC se existir (padrão em alguns setups)
      try {
        await supabase.rpc('delete_user')
      } catch (rpcErr) {
        console.log('Erro ao chamar RPC delete_user:', rpcErr)
      }

      // 3. Desloga e envia para a tela inicial
      await supabase.auth.signOut()
      router.replace('/auth')
    } catch (error: any) {
      console.log('Erro ao deletar conta:', error)
      mostrarModal('Erro', 'Não foi possível deletar a conta. Tente novamente.')
      setCarregando(false)
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header com botão voltar */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.voltar} onPress={() => router.back()}>
              <Feather name="arrow-left" size={22} color="#6B49AD" />
            </TouchableOpacity>
            <Text style={styles.headerTitulo}>MEU PERFIL</Text>
            <View style={{ width: 30 }} />
          </View>

          {carregandoDados ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Carregando informações...</Text>
            </View>
          ) : (
            <View style={[styles.card, { width: CARD_W }]}>
              {/* Área da Foto */}
              <TouchableOpacity style={styles.fotoArea} onPress={escolherFoto} activeOpacity={0.8}>
                {fotoUri ? (
                  <Image source={{ uri: fotoUri }} style={styles.fotoPreview} />
                ) : (
                  <View style={styles.fotoPlaceholder}>
                    <Feather name="user" size={48} color="#6B49AD" />
                  </View>
                )}
                <View style={styles.editBadge}>
                  <Feather name="camera" size={14} color="#fff" />
                </View>
              </TouchableOpacity>

              {fotoUri && (
                <TouchableOpacity style={styles.btnRemover} onPress={removerFoto}>
                  <Text style={styles.btnRemoverTexto}>Remover foto</Text>
                </TouchableOpacity>
              )}

              {/* Formulário */}
              <View style={styles.form}>
                <View style={styles.campoWrapper}>
                  <Text style={styles.campoLabel}>NOME EXIBIDO</Text>
                  <TextInput
                    style={styles.input}
                    value={nome}
                    onChangeText={setNome}
                    placeholder="Seu nome completo"
                    placeholderTextColor="#C4B5FD"
                    autoCorrect={false}
                  />
                </View>

                <View style={styles.campoWrapper}>
                  <Text style={styles.campoLabel}>E-MAIL DE ACESSO</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: '#EDE8FA', color: '#9163CB' }]}
                    value={email}
                    editable={false}
                    placeholder="Seu e-mail"
                    placeholderTextColor="#C4B5FD"
                  />
                  <Text style={{ fontSize: 11, color: '#9163CB', marginTop: 4 }}>* Por questões de segurança, a troca de e-mail deve ser feita através do suporte.</Text>
                </View>

                <TouchableOpacity
                  onPress={salvar}
                  activeOpacity={0.85}
                  style={styles.botaoWrapper}
                  disabled={carregando}
                >
                  <LinearGradient
                    colors={['#5E44A7', '#481D94', '#301971']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.botao, carregando && { opacity: 0.7 }]}
                  >
                    <Text style={styles.botaoTexto}>
                      {carregando ? 'SALVANDO...' : 'SALVAR ALTERAÇÕES'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={confirmarDeletarConta}
                  activeOpacity={0.85}
                  style={styles.botaoDeletarWrapper}
                  disabled={carregando}
                >
                  <Text style={styles.botaoDeletarTexto}>DELETAR CONTA</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <ModalAlerta
        visivel={modal.visivel}
        titulo={modal.titulo}
        mensagem={modal.mensagem}
        onFechar={() => setModal(m => ({ ...m, visivel: false }))}
      />

      <Modal visible={modalDeletarVisivel} transparent animationType="fade">
        <View style={styles.modalFundoDeletar}>
          <View style={styles.modalDeletarCard}>
            <View style={styles.modalDeletarIcone}>
              <Feather name="alert-triangle" size={32} color="#dc2626" />
            </View>
            <Text style={styles.modalDeletarTitulo}>Deletar Conta?</Text>
            <Text style={styles.modalDeletarMsg}>
              Tem certeza que deseja deletar sua conta? Todos os seus dados serão apagados permanentemente e essa ação não pode ser desfeita.
            </Text>
            <TouchableOpacity onPress={deletarConta} activeOpacity={0.85} style={styles.btnDeletarConfirmar}>
              <Text style={styles.btnDeletarConfirmarTexto}>SIM, DELETAR CONTA</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setModalDeletarVisivel(false)} style={styles.btnDeletarCancelar}>
              <Text style={styles.btnDeletarCancelarTexto}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F5F0FF',
  },
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: 16,
    marginBottom: 20,
  },
  voltar: {
    padding: 6,
    borderRadius: 50,
    backgroundColor: '#fff',
    shadowColor: '#6B49AD',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitulo: {
    fontSize: 20,
    fontWeight: '800',
    color: '#301971',
    letterSpacing: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B49AD',
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 28,
    shadowColor: '#6B49AD',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    alignItems: 'center',
  },
  fotoArea: {
    position: 'relative',
    marginBottom: 12,
  },
  fotoPreview: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 3,
    borderColor: '#6B49AD',
  },
  fotoPlaceholder: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 2,
    borderColor: '#6B49AD',
    borderStyle: 'dashed',
    backgroundColor: '#F5F0FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 4,
    backgroundColor: '#6B49AD',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  btnRemover: {
    marginBottom: 24,
  },
  btnRemoverTexto: {
    color: '#dc2626',
    fontSize: 13,
    fontWeight: '600',
  },
  form: {
    width: '100%',
  },
  campoWrapper: {
    marginBottom: 20,
  },
  campoLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9163CB',
    letterSpacing: 1,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F5F0FF',
    borderWidth: 1.5,
    borderColor: '#E2D9F3',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#301971',
  },
  botaoWrapper: {
    shadowColor: '#301971',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
    marginTop: 10,
  },
  botao: {
    borderRadius: 60,
    paddingVertical: 18,
    alignItems: 'center',
  },
  botaoTexto: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 2,
  },
  botaoDeletarWrapper: {
    marginTop: 20,
    alignItems: 'center',
    paddingVertical: 10,
  },
  botaoDeletarTexto: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
  },
  modalFundoDeletar: {
    flex: 1,
    backgroundColor: '#00000055',
    justifyContent: 'center',
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  modalDeletarCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    shadowColor: '#6B49AD',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  modalDeletarIcone: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFEBEE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalDeletarTitulo: {
    fontSize: 18,
    fontWeight: '800',
    color: '#301971',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalDeletarMsg: {
    fontSize: 14,
    color: '#9163CB',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  btnDeletarConfirmar: {
    backgroundColor: '#dc2626',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 10,
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  btnDeletarConfirmarTexto: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
  btnDeletarCancelar: {
    paddingVertical: 12,
    width: '100%',
    alignItems: 'center',
  },
  btnDeletarCancelarTexto: {
    color: '#6B49AD',
    fontSize: 14,
    fontWeight: '700',
  },
})
