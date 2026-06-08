import { Feather } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router'
import * as DocumentPicker from 'expo-document-picker'
import * as FileSystem from 'expo-file-system/legacy'
import { decode } from 'base64-arraybuffer'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Animated, Dimensions, Image, KeyboardAvoidingView, Modal,
  Platform, ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import ModalAlerta from '../../src/components/ModalAlerta'
import { supabase } from '../../src/lib/supabase'
import { salvarHistorico } from '../../src/lib/events'
import { reagendarTodasNotificacoes } from '../../src/lib/notifications'

const { height, width } = Dimensions.get('window')

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Exame = {
  id: number
  nome: string
  data_realizacao: string
  horario: string | null
  data_resultado: string | null
  local: string | null
  arquivo_url: string | null
}

type ArquivoLocal = {
  uri: string
  nome: string
  ext: string
}

type Filtro = 'proximos' | 'realizados' | 'todos'

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

function mascaraHorario(texto: string): string {
  const n = texto.replace(/\D/g, '').slice(0, 4)
  return n.length <= 2 ? n : `${n.slice(0, 2)}:${n.slice(2)}`
}

function formatarHorario(horario: string | null): string {
  if (!horario) return ''
  return horario.slice(0, 5)
}

/**
 * Retorna true se o exame já passou (realizado).
 * Compara data+hora atual com data+hora do exame.
 * Se não tiver horário, considera o fim do dia (23:59).
 */
function jaPassou(exame: Exame): boolean {
  const agora = new Date()
  const [ano, mes, dia] = exame.data_realizacao.split('-').map(Number)
  const horarioStr = exame.horario ? exame.horario.slice(0, 5) : '23:59'
  const [hora, minuto] = horarioStr.split(':').map(Number)
  const dataExame = new Date(ano, mes - 1, dia, hora, minuto)
  return dataExame < agora
}

/**
 * Converte um exame para Date para ordenação.
 */
