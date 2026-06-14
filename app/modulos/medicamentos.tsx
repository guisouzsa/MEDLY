import { Feather } from '@expo/vector-icons'
import { BlurView } from 'expo-blur'
import { LinearGradient } from 'expo-linear-gradient'
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Animated, Dimensions, Image, KeyboardAvoidingView, Modal,
  Platform, ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import ModalAlerta from '../../src/components/ModalAlerta'
import { salvarHistorico } from '../../src/lib/events'
import { reagendarTodasNotificacoes } from '../../src/lib/notifications'
import { supabase } from '../../src/lib/supabase'

const { height } = Dimensions.get('window')

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Horario = {
  id: number
  horario: string
  dia_semana: number | null
  dia_mes: number | null
}

type Medicamento = {
  id: number
  nome: string
  dosagem: string
  frequencia_tipo: 'diario' | 'semanal' | 'mensal' | 'personalizado'
  intervalo_horas: number | null
  horario: string | null
  data_inicio: string
  data_termino: string | null
  data_retorno: string | null
  quantidade_por_dose: string
  observacoes: string
  status: 'ativo' | 'pausado' | 'encerrado'
  motivo_encerramento: string | null
  medicamento_horarios: Horario[]
}

type Filtro = 'todos' | 'ativo' | 'pausado' | 'encerrado'

const DIAS_SEMANA_LABEL = [
  { label: 'Seg', valor: 1 },
  { label: 'Ter', valor: 2 },
  { label: 'Qua', valor: 3 },
  { label: 'Qui', valor: 4 },
  { label: 'Sex', valor: 5 },
  { label: 'Sáb', valor: 6 },
  { label: 'Dom', valor: 0 },
]

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

function dataEhPassada(data: string): boolean {
  if (!data || data.length < 10) return false
  const [d, m, a] = data.split('/')
  if (!d || !m || !a || a.length < 4) return false
  const dataInformada = new Date(Number(a), Number(m) - 1, Number(d))
  const agora = new Date()
  agora.setHours(0, 0, 0, 0)
  return dataInformada < agora
}

function labelFrequencia(med: Medicamento): string {
  if (med.frequencia_tipo === 'diario') return 'Diário'
  if (med.frequencia_tipo === 'semanal') return 'Semanal'
  if (med.frequencia_tipo === 'mensal') return 'Mensal'
  if (med.frequencia_tipo === 'personalizado' && med.intervalo_horas) return `A cada ${med.intervalo_horas}h`
  return med.frequencia_tipo
}

function statusCor(status: string): { bg: string; cor: string } {
  if (status === 'ativo') return { bg: '#DCFCE7', cor: '#16A34A' }
  if (status === 'pausado') return { bg: '#FFF3E0', cor: '#EF6C00' }
  return { bg: '#EDE8FA', cor: '#481D94' }
}

// ─── Componentes internos ─────────────────────────────────────────────────────

