import { Feather } from '@expo/vector-icons'
import { BlurView } from 'expo-blur'

import * as ImagePicker from 'expo-image-picker'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import ModalAlerta from '../../src/components/ModalAlerta'
import { extensionFromUri, mimeFromExtension, readUriAsArrayBuffer } from '../../src/lib/storage'
import { supabase } from '../../src/lib/supabase'

const { width } = Dimensions.get('window')
const CARD_W = Math.min(width * 0.88, 420)

function ModalSair({ visivel, onCancelar, onConfirmar }: { visivel: boolean; onCancelar: () => void; onConfirmar: () => void }) {
  return (
    <Modal visible={visivel} transparent animationType="fade" onRequestClose={() => { }}>
      <BlurView intensity={15} tint="dark" style={StyleSheet.absoluteFillObject} experimentalBlurMethod="dimezisBlurView" />
      <View style={[styles.modalFundoSair, { backgroundColor: 'transparent' }]}>
        <View style={styles.modalCardSair}>
          <Text style={styles.modalTituloSair}>Sair da conta</Text>
          <Text style={styles.modalMensagemSair}>Tem certeza que deseja sair? Você precisará fazer login novamente.</Text>
          <TouchableOpacity onPress={onConfirmar} activeOpacity={0.85} style={styles.modalBotaoWrapperSair}>
            <LinearGradient
              colors={['#5E44A7', '#481D94', '#301971']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.modalBotaoSair}
            >
              <Text style={styles.modalBotaoTextoSair}>SIM, SAIR</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity onPress={onCancelar} style={styles.modalBotaoCancelarSair}>
            <Text style={styles.modalBotaoCancelarTextoSair}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

export default function Perfil() {
  const [usuarioId, setUsuarioId] = useState<string | null>(null)
  const [nome, setNome] = useState('')
  const [nomeOriginal, setNomeOriginal] = useState('')
  const [email, setEmail] = useState('')
  const [fotoUri, setFotoUri] = useState<string | null>(null)
  const [fotoUriOriginal, setFotoUriOriginal] = useState<string | null>(null)
  const [fotoUrlOriginal, setFotoUrlOriginal] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [carregandoDados, setCarregandoDados] = useState(true)
  const [carregandoFoto, setCarregandoFoto] = useState(false)
  const [modal, setModal] = useState({ visivel: false, titulo: '', mensagem: '' })
  const [modalDeletarVisivel, setModalDeletarVisivel] = useState(false)
  const [modalSairVisivel, setModalSairVisivel] = useState(false)
  const [modoEdicao, setModoEdicao] = useState(false)

  const rotateAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 4000,
        useNativeDriver: true,
      })
    ).start()
  }, [rotateAnim])

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  })

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
          setNomeOriginal(perfil.nome ?? '')
          if (perfil.foto_url) {
            setFotoUri(perfil.foto_url)
            setFotoUriOriginal(perfil.foto_url)
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
    if (!modoEdicao) return
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

  function removerFoto() {
    if (!modoEdicao) return
    setFotoUri(null)
  }

  function cancelarEdicao() {
    setNome(nomeOriginal)
    setFotoUri(fotoUriOriginal)
    setModoEdicao(false)
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

      if (fotoUri !== fotoUrlOriginal) {
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
        } else if (fotoUri.startsWith('file://') || fotoUri.startsWith('ph://') || fotoUri.startsWith('content://') || Platform.OS === 'web') {
          const ext = extensionFromUri(fotoUri, 'jpg')
          const fileName = `${usuarioId}.${ext}`
          const uploadData = await readUriAsArrayBuffer(fotoUri)
          const contentType = mimeFromExtension(ext)

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

      const { error: dbError } = await supabase
        .from('perfis')
        .update({
          nome: nome.trim(),
          email: email.trim(),
          foto_url: finalFotoUrl,
        })
        .eq('id', usuarioId)

      if (dbError) throw dbError

      setFotoUrlOriginal(finalFotoUrl)
      setFotoUri(finalFotoUrl)
      setFotoUriOriginal(finalFotoUrl)
      setNomeOriginal(nome.trim())
      setModoEdicao(false)
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
      if (fotoUrlOriginal) {
        try {
          const urlParts = fotoUrlOriginal.split('/avatares/')
          if (urlParts.length > 1) {
            const fileNameWithQuery = urlParts[1]
            const fileName = fileNameWithQuery.split('?')[0]
            await supabase.storage.from('avatares').remove([fileName])
          }
        } catch (e) {
          console.log('Erro ao deletar foto via URL original antes de deletar conta:', e)
        }
      }
      try {
        await supabase.storage.from('avatares').remove([`${usuarioId}.jpg`, `${usuarioId}.png`, `${usuarioId}.jpeg`])
      } catch (e) {
        console.log('Erro no fallback de exclusão da foto antes de deletar conta:', e)
      }

      const { error: dbError } = await supabase.from('perfis').delete().eq('id', usuarioId)
      if (dbError) throw dbError

      try {
        await supabase.rpc('delete_user')
      } catch (rpcErr) {
        console.log('Erro ao chamar RPC delete_user:', rpcErr)
      }

      await supabase.auth.signOut()
      router.replace('/auth')
    } catch (error: any) {
      console.log('Erro ao deletar conta:', error)
      mostrarModal('Erro', 'Não foi possível deletar a conta. Tente novamente.')
      setCarregando(false)
    }
  }

  async function sair() {
    setModalSairVisivel(false)
    await supabase.auth.signOut()
    router.replace('/auth')
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header — padrão dos módulos */}
          <View style={styles.headerCard}>
            <View style={{ width: 44 }} />
            <Image source={require('../../assets/images/logo.png')} style={styles.logo} resizeMode="contain" />
            <TouchableOpacity style={styles.voltar} onPress={() => router.back()}>
              <Feather name="arrow-left" size={18} color="#6B49AD" />
            </TouchableOpacity>
          </View>

          {/* Título — padrão dos módulos */}
          <LinearGradient
            colors={['#6B49AD', '#6843B1', '#481D94']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.cardTituloLista}
          >
            <Text style={styles.cardTituloTexto}>MEU PERFIL</Text>
          </LinearGradient>

          {carregandoDados ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Carregando informações...</Text>
            </View>
          ) : (
            <>
              {/* Área da Foto */}
              <View style={styles.fotoContainer}>
                <Animated.View style={[styles.gradientRingContainer, { transform: [{ rotate: spin }] }]}>
                  <LinearGradient
                    colors={['#6B49AD', '#481D94', '#301971', '#6B49AD']}
                    style={StyleSheet.absoluteFillObject}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  />
                </Animated.View>
                <TouchableOpacity style={styles.fotoWrapperInterno} onPress={escolherFoto} activeOpacity={modoEdicao ? 0.8 : 1} disabled={!modoEdicao}>
                  {fotoUri ? (
                    <Image
                      source={{ uri: fotoUri }}
                      style={styles.fotoPreview}
                      onLoadStart={() => setCarregandoFoto(true)}
                      onLoadEnd={() => setCarregandoFoto(false)}
                    />
                  ) : (
                    <View style={styles.fotoPlaceholder}>
                      <Feather name="user" size={48} color="#6B49AD" />
                    </View>
                  )}
                  {carregandoFoto && (
                    <View style={StyleSheet.absoluteFillObject}>
                      <ActivityIndicator size="small" color="#6B49AD" style={styles.loadingFoto} />
                    </View>
                  )}
                </TouchableOpacity>
                {modoEdicao && (
                  <TouchableOpacity style={styles.editBadge} onPress={escolherFoto} activeOpacity={0.85}>
                    <Feather name="camera" size={14} color="#fff" />
                  </TouchableOpacity>
                )}
              </View>

              {fotoUri && modoEdicao && (
                <TouchableOpacity style={styles.btnRemover} onPress={removerFoto}>
                  <Text style={styles.btnRemoverTexto}>Remover foto</Text>
                </TouchableOpacity>
              )}

              {/* Card de informações */}
              <View style={[styles.card, { width: CARD_W }]}>
                <View style={styles.form}>
                  <View style={styles.campoWrapper}>
                    <Text style={styles.campoLabel}>NOME EXIBIDO</Text>
                    <TextInput
                      style={[styles.input, !modoEdicao && styles.inputDesabilitado]}
                      value={nome}
                      onChangeText={setNome}
                      placeholder="Seu nome completo"
                      placeholderTextColor="#C4B5FD"
                      autoCorrect={false}
                      maxLength={60}
                      editable={modoEdicao}
                    />
                  </View>

                  <View style={styles.campoWrapper}>
                    <Text style={styles.campoLabel}>E-MAIL DE ACESSO</Text>
                    <View style={styles.inputBloqueadoWrapper}>
                      <Feather name="lock" size={16} color="#9163CB" style={{ marginRight: 10 }} />
                      <TextInput
                        style={styles.inputBloqueado}
                        value={email}
                        editable={false}
                        placeholder="Seu e-mail"
                        placeholderTextColor="#C4B5FD"
                      />
                    </View>
                    <Text style={{ fontSize: 11, color: '#9163CB', marginTop: 6, lineHeight: 16 }}>* Por questões de segurança, a troca de e-mail deve ser feita através do suporte.</Text>
                  </View>

                  <View style={styles.divisor} />

                  <TouchableOpacity
                    onPress={modoEdicao ? salvar : () => setModoEdicao(true)}
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
                        {carregando ? 'SALVANDO...' : modoEdicao ? 'SALVAR ALTERAÇÕES' : 'EDITAR PERFIL'}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  {modoEdicao && (
                    <TouchableOpacity
                      onPress={cancelarEdicao}
                      activeOpacity={0.85}
                      style={styles.botaoCancelarEdicao}
                      disabled={carregando}
                    >
                      <Text style={styles.botaoCancelarEdicaoTexto}>CANCELAR</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    onPress={() => setModalSairVisivel(true)}
                    activeOpacity={0.85}
                    style={styles.botaoSairWrapper}
                    disabled={carregando}
                  >
                    <View style={styles.botaoSair}>
                      <Feather name="log-out" size={16} color="#6B49AD" style={{ marginRight: 6 }} />
                      <Text style={styles.botaoSairTexto}>SAIR DA CONTA</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={confirmarDeletarConta}
                    activeOpacity={0.85}
                    style={styles.botaoDeletarOutline}
                    disabled={carregando}
                  >
                    <Feather name="trash-2" size={16} color="#dc2626" style={{ marginRight: 8 }} />
                    <Text style={styles.botaoDeletarOutlineTexto}>DELETAR CONTA</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <ModalAlerta
        visivel={modal.visivel}
        titulo={modal.titulo}
        mensagem={modal.mensagem}
        onFechar={() => setModal(m => ({ ...m, visivel: false }))}
      />

      <Modal visible={modalDeletarVisivel} transparent animationType="fade" onRequestClose={() => { }}>
        <BlurView intensity={15} tint="dark" style={StyleSheet.absoluteFillObject} experimentalBlurMethod="dimezisBlurView" />
        <View style={[styles.modalFundoDeletar, { backgroundColor: 'transparent' }]}>
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

      <ModalSair visivel={modalSairVisivel} onCancelar={() => setModalSairVisivel(false)} onConfirmar={sair} />
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
    paddingTop: 0,
    paddingBottom: 40,
  },

  // ── Header — padrão dos módulos ───────────────────────────────────────────────
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 999,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: '#6B49AD',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    alignSelf: 'stretch',
  },
  logo: {
    width: 110,
    height: 36,
  },
  voltar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F0EAFF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Título — padrão dos módulos ───────────────────────────────────────────────
  cardTituloLista: {
    marginHorizontal: 16,
    borderRadius: 50,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#481D94',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 20,
    alignSelf: 'stretch',
  },
  cardTituloTexto: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 3,
  },

  // ── Loading ──────────────────────────────────────────────────────────────────
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

  // ── Card de informações ──────────────────────────────────────────────────────
  card: {
    backgroundColor: '#fff',
    borderRadius: 40,
    paddingHorizontal: 24,
    paddingVertical: 28,
    shadowColor: '#6B49AD',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    alignItems: 'center',
  },

  // ── Foto ─────────────────────────────────────────────────────────────────────
  fotoContainer: {
    position: 'relative',
    width: 140,
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 10,
  },
  gradientRingContainer: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    overflow: 'hidden',
  },
  fotoWrapperInterno: {
    width: 132,
    height: 132,
    borderRadius: 66,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  fotoPreview: {
    width: 126,
    height: 126,
    borderRadius: 63,
  },
  fotoPlaceholder: {
    width: 126,
    height: 126,
    borderRadius: 63,
    backgroundColor: '#F5F0FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingFoto: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  editBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: '#6B49AD',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#6B49AD',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  btnRemover: {
    marginBottom: 24,
  },
  btnRemoverTexto: {
    color: '#dc2626',
    fontSize: 13,
    fontWeight: '600',
  },

  // ── Formulário ───────────────────────────────────────────────────────────────
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
  inputDesabilitado: {
    backgroundColor: '#EDE8FA',
    color: '#9163CB',
  },
  inputBloqueadoWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EDE8FA',
    borderWidth: 1.5,
    borderColor: '#E2D9F3',
    borderRadius: 16,
    paddingHorizontal: 16,
  },
  inputBloqueado: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: '#9163CB',
  },
  divisor: {
    height: 1,
    backgroundColor: '#E2D9F3',
    width: '100%',
    marginVertical: 24,
  },

  // ── Botões ───────────────────────────────────────────────────────────────────
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
  botaoCancelarEdicao: {
    marginTop: 12,
    borderRadius: 60,
    borderWidth: 1.5,
    borderColor: '#9163CB',
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    backgroundColor: '#fff',
  },
  botaoCancelarEdicaoTexto: {
    color: '#9163CB',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 2,
  },
  botaoDeletarOutline: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#dc2626',
    borderRadius: 60,
    paddingVertical: 16,
    backgroundColor: 'transparent',
    width: '100%',
  },
  botaoDeletarOutlineTexto: {
    color: '#dc2626',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 2,
  },

  // ── Modal deletar ────────────────────────────────────────────────────────────
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

  // ── Botão sair ───────────────────────────────────────────────────────────────
  botaoSairWrapper: {
    marginTop: 14,
    width: '100%',
  },
  botaoSair: {
    borderRadius: 60,
    borderWidth: 1.5,
    borderColor: '#6B49AD',
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    backgroundColor: '#fff',
  },
  botaoSairTexto: {
    color: '#6B49AD',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 2,
  },

  // ── Modal sair ───────────────────────────────────────────────────────────────
  modalFundoSair: {
    flex: 1,
    backgroundColor: '#00000066',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  modalCardSair: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 28,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    shadowColor: '#6B49AD',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 12,
  },
  modalTituloSair: {
    fontSize: 18,
    fontWeight: '800',
    color: '#301971',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  modalMensagemSair: {
    fontSize: 15,
    color: '#6B49AD',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  modalBotaoWrapperSair: {
    width: '100%',
    shadowColor: '#301971',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    marginBottom: 12,
  },
  modalBotaoSair: {
    borderRadius: 60,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalBotaoTextoSair: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 2,
  },
  modalBotaoCancelarSair: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  modalBotaoCancelarTextoSair: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9163CB',
  },
})