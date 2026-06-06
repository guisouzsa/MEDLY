import { Feather } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router'
import * as DocumentPicker from 'expo-document-picker'
import * as FileSystem from 'expo-file-system/legacy'
import { decode } from 'base64-arraybuffer'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Alert,
  Animated, Dimensions, Image, KeyboardAvoidingView, Modal,
  Platform, ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '../../src/lib/supabase'
import { salvarHistorico } from '../../src/lib/events'

const { height } = Dimensions.get('window')

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Exame = {
  id: number
  nome: string
  data_realizacao: string
  data_resultado: string | null
  local: string | null
  arquivo_url: string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isImageUrl(url: string) {
  if (!url) return false
  const urlLower = url.toLowerCase()
  return (
    urlLower.includes('.png') ||
    urlLower.includes('.jpg') ||
    urlLower.includes('.jpeg') ||
    urlLower.includes('.gif') ||
    urlLower.includes('.webp') ||
    urlLower.startsWith('data:image') ||
    urlLower.startsWith('ph://') ||
    urlLower.startsWith('assets-library://')
  )
}

function converterData(data: string): string | null {
  if (!data || data.length < 10) return null
  const [d, m, a] = data.split('/')
  if (!d || !m || !a) return null
  return `${a}-${m}-${d}`
}

function formatarDataParaTela(data: string): string {
  if (!data) return ''
  const match = data.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!match) return data
  const [, a, m, d] = match
  return `${d}/${m}/${a}`
}

function mascaraData(texto: string): string {
  const n = texto.replace(/\D/g, '').slice(0, 8)
  if (n.length <= 2) return n
  if (n.length <= 4) return `${n.slice(0, 2)}/${n.slice(2)}`
  return `${n.slice(0, 2)}/${n.slice(2, 4)}/${n.slice(4)}`
}

// ─── Componentes internos ─────────────────────────────────────────────────────