function Campo({
  label, value, onChangeText, placeholder,
  keyboardType = 'default' as any,
  opcional = false, dica, erro, erroTexto,
}: {
  label: string
  value: string
  onChangeText: (t: string) => void
  placeholder?: string
  keyboardType?: any
  opcional?: boolean
  dica?: string
  erro?: boolean
  erroTexto?: string
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
        style={[styles.input, erro && styles.inputErro]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9163CB"
        keyboardType={keyboardType}
        autoCorrect={false}
      />
      {erro && (
        <View style={styles.erroRow}>
          <Feather name="alert-circle" size={13} color="#dc2626" />
          <Text style={styles.erroTexto}>{erroTexto ?? 'Este campo é obrigatório'}</Text>
        </View>
      )}
      {dica && !erro && <Text style={styles.dicaTexto}>{dica}</Text>}
    </View>
  )
}

function SeletorOpcoes<T extends string>({
  label, opcoes, value, onChange,
}: {
  label: string
  opcoes: { label: string; valor: T }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <View style={styles.campoWrapper}>
      <Text style={styles.campoLabel}>{label}</Text>
      <View style={styles.seletorRow}>
        {opcoes.map((op) => (
          <TouchableOpacity
            key={op.valor}
            style={[styles.seletorOpcao, value === op.valor && styles.seletorOpcaoAtiva]}
            onPress={() => onChange(op.valor)}
          >
            <Text style={[styles.seletorTexto, value === op.valor && styles.seletorTextoAtivo]}>
              {op.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
}

function GrupoHorarios({
  horarios, onAdicionar, onRemover, onAtualizar, label = 'HORÁRIOS', descricao, erro,
}: {
  horarios: string[]
  onAdicionar: () => void
  onRemover: (i: number) => void
  onAtualizar: (i: number, v: string) => void
  label?: string
  descricao?: string
  erro?: boolean
}) {
  return (
    <View style={styles.campoWrapper}>
      <Text style={styles.campoLabel}>{label}</Text>
      {descricao && (
        <View style={styles.avisoBox}>
          <Feather name="info" size={14} color="#6B49AD" />
          <Text style={styles.avisoTexto}>{descricao}</Text>
        </View>
      )}
      {horarios.map((h, index) => (
        <View key={index} style={styles.horarioRow}>
          <View style={[styles.horarioInputWrapper, erro && h.length < 5 && styles.horarioInputErro]}>
            <Feather name="clock" size={16} color="#9163CB" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.inputHorario}
              value={h}
              onChangeText={(t) => onAtualizar(index, t)}
              placeholder="Ex: 08:00"
              placeholderTextColor="#9163CB"
              keyboardType="numeric"
              autoCorrect={false}
            />
          </View>
          {horarios.length > 1 && (
            <TouchableOpacity onPress={() => onRemover(index)} style={styles.btnRemoverHorario}>
              <Feather name="minus" size={18} color="#dc2626" />
            </TouchableOpacity>
          )}
        </View>
      ))}
      {erro && (
        <View style={styles.erroRow}>
          <Feather name="alert-circle" size={13} color="#dc2626" />
          <Text style={styles.erroTexto}>Informe pelo menos um horário válido</Text>
        </View>
      )}
      <TouchableOpacity onPress={onAdicionar} style={styles.btnAdicionarHorario}>
        <Feather name="plus" size={16} color="#6B49AD" />
        <Text style={styles.btnAdicionarTexto}>Adicionar horário</Text>
      </TouchableOpacity>
    </View>
  )
}

// ─── Card de medicamento colapsável ──────────────────────────────────────────

function CardMedicamento({
  med,
  onEditar,
  onExcluir,
}: {
  med: Medicamento
  onEditar: () => void
  onExcluir: () => void
}) {
  const [expandido, setExpandido] = useState(false)
  const sc = statusCor(med.status)

  // Horários formatados
  const hs = med.medicamento_horarios ?? []
  function renderHorariosTexto(): string | null {
    if (med.frequencia_tipo === 'diario') {
      const h = hs.map(x => x.horario.slice(0, 5)).join(' · ')
      return h || null
    }
    if (med.frequencia_tipo === 'semanal') {
      const horariosUnicos = [...new Set(hs.map(x => x.horario.slice(0, 5)))]
      return horariosUnicos.length > 0 ? horariosUnicos.join(' · ') : null
    }
    if (med.frequencia_tipo === 'mensal') {
      const horariosUnicos = [...new Set(hs.map(x => x.horario.slice(0, 5)))]
      return horariosUnicos.length > 0 ? horariosUnicos.join(' · ') : null
    }
    if (med.frequencia_tipo === 'personalizado' && med.intervalo_horas) {
      const H = med.intervalo_horas
      const startHourStr = med.horario ? med.horario.slice(0, 5) : '00:00'
      const [sh, sm] = startHourStr.split(':').map(Number)
      const hrs: string[] = []
      for (let hOffset = 0; hOffset < 24; hOffset += H) {
        const h = (sh + hOffset) % 24
        hrs.push(`${String(h).padStart(2, '0')}:${String(sm).padStart(2, '0')}`)
      }
      hrs.sort((a, b) => a.localeCompare(b))
      return hrs.join(' · ')
    }
    return null
  }
  function renderDiasTexto(): string | null {
    if (med.frequencia_tipo === 'semanal') {
      const dias = [...new Set(hs.map(x => DIAS_SEMANA_LABEL.find(d => d.valor === x.dia_semana)?.label ?? ''))].filter(Boolean)
      return dias.length > 0 ? dias.join(', ') : null
    }
    if (med.frequencia_tipo === 'mensal') {
      const dias = [...new Set(hs.map(x => x.dia_mes))].filter(Boolean).sort((a, b) => (a ?? 0) - (b ?? 0))
      return dias.length > 0 ? `Dias ${dias.join(', ')}` : null
    }
    return null
  }

  const horariosTexto = renderHorariosTexto()
  const diasTexto = renderDiasTexto()

  const temDetalhes = !!(
    med.quantidade_por_dose || horariosTexto || diasTexto ||
    med.data_termino || med.data_retorno || med.motivo_encerramento || med.observacoes
  )

  return (
    <View style={styles.card}>
      {/* Topo sempre visível */}
      <View style={styles.cardTopo}>
        <LinearGradient
          colors={med.status === 'ativo' ? ['#6B49AD', '#481D94'] : ['#9163CB', '#7C4FBD']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.cardIconeBox}
        >
          <Feather name="activity" size={22} color="#fff" />
        </LinearGradient>
        <View style={styles.cardTextos}>
          <Text style={styles.cardNome}>{med.nome}</Text>
          {med.dosagem ? <Text style={styles.cardSubtitulo}>{med.dosagem}</Text> : null}
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
        {/* Badge status */}
        <View style={[styles.badgeStatus, { backgroundColor: sc.bg }]}>
          <Feather
            name={med.status === 'ativo' ? 'check-circle' : med.status === 'pausado' ? 'pause-circle' : 'x-circle'}
            size={11}
            color={sc.cor}
          />
          <Text style={[styles.badgeStatusTexto, { color: sc.cor }]}>
            {med.status.charAt(0).toUpperCase() + med.status.slice(1)}
          </Text>
        </View>

        <View style={styles.infoLinha}>
          <Feather name="refresh-cw" size={15} color="#6B49AD" />
          <Text style={styles.infoLinhaLabel}>Frequência</Text>
          <Text style={styles.infoLinhaTexto}>{labelFrequencia(med)}</Text>
        </View>

        {med.data_inicio ? (
          <View style={styles.infoLinha}>
            <Feather name="calendar" size={15} color="#6B49AD" />
            <Text style={styles.infoLinhaLabel}>Início</Text>
            <Text style={styles.infoLinhaTexto}>{formatarDataParaTela(med.data_inicio)}</Text>
          </View>
        ) : null}
      </View>

      {/* Detalhes expandidos */}
      {expandido && temDetalhes && (
        <View style={styles.cardDetalhes}>
          <View style={styles.cardDivisor} />

          {med.quantidade_por_dose ? (
            <View style={styles.infoLinha}>
              <Feather name="package" size={15} color="#6B49AD" />
              <Text style={styles.infoLinhaLabel}>Por dose</Text>
              <Text style={styles.infoLinhaTexto}>{med.quantidade_por_dose}</Text>
            </View>
          ) : null}

          {diasTexto ? (
            <View style={styles.infoLinha}>
              <Feather name="calendar" size={15} color="#6B49AD" />
              <Text style={styles.infoLinhaLabel}>Dias</Text>
              <Text style={styles.infoLinhaTexto}>{diasTexto}</Text>
            </View>
          ) : null}

          {horariosTexto ? (
            <View style={styles.infoLinha}>
              <Feather name="clock" size={15} color="#6B49AD" />
              <Text style={styles.infoLinhaLabel}>Horários</Text>
              <Text style={styles.infoLinhaTexto}>{horariosTexto}</Text>
            </View>
          ) : null}

          {med.data_termino ? (
            <View style={styles.infoLinha}>
              <Feather name="calendar" size={15} color="#6B49AD" />
              <Text style={styles.infoLinhaLabel}>Término</Text>
              <Text style={styles.infoLinhaTexto}>{formatarDataParaTela(med.data_termino)}</Text>
            </View>
          ) : null}

          {med.status === 'pausado' && med.data_retorno ? (
            <View style={styles.infoLinha}>
              <Feather name="clock" size={15} color="#6B49AD" />
              <Text style={styles.infoLinhaLabel}>Retorno</Text>
              <Text style={styles.infoLinhaTexto}>{formatarDataParaTela(med.data_retorno)}</Text>
            </View>
          ) : null}

          {med.status === 'encerrado' && med.motivo_encerramento ? (
            <View style={[styles.infoLinha, { alignItems: 'flex-start' }]}>
              <Feather name="x-circle" size={15} color="#6B49AD" style={{ marginTop: 2 }} />
              <Text style={styles.infoLinhaLabel}>Motivo</Text>
              <Text style={[styles.infoLinhaTexto, { flex: 1 }]}>{med.motivo_encerramento}</Text>
            </View>
          ) : null}

          {med.observacoes ? (
            <View style={[styles.infoLinha, { alignItems: 'flex-start' }]}>
              <Feather name="file-text" size={15} color="#6B49AD" style={{ marginTop: 2 }} />
              <Text style={styles.infoLinhaLabel}>Obs.</Text>
              <Text style={[styles.infoLinhaTexto, { flex: 1 }]}>{med.observacoes}</Text>
            </View>
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

// ─── Tela principal ───────────────────────────────────────────────────────────

export default function Medicamentos() {
  const { action, hideList } = useLocalSearchParams()

  const [usuarioId, setUsuarioId] = useState<string | null>(null)
  const [lista, setLista] = useState<Medicamento[]>([])
  const [perfilFoto, setPerfilFoto] = useState<string | null>(null)
  const [filtro, setFiltro] = useState<Filtro>('todos')

  const [modalVisivel, setModalVisivel] = useState(false)
  const [editando, setEditando] = useState<Medicamento | null>(null)
  const slideAnim = useRef(new Animated.Value(height)).current

  const [nome, setNome] = useState('')
  const [dosagem, setDosagem] = useState('')
  const [frequenciaTipo, setFrequenciaTipo] = useState<Medicamento['frequencia_tipo']>('diario')
  const [intervaloHoras, setIntervaloHoras] = useState('')
  const [horarioPersonalizado, setHorarioPersonalizado] = useState('08:00')
  const [dataInicio, setDataInicio] = useState('')
  const [dataTermino, setDataTermino] = useState('')
  const [dataRetorno, setDataRetorno] = useState('')
  const [quantidadePorDose, setQuantidadePorDose] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [status, setStatus] = useState<Medicamento['status']>('ativo')
  const [motivoEncerramento, setMotivoEncerramento] = useState('')

  const [horarios, setHorarios] = useState<string[]>([''])
  const [diasSemanaSelecionados, setDiasSemanaSelecionados] = useState<number[]>([])
  const [horariosSemanal, setHorariosSemanal] = useState<string[]>([''])
  const [diasMesSelecionados, setDiasMesSelecionados] = useState<number[]>([])
  const [horariosMensal, setHorariosMensal] = useState<string[]>([''])

  const [carregando, setCarregando] = useState(false)
  const [erros, setErros] = useState<Record<string, boolean>>({})
  const [modalExcluir, setModalExcluir] = useState(false)
  const [excluirId, setExcluirId] = useState<number | null>(null)
  const [modalAlerta, setModalAlerta] = useState({ visivel: false, titulo: '', mensagem: '' })
  const [modalSucesso, setModalSucesso] = useState({ visivel: false, titulo: '', mensagem: '' })
  const [modalPausar, setModalPausar] = useState(false)

  useEffect(() => {
    if (action === 'create') abrirModal()
  }, [action])

  useFocusEffect(
    useCallback(() => {
      async function init() {
        const { data: { user }, error } = await supabase.auth.getUser()
        if (error || !user) { router.replace('/auth'); return }
        setUsuarioId(user.id)
        const { data: perfil } = await supabase
          .from('perfis').select('foto_url').eq('id', user.id).single()
        if (perfil?.foto_url) {
          const url = perfil.foto_url.includes('?') ? perfil.foto_url : `${perfil.foto_url}?t=${Date.now()}`
          setPerfilFoto(url)
        } else {
          setPerfilFoto(null)
        }
        await buscar(user.id)
      }
      init()
    }, [])
  )

  async function buscar(uid?: string) {
    const id = uid ?? usuarioId
    if (!id) return
    const { data, error } = await supabase
      .from('medicamentos')
      .select('*, medicamento_horarios(id, horario, dia_semana, dia_mes)')
      .eq('usuario_id', id)
      .order('id')
    if (error) { console.error('Erro ao buscar:', error.message); return }
    if (data) setLista(data as Medicamento[])
  }

  const filtroLabels: Record<Filtro, string> = {
    todos: 'Todos',
    ativo: 'Ativos',
    pausado: 'Pausados',
    encerrado: 'Encerrados',
  }

  const listaFiltrada = filtro === 'todos' ? lista : lista.filter(m => m.status === filtro)

  function resetForm() {
    setNome(''); setDosagem(''); setFrequenciaTipo('diario')
    setIntervaloHoras(''); setHorarioPersonalizado('08:00'); setDataInicio(''); setDataTermino('')
    setDataRetorno(''); setQuantidadePorDose(''); setObservacoes('')
    setStatus('ativo'); setMotivoEncerramento(''); setHorarios([''])
    setDiasSemanaSelecionados([]); setHorariosSemanal([''])
    setDiasMesSelecionados([]); setHorariosMensal([''])
    setErros({})
  }

  function abrirModal(med?: Medicamento) {
    setEditando(med ?? null)
    if (med) {
      setNome(med.nome)
      setDosagem(med.dosagem ?? '')
      setFrequenciaTipo(med.frequencia_tipo)
      setIntervaloHoras(med.intervalo_horas?.toString() ?? '')
      setDataInicio(med.data_inicio ? formatarDataParaTela(med.data_inicio) : '')
      setDataTermino(med.data_termino ? formatarDataParaTela(med.data_termino) : '')
      setDataRetorno(med.data_retorno ? formatarDataParaTela(med.data_retorno) : '')
      setQuantidadePorDose(med.quantidade_por_dose ?? '')
      setObservacoes(med.observacoes ?? '')
      setStatus(med.status)
      setMotivoEncerramento(med.motivo_encerramento ?? '')
      setErros({})
      const hs = med.medicamento_horarios ?? []
      if (med.frequencia_tipo === 'diario') {
        setHorarios(hs.length > 0 ? hs.map(h => h.horario.slice(0, 5)) : [''])
        setDiasSemanaSelecionados([]); setHorariosSemanal([''])
        setDiasMesSelecionados([]); setHorariosMensal([''])
        setHorarioPersonalizado('08:00')
      } else if (med.frequencia_tipo === 'semanal') {
        setHorarios([''])
        const diasUnicos = [...new Set(hs.map(h => h.dia_semana).filter(d => d !== null) as number[])]
        setDiasSemanaSelecionados(diasUnicos)
        const horariosUnicos = [...new Set(hs.map(h => h.horario.slice(0, 5)))]
        setHorariosSemanal(horariosUnicos.length > 0 ? horariosUnicos : [''])
        setDiasMesSelecionados([]); setHorariosMensal([''])
        setHorarioPersonalizado('08:00')
      } else if (med.frequencia_tipo === 'mensal') {
        setHorarios([]); setDiasSemanaSelecionados([]); setHorariosSemanal([''])
        const diasUnicos = [...new Set(hs.map(h => h.dia_mes).filter(d => d !== null) as number[])]
        setDiasMesSelecionados(diasUnicos)
        const horariosUnicos = [...new Set(hs.map(h => h.horario.slice(0, 5)))]
        setHorariosMensal(horariosUnicos.length > 0 ? horariosUnicos : [''])
        setHorarioPersonalizado('08:00')
      } else {
        setHorarios(['']); setDiasSemanaSelecionados([]); setHorariosSemanal([''])
        setDiasMesSelecionados([]); setHorariosMensal([''])
        setHorarioPersonalizado(med.horario ? med.horario.slice(0, 5) : '08:00')
      }
    } else {
      resetForm()
    }
    setModalVisivel(true)
    Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }).start()
  }

  function fecharModal() {
    Animated.timing(slideAnim, { toValue: height, duration: 280, useNativeDriver: true })
      .start(() => {
        setModalVisivel(false)
        if (hideList === 'true') router.back()
      })
  }

  function toggleDiaSemana(dia: number) {
    setDiasSemanaSelecionados(prev => prev.includes(dia) ? prev.filter(d => d !== dia) : [...prev, dia])
  }
  function toggleDiaMes(dia: number) {
    setDiasMesSelecionados(prev => prev.includes(dia) ? prev.filter(d => d !== dia) : [...prev, dia])
  }

  function handleStatusChange(v: Medicamento['status']) {
    if (v === 'pausado') { setModalPausar(true); setStatus(v) }
    else if (v === 'encerrado') { setStatus(v); setDataRetorno('') }
    else { setStatus(v); setMotivoEncerramento(''); setDataRetorno('') }
  }

  function validar(): boolean {
    const e: Record<string, boolean> = {}
    if (!nome.trim()) e.nome = true
    if (!dosagem.trim()) e.dosagem = true
    if (!quantidadePorDose.trim()) e.quantidadePorDose = true
    if (!dataInicio || dataInicio.length < 10) e.dataInicio = true
    if (dataInicio.length === 10 && dataEhPassada(dataInicio)) e.dataInicioPassada = true
    if (frequenciaTipo === 'personalizado') {
      if (!intervaloHoras) e.intervaloHoras = true
      if (!horarioPersonalizado || horarioPersonalizado.length < 5) e.horarioPersonalizado = true
    }
    if (status === 'pausado' && (!dataRetorno || dataRetorno.length < 10)) e.dataRetorno = true
    if (frequenciaTipo === 'semanal') {
      if (diasSemanaSelecionados.length === 0) e.diasSemana = true
      if (horariosSemanal.filter(h => h.length === 5).length === 0) e.horarioSemanal = true
    }
    if (frequenciaTipo === 'mensal') {
      if (diasMesSelecionados.length === 0) e.diasMes = true
      if (horariosMensal.filter(h => h.length === 5).length === 0) e.horarioMensal = true
    }
    if (frequenciaTipo === 'diario') {
      if (horarios.filter(h => h.length === 5).length === 0) e.horarioDiario = true
    }
    setErros(e)
    if (Object.keys(e).length > 0) {
      setModalAlerta({ visivel: true, titulo: 'Campos obrigatórios', mensagem: 'Preencha todos os campos destacados antes de continuar.' })
      return false
    }
    return true
  }

  async function salvar() {
    if (!validar()) return
    if (!usuarioId) { setModalAlerta({ visivel: true, titulo: 'Erro', mensagem: 'Usuário não autenticado.' }); router.replace('/auth'); return }
    setCarregando(true)
    try {
      const payload = {
        usuario_id: usuarioId,
        nome: nome.trim(),
        dosagem: dosagem.trim(),
        frequencia_tipo: frequenciaTipo,
        intervalo_horas: intervaloHoras ? parseInt(intervaloHoras) : null,
        horario: frequenciaTipo === 'personalizado' ? (horarioPersonalizado.trim() || null) : null,
        data_inicio: converterData(dataInicio),
        data_termino: dataTermino && dataTermino.length === 10 ? converterData(dataTermino) : null,
        data_retorno: status === 'pausado' && dataRetorno.length === 10 ? converterData(dataRetorno) : null,
        quantidade_por_dose: quantidadePorDose.trim(),
        observacoes: observacoes.trim() || null,
        status,
        motivo_encerramento: status === 'encerrado' ? (motivoEncerramento.trim() || null) : null,
      }

      let medicamentoId: number
      if (editando) {
        const { error } = await supabase.from('medicamentos').update(payload).eq('id', editando.id)
        if (error) throw error
        medicamentoId = editando.id
        const { error: erroDel } = await supabase.from('medicamento_horarios').delete().eq('medicamento_id', medicamentoId)
        if (erroDel) throw erroDel
      } else {
        const { data, error } = await supabase.from('medicamentos').insert(payload).select('id').single()
        if (error) throw error
        medicamentoId = data.id
      }

      let horariosParaSalvar: { medicamento_id: number; horario: string; dia_semana: number | null; dia_mes: number | null }[] = []
      if (frequenciaTipo === 'diario') {
        horariosParaSalvar = horarios.filter(h => h.length === 5).map(h => ({ medicamento_id: medicamentoId, horario: h, dia_semana: null, dia_mes: null }))
      } else if (frequenciaTipo === 'semanal') {
        const horariosValidos = horariosSemanal.filter(h => h.length === 5)
        for (const dia of diasSemanaSelecionados)
          for (const hor of horariosValidos)
            horariosParaSalvar.push({ medicamento_id: medicamentoId, horario: hor, dia_semana: dia, dia_mes: null })
      } else if (frequenciaTipo === 'mensal') {
        const horariosValidos = horariosMensal.filter(h => h.length === 5)
        for (const dia of diasMesSelecionados)
          for (const hor of horariosValidos)
            horariosParaSalvar.push({ medicamento_id: medicamentoId, horario: hor, dia_semana: null, dia_mes: dia })
      }

      if (horariosParaSalvar.length > 0) {
        const { error: erroHorarios } = await supabase.from('medicamento_horarios').insert(horariosParaSalvar)
        if (erroHorarios) throw erroHorarios
      }

      await salvarHistorico(usuarioId, editando
        ? `Medicamento ${nome.trim()} (${dosagem.trim()}) foi alterado`
        : `Medicamento ${nome.trim()} (${dosagem.trim()}) foi cadastrado`)

      await buscar()
      await reagendarTodasNotificacoes(usuarioId).catch(console.warn)
      setModalSucesso({
        visivel: true,
        titulo: 'Sucesso!',
        mensagem: editando ? 'Medicamento atualizado.' : 'Medicamento cadastrado.',
      })
    } catch (err: any) {
      console.error('Erro ao salvar:', err.message)
      setModalAlerta({ visivel: true, titulo: 'Erro ao salvar', mensagem: err.message ?? 'Tente novamente.' })
    } finally {
      setCarregando(false)
    }
  }

  function confirmarExcluir(id: number) { setExcluirId(id); setModalExcluir(true) }

  async function excluir() {
    if (!excluirId) return
    const med = lista.find(m => m.id === excluirId)
    const { error } = await supabase.from('medicamentos').delete().eq('id', excluirId)
    if (error) { setModalAlerta({ visivel: true, titulo: 'Erro ao excluir', mensagem: error.message }); return }
    if (med) await salvarHistorico(usuarioId!, `Medicamento ${med.nome} foi removido`)
    setModalExcluir(false); setExcluirId(null)
    await buscar()
    await reagendarTodasNotificacoes(usuarioId!).catch(console.warn)
    setModalSucesso({
      visivel: true,
      titulo: 'Medicamento excluído!',
      mensagem: `${med?.nome ?? 'O medicamento'} foi removido com sucesso.`,
    })
  }

  function renderSemanal() {
    return (
      <View style={styles.campoWrapper}>
        <Text style={styles.campoLabel}>DIAS DA SEMANA</Text>
        <View style={styles.avisoBox}>
          <Feather name="info" size={14} color="#6B49AD" />
          <Text style={styles.avisoTexto}>Selecione os dias em que o medicamento será tomado.</Text>
        </View>
        <View style={styles.diasRow}>
          {DIAS_SEMANA_LABEL.map(({ label, valor }) => {
            const ativo = diasSemanaSelecionados.includes(valor)
            return (
              <TouchableOpacity
                key={valor}
                style={[styles.diaPilula, ativo && styles.diaPilulaAtiva, erros.diasSemana && !ativo && styles.diaPilulaErro]}
                onPress={() => { toggleDiaSemana(valor); setErros(p => ({ ...p, diasSemana: false })) }}
              >
                <Text style={[styles.diaTexto, ativo && styles.diaTextoAtivo]}>{label}</Text>
              </TouchableOpacity>
            )
          })}
        </View>
        {erros.diasSemana && (
          <View style={[styles.erroRow, { marginTop: 8 }]}>
            <Feather name="alert-circle" size={13} color="#dc2626" />
            <Text style={styles.erroTexto}>Selecione pelo menos um dia</Text>
          </View>
        )}
        <View style={{ height: 20 }} />
        <GrupoHorarios
          label="HORÁRIOS"
          descricao="Esses horários valerão para todos os dias selecionados."
          horarios={horariosSemanal}
          onAdicionar={() => setHorariosSemanal(p => [...p, ''])}
          onRemover={(i) => setHorariosSemanal(p => p.filter((_, idx) => idx !== i))}
          onAtualizar={(i, v) => { setHorariosSemanal(p => p.map((h, idx) => idx === i ? mascaraHorario(v) : h)); setErros(p => ({ ...p, horarioSemanal: false })) }}
          erro={erros.horarioSemanal}
        />
      </View>
    )
  }

  function renderMensal() {
    const diasDoMes = Array.from({ length: 31 }, (_, i) => i + 1)
    return (
      <View style={styles.campoWrapper}>
        <Text style={styles.campoLabel}>DIAS DO MÊS</Text>
        <View style={styles.avisoBox}>
          <Feather name="info" size={14} color="#6B49AD" />
          <Text style={styles.avisoTexto}>Toque nos dias do mês em que o medicamento deve ser tomado.</Text>
        </View>
        <View style={styles.diasMesGrid}>
          {diasDoMes.map(dia => {
            const ativo = diasMesSelecionados.includes(dia)
            return (
              <TouchableOpacity
                key={dia}
                style={[styles.diaMesItem, ativo && styles.diaMesItemAtivo, erros.diasMes && !ativo && styles.diaMesItemErro]}
                onPress={() => { toggleDiaMes(dia); setErros(p => ({ ...p, diasMes: false })) }}
              >
                <Text style={[styles.diaMesTexto, ativo && styles.diaMesTextoAtivo]}>{dia}</Text>
              </TouchableOpacity>
            )
          })}
        </View>
        {erros.diasMes && (
          <View style={[styles.erroRow, { marginTop: 8 }]}>
            <Feather name="alert-circle" size={13} color="#dc2626" />
            <Text style={styles.erroTexto}>Selecione pelo menos um dia</Text>
          </View>
        )}
        <View style={{ height: 20 }} />
        <GrupoHorarios
          label="HORÁRIOS"
          descricao="Esses horários valerão para todos os dias selecionados."
          horarios={horariosMensal}
          onAdicionar={() => setHorariosMensal(p => [...p, ''])}
          onRemover={(i) => setHorariosMensal(p => p.filter((_, idx) => idx !== i))}
          onAtualizar={(i, v) => { setHorariosMensal(p => p.map((h, idx) => idx === i ? mascaraHorario(v) : h)); setErros(p => ({ ...p, horarioMensal: false })) }}
          erro={erros.horarioMensal}
        />
      </View>
    )
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={[styles.safe, hideList === 'true' && { backgroundColor: 'transparent' }]} edges={['top']}>
      {hideList !== 'true' && (
        <>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>

            {/* Card Perfil — idêntico ao exames */}
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

            {/* Título — idêntico ao exames */}
            <LinearGradient
              colors={['#6B49AD', '#6843B1', '#481D94']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.cardTituloLista}
            >
              <Text style={styles.cardTituloTexto}>MEDICAMENTOS</Text>
            </LinearGradient>

            {/* Filtros — idêntico ao exames */}
            <View style={styles.filtrosRow}>
              {(['todos', 'ativo', 'pausado', 'encerrado'] as Filtro[]).map((f) => (
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
                    <Feather name="activity" size={36} color="#9163CB" />
                  </View>
                  <Text style={styles.vazioTitulo}>
                    {filtro === 'todos' ? 'Nenhum medicamento'
                      : filtro === 'ativo' ? 'Nenhum medicamento ativo'
                        : filtro === 'pausado' ? 'Nenhum medicamento pausado'
                          : 'Nenhum medicamento encerrado'}
                  </Text>
                  <Text style={styles.vazioSub}>Toque em "+" para adicionar</Text>
                </View>
              ) : (
                listaFiltrada.map((med) => (
                  <CardMedicamento
                    key={med.id}
                    med={med}
                    onEditar={() => abrirModal(med)}
                    onExcluir={() => confirmarExcluir(med.id)}
                  />
                ))
              )}
            </View>
          </ScrollView>

          {/* FAB — idêntico ao exames */}
          <TouchableOpacity onPress={() => abrirModal()} activeOpacity={0.85} style={styles.fab}>
            <LinearGradient
              colors={['#6B49AD', '#481D94']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.fabGradient}
            >
              <Feather name="plus" size={26} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </>
      )}

      {/* Modal cadastro/edição */}
      <Modal visible={modalVisivel} transparent animationType="none">
        <KeyboardAvoidingView style={styles.modalFundo} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <BlurView intensity={40} tint="dark" style={styles.modalOverlay}>
            <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={fecharModal} />
          </BlurView>
          <Animated.View style={[styles.modalCard, { transform: [{ translateY: slideAnim }] }]}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={styles.modalHandle} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitulo}>{editando ? 'Editar medicamento' : 'Novo medicamento'}</Text>
                <TouchableOpacity onPress={fecharModal} style={styles.modalFechar}>
                  <Feather name="x" size={22} color="#9163CB" />
                </TouchableOpacity>
              </View>

              <Campo label="NOME DO MEDICAMENTO" value={nome}
                onChangeText={(v) => { setNome(v); setErros(p => ({ ...p, nome: false })) }}
                placeholder="Ex: Paracetamol" erro={erros.nome} />

              <View style={styles.duasColunas}>
                <View style={[styles.coluna, { flex: 3 }]}>
                  <Campo label="DOSAGEM" value={dosagem}
                    onChangeText={(v) => { setDosagem(v); setErros(p => ({ ...p, dosagem: false })) }}
                    placeholder="Ex: 500" keyboardType="numeric" erro={erros.dosagem} />
                </View>
                <View style={[styles.coluna, { flex: 2 }]}>
                  <Campo label="QTDE/DOSE" value={quantidadePorDose}
                    onChangeText={(v) => { setQuantidadePorDose(v); setErros(p => ({ ...p, quantidadePorDose: false })) }}
                    placeholder="Ex: 1" keyboardType="numeric" erro={erros.quantidadePorDose} />
                </View>
              </View>

              <SeletorOpcoes label="FREQUÊNCIA" value={frequenciaTipo} onChange={setFrequenciaTipo}
                opcoes={[
                  { label: 'Diário', valor: 'diario' },
                  { label: 'Semanal', valor: 'semanal' },
                  { label: 'Mensal', valor: 'mensal' },
                  { label: 'Custom', valor: 'personalizado' },
                ]} />

              {frequenciaTipo === 'diario' && (
                <GrupoHorarios
                  label="HORÁRIOS DO DIA"
                  descricao="Informe os horários em que o medicamento deve ser tomado."
                  horarios={horarios}
                  onAdicionar={() => setHorarios(p => [...p, ''])}
                  onRemover={(i) => setHorarios(p => p.filter((_, idx) => idx !== i))}
                  onAtualizar={(i, v) => { setHorarios(p => p.map((h, idx) => idx === i ? mascaraHorario(v) : h)); setErros(p => ({ ...p, horarioDiario: false })) }}
                  erro={erros.horarioDiario}
                />
              )}
              {frequenciaTipo === 'semanal' && renderSemanal()}
              {frequenciaTipo === 'mensal' && renderMensal()}
              {frequenciaTipo === 'personalizado' && (
                <View style={styles.duasColunas}>
                  <View style={[styles.coluna, { flex: 1 }]}>
                    <Campo label="INTERVALO EM HORAS" value={intervaloHoras}
                      onChangeText={(v) => { setIntervaloHoras(v); setErros(p => ({ ...p, intervaloHoras: false })) }}
                      placeholder="Ex: 8" keyboardType="numeric" erro={erros.intervaloHoras} />
                  </View>
                  <View style={[styles.coluna, { flex: 1 }]}>
                    <Campo label="HORA DE INÍCIO" value={horarioPersonalizado}
                      onChangeText={(v) => { setHorarioPersonalizado(mascaraHorario(v)); setErros(p => ({ ...p, horarioPersonalizado: false })) }}
                      placeholder="Ex: 08:00" keyboardType="numeric" erro={erros.horarioPersonalizado}
                      dica="Hora da primeira dose" />
                  </View>
                </View>
              )}

              <View style={styles.duasColunas}>
                <View style={[styles.coluna, { flex: 3 }]}>
                  <Campo label="DATA INÍCIO" value={dataInicio}
                    onChangeText={(t) => { setDataInicio(mascaraData(t)); setErros(p => ({ ...p, dataInicio: false, dataInicioPassada: false })) }}
                    placeholder="DD/MM/AAAA" keyboardType="numeric"
                    erro={erros.dataInicio || erros.dataInicioPassada}
                    erroTexto={erros.dataInicioPassada ? 'Data não pode ser passada' : 'Obrigatório'} />
                </View>
                <View style={[styles.coluna, { flex: 3 }]}>
                  <Campo label="DATA TÉRMINO" value={dataTermino}
                    onChangeText={(t) => setDataTermino(mascaraData(t))}
                    placeholder="DD/MM/AAAA" keyboardType="numeric" opcional
                    dica="Vazio = contínuo" />
                </View>
              </View>

              <Campo label="OBSERVAÇÕES" value={observacoes} onChangeText={setObservacoes}
                placeholder="Ex: Tomar com água" opcional />

              <View style={styles.campoWrapper}>
                <Text style={styles.campoLabel}>STATUS</Text>
                <View style={styles.seletorRow}>
                  {(['ativo', 'pausado', 'encerrado'] as Medicamento['status'][]).map((s) => (
                    <TouchableOpacity
                      key={s}
                      style={[styles.seletorOpcao, status === s && styles.seletorOpcaoAtiva]}
                      onPress={() => handleStatusChange(s)}
                    >
                      <Text style={[styles.seletorTexto, status === s && styles.seletorTextoAtivo]}>
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {status === 'pausado' && (
                <View style={styles.statusBox}>
                  <View style={styles.statusBoxHeader}>
                    <Feather name="pause-circle" size={16} color="#481D94" />
                    <Text style={styles.statusBoxTitulo}>Quando deseja retomar?</Text>
                  </View>
                  <Text style={styles.statusBoxSub}>Esta data será usada para lembrar você de retomar o medicamento.</Text>
                  <Campo label="DATA DE RETORNO" value={dataRetorno}
                    onChangeText={(t) => { setDataRetorno(mascaraData(t)); setErros(p => ({ ...p, dataRetorno: false })) }}
                    placeholder="DD/MM/AAAA" keyboardType="numeric"
                    erro={erros.dataRetorno} erroTexto="Informe a data de retorno" />
                </View>
              )}

              {status === 'encerrado' && (
                <View style={styles.statusBox}>
                  <View style={styles.statusBoxHeader}>
                    <Feather name="x-circle" size={16} color="#481D94" />
                    <Text style={styles.statusBoxTitulo}>Motivo do encerramento</Text>
                  </View>
                  <Text style={styles.statusBoxSub}>Descreva o motivo pelo qual este medicamento foi encerrado.</Text>
                  <TextInput
                    style={styles.statusBoxInput}
                    value={motivoEncerramento}
                    onChangeText={setMotivoEncerramento}
                    placeholder="Ex: Tratamento concluído, efeitos adversos..."
                    placeholderTextColor="#9163CB"
                    multiline
                    numberOfLines={3}
                    autoCorrect={false}
                  />
                </View>
              )}

              <TouchableOpacity onPress={salvar} disabled={carregando} activeOpacity={0.85} style={styles.botaoSalvarWrapper}>
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
      <Modal visible={modalExcluir} transparent animationType="fade" onRequestClose={() => {}}>
        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFillObject} />
        <View style={[styles.modalExcluirFundo, { backgroundColor: 'transparent' }]}>
          <View style={styles.modalExcluirCard}>
            <View style={styles.modalExcluirIcone}>
              <Feather name="trash-2" size={32} color="#dc2626" />
            </View>
            <Text style={styles.modalExcluirTitulo}>Excluir medicamento?</Text>
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

      {/* Modal pausar */}
      <Modal visible={modalPausar} transparent animationType="fade" onRequestClose={() => {}}>
        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFillObject} />
        <View style={[styles.modalCentroFundo, { backgroundColor: 'transparent' }]}>
          <View style={styles.modalCentroCard}>
            <LinearGradient
              colors={['#6B49AD', '#481D94']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.modalRoxoHeader}
            >
              <Feather name="pause-circle" size={28} color="#fff" />
              <Text style={styles.modalRoxoTitulo}>Pausar medicamento</Text>
            </LinearGradient>
            <View style={styles.modalRoxoBody}>
              <Text style={styles.modalRoxoPergunta}>O medicamento ficará pausado até a data de retorno que você definir no formulário.</Text>
              <TouchableOpacity onPress={() => setModalPausar(false)} activeOpacity={0.85} style={styles.btnRoxoConfirmar}>
                <LinearGradient
                  colors={['#6B49AD', '#481D94']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.btnRoxoGradient}
                >
                  <Text style={styles.btnConfirmarTexto}>ENTENDI</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ModalAlerta visivel={modalAlerta.visivel} titulo={modalAlerta.titulo} mensagem={modalAlerta.mensagem}
        onFechar={() => setModalAlerta(m => ({ ...m, visivel: false }))} />
      <ModalAlerta visivel={modalSucesso.visivel} titulo={modalSucesso.titulo} mensagem={modalSucesso.mensagem}
        onFechar={() => {
          setModalSucesso(m => ({ ...m, visivel: false }))
          if (modalVisivel) fecharModal()
        }} />
    </SafeAreaView>
  )
}

// ─── Styles — cópia exata do exames.tsx ──────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F0FF' },

  // Header
  cardPerfil: {
    backgroundColor: '#fff', marginHorizontal: 16, marginTop: 16,
    borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10,
    flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between',
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

  // Título
  cardTituloLista: {
    marginHorizontal: 16, marginTop: 12, borderRadius: 50,
    paddingVertical: 14, alignItems: 'center',
    shadowColor: '#481D94', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 5,
  },
  cardTituloTexto: { fontSize: 14, fontWeight: '800', color: '#fff', letterSpacing: 3 },

  // Filtros — cópia exata do exames
  filtrosRow: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginTop: 12, gap: 8,
  },
  chip: {
    flex: 1, borderRadius: 999, overflow: 'hidden',
    borderWidth: 1.5, borderColor: '#6B49AD',
  },
  chipAtivo: {
    borderColor: 'transparent',
    shadowColor: '#481D94', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25, shadowRadius: 6, elevation: 4,
  },
  chipGradient: { paddingVertical: 10, alignItems: 'center' },
  chipInner: { paddingVertical: 10, alignItems: 'center', backgroundColor: 'rgba(107,73,173,0.08)' },
  chipTexto: { fontSize: 12, fontWeight: '700', color: '#481D94' },
  chipTextoAtivo: { fontSize: 12, fontWeight: '700', color: '#fff' },

  // FAB
  fab: {
    position: 'absolute', bottom: 28, right: 24,
    borderRadius: 999,
    shadowColor: '#481D94', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 10, elevation: 8,
  },
  fabGradient: { width: 60, height: 60, borderRadius: 999, justifyContent: 'center', alignItems: 'center' },

  // Lista
  cardLista: {
    marginHorizontal: 16, marginTop: 14, backgroundColor: '#fff',
    borderRadius: 24, padding: 16,
    shadowColor: '#6B49AD', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 4, gap: 12,
  },
  vazioContainer: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  vazioIcone: {
    width: 76, height: 76, borderRadius: 24, backgroundColor: '#EDE8FA',
    justifyContent: 'center', alignItems: 'center', marginBottom: 4,
  },
  vazioTitulo: { fontSize: 17, fontWeight: '700', color: '#301971' },
  vazioSub: { fontSize: 14, color: '#9163CB' },

  // Card — cópia exata do exames
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

  badgeStatus: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4,
  },
  badgeStatusTexto: { fontSize: 11, fontWeight: '700' },

  // Ver mais — cópia exata do exames (com linha divisória acima)
  verMaisBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, marginTop: 10, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: '#F0EAFF',
  },
  verMaisTexto: { fontSize: 13, fontWeight: '700', color: '#6B49AD' },

  // Modal form
  modalFundo: { flex: 1 },
  modalOverlay: { ...StyleSheet.absoluteFillObject, flex: 1 },
  modalCard: {
    backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, maxHeight: height * 0.92,
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E2D9F3', alignSelf: 'center', marginBottom: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitulo: { fontSize: 19, fontWeight: '800', color: '#301971' },
  modalFechar: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#F0EAFF', justifyContent: 'center', alignItems: 'center' },
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
  inputErro: { borderColor: '#f87171', backgroundColor: '#FFF5F5' },
  dicaTexto: { fontSize: 12, color: '#9163CB', marginTop: 6, marginLeft: 4 },
  erroRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6, marginLeft: 4 },
  erroTexto: { fontSize: 12, color: '#dc2626', fontWeight: '600' },

  botaoSalvarWrapper: {
    marginTop: 8, shadowColor: '#481D94',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  botaoSalvar: { borderRadius: 50, paddingVertical: 18, alignItems: 'center' },
  botaoSalvarTexto: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 2 },

  // Horários
  horarioRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  horarioInputWrapper: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#481D94', borderRadius: 50,
    backgroundColor: '#FAFAFE', paddingHorizontal: 16,
  },
  horarioInputErro: { borderColor: '#f87171', backgroundColor: '#FFF5F5' },
  inputHorario: { flex: 1, paddingVertical: Platform.OS === 'ios' ? 14 : 11, fontSize: 15, color: '#301971' },
  btnRemoverHorario: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF1F2', justifyContent: 'center', alignItems: 'center' },
  btnAdicionarHorario: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 10, paddingHorizontal: 18,
    backgroundColor: '#F0EAFF', borderRadius: 50, alignSelf: 'flex-start',
    borderWidth: 1.5, borderColor: '#C4B5FD', marginTop: 4,
  },
  btnAdicionarTexto: { fontSize: 13, fontWeight: '700', color: '#6B49AD' },

  avisoBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#F0EAFF', borderRadius: 14, padding: 12,
    marginBottom: 14, borderLeftWidth: 3, borderLeftColor: '#481D94',
  },
  avisoTexto: { flex: 1, fontSize: 13, color: '#481D94', lineHeight: 18, fontWeight: '500' },

  diasRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  diaPilula: {
    flex: 1, minWidth: 40, paddingVertical: 12, borderRadius: 50,
    borderWidth: 1.5, borderColor: '#481D94', backgroundColor: '#FAFAFE', alignItems: 'center',
  },
  diaPilulaAtiva: { backgroundColor: '#6B49AD', borderColor: '#6B49AD' },
  diaPilulaErro: { borderColor: '#f87171', backgroundColor: '#FFF5F5' },
  diaTexto: { fontSize: 12, fontWeight: '700', color: '#9163CB' },
  diaTextoAtivo: { color: '#fff' },

  diasMesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  diaMesItem: {
    width: 40, height: 40, borderRadius: 20, borderWidth: 1.5,
    borderColor: '#481D94', backgroundColor: '#FAFAFE', justifyContent: 'center', alignItems: 'center',
  },
  diaMesItemAtivo: { backgroundColor: '#6B49AD', borderColor: '#6B49AD' },
  diaMesItemErro: { borderColor: '#f87171', backgroundColor: '#FFF5F5' },
  diaMesTexto: { fontSize: 12, fontWeight: '700', color: '#9163CB' },
  diaMesTextoAtivo: { color: '#fff' },

  seletorRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  seletorOpcao: {
    flex: 1, paddingVertical: 13, borderRadius: 50, borderWidth: 1.5,
    borderColor: '#481D94', alignItems: 'center', backgroundColor: '#FAFAFE', minWidth: 70,
  },
  seletorOpcaoAtiva: { backgroundColor: '#EDE8FA', borderColor: '#6B49AD' },
  seletorTexto: { fontSize: 13, fontWeight: '600', color: '#9163CB' },
  seletorTextoAtivo: { color: '#301971', fontWeight: '800' },

  statusBox: {
    backgroundColor: '#EDE8FA', borderRadius: 18, padding: 18,
    marginBottom: 20, borderWidth: 1.5, borderColor: '#C4B5FD',
  },
  statusBoxHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  statusBoxTitulo: { fontSize: 14, fontWeight: '700', color: '#481D94' },
  statusBoxSub: { fontSize: 13, color: '#6B49AD', marginBottom: 14, lineHeight: 18 },
  statusBoxInput: {
    borderWidth: 1.5, borderColor: '#481D94', borderRadius: 18,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: '#301971', backgroundColor: '#fff',
    textAlignVertical: 'top', minHeight: 80,
  },

  // Modal excluir
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

  // Modal pausar
  modalCentroFundo: {
    flex: 1, backgroundColor: '#00000066', justifyContent: 'center',
    alignItems: 'center', paddingHorizontal: 28,
  },
  modalCentroCard: {
    backgroundColor: '#fff', borderRadius: 28, width: '100%', overflow: 'hidden',
    shadowColor: '#6B49AD', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2, shadowRadius: 20, elevation: 12,
  },
  modalRoxoHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 24, paddingVertical: 20,
  },
  modalRoxoTitulo: { fontSize: 17, fontWeight: '800', color: '#fff' },
  modalRoxoBody: { padding: 24 },
  modalRoxoPergunta: { fontSize: 15, fontWeight: '600', color: '#301971', marginBottom: 16, lineHeight: 22 },
  btnRoxoConfirmar: {
    shadowColor: '#481D94', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  btnRoxoGradient: { borderRadius: 50, paddingVertical: 16, alignItems: 'center' },
  btnConfirmarTexto: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 2 },
})