function toDate(exame: Exame): Date {
  const [ano, mes, dia] = exame.data_realizacao.split('-').map(Number)
  const horarioStr = exame.horario ? exame.horario.slice(0, 5) : '00:00'
  const [hora, minuto] = horarioStr.split(':').map(Number)
  return new Date(ano, mes - 1, dia, hora, minuto)
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
        placeholderTextColor="#9163CB"
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

// ─── Card de exame colapsável ─────────────────────────────────────────────────

function CardExame({
  exame,
  onEditar,
  onExcluir,
  onVerArquivo,
}: {
  exame: Exame
  onEditar: () => void
  onExcluir: () => void
  onVerArquivo: (url: string, isImage: boolean) => void
}) {
  const [expandido, setExpandido] = useState(false)
  const isFuturo = !jaPassou(exame)

  const temDetalhes = !!(exame.local || exame.data_resultado || exame.arquivo_url)

  return (
    <View style={styles.card}>
      {/* Topo sempre visível */}
      <View style={styles.cardTopo}>
        <LinearGradient
          colors={isFuturo ? ['#6B49AD', '#481D94'] : ['#9163CB', '#7C4FBD']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.cardIconeBox}
        >
          <Feather name="file-text" size={22} color="#fff" />
        </LinearGradient>
        <View style={styles.cardTextos}>
          <Text style={styles.cardNome}>{exame.nome}</Text>
          {exame.local ? (
            <Text style={styles.cardSubtitulo}>{exame.local}</Text>
          ) : null}
        </View>
        <View style={styles.cardAcoes}>
          <TouchableOpacity style={styles.btnEditar} onPress={onEditar}>
            <Feather name="edit-2" size={17} color="#6B49AD" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnExcluirCard} onPress={onExcluir}>
            <Feather name="trash-2" size={17} color="#dc2626" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.cardDivisor} />

      {/* Infos sempre visíveis */}
      <View style={styles.cardInfos}>
        {/* Badge próximo/realizado */}
        <View style={isFuturo ? styles.badgeProxima : styles.badgeRealizada}>
          <Feather name={isFuturo ? 'clock' : 'check-circle'} size={11} color={isFuturo ? '#185FA5' : '#6B49AD'} />
          <Text style={isFuturo ? styles.badgeProximaTexto : styles.badgeRealizadaTexto}>
            {isFuturo ? 'Próximo' : 'Realizado'}
          </Text>
        </View>

        {exame.data_realizacao ? (
          <View style={styles.infoLinha}>
            <Feather name="calendar" size={15} color="#6B49AD" />
            <Text style={styles.infoLinhaLabel}>Data e Hora</Text>
            <Text style={styles.infoLinhaTexto}>
              {formatarDataParaTela(exame.data_realizacao)}
              {exame.horario ? ` às ${formatarHorario(exame.horario)}` : ''}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Detalhes expandidos */}
      {expandido && temDetalhes && (
        <View style={styles.cardDetalhes}>
          <View style={styles.cardDivisor} />
          {exame.data_resultado ? (
            <View style={styles.infoLinha}>
              <Feather name="check-circle" size={15} color="#6B49AD" />
              <Text style={styles.infoLinhaLabel}>Result.</Text>
              <Text style={styles.infoLinhaTexto}>{formatarDataParaTela(exame.data_resultado)}</Text>
            </View>
          ) : null}
          {exame.local ? (
            <View style={styles.infoLinha}>
              <Feather name="map-pin" size={15} color="#6B49AD" />
              <Text style={styles.infoLinhaLabel}>Local</Text>
              <Text style={styles.infoLinhaTexto}>{exame.local}</Text>
            </View>
          ) : null}
          {exame.arquivo_url ? (
            <TouchableOpacity
              onPress={() => onVerArquivo(exame.arquivo_url!, isImageUrl(exame.arquivo_url!))}
              activeOpacity={0.75}
              style={styles.btnArquivoCard}
            >
              <View style={styles.btnArquivoCardIcone}>
                {isImageUrl(exame.arquivo_url) ? (
                  <Feather name="image" size={16} color="#6B49AD" />
                ) : (
                  <Feather name="file-text" size={16} color="#dc2626" />
                )}
              </View>
              <Text style={styles.btnArquivoCardTexto}>
                {isImageUrl(exame.arquivo_url) ? 'Ver imagem' : 'Ver PDF'}
              </Text>
              <Feather name="external-link" size={14} color="#6B49AD" style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>
          ) : null}
        </View>
      )}

      {/* Botão ver mais / ver menos */}
      {temDetalhes && (
        <TouchableOpacity
          onPress={() => setExpandido(e => !e)}
          activeOpacity={0.7}
          style={styles.verMaisBtn}
        >
          <Text style={styles.verMaisTexto}>{expandido ? 'Ver menos' : 'Ver mais'}</Text>
          <Feather name={expandido ? 'chevron-up' : 'chevron-down'} size={14} color="#6B49AD" />
        </TouchableOpacity>
      )}
    </View>
  )
}

// ─── Modal visualizador de arquivo ───────────────────────────────────────────

