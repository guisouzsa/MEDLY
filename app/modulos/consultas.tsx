import { Feather } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Alert,
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
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import ModalAlerta from '../../src/components/ModalAlerta'
import { supabase } from '../../src/lib/supabase'

const { height, width } = Dimensions.get('window')
const CARD_W = Math.min(width * 0.88, 420)

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Consulta = {
  id: number
  usuario_id: string
  especialidade: string
  nome_medico: string
  data: string
  horario: string
  local?: string
  observacoes?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function converterData(data: string): string | null {
  if (!data || data.length < 10) return null
  const [d, m, a] = data.split('/')
  if (!d || !m || !a) return null
  return `${a}-${m}-${d}`
}

function formatarDataParaTela(data: string): string {
  if (!data) return ''
  const [a, m, d] = data.split('-')
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

// ─── Componentes de Formulário ────────────────────────────────────────────────

function Campo({
  label, value, onChangeText, placeholder, keyboardType = 'default' as any,
  opcional = false, dica, obrigatorio = false, erro,
}: {
  label: string
  value: string
  onChangeText: (t: string) => void
  placeholder?: string
  keyboardType?: any
  opcional?: boolean
  obrigatorio?: boolean
  dica?: string
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
        {obrigatorio && (
          <View style={styles.tagObrigatorio}>
            <Text style={styles.tagObrigatorioTexto}>obrigatório</Text>
          </View>
        )}
      </View>
      <TextInput
        style={[styles.input, erro && styles.inputErro]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#C4B5FD"
        keyboardType={keyboardType}
        autoCorrect={false}
      />
      {erro && (
        <View style={styles.erroRow}>
          <Feather name="alert-circle" size={13} color="#dc2626" />
          <Text style={styles.erroTexto}>Este campo é obrigatório</Text>
        </View>
      )}
      {dica && !erro && <Text style={styles.dicaTexto}>{dica}</Text>}
    </View>
  )
}

// ─── Componente Principal ────────────────────────────────────────────────────

export default function Consultas() {
  const { abrir } = useLocalSearchParams()

  const [usuarioId, setUsuarioId] = useState<string | null>(null)
  const [lista, setLista] = useState<Consulta[]>([])
  const [perfilFoto, setPerfilFoto] = useState<string | null>(null)
  const [perfilNome, setPerfilNome] = useState<string>('')

  const [modalVisivel, setModalVisivel] = useState(false)
  const [editando, setEditando] = useState<Consulta | null>(null)
  const slideAnim = useRef(new Animated.Value(height)).current

  // ── Campos do form ────────────────────────────────────────────────────────
  const [especialidade, setEspecialidade] = useState('')
  const [nomeMedico, setNomeMedico] = useState('')
  const [dataConsulta, setDataConsulta] = useState('')
  const [horario, setHorario] = useState('')
  const [local, setLocal] = useState('')
  const [observacoes, setObservacoes] = useState('')

  const [carregando, setCarregando] = useState(false)
  const [modalExcluir, setModalExcluir] = useState(false)
  const [excluirId, setExcluirId] = useState<number | null>(null)
  const [erros, setErros] = useState<Record<string, boolean>>({})
  const [alerta, setAlerta] = useState({ visivel: false, titulo: '', mensagem: '' })

  function mostrarAlerta(titulo: string, mensagem: string) {
    setAlerta({ visivel: true, titulo, mensagem })
  }

  // ── Init ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (abrir === 'true') abrirModal()
  }, [abrir])

  useFocusEffect(
    useCallback(() => {
      async function init() {
        const { data: { user }, error } = await supabase.auth.getUser()
        if (error || !user) { router.replace('/auth'); return }
        setUsuarioId(user.id)

        // Busca perfil
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

  // ── Buscar ────────────────────────────────────────────────────────────────

  async function buscar(uid?: string) {
    const id = uid ?? usuarioId
    if (!id) return
    const { data, error } = await supabase
      .from('consultas')
      .select('*')
      .eq('usuario_id', id)
      .order('data', { ascending: true })
    if (error) { console.error('Erro ao buscar consultas:', error.message); return }
    if (data) setLista(data as Consulta[])
  }

  // ── Modal ─────────────────────────────────────────────────────────────────

  function resetForm() {
    setEspecialidade('')
    setNomeMedico('')
    setDataConsulta('')
    setHorario('')
    setLocal('')
    setObservacoes('')
    setErros({})
  }

  function abrirModal(item?: Consulta) {
    setEditando(item ?? null)
    if (item) {
      setEspecialidade(item.especialidade)
      setNomeMedico(item.nome_medico)
      setDataConsulta(item.data ? formatarDataParaTela(item.data) : '')
      setHorario(item.horario ?? '')
      setLocal(item.local ?? '')
      setObservacoes(item.observacoes ?? '')
      setErros({})
    } else {
      resetForm()
    }

    setModalVisivel(true)
    Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }).start()
  }

  function fecharModal() {
    Animated.timing(slideAnim, { toValue: height, duration: 280, useNativeDriver: true }).start(() => setModalVisivel(false))
  }

  // ── Validação ─────────────────────────────────────────────────────────────

  function validar(): boolean {
    const novosErros: Record<string, boolean> = {}

    if (!especialidade.trim()) novosErros.especialidade = true
    if (!nomeMedico.trim()) novosErros.nomeMedico = true
    if (!dataConsulta || dataConsulta.length < 10) novosErros.dataConsulta = true
    if (!horario || horario.length < 5) novosErros.horario = true

    setErros(novosErros)

    if (Object.keys(novosErros).length > 0) {
      Alert.alert('Campos obrigatórios', 'Preencha todos os campos destacados antes de continuar.')
      return false
    }
    return true
  }

  // ── Salvar ────────────────────────────────────────────────────────────────

  async function salvar() {
    if (!validar()) return
    if (!usuarioId) { Alert.alert('Erro', 'Usuário não autenticado.'); router.replace('/auth'); return }

    setCarregando(true)

    try {
      const payload = {
        usuario_id: usuarioId,
        especialidade: especialidade.trim(),
        nome_medico: nomeMedico.trim(),
        data: converterData(dataConsulta),
        horario: horario.trim(),
        local: local.trim() || null,
        observacoes: observacoes.trim() || null,
      }

      if (editando) {
        const { error } = await supabase
          .from('consultas')
          .update(payload)
          .eq('id', editando.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('consultas')
          .insert(payload)

        if (error) throw error
      }

      fecharModal()
      await buscar()
    } catch (e: any) {
      console.error('Erro ao salvar consulta:', e)
      mostrarAlerta('Erro ao salvar', e.message || 'Houve um erro ao registrar a consulta.')
    } finally {
      setCarregando(false)
    }
  }

  // ── Excluir ───────────────────────────────────────────────────────────────

  function confirmarExcluir(id: number) {
    setExcluirId(id)
    setModalExcluir(true)
  }

  async function excluir() {
    if (!excluirId) return
    setCarregando(true)
    try {
      const { error } = await supabase
        .from('consultas')
        .delete()
        .eq('id', excluirId)

      if (error) throw error

      setModalExcluir(false)
      setExcluirId(null)
      await buscar()
    } catch (e: any) {
      console.error('Erro ao excluir consulta:', e)
      mostrarAlerta('Erro ao excluir', e.message || 'Houve um erro ao remover a consulta.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Card 1 — Perfil + Logo */}
        <View style={styles.cardPerfil}>
          <View style={styles.cardPerfilConteudo}>
            <TouchableOpacity
              onPress={() => router.push('/modulos/perfil' as any)}
              activeOpacity={0.85}
            >
              {perfilFoto ? (
                <Image source={{ uri: perfilFoto }} style={styles.fotoPerfil} onError={() => setPerfilFoto(null)} />
              ) : (
                <View style={styles.fotoPerfilPlaceholder}>
                  <Feather name="user" size={28} color="#9163CB" />
                </View>
              )}
            </TouchableOpacity>
            <View style={styles.logoArea}>
              <Image
                source={require('../../assets/images/logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
              {perfilNome ? (
                <Text style={styles.perfilBoasVindas}>Olá, {perfilNome.split(' ')[0]} 👋</Text>
              ) : null}
            </View>
            <TouchableOpacity onPress={() => router.back()} style={styles.voltarBtn}>
              <Feather name="arrow-left" size={20} color="#6B49AD" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Card 2 — Título da listagem */}
        <View style={styles.cardTituloLista}>
          <LinearGradient
            colors={['#5E44A7', '#301971']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.degradeTitulo}
          >
            <View style={styles.degradeInfo}>
              <Text style={styles.degradeTag}>MÓDULO</Text>
              <Text style={styles.degradeNome}>CONSULTAS</Text>
            </View>
            <TouchableOpacity style={styles.degradeAddBtn} onPress={() => abrirModal()} activeOpacity={0.9}>
              <Feather name="plus" size={20} color="#6B49AD" />
              <Text style={styles.degradeAddTexto}>Nova</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>

        {/* Card 3 — Listagem */}
        <View style={styles.cardLista}>
          {carregando ? (
            <ActivityIndicator size="large" color="#6B49AD" style={{ marginVertical: 32 }} />
          ) : lista.length === 0 ? (
            <View style={styles.vazioContainer}>
              <View style={styles.vazioIcone}>
                <Feather name="calendar" size={32} color="#6B49AD" />
              </View>
              <Text style={styles.vazioTitulo}>Nenhuma consulta cadastrada</Text>
              <Text style={styles.vazioSub}>Cadastre suas consultas médicas para acompanhar sua agenda</Text>
            </View>
          ) : (
            lista.map((item) => (
              <View key={item.id} style={styles.itemCard}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemEspecialidade}>{item.especialidade.toUpperCase()}</Text>
                  <Text style={styles.itemMedico}>Dr(a). {item.nome_medico}</Text>
                  <View style={styles.itemMetaRow}>
                    <Feather name="calendar" size={13} color="#9163CB" />
                    <Text style={styles.itemMetaTexto}>{formatarDataParaTela(item.data)} às {item.horario}</Text>
                  </View>
                  {item.local && (
                    <View style={styles.itemMetaRow}>
                      <Feather name="map-pin" size={13} color="#9163CB" />
                      <Text style={styles.itemMetaTexto}>{item.local}</Text>
                    </View>
                  )}
                  {item.observacoes && (
                    <View style={styles.itemObsBox}>
                      <Text style={styles.itemObsTexto} numberOfLines={2}>{item.observacoes}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.itemAcoes}>
                  <TouchableOpacity style={styles.btnEditar} onPress={() => abrirModal(item)}>
                    <Feather name="edit-2" size={16} color="#6B49AD" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.btnExcluir} onPress={() => confirmarExcluir(item.id)}>
                    <Feather name="trash-2" size={16} color="#dc2626" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ─── MODAL DESLIZANTE DE CADASTRO/EDIÇÃO ─────────────────────────────── */}
      <Modal visible={modalVisivel} transparent animationType="none">
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={fecharModal} />
          <Animated.View style={[styles.modalConteudo, { transform: [{ translateY: slideAnim }] }]}>
            <View style={styles.linhaArrastar} />
            <Text style={styles.modalTitulo}>{editando ? 'EDITAR CONSULTA' : 'NOVA CONSULTA'}</Text>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
              <Campo
                label="ESPECIALIDADE MÉDICA"
                value={especialidade}
                onChangeText={(t) => { setEspecialidade(t); setErros(p => ({ ...p, especialidade: false })) }}
                placeholder="Ex: Cardiologista, Pediatra..."
                obrigatorio
                erro={erros.especialidade}
              />

              <Campo
                label="NOME DO MÉDICO / PROFISSIONAL"
                value={nomeMedico}
                onChangeText={(t) => { setNomeMedico(t); setErros(p => ({ ...p, nomeMedico: false })) }}
                placeholder="Ex: Dr. Carlos Silva"
                obrigatorio
                erro={erros.nomeMedico}
              />

              <View style={styles.rowCampos}>
                <View style={{ flex: 1 }}>
                  <Campo
                    label="DATA"
                    value={dataConsulta}
                    onChangeText={(t) => { setDataConsulta(mascaraData(t)); setErros(p => ({ ...p, dataConsulta: false })) }}
                    placeholder="Ex: 10/12/2026"
                    keyboardType="numeric"
                    obrigatorio
                    erro={erros.dataConsulta}
                  />
                </View>
                <View style={{ width: 16 }} />
                <View style={{ flex: 1 }}>
                  <Campo
                    label="HORÁRIO"
                    value={horario}
                    onChangeText={(t) => { setHorario(mascaraHorario(t)); setErros(p => ({ ...p, horario: false })) }}
                    placeholder="Ex: 14:30"
                    keyboardType="numeric"
                    obrigatorio
                    erro={erros.horario}
                  />
                </View>
              </View>

              <Campo
                label="LOCAL DA CONSULTA"
                value={local}
                onChangeText={setLocal}
                placeholder="Ex: Clínica Vida, Sala 304"
                opcional
              />

              <View style={styles.campoWrapper}>
                <Text style={styles.campoLabel}>OBSERVAÇÕES (OPCIONAL)</Text>
                <TextInput
                  style={[styles.input, styles.textarea]}
                  value={observacoes}
                  onChangeText={setObservacoes}
                  placeholder="Ex: Levar exames de sangue antigos..."
                  placeholderTextColor="#C4B5FD"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              {/* Botões do Modal */}
              <View style={styles.modalAcoesRow}>
                <TouchableOpacity style={styles.modalBtnVoltar} onPress={fecharModal}>
                  <Text style={styles.modalBtnVoltarTexto}>VOLTAR</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.modalBtnSalvarWrapper} onPress={salvar} disabled={carregando}>
                  <LinearGradient
                    colors={['#5E44A7', '#481D94', '#301971']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={styles.modalBtnSalvar}
                  >
                    <Text style={styles.modalBtnSalvarTexto}>
                      {carregando ? 'SALVANDO...' : 'SALVAR'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      {/* Modal Confirmar Exclusão */}
      <Modal visible={modalExcluir} transparent animationType="fade">
        <View style={styles.confirmFundo}>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitulo}>Excluir consulta</Text>
            <Text style={styles.confirmMensagem}>Tem certeza que deseja remover esta consulta? Essa ação não pode ser desfeita.</Text>
            <View style={styles.confirmAcoes}>
              <TouchableOpacity style={styles.confirmBtnCancelar} onPress={() => setModalExcluir(false)}>
                <Text style={styles.confirmBtnCancelarTexto}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtnExcluir} onPress={excluir} disabled={carregando}>
                <Text style={styles.confirmBtnExcluirTexto}>{carregando ? 'Excluindo...' : 'Sim, excluir'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ModalAlerta
        visivel={alerta.visivel}
        titulo={alerta.titulo}
        mensagem={alerta.mensagem}
        onFechar={() => setAlerta(m => ({ ...m, visivel: false }))}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F5F0FF',
  },
  cardPerfil: {
    backgroundColor: '#fff',
    borderRadius: 60,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 20,
    shadowColor: '#6B49AD',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  cardPerfilConteudo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fotoPerfil: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#E7DDFF',
  },
  fotoPerfilPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EDE8FA',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E7DDFF',
  },
  logoArea: {
    alignItems: 'center',
  },
  logo: {
    width: 100,
    height: 32,
  },
  perfilBoasVindas: {
    fontSize: 14,
    fontWeight: '700',
    color: '#301971',
    marginTop: 2,
  },
  voltarBtn: {
    padding: 8,
  },
  cardTituloLista: {
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#301971',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  degradeTitulo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  degradeInfo: {
    flex: 1,
  },
  degradeTag: {
    fontSize: 10,
    fontWeight: '700',
    color: '#D6B9FF',
    letterSpacing: 1,
    marginBottom: 4,
  },
  degradeNome: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 1,
  },
  degradeAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 50,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 4,
  },
  degradeAddTexto: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B49AD',
  },
  cardLista: {
    marginHorizontal: 16,
    gap: 14,
  },
  vazioContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingHorizontal: 32,
    shadowColor: '#6B49AD',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  vazioIcone: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#EDE8FA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  vazioTitulo: {
    fontSize: 16,
    fontWeight: '700',
    color: '#301971',
    textAlign: 'center',
    marginBottom: 8,
  },
  vazioSub: {
    fontSize: 13,
    color: '#9163CB',
    textAlign: 'center',
    lineHeight: 18,
  },
  itemCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#6B49AD',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  itemInfo: {
    flex: 1,
    gap: 6,
  },
  itemEspecialidade: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9163CB',
    letterSpacing: 1,
  },
  itemMedico: {
    fontSize: 18,
    fontWeight: '800',
    color: '#301971',
  },
  itemMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  itemMetaTexto: {
    fontSize: 13,
    color: '#6B49AD',
    fontWeight: '600',
  },
  itemObsBox: {
    marginTop: 8,
    backgroundColor: '#F5F0FF',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2D9F3',
  },
  itemObsTexto: {
    fontSize: 12,
    color: '#6B49AD',
    lineHeight: 16,
  },
  itemAcoes: {
    gap: 12,
    marginLeft: 16,
  },
  btnEditar: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F5F0FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2D9F3',
  },
  btnExcluir: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },

  // ─── Estilos do Formulário no Modal ───────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: '#00000066',
    justifyContent: 'flex-end',
  },
  modalConteudo: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 14,
    maxHeight: '85%',
  },
  linhaArrastar: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#E2D9F3',
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitulo: {
    fontSize: 18,
    fontWeight: '800',
    color: '#301971',
    letterSpacing: 2,
    marginBottom: 24,
    textAlign: 'center',
  },
  campoWrapper: {
    marginBottom: 18,
  },
  campoLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  campoLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9163CB',
    letterSpacing: 1,
  },
  tagOpcional: {
    backgroundColor: '#F5F0FF',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  tagOpcionalTexto: {
    fontSize: 9,
    fontWeight: '700',
    color: '#9163CB',
    textTransform: 'uppercase',
  },
  tagObrigatorio: {
    backgroundColor: '#FDF2F8',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  tagObrigatorioTexto: {
    fontSize: 9,
    fontWeight: '700',
    color: '#EC4899',
    textTransform: 'uppercase',
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
  inputErro: {
    borderColor: '#dc2626',
    backgroundColor: '#FEF2F2',
  },
  erroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  erroTexto: {
    color: '#dc2626',
    fontSize: 12,
    fontWeight: '600',
  },
  dicaTexto: {
    fontSize: 12,
    color: '#9163CB',
    marginTop: 6,
  },
  rowCampos: {
    flexDirection: 'row',
  },
  textarea: {
    height: 80,
    paddingTop: 14,
  },
  modalAcoesRow: {
    flexDirection: 'row',
    marginTop: 12,
  },
  modalBtnVoltar: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#6B49AD',
    borderRadius: 60,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnVoltarTexto: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B49AD',
    letterSpacing: 1,
  },
  modalBtnSalvarWrapper: {
    flex: 1.3,
    marginLeft: 14,
    shadowColor: '#301971',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  modalBtnSalvar: {
    borderRadius: 60,
    paddingVertical: 18,
    alignItems: 'center',
  },
  modalBtnSalvarTexto: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },

  // ─── Modal de Exclusão ───────────────────────────────────────────
  confirmFundo: {
    flex: 1,
    backgroundColor: '#00000066',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  confirmCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 28,
    width: '100%',
    alignItems: 'center',
  },
  confirmTitulo: {
    fontSize: 18,
    fontWeight: '800',
    color: '#301971',
    marginBottom: 10,
  },
  confirmMensagem: {
    fontSize: 14,
    color: '#6B49AD',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  confirmAcoes: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  confirmBtnCancelar: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 60,
    borderWidth: 1.5,
    borderColor: '#6B49AD',
    alignItems: 'center',
  },
  confirmBtnCancelarTexto: {
    color: '#6B49AD',
    fontSize: 14,
    fontWeight: '700',
  },
  confirmBtnExcluir: {
    flex: 1.2,
    backgroundColor: '#dc2626',
    paddingVertical: 14,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnExcluirTexto: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
})
