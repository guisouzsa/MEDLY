import { Feather } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import {
    Animated, Dimensions, KeyboardAvoidingView, Modal,
    Platform, ScrollView,
    StyleSheet, Text, TextInput, TouchableOpacity, View
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '../../src/lib/supabase'

const { height } = Dimensions.get('window')

type Medicamento = {
  id: number
  nome: string
  dosagem: string
  horario: string
  frequencia: string
  data_inicio: string
  data_termino: string
  quantidade_por_dose: string
  observacoes: string
  status: string
}

function Campo({ label, value, onChangeText, placeholder, keyboardType = 'default' as any }: {
  label: string, value: string, onChangeText: (t: string) => void,
  placeholder?: string, keyboardType?: any,
}) {
  return (
    <View style={styles.campoWrapper}>
      <Text style={styles.campoLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#C4B5FD"
        keyboardType={keyboardType}
        autoCorrect={false}
      />
    </View>
  )
}

function SeletorStatus({ value, onChange }: { value: string, onChange: (v: string) => void }) {
  const opcoes = [
    { label: 'Ativo', valor: 'ativo' },
    { label: 'Pausado', valor: 'pausado' },
    { label: 'Concluído', valor: 'concluido' },
  ]
  return (
    <View style={styles.campoWrapper}>
      <Text style={styles.campoLabel}>STATUS</Text>
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

function tagStatusCor(status: string) {
  if (status === 'ativo') return { bg: '#DCFCE7', cor: '#16A34A' }
  if (status === 'pausado') return { bg: '#FEF9C3', cor: '#CA8A04' }
  return { bg: '#F1F5F9', cor: '#64748B' }
}

// converte DD/MM/AAAA para AAAA-MM-DD que o Supabase aceita
function converterData(data: string): string | null {
  if (!data || data.length < 10) return null
  const partes = data.split('/')
  if (partes.length !== 3) return null
  return `${partes[2]}-${partes[1]}-${partes[0]}`
}

export default function Medicamentos() {
  const { abrir } = useLocalSearchParams()
  const [usuarioId, setUsuarioId] = useState<string | null>(null)
  const [lista, setLista] = useState<Medicamento[]>([])
  const [modalVisivel, setModalVisivel] = useState(false)
  const [modalExcluir, setModalExcluir] = useState(false)
  const [excluirId, setExcluirId] = useState<number | null>(null)
  const [editando, setEditando] = useState<Medicamento | null>(null)
  const [nome, setNome] = useState('')
  const [dosagem, setDosagem] = useState('')
  const [horario, setHorario] = useState('')
  const [frequencia, setFrequencia] = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [dataTermino, setDataTermino] = useState('')
  const [quantidadePorDose, setQuantidadePorDose] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [status, setStatus] = useState('ativo')
  const [carregando, setCarregando] = useState(false)
  const slideAnim = useRef(new Animated.Value(height)).current

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/auth'); return }
      setUsuarioId(user.id)
      buscar(user.id)
      if (abrir === 'true') abrirModal()
    }
    init()
  }, [])

  async function buscar(uid?: string) {
    const id = uid ?? usuarioId
    if (!id) return
    const { data } = await supabase
      .from('medicamentos')
      .select()
      .eq('usuario_id', id)
      .order('id')
    if (data) setLista(data)
  }

  function abrirModal(med?: Medicamento) {
    setEditando(med ?? null)
    setNome(med?.nome ?? '')
    setDosagem(med?.dosagem ?? '')
    setHorario(med?.horario ?? '')
    setFrequencia(med?.frequencia ?? '')
    setDataInicio(med?.data_inicio ?? '')
    setDataTermino(med?.data_termino ?? '')
    setQuantidadePorDose(med?.quantidade_por_dose ?? '')
    setObservacoes(med?.observacoes ?? '')
    setStatus(med?.status ?? 'ativo')
    setModalVisivel(true)
    Animated.spring(slideAnim, {
      toValue: 0, useNativeDriver: true, tension: 65, friction: 11,
    }).start()
  }

  function fecharModal() {
    Animated.timing(slideAnim, {
      toValue: height, duration: 280, useNativeDriver: true,
    }).start(() => setModalVisivel(false))
  }

  function mascaraData(texto: string) {
    const n = texto.replace(/\D/g, '').slice(0, 8)
    if (n.length <= 2) return n
    if (n.length <= 4) return `${n.slice(0, 2)}/${n.slice(2)}`
    return `${n.slice(0, 2)}/${n.slice(2, 4)}/${n.slice(4)}`
  }

  function mascaraHorario(texto: string) {
    const n = texto.replace(/\D/g, '').slice(0, 4)
    return n.length <= 2 ? n : `${n.slice(0, 2)}:${n.slice(2)}`
  }

  async function salvar() {
    if (!nome.trim() || !usuarioId) return
    setCarregando(true)
    const payload = {
      usuario_id: usuarioId,
      nome: nome.trim(),
      dosagem: dosagem.trim(),
      horario,
      frequencia: frequencia.trim(),
      data_inicio: converterData(dataInicio),
      data_termino: converterData(dataTermino),
      quantidade_por_dose: quantidadePorDose.trim(),
      observacoes: observacoes.trim(),
      status,
    }
    if (editando) {
      await supabase.from('medicamentos').update(payload).eq('id', editando.id)
    } else {
      await supabase.from('medicamentos').insert(payload)
    }
    setCarregando(false)
    fecharModal()
    buscar()
  }

  function confirmarExcluir(id: number) {
    setExcluirId(id)
    setModalExcluir(true)
  }

  async function excluir() {
    if (!excluirId) return
    await supabase.from('medicamentos').delete().eq('id', excluirId)
    setModalExcluir(false)
    setExcluirId(null)
    buscar()
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.voltarBtn}>
          <Feather name="arrow-left" size={22} color="#6B49AD" />
        </TouchableOpacity>
        <Text style={styles.headerTitulo}>Meus Medicamentos</Text>
        <TouchableOpacity onPress={() => abrirModal()} activeOpacity={0.8} style={styles.botaoNovo}>
          <LinearGradient
            colors={['#7B52D3', '#481D94']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.botaoNovoGradient}
          >
            <Feather name="plus" size={20} color="#fff" />
            <Text style={styles.botaoNovoTexto}>Cadastrar</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.lista} showsVerticalScrollIndicator={false}>
        {lista.length === 0 && (
          <View style={styles.vazioContainer}>
            <View style={styles.vazioIcone}>
              <Feather name="activity" size={40} color="#9163CB" />
            </View>
            <Text style={styles.vazioTitulo}>Nenhum medicamento</Text>
            <Text style={styles.vazioSub}>Toque em cadastrar para adicionar</Text>
          </View>
        )}

        {lista.map((med) => {
          const cor = tagStatusCor(med.status)
          return (
            <View key={med.id} style={styles.card}>
              <View style={styles.cardTopo}>
                <LinearGradient
                  colors={['#7B52D3', '#481D94']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={styles.cardIconeBox}
                >
                  <Feather name="activity" size={24} color="#fff" />
                </LinearGradient>
                <View style={styles.cardTextos}>
                  <Text style={styles.cardNome}>{med.nome}</Text>
                  {med.status ? (
                    <View style={[styles.tagStatus, { backgroundColor: cor.bg }]}>
                      <Text style={[styles.tagStatusTexto, { color: cor.cor }]}>
                        {med.status.charAt(0).toUpperCase() + med.status.slice(1)}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <View style={styles.cardAcoes}>
                  <TouchableOpacity style={styles.btnEditar} onPress={() => abrirModal(med)}>
                    <Feather name="edit-2" size={18} color="#6B49AD" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.btnExcluir} onPress={() => confirmarExcluir(med.id)}>
                    <Feather name="trash-2" size={18} color="#dc2626" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.cardInfoRow}>
                {med.dosagem ? (
                  <View style={styles.infoItem}>
                    <Feather name="droplet" size={14} color="#6B49AD" />
                    <Text style={styles.infoTexto}>{med.dosagem}</Text>
                  </View>
                ) : null}
                {med.horario ? (
                  <View style={styles.infoItem}>
                    <Feather name="clock" size={14} color="#6B49AD" />
                    <Text style={styles.infoTexto}>{med.horario}</Text>
                  </View>
                ) : null}
                {med.frequencia ? (
                  <View style={styles.infoItem}>
                    <Feather name="refresh-cw" size={14} color="#6B49AD" />
                    <Text style={styles.infoTexto}>{med.frequencia}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          )
        })}
        <View style={{ height: 100 }} />
      </ScrollView>

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

              <Campo label="NOME DO MEDICAMENTO *" value={nome} onChangeText={setNome} placeholder="Ex: Paracetamol" />

              <View style={styles.duasColunas}>
                <View style={styles.coluna}>
                  <Campo label="DOSAGEM" value={dosagem} onChangeText={setDosagem} placeholder="Ex: 500mg" />
                </View>
                <View style={styles.coluna}>
                  <Campo label="HORÁRIO" value={horario} onChangeText={(t) => setHorario(mascaraHorario(t))} placeholder="08:00" keyboardType="numeric" />
                </View>
              </View>

              <Campo label="FREQUÊNCIA" value={frequencia} onChangeText={setFrequencia} placeholder="Ex: 1 vez ao dia" />

              <View style={styles.duasColunas}>
                <View style={styles.coluna}>
                  <Campo label="DATA INÍCIO" value={dataInicio} onChangeText={(t) => setDataInicio(mascaraData(t))} placeholder="DD/MM/AAAA" keyboardType="numeric" />
                </View>
                <View style={styles.coluna}>
                  <Campo label="DATA FIM" value={dataTermino} onChangeText={(t) => setDataTermino(mascaraData(t))} placeholder="DD/MM/AAAA" keyboardType="numeric" />
                </View>
              </View>

              <Campo label="QUANTIDADE POR DOSE" value={quantidadePorDose} onChangeText={setQuantidadePorDose} placeholder="Ex: 1 comprimido" />
              <Campo label="OBSERVAÇÕES" value={observacoes} onChangeText={setObservacoes} placeholder="Observações opcionais" />
              <SeletorStatus value={status} onChange={setStatus} />

              <TouchableOpacity
                onPress={salvar}
                disabled={carregando || !nome.trim()}
                activeOpacity={0.85}
                style={styles.botaoSalvarWrapper}
              >
                <LinearGradient
                  colors={['#7B52D3', '#481D94']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={[styles.botaoSalvar, (!nome.trim() || carregando) && { opacity: 0.5 }]}
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

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F5F0FF',
  },
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
    shadowColor: '#6B49AD', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 6,
  },
  voltarBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#F0EAFF',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitulo: { fontSize: 20, fontWeight: '800', color: '#301971', flex: 1, marginLeft: 12 },
  botaoNovo: {
    borderRadius: 60, shadowColor: '#481D94',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  botaoNovoGradient: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 60, paddingHorizontal: 20, paddingVertical: 14,
  },
  botaoNovoTexto: { color: '#fff', fontWeight: '700', fontSize: 16 },

  lista: { padding: 16, gap: 14 },

  vazioContainer: { alignItems: 'center', marginTop: 80, gap: 12 },
  vazioIcone: {
    width: 90, height: 90, borderRadius: 28,
    backgroundColor: '#EDE8FA',
    justifyContent: 'center', alignItems: 'center', marginBottom: 8,
  },
  vazioTitulo: { fontSize: 18, fontWeight: '700', color: '#301971' },
  vazioSub: { fontSize: 15, color: '#9163CB' },

  card: {
    backgroundColor: '#fff', borderRadius: 20, padding: 18,
    shadowColor: '#6B49AD', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08, shadowRadius: 10, elevation: 4, gap: 14,
  },
  cardTopo: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  cardIconeBox: {
    width: 52, height: 52, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
  },
  cardTextos: { flex: 1, gap: 6 },
  cardNome: { fontSize: 17, fontWeight: '700', color: '#301971' },
  tagStatus: {
    alignSelf: 'flex-start', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 4,
  },
  tagStatusTexto: { fontSize: 13, fontWeight: '700' },
  cardAcoes: { flexDirection: 'row', gap: 8 },
  btnEditar: {
    width: 42, height: 42, borderRadius: 14,
    backgroundColor: '#F0EAFF',
    justifyContent: 'center', alignItems: 'center',
  },
  btnExcluir: {
    width: 42, height: 42, borderRadius: 14,
    backgroundColor: '#FFF1F2',
    justifyContent: 'center', alignItems: 'center',
  },
  cardInfoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  infoItem: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#F0EAFF', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  infoTexto: { fontSize: 14, color: '#6B49AD', fontWeight: '600' },

  modalFundo: { flex: 1 },
  modalOverlay: { flex: 1, backgroundColor: '#00000055' },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, maxHeight: height * 0.85,
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#E2D9F3',
    alignSelf: 'center', marginBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 20,
  },
  modalTitulo: { fontSize: 19, fontWeight: '800', color: '#301971' },
  modalFechar: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#F0EAFF',
    justifyContent: 'center', alignItems: 'center',
  },

  duasColunas: { flexDirection: 'row', gap: 12 },
  coluna: { flex: 1 },

  campoWrapper: { marginBottom: 16 },
  campoLabel: {
    fontSize: 11, fontWeight: '700',
    color: '#9163CB', letterSpacing: 1.2, marginBottom: 8,
  },
  input: {
    borderWidth: 1.5, borderColor: '#E2D9F3',
    borderRadius: 14, paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 16 : 12,
    fontSize: 16, color: '#301971', backgroundColor: '#FAFAFE',
  },

  seletorRow: { flexDirection: 'row', gap: 10 },
  seletorOpcao: {
    flex: 1, paddingVertical: 12, borderRadius: 14,
    borderWidth: 1.5, borderColor: '#E2D9F3',
    alignItems: 'center', backgroundColor: '#FAFAFE',
  },
  seletorOpcaoAtiva: { backgroundColor: '#EDE8FA', borderColor: '#9163CB' },
  seletorTexto: { fontSize: 14, fontWeight: '600', color: '#9163CB' },
  seletorTextoAtivo: { color: '#301971', fontWeight: '800' },

  botaoSalvarWrapper: {
    marginTop: 8, shadowColor: '#481D94',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  botaoSalvar: { borderRadius: 60, paddingVertical: 18, alignItems: 'center' },
  botaoSalvarTexto: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 2 },

  modalExcluirFundo: {
    flex: 1, backgroundColor: '#00000066',
    justifyContent: 'flex-end',
  },
  modalExcluirCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 32, alignItems: 'center', gap: 12,
  },
  modalExcluirIcone: {
    width: 72, height: 72, borderRadius: 24,
    backgroundColor: '#FFF1F2',
    justifyContent: 'center', alignItems: 'center', marginBottom: 8,
  },
  modalExcluirTitulo: { fontSize: 20, fontWeight: '800', color: '#301971' },
  modalExcluirMsg: { fontSize: 15, color: '#6B49AD', marginBottom: 8 },
  btnExcluirConfirmar: {
    width: '100%', backgroundColor: '#dc2626',
    borderRadius: 60, paddingVertical: 18, alignItems: 'center',
  },
  btnExcluirConfirmarTexto: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 2 },
  btnCancelar: { paddingVertical: 14 },
  btnCancelarTexto: { fontSize: 15, fontWeight: '600', color: '#9163CB' },
})