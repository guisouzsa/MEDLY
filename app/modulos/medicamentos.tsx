import { Feather } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Alert,
  Animated, Dimensions, Image, KeyboardAvoidingView, Modal,
  Platform, ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
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
  data_inicio: string
  data_termino: string | null
  quantidade_por_dose: string
  observacoes: string
  status: 'ativo' | 'pausado' | 'encerrado'
  medicamento_horarios: Horario[]
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const DIAS_SEMANA = [
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

function tagStatusCor(status: string) {
  if (status === 'ativo') return { bg: '#DCFCE7', cor: '#16A34A' }
  if (status === 'pausado') return { bg: '#FEF9C3', cor: '#CA8A04' }
  return { bg: '#F1F5F9', cor: '#64748B' }
}

function labelFrequencia(med: Medicamento): string {
  if (med.frequencia_tipo === 'diario') return 'Diário'
  if (med.frequencia_tipo === 'semanal') return 'Semanal'
  if (med.frequencia_tipo === 'mensal') return 'Mensal'
  if (med.frequencia_tipo === 'personalizado' && med.intervalo_horas) return `A cada ${med.intervalo_horas}h`
  return med.frequencia_tipo
}

// ─── Componentes internos ─────────────────────────────────────────────────────

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

// ─── Componente de grupo de horários ─────────────────────────────────────────

function GrupoHorarios({
  horarios,
  onAdicionar,
  onRemover,
  onAtualizar,
  label = 'HORÁRIOS',
  descricao,
}: {
  horarios: string[]
  onAdicionar: () => void
  onRemover: (i: number) => void
  onAtualizar: (i: number, v: string) => void
  label?: string
  descricao?: string
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
          <View style={styles.horarioInputWrapper}>
            <Feather name="clock" size={16} color="#9163CB" style={styles.horarioIcIcoe} />
            <TextInput
              style={styles.inputHorario}
              value={h}
              onChangeText={(t) => onAtualizar(index, t)}
              placeholder="Ex: 08:00"
              placeholderTextColor="#C4B5FD"
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
      <TouchableOpacity onPress={onAdicionar} style={styles.btnAdicionarHorario}>
        <Feather name="plus" size={16} color="#6B49AD" />
        <Text style={styles.btnAdicionarTexto}>Adicionar horário</Text>
      </TouchableOpacity>
    </View>
  )
}

// ─── Tela principal ───────────────────────────────────────────────────────────

export default function Medicamentos() {
  const { abrir } = useLocalSearchParams()

  const [usuarioId, setUsuarioId] = useState<string | null>(null)
  const [lista, setLista] = useState<Medicamento[]>([])
  const [perfilFoto, setPerfilFoto] = useState<string | null>(null)
  const [perfilNome, setPerfilNome] = useState<string>('')

  const [modalVisivel, setModalVisivel] = useState(false)
  const [editando, setEditando] = useState<Medicamento | null>(null)
  const slideAnim = useRef(new Animated.Value(height)).current

  // ── Campos do form ────────────────────────────────────────────────────────
  const [nome, setNome] = useState('')
  const [dosagem, setDosagem] = useState('')
  const [frequenciaTipo, setFrequenciaTipo] = useState<Medicamento['frequencia_tipo']>('diario')
  const [intervaloHoras, setIntervaloHoras] = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [dataTermino, setDataTermino] = useState('')
  const [quantidadePorDose, setQuantidadePorDose] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [status, setStatus] = useState<Medicamento['status']>('ativo')

  // Diário: múltiplos horários
  const [horarios, setHorarios] = useState<string[]>([''])

  // Semanal: dias + horários por dia selecionado
  const [diasSemanaSelecionados, setDiasSemanaSelecionados] = useState<number[]>([])
  const [horariosSemanal, setHorariosSemanal] = useState<string[]>([''])

  // Mensal: dias + horários
  const [diasMesSelecionados, setDiasMesSelecionados] = useState<number[]>([])
  const [horariosMensal, setHorariosMensal] = useState<string[]>([''])

  const [carregando, setCarregando] = useState(false)
  const [modalExcluir, setModalExcluir] = useState(false)
  const [excluirId, setExcluirId] = useState<number | null>(null)

  // Erros de validação por campo
  const [erros, setErros] = useState<Record<string, boolean>>({})

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
      .from('medicamentos')
      .select('*, medicamento_horarios(id, horario, dia_semana, dia_mes)')
      .eq('usuario_id', id)
      .order('id')
    if (error) { console.error('Erro ao buscar:', error.message); return }
    if (data) setLista(data as Medicamento[])
  }

  // ── Modal ─────────────────────────────────────────────────────────────────

  function resetForm() {
    setNome('')
    setDosagem('')
    setFrequenciaTipo('diario')
    setIntervaloHoras('')
    setDataInicio('')
    setDataTermino('')
    setQuantidadePorDose('')
    setObservacoes('')
    setStatus('ativo')
    setHorarios([''])
    setDiasSemanaSelecionados([])
    setHorariosSemanal([''])
    setDiasMesSelecionados([])
    setHorariosMensal([''])
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
      setQuantidadePorDose(med.quantidade_por_dose ?? '')
      setObservacoes(med.observacoes ?? '')
      setStatus(med.status)
      setErros({})

      const hs = med.medicamento_horarios ?? []

      if (med.frequencia_tipo === 'diario') {
        setHorarios(hs.length > 0 ? hs.map(h => h.horario.slice(0, 5)) : [''])
        setDiasSemanaSelecionados([])
        setHorariosSemanal([''])
        setDiasMesSelecionados([])
        setHorariosMensal([''])
      } else if (med.frequencia_tipo === 'semanal') {
        setHorarios([''])
        const diasUnicos = [...new Set(hs.map(h => h.dia_semana).filter(d => d !== null) as number[])]
        setDiasSemanaSelecionados(diasUnicos)
        // Pega horários únicos do semanal
        const horariosUnicos = [...new Set(hs.map(h => h.horario.slice(0, 5)))]
        setHorariosSemanal(horariosUnicos.length > 0 ? horariosUnicos : [''])
        setDiasMesSelecionados([])
        setHorariosMensal([''])
      } else if (med.frequencia_tipo === 'mensal') {
        setHorarios([''])
        setDiasSemanaSelecionados([])
        setHorariosSemanal([''])
        const diasUnicos = [...new Set(hs.map(h => h.dia_mes).filter(d => d !== null) as number[])]
        setDiasMesSelecionados(diasUnicos)
        const horariosUnicos = [...new Set(hs.map(h => h.horario.slice(0, 5)))]
        setHorariosMensal(horariosUnicos.length > 0 ? horariosUnicos : [''])
      } else {
        setHorarios([''])
        setDiasSemanaSelecionados([])
        setHorariosSemanal([''])
        setDiasMesSelecionados([])
        setHorariosMensal([''])
      }
    } else {
      resetForm()
    }

    setModalVisivel(true)
    Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }).start()
  }

  function fecharModal() {
    Animated.timing(slideAnim, { toValue: height, duration: 280, useNativeDriver: true }).start(() => setModalVisivel(false))
  }

  // ── Toggles dia semana / dia mês ──────────────────────────────────────────

  function toggleDiaSemana(dia: number) {
    setDiasSemanaSelecionados(prev =>
      prev.includes(dia) ? prev.filter(d => d !== dia) : [...prev, dia]
    )
  }

  function toggleDiaMes(dia: number) {
    setDiasMesSelecionados(prev =>
      prev.includes(dia) ? prev.filter(d => d !== dia) : [...prev, dia]
    )
  }

  // ── Horários diários ──────────────────────────────────────────────────────
  function adicionarHorario() { setHorarios(prev => [...prev, '']) }
  function removerHorario(index: number) { setHorarios(prev => prev.filter((_, i) => i !== index)) }
  function atualizarHorario(index: number, valor: string) {
    setHorarios(prev => prev.map((h, i) => i === index ? mascaraHorario(valor) : h))
  }

  // ── Horários semanal ──────────────────────────────────────────────────────
  function adicionarHorarioSemanal() { setHorariosSemanal(prev => [...prev, '']) }
  function removerHorarioSemanal(index: number) { setHorariosSemanal(prev => prev.filter((_, i) => i !== index)) }
  function atualizarHorarioSemanal(index: number, valor: string) {
    setHorariosSemanal(prev => prev.map((h, i) => i === index ? mascaraHorario(valor) : h))
  }

  // ── Horários mensal ───────────────────────────────────────────────────────
  function adicionarHorarioMensal() { setHorariosMensal(prev => [...prev, '']) }
  function removerHorarioMensal(index: number) { setHorariosMensal(prev => prev.filter((_, i) => i !== index)) }
  function atualizarHorarioMensal(index: number, valor: string) {
    setHorariosMensal(prev => prev.map((h, i) => i === index ? mascaraHorario(valor) : h))
  }

  // ── Validação ─────────────────────────────────────────────────────────────

  function validar(): boolean {
    const novosErros: Record<string, boolean> = {}

    if (!nome.trim()) novosErros.nome = true
    if (!dosagem.trim()) novosErros.dosagem = true
    if (!quantidadePorDose.trim()) novosErros.quantidadePorDose = true
    if (!dataInicio || dataInicio.length < 10) novosErros.dataInicio = true

    if (dataInicio.length === 10 && dataEhPassada(dataInicio)) {
      novosErros.dataInicioPassada = true
    }

    if (frequenciaTipo === 'personalizado' && !intervaloHoras) {
      novosErros.intervaloHoras = true
    }

    if (frequenciaTipo === 'semanal') {
      if (diasSemanaSelecionados.length === 0) novosErros.diasSemana = true
      const horariosValidos = horariosSemanal.filter(h => h.length === 5)
      if (horariosValidos.length === 0) novosErros.horarioSemanal = true
    }

    if (frequenciaTipo === 'mensal') {
      if (diasMesSelecionados.length === 0) novosErros.diasMes = true
      const horariosValidos = horariosMensal.filter(h => h.length === 5)
      if (horariosValidos.length === 0) novosErros.horarioMensal = true
    }

    if (frequenciaTipo === 'diario') {
      const validos = horarios.filter(h => h.length === 5)
      if (validos.length === 0) novosErros.horarioDiario = true
    }

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
        nome: nome.trim(),
        dosagem: dosagem.trim(),
        frequencia_tipo: frequenciaTipo,
        intervalo_horas: intervaloHoras ? parseInt(intervaloHoras) : null,
        data_inicio: converterData(dataInicio),
        data_termino: dataTermino && dataTermino.length === 10 ? converterData(dataTermino) : null,
        quantidade_por_dose: quantidadePorDose.trim(),
        observacoes: observacoes.trim() || null,
        status,
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

      // Monta registros de horário conforme o tipo
      let horariosParaSalvar: { medicamento_id: number; horario: string; dia_semana: number | null; dia_mes: number | null }[] = []

      if (frequenciaTipo === 'diario') {
        const validos = horarios.filter(h => h.length === 5)
        horariosParaSalvar = validos.map(h => ({
          medicamento_id: medicamentoId,
          horario: h,
          dia_semana: null,
          dia_mes: null,
        }))
      } else if (frequenciaTipo === 'semanal') {
        // Cada combinação dia × horário
        const horariosValidos = horariosSemanal.filter(h => h.length === 5)
        for (const dia of diasSemanaSelecionados) {
          for (const hor of horariosValidos) {
            horariosParaSalvar.push({
              medicamento_id: medicamentoId,
              horario: hor,
              dia_semana: dia,
              dia_mes: null,
            })
          }
        }
      } else if (frequenciaTipo === 'mensal') {
        const horariosValidos = horariosMensal.filter(h => h.length === 5)
        for (const dia of diasMesSelecionados) {
          for (const hor of horariosValidos) {
            horariosParaSalvar.push({
              medicamento_id: medicamentoId,
              horario: hor,
              dia_semana: null,
              dia_mes: dia,
            })
          }
        }
      }

      if (horariosParaSalvar.length > 0) {
        const { error: erroHorarios } = await supabase.from('medicamento_horarios').insert(horariosParaSalvar)
        if (erroHorarios) throw erroHorarios
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
    const { error } = await supabase.from('medicamentos').delete().eq('id', excluirId)
    if (error) { Alert.alert('Erro ao excluir', error.message); return }
    setModalExcluir(false)
    setExcluirId(null)
    await buscar()
  }

  // ── Render horários diários ───────────────────────────────────────────────

  function renderHorariosDiarios() {
    return (
      <>
        <GrupoHorarios
          label="HORÁRIOS DO DIA"
          descricao="Informe os horários em que o medicamento deve ser tomado. Você pode adicionar quantos horários precisar."
          horarios={horarios}
          onAdicionar={adicionarHorario}
          onRemover={removerHorario}
          onAtualizar={atualizarHorario}
        />
        {erros.horarioDiario && (
          <View style={styles.erroRow}>
            <Feather name="alert-circle" size={13} color="#dc2626" />
            <Text style={styles.erroTexto}>Informe pelo menos um horário</Text>
          </View>
        )}
      </>
    )
  }

  // ── Render semanal ────────────────────────────────────────────────────────

  function renderSemanal() {
    return (
      <View style={styles.campoWrapper}>
        <Text style={styles.campoLabel}>DIAS DA SEMANA</Text>
        <View style={styles.avisoBox}>
          <Feather name="info" size={14} color="#6B49AD" />
          <Text style={styles.avisoTexto}>Selecione os dias em que o medicamento será tomado e os horários correspondentes.</Text>
        </View>

        {erros.diasSemana && (
          <View style={[styles.erroRow, { marginBottom: 10 }]}>
            <Feather name="alert-circle" size={13} color="#dc2626" />
            <Text style={styles.erroTexto}>Selecione pelo menos um dia</Text>
          </View>
        )}

        <View style={styles.diasRow}>
          {DIAS_SEMANA.map(({ label, valor }) => {
            const ativo = diasSemanaSelecionados.includes(valor)
            return (
              <TouchableOpacity
                key={valor}
                style={[styles.diaPilula, ativo && styles.diaPilulaAtiva, erros.diasSemana && !ativo && styles.diaPilulaErro]}
                onPress={() => {
                  toggleDiaSemana(valor)
                  if (erros.diasSemana) setErros(prev => ({ ...prev, diasSemana: false }))
                }}
              >
                <Text style={[styles.diaTexto, ativo && styles.diaTextoAtivo]}>{label}</Text>
              </TouchableOpacity>
            )
          })}
        </View>

        <View style={{ height: 16 }} />

        <GrupoHorarios
          label="HORÁRIOS"
          descricao="Esses horários valerão para todos os dias selecionados acima."
          horarios={horariosSemanal}
          onAdicionar={adicionarHorarioSemanal}
          onRemover={removerHorarioSemanal}
          onAtualizar={atualizarHorarioSemanal}
        />
        {erros.horarioSemanal && (
          <View style={styles.erroRow}>
            <Feather name="alert-circle" size={13} color="#dc2626" />
            <Text style={styles.erroTexto}>Informe pelo menos um horário</Text>
          </View>
        )}
      </View>
    )
  }

  // ── Render mensal ─────────────────────────────────────────────────────────

  function renderMensal() {
    const diasDoMes = Array.from({ length: 31 }, (_, i) => i + 1)
    return (
      <View style={styles.campoWrapper}>
        <Text style={styles.campoLabel}>DIAS DO MÊS</Text>
        <View style={styles.avisoBox}>
          <Feather name="info" size={14} color="#6B49AD" />
          <Text style={styles.avisoTexto}>Toque nos dias do mês em que o medicamento deve ser tomado.</Text>
        </View>

        {erros.diasMes && (
          <View style={[styles.erroRow, { marginBottom: 10 }]}>
            <Feather name="alert-circle" size={13} color="#dc2626" />
            <Text style={styles.erroTexto}>Selecione pelo menos um dia</Text>
          </View>
        )}

        <View style={styles.diasMesGrid}>
          {diasDoMes.map(dia => {
            const ativo = diasMesSelecionados.includes(dia)
            return (
              <TouchableOpacity
                key={dia}
                style={[styles.diaMesItem, ativo && styles.diaMesItemAtivo, erros.diasMes && !ativo && styles.diaMesItemErro]}
                onPress={() => {
                  toggleDiaMes(dia)
                  if (erros.diasMes) setErros(prev => ({ ...prev, diasMes: false }))
                }}
              >
                <Text style={[styles.diaMesTexto, ativo && styles.diaMesTextoAtivo]}>{dia}</Text>
              </TouchableOpacity>
            )
          })}
        </View>

        <View style={{ height: 16 }} />

        <GrupoHorarios
          label="HORÁRIOS"
          descricao="Esses horários valerão para todos os dias selecionados acima."
          horarios={horariosMensal}
          onAdicionar={adicionarHorarioMensal}
          onRemover={removerHorarioMensal}
          onAtualizar={atualizarHorarioMensal}
        />
        {erros.horarioMensal && (
          <View style={styles.erroRow}>
            <Feather name="alert-circle" size={13} color="#dc2626" />
            <Text style={styles.erroTexto}>Informe pelo menos um horário</Text>
          </View>
        )}
      </View>
    )
  }

  // ── Render resumo horários no card ────────────────────────────────────────

  function renderInfoHorarios(med: Medicamento) {
    const hs = med.medicamento_horarios ?? []
    if (med.frequencia_tipo === 'diario') {
      return hs.map(h => (
        <View key={h.id} style={styles.infoItem}>
          <Feather name="clock" size={14} color="#6B49AD" />
          <Text style={styles.infoTexto}>{h.horario.slice(0, 5)}</Text>
        </View>
      ))
    }
    if (med.frequencia_tipo === 'semanal') {
      const dias = [...new Set(hs.map(h => DIAS_SEMANA.find(d => d.valor === h.dia_semana)?.label ?? ''))].filter(Boolean)
      const horariosUnicos = [...new Set(hs.map(h => h.horario.slice(0, 5)))]
      return (
        <>
          {dias.length > 0 && (
            <View style={styles.infoItem}>
              <Feather name="calendar" size={14} color="#6B49AD" />
              <Text style={styles.infoTexto}>{dias.join(', ')}</Text>
            </View>
          )}
          {horariosUnicos.map((hor, i) => (
            <View key={i} style={styles.infoItem}>
              <Feather name="clock" size={14} color="#6B49AD" />
              <Text style={styles.infoTexto}>{hor}</Text>
            </View>
          ))}
        </>
      )
    }
    if (med.frequencia_tipo === 'mensal') {
      const dias = [...new Set(hs.map(h => h.dia_mes))].filter(Boolean).sort((a, b) => (a ?? 0) - (b ?? 0))
      const horariosUnicos = [...new Set(hs.map(h => h.horario.slice(0, 5)))]
      return (
        <>
          {dias.length > 0 && (
            <View style={styles.infoItem}>
              <Feather name="calendar" size={14} color="#6B49AD" />
              <Text style={styles.infoTexto}>Dias: {dias.join(', ')}</Text>
            </View>
          )}
          {horariosUnicos.map((hor, i) => (
            <View key={i} style={styles.infoItem}>
              <Feather name="clock" size={14} color="#6B49AD" />
              <Text style={styles.infoTexto}>{hor}</Text>
            </View>
          ))}
        </>
      )
    }
    if (med.frequencia_tipo === 'personalizado' && med.intervalo_horas) {
      return (
        <View style={styles.infoItem}>
          <Feather name="clock" size={14} color="#6B49AD" />
          <Text style={styles.infoTexto}>A cada {med.intervalo_horas}h</Text>
        </View>
      )
    }
    return null
  }

  // ── Render principal ──────────────────────────────────────────────────────

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
                <Image source={{ uri: perfilFoto }} style={styles.fotoPerfil} onError={(e) => { console.log('ERRO ao carregar foto perfil:', e.nativeEvent.error, perfilFoto); setPerfilFoto(null) }} />
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
            colors={['#6B49AD', '#481D94']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.cardTituloGradient}
          >
            <Feather name="activity" size={22} color="#fff" />
            <Text style={styles.cardTituloTexto}>MEDICAMENTOS</Text>
            <TouchableOpacity onPress={() => abrirModal()} activeOpacity={0.8} style={styles.btnNovoHeader}>
              <Feather name="plus" size={20} color="#fff" />
              <Text style={styles.btnNovoHeaderTexto}>Cadastrar</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>

        {/* Card 3 — Lista */}
        <View style={styles.cardLista}>
          {lista.length === 0 ? (
            <View style={styles.vazioContainer}>
              <View style={styles.vazioIcone}>
                <Feather name="activity" size={36} color="#9163CB" />
              </View>
              <Text style={styles.vazioTitulo}>Nenhum medicamento</Text>
              <Text style={styles.vazioSub}>Toque em "Cadastrar" para adicionar</Text>
            </View>
          ) : (
            lista.map((med) => {
              const cor = tagStatusCor(med.status)
              return (
                <View key={med.id} style={styles.card}>
                  <View style={styles.cardTopo}>
                    <LinearGradient
                      colors={['#6B49AD', '#481D94']}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                      style={styles.cardIconeBox}
                    >
                      <Feather name="activity" size={22} color="#fff" />
                    </LinearGradient>
                    <View style={styles.cardTextos}>
                      <Text style={styles.cardNome}>{med.nome}</Text>
                      <View style={[styles.tagStatus, { backgroundColor: cor.bg }]}>
                        <Text style={[styles.tagStatusTexto, { color: cor.cor }]}>
                          {med.status.charAt(0).toUpperCase() + med.status.slice(1)}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.cardAcoes}>
                      <TouchableOpacity style={styles.btnEditar} onPress={() => abrirModal(med)}>
                        <Feather name="edit-2" size={17} color="#6B49AD" />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.btnExcluirCard} onPress={() => confirmarExcluir(med.id)}>
                        <Feather name="trash-2" size={17} color="#dc2626" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.cardInfoRow}>
                    {med.dosagem ? (
                      <View style={styles.infoItem}>
                        <Feather name="droplet" size={13} color="#6B49AD" />
                        <Text style={styles.infoTexto}>{med.dosagem}</Text>
                      </View>
                    ) : null}
                    <View style={styles.infoItem}>
                      <Feather name="refresh-cw" size={13} color="#6B49AD" />
                      <Text style={styles.infoTexto}>{labelFrequencia(med)}</Text>
                    </View>
                    {renderInfoHorarios(med)}
                  </View>
                </View>
              )
            })
          )}
          <View style={{ height: 32 }} />
        </View>
      </ScrollView>

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
                  {editando ? 'Editar medicamento' : 'Novo medicamento'}
                </Text>
                <TouchableOpacity onPress={fecharModal} style={styles.modalFechar}>
                  <Feather name="x" size={22} color="#9163CB" />
                </TouchableOpacity>
              </View>

              {/* Nome */}
              <Campo
                label="NOME DO MEDICAMENTO"
                value={nome}
                onChangeText={(v) => { setNome(v); setErros(p => ({ ...p, nome: false })) }}
                placeholder="Ex: Paracetamol"
                obrigatorio
                erro={erros.nome}
              />

              {/* Dosagem e Qtde por dose */}
              <View style={styles.duasColunas}>
                <View style={styles.coluna}>
                  <Campo
                    label="DOSAGEM"
                    value={dosagem}
                    onChangeText={(v) => { setDosagem(v); setErros(p => ({ ...p, dosagem: false })) }}
                    placeholder="Ex: 500mg"
                    obrigatorio
                    erro={erros.dosagem}
                  />
                </View>
                <View style={styles.coluna}>
                  <Campo
                    label="QTDE POR DOSE"
                    value={quantidadePorDose}
                    onChangeText={(v) => { setQuantidadePorDose(v); setErros(p => ({ ...p, quantidadePorDose: false })) }}
                    placeholder="Ex: 1 comprimido"
                    obrigatorio
                    erro={erros.quantidadePorDose}
                  />
                </View>
              </View>

              {/* Frequência */}
              <SeletorOpcoes
                label="FREQUÊNCIA"
                value={frequenciaTipo}
                onChange={setFrequenciaTipo}
                opcoes={[
                  { label: 'Diário', valor: 'diario' },
                  { label: 'Semanal', valor: 'semanal' },
                  { label: 'Mensal', valor: 'mensal' },
                  { label: 'Custom', valor: 'personalizado' },
                ]}
              />

              {/* Campos dinâmicos */}
              {frequenciaTipo === 'diario' && renderHorariosDiarios()}
              {frequenciaTipo === 'semanal' && renderSemanal()}
              {frequenciaTipo === 'mensal' && renderMensal()}
              {frequenciaTipo === 'personalizado' && (
                <Campo
                  label="INTERVALO EM HORAS"
                  value={intervaloHoras}
                  onChangeText={(v) => { setIntervaloHoras(v); setErros(p => ({ ...p, intervaloHoras: false })) }}
                  placeholder="Ex: 8"
                  keyboardType="numeric"
                  obrigatorio
                  erro={erros.intervaloHoras}
                  dica="O medicamento será lembrado a cada X horas a partir do início."
                />
              )}

              {/* Data início */}
              <Campo
                label="DATA INÍCIO"
                value={dataInicio}
                onChangeText={(t) => { setDataInicio(mascaraData(t)); setErros(p => ({ ...p, dataInicio: false, dataInicioPassada: false })) }}
                placeholder="DD/MM/AAAA"
                keyboardType="numeric"
                obrigatorio
                erro={erros.dataInicio || erros.dataInicioPassada}
              />
              {erros.dataInicioPassada && (
                <View style={[styles.erroRow, { marginTop: -10, marginBottom: 12 }]}>
                  <Feather name="alert-circle" size={13} color="#dc2626" />
                  <Text style={styles.erroTexto}>A data de início não pode ser uma data passada</Text>
                </View>
              )}

              {/* Data término */}
              <Campo
                label="DATA TÉRMINO"
                value={dataTermino}
                onChangeText={(t) => setDataTermino(mascaraData(t))}
                placeholder="DD/MM/AAAA"
                keyboardType="numeric"
                opcional
                dica="Deixe em branco se o uso for contínuo."
              />

              {/* Observações */}
              <Campo
                label="OBSERVAÇÕES"
                value={observacoes}
                onChangeText={setObservacoes}
                placeholder="Ex: Tomar com água"
                opcional
              />

              {/* Status */}
              <SeletorOpcoes
                label="STATUS"
                value={status}
                onChange={setStatus}
                opcoes={[
                  { label: 'Ativo', valor: 'ativo' },
                  { label: 'Pausado', valor: 'pausado' },
                  { label: 'Encerrado', valor: 'encerrado' },
                ]}
              />

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

    </SafeAreaView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F0FF' },

  // ── Cards da tela de lista ─────────────────────────────────────────────────

  cardPerfil: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 24,
    padding: 16,
    shadowColor: '#6B49AD',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  cardPerfilConteudo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  fotoPerfil: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#E2D9F3',
  },
  fotoPerfilPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EDE8FA',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E2D9F3',
  },
  logoArea: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  logo: {
    width: 100,
    height: 36,
  },
  perfilBoasVindas: {
    fontSize: 13,
    color: '#9163CB',
    fontWeight: '600',
  },
  voltarBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0EAFF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  cardTituloLista: {
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#481D94',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  cardTituloGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    gap: 10,
  },
  cardTituloTexto: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 1.5,
  },
  btnNovoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  btnNovoHeaderTexto: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },

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
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: '#EDE8FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  vazioTitulo: { fontSize: 17, fontWeight: '700', color: '#301971' },
  vazioSub: { fontSize: 14, color: '#9163CB' },

  // ── Cards de medicamentos ──────────────────────────────────────────────────

  card: {
    backgroundColor: '#FAFAFE',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EDE8FA',
    gap: 12,
  },
  cardTopo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardIconeBox: { width: 46, height: 46, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  cardTextos: { flex: 1, gap: 5 },
  cardNome: { fontSize: 16, fontWeight: '700', color: '#301971' },
  tagStatus: { alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  tagStatusTexto: { fontSize: 12, fontWeight: '700' },
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

  // ── Modal ─────────────────────────────────────────────────────────────────

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
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitulo: { fontSize: 19, fontWeight: '800', color: '#301971' },
  modalFechar: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#F0EAFF', justifyContent: 'center', alignItems: 'center',
  },

  duasColunas: { flexDirection: 'row', gap: 12 },
  coluna: { flex: 1 },

  // ── Campos do formulário ──────────────────────────────────────────────────

  campoWrapper: { marginBottom: 18 },
  campoLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  campoLabel: { fontSize: 11, fontWeight: '700', color: '#9163CB', letterSpacing: 1.2 },

  tagOpcional: {
    backgroundColor: '#EDE8FA', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3,
    borderWidth: 1, borderColor: '#C4B5FD',
  },
  tagOpcionalTexto: { fontSize: 10, fontWeight: '700', color: '#7C3AED', letterSpacing: 0.5 },

  tagObrigatorio: {
    backgroundColor: '#FFF1F2', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3,
    borderWidth: 1, borderColor: '#FECACA',
  },
  tagObrigatorioTexto: { fontSize: 10, fontWeight: '700', color: '#dc2626', letterSpacing: 0.5 },

  // Input arredondado com borda roxa — estilo da referência
  input: {
    borderWidth: 1.5,
    borderColor: '#C4B5FD',
    borderRadius: 50,
    paddingHorizontal: 20,
    paddingVertical: Platform.OS === 'ios' ? 16 : 13,
    fontSize: 15,
    color: '#301971',
    backgroundColor: '#FAFAFE',
  },
  inputErro: {
    borderColor: '#f87171',
    backgroundColor: '#FFF5F5',
  },

  // Input de horário com ícone à esquerda
  horarioInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#C4B5FD',
    borderRadius: 50,
    backgroundColor: '#FAFAFE',
    paddingHorizontal: 16,
  },
  horarioIcIcoe: { marginRight: 8 },
  inputHorario: {
    flex: 1,
    paddingVertical: Platform.OS === 'ios' ? 14 : 11,
    fontSize: 15,
    color: '#301971',
  },

  dicaTexto: { fontSize: 12, color: '#9163CB', marginTop: 8, marginLeft: 16 },

  erroRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6, marginLeft: 16 },
  erroTexto: { fontSize: 12, color: '#dc2626', fontWeight: '600' },

  // ── Aviso azulado / roxo ──────────────────────────────────────────────────

  avisoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#EDE8FA',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    borderLeftWidth: 3,
    borderLeftColor: '#6B49AD',
  },
  avisoTexto: {
    flex: 1,
    fontSize: 13,
    color: '#6B49AD',
    lineHeight: 18,
    fontWeight: '500',
  },

  // ── Horários ──────────────────────────────────────────────────────────────

  horarioRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  btnRemoverHorario: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#FFF1F2', justifyContent: 'center', alignItems: 'center',
  },
  btnAdicionarHorario: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 10, paddingHorizontal: 18,
    backgroundColor: '#F0EAFF', borderRadius: 50, alignSelf: 'flex-start',
    borderWidth: 1.5, borderColor: '#C4B5FD',
  },
  btnAdicionarTexto: { fontSize: 13, fontWeight: '700', color: '#6B49AD' },

  // ── Dias da semana ────────────────────────────────────────────────────────

  diasRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  diaPilula: {
    flex: 1,
    minWidth: 44,
    paddingVertical: 12,
    borderRadius: 50,
    borderWidth: 1.5,
    borderColor: '#C4B5FD',
    backgroundColor: '#FAFAFE',
    alignItems: 'center',
  },
  diaPilulaAtiva: { backgroundColor: '#6B49AD', borderColor: '#6B49AD' },
  diaPilulaErro: { borderColor: '#f87171', backgroundColor: '#FFF5F5' },
  diaTexto: { fontSize: 13, fontWeight: '700', color: '#9163CB' },
  diaTextoAtivo: { color: '#fff' },

  // ── Dias do mês ───────────────────────────────────────────────────────────

  diasMesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  diaMesItem: {
    width: 42, height: 42, borderRadius: 21,
    borderWidth: 1.5, borderColor: '#C4B5FD',
    backgroundColor: '#FAFAFE',
    justifyContent: 'center', alignItems: 'center',
  },
  diaMesItemAtivo: { backgroundColor: '#6B49AD', borderColor: '#6B49AD' },
  diaMesItemErro: { borderColor: '#f87171', backgroundColor: '#FFF5F5' },
  diaMesTexto: { fontSize: 13, fontWeight: '700', color: '#9163CB' },
  diaMesTextoAtivo: { color: '#fff' },

  // ── Seletor de opções ─────────────────────────────────────────────────────

  seletorRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  seletorOpcao: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 50,
    borderWidth: 1.5,
    borderColor: '#C4B5FD',
    alignItems: 'center',
    backgroundColor: '#FAFAFE',
    minWidth: 70,
  },
  seletorOpcaoAtiva: { backgroundColor: '#EDE8FA', borderColor: '#6B49AD' },
  seletorTexto: { fontSize: 13, fontWeight: '600', color: '#9163CB' },
  seletorTextoAtivo: { color: '#301971', fontWeight: '800' },

  // ── Botão salvar ──────────────────────────────────────────────────────────

  botaoSalvarWrapper: {
    marginTop: 8,
    shadowColor: '#481D94',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  botaoSalvar: { borderRadius: 50, paddingVertical: 18, alignItems: 'center' },
  botaoSalvarTexto: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 2 },

  // ── Modal excluir ─────────────────────────────────────────────────────────

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
})