function ModalVisualizarArquivo({
  visivel,
  url,
  isImage,
  onFechar,
}: {
  visivel: boolean
  url: string
  isImage: boolean
  onFechar: () => void
}) {
  return (
    <Modal visible={visivel} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.viewerFundo}>
        <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
          {/* Header */}
          <View style={styles.viewerHeader}>
            <TouchableOpacity onPress={onFechar} style={styles.viewerFechar} activeOpacity={0.8}>
              <Feather name="x" size={22} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.viewerTitulo} numberOfLines={1}>
              {isImage ? 'Imagem' : 'Documento'}
            </Text>
            <TouchableOpacity
              onPress={() => import('expo-web-browser').then(wb => wb.openBrowserAsync(url))}
              style={styles.viewerAbrirExterno}
              activeOpacity={0.8}
            >
              <Feather name="external-link" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Conteúdo */}
          <View style={styles.viewerConteudo}>
            {isImage ? (
              <Image
                source={{ uri: url }}
                style={styles.viewerImagem}
                resizeMode="contain"
              />
            ) : (
              // Para PDFs: exibe botão para abrir no browser externo + preview de ícone
              <View style={styles.viewerPdfContainer}>
                <View style={styles.viewerPdfIcone}>
                  <Feather name="file-text" size={64} color="#dc2626" />
                  <Text style={styles.viewerPdfLabel}>PDF</Text>
                </View>
                <Text style={styles.viewerPdfTexto}>
                  Visualização de PDF disponível no navegador externo
                </Text>
                <TouchableOpacity
                  onPress={() => import('expo-web-browser').then(wb => wb.openBrowserAsync(url))}
                  activeOpacity={0.85}
                  style={styles.viewerPdfBotao}
                >
                  <LinearGradient
                    colors={['#6B49AD', '#481D94']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={styles.viewerPdfBotaoGradient}
                  >
                    <Feather name="external-link" size={16} color="#fff" />
                    <Text style={styles.viewerPdfBotaoTexto}>Abrir PDF</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  )
}

// ─── Tela principal ───────────────────────────────────────────────────────────

export default function Exames() {
  const { action } = useLocalSearchParams()

  const [usuarioId, setUsuarioId] = useState<string | null>(null)
  const [lista, setLista] = useState<Exame[]>([])
  const [perfilFoto, setPerfilFoto] = useState<string | null>(null)
  const [filtro, setFiltro] = useState<Filtro>('proximos')

  const [modalVisivel, setModalVisivel] = useState(false)
  const [editando, setEditando] = useState<Exame | null>(null)
  const slideAnim = useRef(new Animated.Value(height)).current

  // ── Campos do form ────────────────────────────────────────────────────────
  const [nome, setNome] = useState('')
  const [dataRealizacao, setDataRealizacao] = useState('')
  const [horario, setHorario] = useState('')
  const [dataResultado, setDataResultado] = useState('')
  const [local, setLocal] = useState('')

  const [arquivoLocal, setArquivoLocal] = useState<ArquivoLocal | null>(null)
  const [arquivoUrlRemota, setArquivoUrlRemota] = useState<string | null>(null)
  const [arquivoNome, setArquivoNome] = useState('')

  const [carregando, setCarregando] = useState(false)
  const [modalExcluir, setModalExcluir] = useState(false)
  const [excluirId, setExcluirId] = useState<number | null>(null)
  const [erros, setErros] = useState<Record<string, boolean>>({})
  const [modalAlerta, setModalAlerta] = useState({ visivel: false, titulo: '', mensagem: '' })
  const [modalSucesso, setModalSucesso] = useState({ visivel: false, titulo: '', mensagem: '' })

  // ── Visualizador de arquivo ───────────────────────────────────────────────
  const [viewerVisivel, setViewerVisivel] = useState(false)
  const [viewerUrl, setViewerUrl] = useState('')
  const [viewerIsImage, setViewerIsImage] = useState(false)

  const arquivoUrlAtual = arquivoLocal?.uri ?? arquivoUrlRemota ?? ''

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
      .select('id, nome, data_realizacao, horario, data_resultado, local, arquivo_url')
      .eq('usuario_id', id)
      .order('data_realizacao', { ascending: true })
    if (error) { console.error('Erro ao buscar:', error.message); return }
    if (rows) setLista(rows as Exame[])
  }

  // ── Filtro e ordenação ────────────────────────────────────────────────────

  const listaFiltrada = (() => {
    let filtradas = lista.filter((e) => {
      if (filtro === 'proximos') return !jaPassou(e)
      if (filtro === 'realizados') return jaPassou(e)
      return true
    })

    if (filtro === 'proximos') {
      filtradas = [...filtradas].sort((a, b) => toDate(a).getTime() - toDate(b).getTime())
    } else if (filtro === 'realizados') {
      filtradas = [...filtradas].sort((a, b) => toDate(b).getTime() - toDate(a).getTime())
    } else {
      filtradas = [...filtradas].sort((a, b) => {
        const aPassou = jaPassou(a)
        const bPassou = jaPassou(b)
        if (!aPassou && !bPassou) return toDate(a).getTime() - toDate(b).getTime()
        if (aPassou && bPassou) return toDate(b).getTime() - toDate(a).getTime()
        return aPassou ? 1 : -1
      })
    }

    return filtradas
  })()

  const filtroLabels: Record<Filtro, string> = {
    proximos: 'Próximos',
    realizados: 'Realizados',
    todos: 'Todos',
  }

  // ── Modal ─────────────────────────────────────────────────────────────────

  function resetForm() {
    setNome('')
    setDataRealizacao('')
    setHorario('')
    setDataResultado('')
    setLocal('')
    setArquivoLocal(null)
    setArquivoUrlRemota(null)
    setArquivoNome('')
    setErros({})
  }

  function abrirModal(exame?: Exame) {
    setEditando(exame ?? null)
    if (exame) {
      setNome(exame.nome)
      setDataRealizacao(formatarDataParaTela(exame.data_realizacao))
      setHorario(formatarHorario(exame.horario))
      setDataResultado(exame.data_resultado ? formatarDataParaTela(exame.data_resultado) : '')
      setLocal(exame.local ?? '')
      setArquivoLocal(null)
      setArquivoUrlRemota(exame.arquivo_url ?? null)
      if (exame.arquivo_url) {
        const parts = exame.arquivo_url.split('/')
        const nameWithQuery = parts[parts.length - 1]
        setArquivoNome(decodeURIComponent(nameWithQuery.split('?')[0]))
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
    if (!horario || horario.length < 5) novosErros.horario = true
    setErros(novosErros)
    if (Object.keys(novosErros).length > 0) {
      setModalAlerta({ visivel: true, titulo: 'Campos obrigatórios', mensagem: 'Preencha todos os campos destacados antes de continuar.' })
      return false
    }
    return true
  }

  // ── Escolher arquivo ──────────────────────────────────────────────────────

  async function escolherArquivo() {
    try {
      const resultado = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      })
      if (!resultado.canceled && resultado.assets && resultado.assets.length > 0) {
        const asset = resultado.assets[0]
        const nomeArq = asset.name || 'arquivo'
        const parts = nomeArq.split('.')
        const extRaw = parts.length > 1 ? parts.pop()!.toLowerCase() : 'pdf'
        const ext = ['pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp'].includes(extRaw) ? extRaw : 'pdf'
        setArquivoLocal({ uri: asset.uri, nome: nomeArq, ext })
        setArquivoUrlRemota(null)
        setArquivoNome(nomeArq)
      }
    } catch (err) {
      console.error('Erro ao escolher arquivo:', err)
      setModalAlerta({ visivel: true, titulo: 'Erro', mensagem: 'Não foi possível selecionar o arquivo.' })
    }
  }

  function removerArquivo() {
    setArquivoLocal(null)
    setArquivoUrlRemota(null)
    setArquivoNome('')
  }

  // ── Visualizar arquivo ────────────────────────────────────────────────────

  function abrirVisualizador(url: string, isImage: boolean) {
    setViewerUrl(url)
    setViewerIsImage(isImage)
    setViewerVisivel(true)
  }

  // ── Salvar ────────────────────────────────────────────────────────────────

  async function salvar() {
    if (!validar()) return
    if (!usuarioId) { setModalAlerta({ visivel: true, titulo: 'Erro', mensagem: 'Usuário não autenticado.' }); router.replace('/auth'); return }

    setCarregando(true)
    try {
      let urlFinal: string | null = arquivoUrlRemota

      if (arquivoLocal) {
        const { uri, nome: nomeArq, ext } = arquivoLocal
        const fileContent = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        })

        const fileName = `${usuarioId}_${Date.now()}.${ext}`

        let contentType = 'application/octet-stream'
        if (ext === 'pdf') {
          contentType = 'application/pdf'
        } else if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
          contentType = `image/${ext === 'jpg' ? 'jpeg' : ext}`
        }

        const { error: uploadError } = await supabase.storage
          .from('exames_arquivos')
          .upload(fileName, decode(fileContent), { contentType, upsert: true })

        if (uploadError) throw new Error('Falha no upload do arquivo.')

        const { data: { publicUrl } } = supabase.storage
          .from('exames_arquivos')
          .getPublicUrl(fileName)

        urlFinal = publicUrl
      }

      const payload = {
        usuario_id: usuarioId,
        nome: nome.trim(),
        data_realizacao: converterData(dataRealizacao),
        horario: horario.trim() || null,
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
      await reagendarTodasNotificacoes(usuarioId!).catch(console.error)
      setModalSucesso({
        visivel: true,
        titulo: editando ? 'Exame atualizado!' : 'Exame cadastrado!',
        mensagem: editando ? `${nome.trim()} foi atualizado com sucesso.` : `${nome.trim()} foi cadastrado.`,
      })
    } catch (err: any) {
      console.error('Erro ao salvar:', err.message)
      setModalAlerta({ visivel: true, titulo: 'Erro ao salvar', mensagem: err.message ?? 'Tente novamente.' })
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
    if (error) { setModalAlerta({ visivel: true, titulo: 'Erro ao excluir', mensagem: error.message }); return }
    if (exa) {
      await salvarHistorico(usuarioId!, `Exame ${exa.nome} foi removido`)
    }
    setModalExcluir(false)
    setExcluirId(null)
    await buscar()
    await reagendarTodasNotificacoes(usuarioId!).catch(console.error)
    setModalSucesso({
      visivel: true,
      titulo: 'Exame excluído!',
      mensagem: `O exame ${exa?.nome ?? 'selecionado'} foi removido com sucesso.`,
    })
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>

        {/* Card Perfil */}
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

        {/* Título */}
        <LinearGradient
          colors={['#6B49AD', '#6843B1', '#481D94']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={styles.cardTituloLista}
        >
          <Text style={styles.cardTituloTexto}>EXAMES</Text>
        </LinearGradient>

        {/* Filtros */}
        <View style={styles.filtrosRow}>
          {(['proximos', 'realizados', 'todos'] as Filtro[]).map((f) => (
            <TouchableOpacity
              key={f}
              onPress={() => setFiltro(f)}
              activeOpacity={0.8}
              style={[styles.chip, filtro === f && styles.chipAtivo]}
            >
              {filtro === f ? (
                <LinearGradient
                  colors={['#6B49AD', '#481D94']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.chipGradient}
                >
                  <Text style={styles.chipTextoAtivo}>{filtroLabels[f]}</Text>
                </LinearGradient>
              ) : (
                <View style={styles.chipInner}>
                  <Text style={styles.chipTexto}>{filtroLabels[f]}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Lista */}
        <View style={styles.cardLista}>
          {listaFiltrada.length === 0 ? (
            <View style={styles.vazioContainer}>
              <View style={styles.vazioIcone}>
                <Feather name="file-text" size={36} color="#9163CB" />
              </View>
              <Text style={styles.vazioTitulo}>
                {filtro === 'proximos' ? 'Nenhum exame futuro'
                  : filtro === 'realizados' ? 'Nenhum exame realizado'
                  : 'Nenhum exame'}
              </Text>
              <Text style={styles.vazioSub}>Toque em "+" para adicionar</Text>
            </View>
          ) : (
            listaFiltrada.map((exame) => (
              <CardExame
                key={exame.id}
                exame={exame}
                onEditar={() => abrirModal(exame)}
                onExcluir={() => confirmarExcluir(exame.id)}
                onVerArquivo={abrirVisualizador}
              />
            ))
          )}
        </View>

      </ScrollView>

      {/* FAB fixo no canto inferior direito */}
      <TouchableOpacity
        onPress={() => abrirModal()}
        activeOpacity={0.85}
        style={styles.fab}
      >
        <LinearGradient
          colors={['#6B49AD', '#481D94']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.fabGradient}
        >
          <Feather name="plus" size={26} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      {/* Modal cadastro/edição */}
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
                <View style={[styles.coluna, { flex: 3 }]}>
                  <Campo
                    label="DATA REALIZAÇÃO"
                    value={dataRealizacao}
                    onChangeText={(t) => { setDataRealizacao(mascaraData(t)); setErros(p => ({ ...p, dataRealizacao: false })) }}
                    placeholder="DD/MM/AAAA"
                    keyboardType="numeric"
                    erro={erros.dataRealizacao}
                  />
                </View>
                <View style={[styles.coluna, { flex: 2 }]}>
                  <Campo
                    label="HORÁRIO"
                    value={horario}
                    onChangeText={(t) => { setHorario(mascaraHorario(t)); setErros(p => ({ ...p, horario: false })) }}
                    placeholder="HH:MM"
                    keyboardType="numeric"
                    erro={erros.horario}
                  />
                </View>
              </View>

              <Campo
                label="DATA RESULTADO"
                value={dataResultado}
                onChangeText={(t) => setDataResultado(mascaraData(t))}
                placeholder="DD/MM/AAAA"
                keyboardType="numeric"
                opcional
              />

              <Campo
                label="LOCAL"
                value={local}
                onChangeText={setLocal}
                placeholder="Ex: Laboratório Central"
                opcional
              />

              {/* Campo arquivo */}
              <View style={styles.campoWrapper}>
                <View style={styles.campoLabelRow}>
                  <Text style={styles.campoLabel}>ARQUIVO</Text>
                  <View style={styles.tagOpcional}>
                    <Text style={styles.tagOpcionalTexto}>opcional</Text>
                  </View>
                </View>
                {arquivoUrlAtual ? (
                  <View style={styles.previewContainer}>
                    {isImageUrl(arquivoUrlAtual) ? (
                      <Image source={{ uri: arquivoUrlAtual }} style={styles.previewImage} resizeMode="cover" />
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
                      <TouchableOpacity onPress={removerArquivo} style={styles.removerArquivoBtn}>
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

      {/* Modal excluir */}
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

      {/* Modal visualizador de arquivo */}
      <ModalVisualizarArquivo
        visivel={viewerVisivel}
        url={viewerUrl}
        isImage={viewerIsImage}
        onFechar={() => setViewerVisivel(false)}
      />

      {/* Modal de alerta (erro/validação) */}
      <ModalAlerta
        visivel={modalAlerta.visivel}
        titulo={modalAlerta.titulo}
        mensagem={modalAlerta.mensagem}
        onFechar={() => setModalAlerta({ visivel: false, titulo: '', mensagem: '' })}
      />

      {/* Modal de sucesso */}
      <ModalAlerta
        visivel={modalSucesso.visivel}
        titulo={modalSucesso.titulo}
        mensagem={modalSucesso.mensagem}
        onFechar={() => setModalSucesso({ visivel: false, titulo: '', mensagem: '' })}
      />

    </SafeAreaView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F0FF' },

  // ── Header ────────────────────────────────────────────────────────────────
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

  // ── Título ────────────────────────────────────────────────────────────────
  cardTituloLista: {
    marginHorizontal: 16, marginTop: 12, borderRadius: 50,
    paddingVertical: 14, alignItems: 'center',
    shadowColor: '#481D94', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 5,
  },
  cardTituloTexto: { fontSize: 14, fontWeight: '800', color: '#fff', letterSpacing: 3 },

  // ── Filtros ───────────────────────────────────────────────────────────────
  filtrosRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    gap: 8,
  },
  chip: {
    flex: 1,
    borderRadius: 999,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#6B49AD',
  },
  chipAtivo: {
    borderColor: 'transparent',
    shadowColor: '#481D94',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  chipGradient: { paddingVertical: 10, alignItems: 'center' },
  chipInner: { paddingVertical: 10, alignItems: 'center', backgroundColor: 'rgba(107,73,173,0.08)' },
  chipTexto: { fontSize: 12, fontWeight: '700', color: '#481D94' },
  chipTextoAtivo: { fontSize: 12, fontWeight: '700', color: '#fff' },

  // ── FAB ───────────────────────────────────────────────────────────────────
  fab: {
    position: 'absolute',
    bottom: 28,
    right: 24,
    borderRadius: 999,
    shadowColor: '#481D94',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  fabGradient: {
    width: 60,
    height: 60,
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Lista ─────────────────────────────────────────────────────────────────
  cardLista: {
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 16,
    shadowColor: '#6B49AD',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    gap: 12,
  },
  vazioContainer: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  vazioIcone: {
    width: 76, height: 76, borderRadius: 24, backgroundColor: '#EDE8FA',
    justifyContent: 'center', alignItems: 'center', marginBottom: 4,
  },
  vazioTitulo: { fontSize: 17, fontWeight: '700', color: '#301971' },
  vazioSub: { fontSize: 14, color: '#9163CB' },

  // ── Card colapsável ───────────────────────────────────────────────────────
  card: {
    backgroundColor: '#FAFAFE', borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: '#EDE8FA',
  },
  cardTopo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardIconeBox: { width: 46, height: 46, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  cardTextos: { flex: 1, gap: 4 },
  cardNome: { fontSize: 16, fontWeight: '700', color: '#301971' },
  cardSubtitulo: { fontSize: 13, color: '#6B49AD', fontWeight: '600' },
  cardAcoes: { flexDirection: 'row', gap: 8 },
  btnEditar: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: '#F0EAFF', justifyContent: 'center', alignItems: 'center',
  },
  btnExcluirCard: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: '#FFF1F2', justifyContent: 'center', alignItems: 'center',
  },
  cardDivisor: { height: 1, backgroundColor: '#F0EAFF', marginVertical: 12 },
  cardInfos: { gap: 8 },
  cardDetalhes: { gap: 10 },

  infoLinha: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoLinhaLabel: { fontSize: 13, fontWeight: '700', color: '#9163CB', flexShrink: 0, marginRight: 4 },
  infoLinhaTexto: { fontSize: 13, color: '#301971', fontWeight: '600', flex: 1 },

  badgeProxima: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-start', backgroundColor: '#E6F1FB',
    borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4,
  },
  badgeProximaTexto: { fontSize: 11, fontWeight: '700', color: '#185FA5' },
  badgeRealizada: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-start', backgroundColor: '#EDE8FA',
    borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4,
  },
  badgeRealizadaTexto: { fontSize: 11, fontWeight: '700', color: '#6B49AD' },

  verMaisBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, marginTop: 10, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: '#F0EAFF',
  },
  verMaisTexto: { fontSize: 13, fontWeight: '700', color: '#6B49AD' },

  // Botão arquivo no card
  btnArquivoCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#F0EAFF', borderRadius: 14,
    paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: '#E2D9F3',
  },
  btnArquivoCardIcone: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center',
  },
  btnArquivoCardTexto: { fontSize: 13, fontWeight: '700', color: '#481D94', flex: 1 },

  // ── Modal form ───────────────────────────────────────────────────────────
  modalFundo: { flex: 1 },
  modalOverlay: { flex: 1, backgroundColor: '#00000055' },
  modalCard: {
    backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
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
  campoLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  campoLabel: { fontSize: 11, fontWeight: '700', color: '#9163CB', letterSpacing: 1.2 },

  tagOpcional: {
    backgroundColor: '#EDE8FA', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3,
    borderWidth: 1, borderColor: '#C4B5FD',
  },
  tagOpcionalTexto: { fontSize: 10, fontWeight: '700', color: '#481D94', letterSpacing: 0.5 },
  input: {
    borderWidth: 1.5, borderColor: '#481D94', borderRadius: 50,
    paddingHorizontal: 20, paddingVertical: Platform.OS === 'ios' ? 16 : 13,
    fontSize: 15, color: '#301971', backgroundColor: '#FAFAFE',
  },
  inputMultiline: { borderRadius: 20, minHeight: 96, paddingTop: 14, textAlignVertical: 'top' },
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
    shadowColor: '#481D94', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  botaoSalvar: { borderRadius: 50, paddingVertical: 18, alignItems: 'center' },
  botaoSalvarTexto: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 2 },

  previewContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FAFAFE', borderRadius: 20, padding: 12,
    borderWidth: 1.5, borderColor: '#C4B5FD', gap: 12,
  },
  previewImage: {
    width: 60, height: 60, borderRadius: 12,
    borderWidth: 1, borderColor: '#E2D9F3',
  },
  pdfIconeBox: {
    width: 60, height: 60, borderRadius: 12,
    backgroundColor: '#FFEBEE', justifyContent: 'center', alignItems: 'center',
  },
  pdfIconeTexto: { fontSize: 9, fontWeight: '800', color: '#dc2626', marginTop: 2 },
  previewDetalhes: { flex: 1, justifyContent: 'center', gap: 6 },
  previewNome: { fontSize: 14, fontWeight: '700', color: '#301971' },
  removerArquivoBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  removerArquivoTexto: { fontSize: 12, fontWeight: '700', color: '#dc2626' },

  // ── Modal excluir ────────────────────────────────────────────────────────
  modalExcluirFundo: { flex: 1, backgroundColor: '#00000066', justifyContent: 'flex-end' },
  modalExcluirCard: {
    backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
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

  // ── Visualizador de arquivo ───────────────────────────────────────────────
  viewerFundo: {
    flex: 1,
    backgroundColor: '#000',
  },
  viewerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  viewerFechar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  viewerTitulo: {
    flex: 1, fontSize: 16, fontWeight: '700', color: '#fff', textAlign: 'center',
  },
  viewerAbrirExterno: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  viewerConteudo: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerImagem: {
    width: width,
    height: height * 0.75,
  },
  viewerPdfContainer: {
    alignItems: 'center',
    padding: 32,
    gap: 20,
  },
  viewerPdfIcone: {
    width: 120, height: 120, borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center',
  },
  viewerPdfLabel: {
    fontSize: 11, fontWeight: '800', color: '#dc2626',
    marginTop: 6, letterSpacing: 2,
  },
  viewerPdfTexto: {
    fontSize: 15, color: 'rgba(255,255,255,0.7)',
    textAlign: 'center', lineHeight: 22,
  },
  viewerPdfBotao: {
    borderRadius: 999,
    shadowColor: '#481D94', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 10, elevation: 6,
    marginTop: 8,
  },
  viewerPdfBotaoGradient: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 999, paddingHorizontal: 28, paddingVertical: 16,
  },
  viewerPdfBotaoTexto: { fontSize: 15, fontWeight: '800', color: '#fff', letterSpacing: 1 },
})