function Campo({
  label, value, onChangeText, placeholder,
  keyboardType = 'default' as any,
  opcional = false,
  multiline = false, erro,
}: {
  label: string
  value: string
  onChangeText: (t: string) => void
  placeholder?: string
  keyboardType?: any
  opcional?: boolean
  multiline?: boolean
  erro?: boolean
}) {
  return (
    <View style={styles.campoWrapper}>
      <View style={styles.campoLabelRow}>
        <Text style={styles.campoLabel}>{label}</Text>
        {opcional && (
          <View style={styles.tagOpcional}>
            <Text style={styles.tagOpcionalTexto}>opcional</Text>
          </View>
        )}
      </View>
      <TextInput
        style={[styles.input, multiline && styles.inputMultiline, erro && styles.inputErro]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#C4B5FD"
        keyboardType={keyboardType}
        autoCorrect={false}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
      {erro && (
        <View style={styles.erroRow}>
          <Feather name="alert-circle" size={13} color="#dc2626" />
          <Text style={styles.erroTexto}>Este campo é obrigatório</Text>
        </View>
      )}
    </View>
  )
}

// ─── Tela principal ───────────────────────────────────────────────────────────

export default function Exames() {
  const { action } = useLocalSearchParams()

  const [usuarioId, setUsuarioId] = useState<string | null>(null)
  const [lista, setLista] = useState<Exame[]>([])
  const [perfilFoto, setPerfilFoto] = useState<string | null>(null)
  const [perfilNome, setPerfilNome] = useState<string>('')

  const [modalVisivel, setModalVisivel] = useState(false)
  const [editando, setEditando] = useState<Exame | null>(null)
  const slideAnim = useRef(new Animated.Value(height)).current

  // ── Campos do form ────────────────────────────────────────────────────────
  const [nome, setNome] = useState('')
  const [dataRealizacao, setDataRealizacao] = useState('')
  const [dataResultado, setDataResultado] = useState('')
  const [local, setLocal] = useState('')
  const [arquivoUrl, setArquivoUrl] = useState('')
  const [arquivoNome, setArquivoNome] = useState('')

  const [carregando, setCarregando] = useState(false)
  const [modalExcluir, setModalExcluir] = useState(false)
  const [excluirId, setExcluirId] = useState<number | null>(null)
  const [erros, setErros] = useState<Record<string, boolean>>({})

  // ── Init ──────────────────────────────────────────────────────────────────

  useFocusEffect(
    useCallback(() => {
      async function init() {
        const { data: { user }, error } = await supabase.auth.getUser()
        if (error || !user) { router.replace('/auth'); return }
        setUsuarioId(user.id)

        const { data: perfil } = await supabase
          .from('perfis')
          .select('nome, foto_url')
          .eq('id', user.id)
          .single()
        if (perfil) {
          setPerfilNome(perfil.nome ?? '')
          if (perfil.foto_url) {
            const url = perfil.foto_url.includes('?') ? perfil.foto_url : `${perfil.foto_url}?t=${Date.now()}`
            setPerfilFoto(url)
          } else {
            setPerfilFoto(null)
          }
        }

        await buscar(user.id)
      }
      init()
    }, [])
  )

  useEffect(() => {
    if (action === 'create') abrirModal()
  }, [action])

  // ── Buscar ────────────────────────────────────────────────────────────────

  async function buscar(uid?: string) {
    const id = uid ?? usuarioId
    if (!id) return
    const { data: rows, error } = await supabase
      .from('exames')
      .select('id, nome, data_realizacao, data_resultado, local, arquivo_url')
      .eq('usuario_id', id)
      .order('data_realizacao', { ascending: false })
    if (error) { console.error('Erro ao buscar:', error.message); return }
    if (rows) setLista(rows as Exame[])
  }

  // ── Modal ─────────────────────────────────────────────────────────────────

  function resetForm() {
    setNome('')
    setDataRealizacao('')
    setDataResultado('')
    setLocal('')
    setArquivoUrl('')
    setArquivoNome('')
    setErros({})
  }

  function abrirModal(exame?: Exame) {
    setEditando(exame ?? null)
    if (exame) {
      setNome(exame.nome)
      setDataRealizacao(formatarDataParaTela(exame.data_realizacao))
      setDataResultado(exame.data_resultado ? formatarDataParaTela(exame.data_resultado) : '')
      setLocal(exame.local ?? '')
      setArquivoUrl(exame.arquivo_url ?? '')
      if (exame.arquivo_url) {
        const parts = exame.arquivo_url.split('/')
        const nameWithQuery = parts[parts.length - 1]
        const name = nameWithQuery.split('?')[0]
        setArquivoNome(decodeURIComponent(name))
      } else {
        setArquivoNome('')
      }
    } else {
      resetForm()
    }
    setErros({})
    setModalVisivel(true)
    Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }).start()
  }

  function fecharModal() {
    Animated.timing(slideAnim, { toValue: height, duration: 280, useNativeDriver: true })
      .start(() => setModalVisivel(false))
  }

  // ── Validação ─────────────────────────────────────────────────────────────

  function validar(): boolean {
    const novosErros: Record<string, boolean> = {}
    if (!nome.trim()) novosErros.nome = true
    if (!dataRealizacao || dataRealizacao.length < 10) novosErros.dataRealizacao = true
    setErros(novosErros)
    if (Object.keys(novosErros).length > 0) {
      Alert.alert('Campos obrigatórios', 'Preencha todos os campos destacados antes de continuar.')
      return false
    }
    return true
  }

  async function escolherArquivo() {
    try {
      const resultado = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      })
      if (!resultado.canceled && resultado.assets && resultado.assets.length > 0) {
        setArquivoUrl(resultado.assets[0].uri)
        setArquivoNome(resultado.assets[0].name || 'arquivo')
      }
    } catch (err) {
      console.error('Erro ao escolher arquivo:', err)
      Alert.alert('Erro', 'Não foi possível selecionar o arquivo.')
    }
  }

  // ── Salvar ────────────────────────────────────────────────────────────────

  async function salvar() {
    if (!validar()) return
    if (!usuarioId) { Alert.alert('Erro', 'Usuário não autenticado.'); router.replace('/auth'); return }

    setCarregando(true)
    try {
      let urlFinal = arquivoUrl.trim() || null

      if (urlFinal && !urlFinal.startsWith('http')) {
        const fileContent = await FileSystem.readAsStringAsync(urlFinal, { encoding: FileSystem.EncodingType.Base64 })
        
        // Determina extensão baseada no nome original do arquivo
        const parts = arquivoNome.split('.')
        const extRaw = parts.length > 1 ? parts.pop()?.toLowerCase() : 'pdf'
        const ext = ['pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp'].includes(extRaw || '') ? extRaw : 'pdf'
        const fileName = `${usuarioId}_${Date.now()}.${ext}`

        let contentType = 'application/octet-stream'
        if (ext === 'pdf') {
          contentType = 'application/pdf'
        } else if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
          contentType = `image/${ext === 'jpg' ? 'jpeg' : ext}`
        }

        const { error: uploadError } = await supabase.storage.from('exames_arquivos').upload(fileName, decode(fileContent), {
          contentType,
          upsert: true,
        })
        if (uploadError) throw new Error('Falha no upload do arquivo.')
        
        const { data: { publicUrl } } = supabase.storage.from('exames_arquivos').getPublicUrl(fileName)
        urlFinal = publicUrl
      }

      const payload = {
        usuario_id: usuarioId,
        nome: nome.trim(),
        data_realizacao: converterData(dataRealizacao),
        data_resultado: dataResultado.length === 10 ? converterData(dataResultado) : null,
        local: local.trim() || null,
        arquivo_url: urlFinal,
      }

      if (editando) {
        const { error } = await supabase.from('exames').update(payload).eq('id', editando.id)
        if (error) throw error
        await salvarHistorico(usuarioId, `Exame ${nome.trim()} foi alterado`)
      } else {
        const { error } = await supabase.from('exames').insert(payload)
        if (error) throw error
        await salvarHistorico(usuarioId, `Exame ${nome.trim()} foi cadastrado`)
      }

      fecharModal()
      await buscar()
    } catch (err: any) {
      console.error('Erro ao salvar:', err.message)
      Alert.alert('Erro ao salvar', err.message ?? 'Tente novamente.')
    } finally {
      setCarregando(false)
    }
  }

  // ── Excluir ───────────────────────────────────────────────────────────────

  function confirmarExcluir(id: number) { setExcluirId(id); setModalExcluir(true) }

  async function excluir() {
    if (!excluirId) return
    const exa = lista.find(e => e.id === excluirId)
    const { error } = await supabase.from('exames').delete().eq('id', excluirId)
    if (error) { Alert.alert('Erro ao excluir', error.message); return }
    if (exa) {
      await salvarHistorico(usuarioId!, `Exame ${exa.nome} foi removido`)
    }
    setModalExcluir(false)
    setExcluirId(null)
    await buscar()
  }

  // ── Render principal ──────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Card 1 — Perfil + Logo */}
        <View style={styles.cardPerfil}>
          <TouchableOpacity onPress={() => router.push('/modulos/perfil' as any)} activeOpacity={0.85}>
            {perfilFoto ? (
              <Image source={{ uri: perfilFoto }} style={styles.fotoPerfil} onError={() => setPerfilFoto(null)} />
            ) : (
              <View style={styles.fotoPerfilPlaceholder}>
                <Feather name="user" size={24} color="#9163CB" />
              </View>
            )}
          </TouchableOpacity>
          <Image source={require('../../assets/images/logo.png')} style={styles.logo} resizeMode="contain" />
          <TouchableOpacity onPress={() => router.back()} style={styles.voltarBtn}>
            <Feather name="arrow-left" size={18} color="#6B49AD" />
          </TouchableOpacity>
        </View>

        {/* Card 2 — Título */}
        <LinearGradient
          colors={['#6B49AD', '#6843B1', '#481D94']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={styles.cardTituloLista}
        >
          <Text style={styles.cardTituloTexto}>EXAMES</Text>
        </LinearGradient>

        {/* Botões abaixo do card EXAMES */}
        <View style={styles.botoesAcao}>
          <TouchableOpacity
            onPress={() => router.push({ pathname: '/modulos/historico', params: { modulo: 'exame' } } as any)}
            activeOpacity={0.85}
            style={styles.btnAcaoSecundario}
          >
            <Feather name="clock" size={16} color="#6B49AD" />
            <Text style={styles.btnAcaoSecundarioTexto}>Histórico</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => abrirModal()} activeOpacity={0.85} style={styles.btnAcaoPrimario}>
            <LinearGradient
              colors={['#6B49AD', '#481D94']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.btnAcaoPrimarioGradient}
            >
              <Feather name="plus" size={16} color="#fff" />
              <Text style={styles.btnAcaoPrimarioTexto}>Cadastrar</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Card 3 — Lista */}
        <View style={styles.cardLista}>
          {lista.length === 0 ? (
            <View style={styles.vazioContainer}>
              <View style={styles.vazioIcone}>
                <Feather name="file-text" size={36} color="#9163CB" />
              </View>
              <Text style={styles.vazioTitulo}>Nenhum exame</Text>
              <Text style={styles.vazioSub}>Toque em "Cadastrar" para adicionar</Text>
            </View>
          ) : (
            lista.map((exame) => {
              return (
                <View key={exame.id} style={styles.card}>
                  <View style={styles.cardTopo}>
                    <LinearGradient
                      colors={['#6B49AD', '#481D94']}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                      style={styles.cardIconeBox}
                    >
                      <Feather name="file-text" size={22} color="#fff" />
                    </LinearGradient>
                    <View style={styles.cardTextos}>
                      <Text style={styles.cardNome}>{exame.nome}</Text>
                    </View>
                    <View style={styles.cardAcoes}>
                      <TouchableOpacity style={styles.btnEditar} onPress={() => abrirModal(exame)}>
                        <Feather name="edit-2" size={17} color="#6B49AD" />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.btnExcluirCard} onPress={() => confirmarExcluir(exame.id)}>
                        <Feather name="trash-2" size={17} color="#dc2626" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.cardInfoRow}>
                    {exame.data_realizacao ? (
                      <View style={styles.infoItem}>
                        <Feather name="calendar" size={13} color="#6B49AD" />
                        <Text style={styles.infoTexto}>{formatarDataParaTela(exame.data_realizacao)}</Text>
                      </View>
                    ) : null}
                    {exame.data_resultado ? (
                      <View style={styles.infoItem}>
                        <Feather name="check-circle" size={13} color="#6B49AD" />
                        <Text style={styles.infoTexto}>Resultado: {formatarDataParaTela(exame.data_resultado)}</Text>
                      </View>
                    ) : null}
                    {exame.local ? (
                      <View style={styles.infoItem}>
                        <Feather name="map-pin" size={13} color="#6B49AD" />
                        <Text style={styles.infoTexto}>{exame.local}</Text>
                      </View>
                    ) : null}
                    {exame.arquivo_url ? (
                      <TouchableOpacity
                        onPress={() => {
                          if (exame.arquivo_url) {
                            import('expo-web-browser').then(wb => wb.openBrowserAsync(exame.arquivo_url!))
                          }
                        }}
                        style={[styles.infoItem, { opacity: 0.85 }]}
                        activeOpacity={0.7}
                      >
                        <Feather name="paperclip" size={13} color="#6B49AD" />
                        <Text style={[styles.infoTexto, { textDecorationLine: 'underline', color: '#481D94' }]}>
                          Ver arquivo ({isImageUrl(exame.arquivo_url) ? 'Imagem' : 'PDF'})
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                    {exame.arquivo_url && isImageUrl(exame.arquivo_url) && (
                      <TouchableOpacity
                        onPress={() => {
                          if (exame.arquivo_url) {
                            import('expo-web-browser').then(wb => wb.openBrowserAsync(exame.arquivo_url!))
                          }
                        }}
                        activeOpacity={0.85}
                        style={styles.cardThumbnailContainer}
                      >
                        <Image source={{ uri: exame.arquivo_url }} style={styles.cardThumbnail} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )
            })
          )}
          <View style={{ height: 32 }} />
        </View>

      </ScrollView>

      {/* ── Modal cadastro/edição ── */}
      <Modal visible={modalVisivel} transparent animationType="none">
        <KeyboardAvoidingView
          style={styles.modalFundo}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableOpacity style={styles.modalOverlay} onPress={fecharModal} activeOpacity={1} />
          <Animated.View style={[styles.modalCard, { transform: [{ translateY: slideAnim }] }]}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={styles.modalHandle} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitulo}>
                  {editando ? 'Editar exame' : 'Novo exame'}
                </Text>
                <TouchableOpacity onPress={fecharModal} style={styles.modalFechar}>
                  <Feather name="x" size={22} color="#9163CB" />
                </TouchableOpacity>
              </View>

              <Campo
                label="NOME DO EXAME"
                value={nome}
                onChangeText={(v) => { setNome(v); setErros(p => ({ ...p, nome: false })) }}
                placeholder="Ex: Hemograma completo"
                erro={erros.nome}
              />

              <View style={styles.duasColunas}>
                <View style={[styles.coluna, { flex: 1 }]}>
                  <Campo
                    label="DATA REALIZAÇÃO"
                    value={dataRealizacao}
                    onChangeText={(t) => { setDataRealizacao(mascaraData(t)); setErros(p => ({ ...p, dataRealizacao: false })) }}
                    placeholder="DD/MM/AAAA"
                    keyboardType="numeric"
                    erro={erros.dataRealizacao}
                  />
                </View>
                <View style={[styles.coluna, { flex: 1 }]}>
                  <Campo
                    label="DATA RESULTADO"
                    value={dataResultado}
                    onChangeText={(t) => setDataResultado(mascaraData(t))}
                    placeholder="DD/MM/AAAA"
                    keyboardType="numeric"
                    opcional
                  />
                </View>
              </View>

              <Campo
                label="LOCAL"
                value={local}
                onChangeText={setLocal}
                placeholder="Ex: Laboratório Central"
                opcional
              />

              <View style={styles.campoWrapper}>
                <View style={styles.campoLabelRow}>
                  <Text style={styles.campoLabel}>ARQUIVO</Text>
                  <View style={styles.tagOpcional}>
                    <Text style={styles.tagOpcionalTexto}>opcional</Text>
                  </View>
                </View>
                {arquivoUrl ? (
                  <View style={styles.previewContainer}>
                    {isImageUrl(arquivoUrl) ? (
                      <Image source={{ uri: arquivoUrl }} style={styles.previewImage} resizeMode="cover" />
                    ) : (
                      <View style={styles.pdfIconeBox}>
                        <Feather name="file-text" size={30} color="#dc2626" />
                        <Text style={styles.pdfIconeTexto}>PDF</Text>
                      </View>
                    )}
                    <View style={styles.previewDetalhes}>
                      <Text style={styles.previewNome} numberOfLines={1}>
                        {arquivoNome || 'Arquivo selecionado'}
                      </Text>
                      <TouchableOpacity onPress={() => { setArquivoUrl(''); setArquivoNome('') }} style={styles.removerArquivoBtn}>
                        <Feather name="trash-2" size={14} color="#dc2626" />
                        <Text style={styles.removerArquivoTexto}>Remover arquivo</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity onPress={escolherArquivo} style={styles.botaoArquivo}>
                    <Feather name="upload" size={20} color="#6B49AD" />
                    <Text style={styles.botaoArquivoTexto}>Selecione um PDF ou Imagem</Text>
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity
                onPress={salvar}
                disabled={carregando}
                activeOpacity={0.85}
                style={styles.botaoSalvarWrapper}
              >
                <LinearGradient
                  colors={['#6B49AD', '#481D94']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={[styles.botaoSalvar, carregando && { opacity: 0.6 }]}
                >
                  <Text style={styles.botaoSalvarTexto}>
                    {carregando ? 'SALVANDO...' : editando ? 'ATUALIZAR' : 'CADASTRAR'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
              <View style={{ height: 40 }} />
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Modal excluir ── */}
      <Modal visible={modalExcluir} transparent animationType="fade">
        <View style={styles.modalExcluirFundo}>
          <View style={styles.modalExcluirCard}>
            <View style={styles.modalExcluirIcone}>
              <Feather name="trash-2" size={32} color="#dc2626" />
            </View>
            <Text style={styles.modalExcluirTitulo}>Excluir exame?</Text>
            <Text style={styles.modalExcluirMsg}>Esta ação não pode ser desfeita.</Text>
            <TouchableOpacity onPress={excluir} activeOpacity={0.85} style={styles.btnExcluirConfirmar}>
              <Text style={styles.btnExcluirConfirmarTexto}>SIM, EXCLUIR</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setModalExcluir(false)} style={styles.btnCancelar}>
              <Text style={styles.btnCancelarTexto}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F0FF' },

  cardPerfil: {
    backgroundColor: '#fff', marginHorizontal: 16, marginTop: 16,
    borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    shadowColor: '#6B49AD', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 12, elevation: 5,
  },
  fotoPerfil: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: '#E2D9F3' },
  fotoPerfilPlaceholder: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#EDE8FA',
    justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#E2D9F3',
  },
  logo: { width: 110, height: 36 },
  voltarBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#F0EAFF',
    justifyContent: 'center', alignItems: 'center',
  },

  cardTituloLista: {
    marginHorizontal: 16, marginTop: 12, borderRadius: 50,
    paddingVertical: 14, alignItems: 'center',
    shadowColor: '#481D94', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 5,
  },
  cardTituloTexto: { fontSize: 14, fontWeight: '800', color: '#fff', letterSpacing: 3 },

  botoesAcao: {
    marginHorizontal: 16, marginTop: 10,
    flexDirection: 'row', justifyContent: 'space-between',
  },
  btnAcaoSecundario: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1.5, borderColor: '#481D94', borderRadius: 50,
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: 'rgba(107,73,173,0.08)',
  },
  btnAcaoSecundarioTexto: { fontSize: 13, fontWeight: '700', color: '#481D94' },
  btnAcaoPrimario: {
    borderRadius: 50,
    shadowColor: '#481D94', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  btnAcaoPrimarioGradient: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 50, paddingHorizontal: 18, paddingVertical: 10,
  },
  btnAcaoPrimarioTexto: { fontSize: 13, fontWeight: '700', color: '#fff' },

  cardLista: {
    marginHorizontal: 16, marginTop: 14,
    backgroundColor: '#fff', borderRadius: 24, padding: 16,
    shadowColor: '#6B49AD',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 4, gap: 12,
  },

  vazioContainer: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  vazioIcone: {
    width: 76, height: 76, borderRadius: 24,
    backgroundColor: '#EDE8FA', justifyContent: 'center', alignItems: 'center', marginBottom: 4,
  },
  vazioTitulo: { fontSize: 17, fontWeight: '700', color: '#301971' },
  vazioSub: { fontSize: 14, color: '#9163CB' },

  card: {
    backgroundColor: '#FAFAFE', borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: '#EDE8FA', gap: 12,
  },
  cardTopo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardIconeBox: { width: 46, height: 46, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  cardTextos: { flex: 1, gap: 4 },
  cardNome: { fontSize: 16, fontWeight: '700', color: '#301971' },
  cardAcoes: { flexDirection: 'row', gap: 8 },
  btnEditar: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: '#F0EAFF', justifyContent: 'center', alignItems: 'center',
  },
  btnExcluirCard: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: '#FFF1F2', justifyContent: 'center', alignItems: 'center',
  },
  cardInfoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  infoItem: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#F0EAFF', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
  },
  infoTexto: { fontSize: 13, color: '#6B49AD', fontWeight: '600' },

  modalFundo: { flex: 1 },
  modalOverlay: { flex: 1, backgroundColor: '#00000055' },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, maxHeight: height * 0.92,
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: '#E2D9F3',
    alignSelf: 'center', marginBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 24,
  },
  modalTitulo: { fontSize: 19, fontWeight: '800', color: '#301971' },
  modalFechar: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#F0EAFF', justifyContent: 'center', alignItems: 'center',
  },

  duasColunas: { flexDirection: 'row', gap: 12 },
  coluna: { flex: 1 },

  campoWrapper: { marginBottom: 18 },
  campoLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  campoLabel: { fontSize: 11, fontWeight: '700', color: '#9163CB', letterSpacing: 1.2 },
  tagOpcional: { backgroundColor: '#F0EAFF', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  tagOpcionalTexto: { fontSize: 9, fontWeight: '700', color: '#9163CB', textTransform: 'uppercase' },

  input: {
    borderWidth: 1.5, borderColor: '#C4B5FD', borderRadius: 50,
    paddingHorizontal: 20,
    paddingVertical: Platform.OS === 'ios' ? 16 : 13,
    fontSize: 15, color: '#301971', backgroundColor: '#FAFAFE',
  },
  inputMultiline: {
    borderRadius: 20, minHeight: 96,
    paddingTop: 14, textAlignVertical: 'top',
  },
  inputErro: { borderColor: '#f87171', backgroundColor: '#FFF5F5' },

  botaoArquivo: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1.5, borderColor: '#C4B5FD', borderStyle: 'dashed',
    borderRadius: 20, paddingVertical: 20, backgroundColor: '#FAFAFE',
  },
  botaoArquivoTexto: { fontSize: 14, fontWeight: '600', color: '#6B49AD' },

  erroRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6, marginLeft: 16 },
  erroTexto: { fontSize: 12, color: '#dc2626', fontWeight: '600' },

  botaoSalvarWrapper: {
    marginTop: 8,
    shadowColor: '#481D94',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  botaoSalvar: { borderRadius: 50, paddingVertical: 18, alignItems: 'center' },
  botaoSalvarTexto: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 2 },

  modalExcluirFundo: { flex: 1, backgroundColor: '#00000066', justifyContent: 'flex-end' },
  modalExcluirCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 32, alignItems: 'center', gap: 12,
  },
  modalExcluirIcone: {
    width: 72, height: 72, borderRadius: 24, backgroundColor: '#FFF1F2',
    justifyContent: 'center', alignItems: 'center', marginBottom: 8,
  },
  modalExcluirTitulo: { fontSize: 20, fontWeight: '800', color: '#301971' },
  modalExcluirMsg: { fontSize: 15, color: '#6B49AD', marginBottom: 8 },
  btnExcluirConfirmar: {
    width: '100%', backgroundColor: '#dc2626',
    borderRadius: 50, paddingVertical: 18, alignItems: 'center',
  },
  btnExcluirConfirmarTexto: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 2 },
  btnCancelar: { paddingVertical: 14 },
  btnCancelarTexto: { fontSize: 15, fontWeight: '600', color: '#9163CB' },
  previewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFE',
    borderRadius: 20,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#C4B5FD',
    gap: 12,
  },
  previewImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2D9F3',
  },
  pdfIconeBox: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#FFEBEE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pdfIconeTexto: {
    fontSize: 9,
    fontWeight: '800',
    color: '#dc2626',
    marginTop: 2,
  },
  previewDetalhes: {
    flex: 1,
    justifyContent: 'center',
    gap: 6,
  },
  previewNome: {
    fontSize: 14,
    fontWeight: '700',
    color: '#301971',
  },
  removerArquivoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  removerArquivoTexto: {
    fontSize: 12,
    fontWeight: '700',
    color: '#dc2626',
  },
  cardThumbnailContainer: {
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2D9F3',
    width: 120,
    height: 80,
  },
  cardThumbnail: {
    width: '100%',
    height: '100%',
  },
})