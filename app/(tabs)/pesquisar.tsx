import { Feather } from '@expo/vector-icons'
import { useEffect, useState } from 'react'
import {
    ActivityIndicator, Modal,
    ScrollView,
    StyleSheet, Text,
    TextInput, TouchableOpacity, View
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '../../src/lib/supabase'

type Filtro = 'todos' | 'medicamentos' | 'consultas' | 'sintomas' | 'exames'

type Item = {
  id: number
  tipo: Filtro
  titulo: string
  subtitulo: string
  icone: string
}

const FILTROS: { label: string, valor: Filtro, icone: string }[] = [
  { label: 'Todos',         valor: 'todos',        icone: 'grid' },
  { label: 'Medicamentos',  valor: 'medicamentos', icone: 'activity' },
  { label: 'Consultas',     valor: 'consultas',    icone: 'calendar' },
  { label: 'Sintomas',      valor: 'sintomas',     icone: 'thermometer' },
  { label: 'Exames',        valor: 'exames',       icone: 'file-text' },
]

const COR_TIPO: Record<string, { bg: string, cor: string }> = {
  medicamentos: { bg: '#EDE8FA', cor: '#6B49AD' },
  consultas:    { bg: '#DBEAFE', cor: '#1D4ED8' },
  sintomas:     { bg: '#FEF9C3', cor: '#CA8A04' },
  exames:       { bg: '#DCFCE7', cor: '#16A34A' },
}

export default function Pesquisar() {
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [itens, setItens] = useState<Item[]>([])
  const [carregando, setCarregando] = useState(false)
  const [modalFiltro, setModalFiltro] = useState(false)

  useEffect(() => { carregar() }, [filtro])

  async function carregar() {
    setCarregando(true)
    const resultado: Item[] = []

    if (filtro === 'todos' || filtro === 'medicamentos') {
      const { data } = await supabase.from('medicamentos').select('id, nome, dosagem, horario, status')
      data?.forEach(m => resultado.push({
        id: m.id, tipo: 'medicamentos',
        titulo: m.nome,
        subtitulo: [m.dosagem, m.horario, m.status].filter(Boolean).join(' · '),
        icone: 'activity',
      }))
    }

    if (filtro === 'todos' || filtro === 'consultas') {
      const { data } = await supabase.from('consultas').select('id, especialidade, nome_medico, data, horario, local')
      data?.forEach(c => {
        const dataFormatada = (() => {
          if (!c.data) return ''
          const parts = c.data.split('-')
          if (parts.length < 3) return c.data
          return `${parts[2]}/${parts[1]}/${parts[0]}`
        })()
        const dataHora = [dataFormatada, c.horario].filter(Boolean).join(' às ')
        resultado.push({
          id: c.id, tipo: 'consultas',
          titulo: c.especialidade,
          subtitulo: [c.nome_medico, dataHora, c.local].filter(Boolean).join(' · '),
          icone: 'calendar',
        })
      })
    }

    if (filtro === 'todos' || filtro === 'sintomas') {
      const { data } = await supabase.from('sintomas').select('id, nome, intensidade, data')
      data?.forEach(s => resultado.push({
        id: s.id, tipo: 'sintomas',
        titulo: s.nome,
        subtitulo: [`Intensidade ${s.intensidade}/10`, s.data].filter(Boolean).join(' · '),
        icone: 'thermometer',
      }))
    }

    if (filtro === 'todos' || filtro === 'exames') {
      const { data } = await supabase.from('exames').select('id, nome, data_realizacao, status')
      data?.forEach(e => resultado.push({
        id: e.id, tipo: 'exames',
        titulo: e.nome,
        subtitulo: [e.data_realizacao, e.status].filter(Boolean).join(' · '),
        icone: 'file-text',
      }))
    }

    setItens(resultado)
    setCarregando(false)
  }

  const itensFiltrados = itens.filter(item =>
    item.titulo.toLowerCase().includes(busca.toLowerCase()) ||
    item.subtitulo.toLowerCase().includes(busca.toLowerCase())
  )

  const filtroAtual = FILTROS.find(f => f.valor === filtro)

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>

      <View style={styles.header}>
        <Text style={styles.headerTitulo}>Pesquisar</Text>
        <Text style={styles.headerSub}>Busque em todos os seus registros</Text>

        <View style={styles.inputBox}>
          <Feather name="search" size={20} color="#9163CB" />
          <TextInput
            style={styles.input}
            value={busca}
            onChangeText={setBusca}
            placeholder="Digite para pesquisar..."
            placeholderTextColor="#C4B5FD"
            autoCorrect={false}
          />
          {busca.length > 0 && (
            <TouchableOpacity onPress={() => setBusca('')}>
              <Feather name="x" size={18} color="#9163CB" />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity style={styles.botaoFiltro} onPress={() => setModalFiltro(true)} activeOpacity={0.8}>
          <Feather name={filtroAtual?.icone as any} size={16} color="#6B49AD" />
          <Text style={styles.botaoFiltroTexto}>{filtroAtual?.label}</Text>
          <Feather name="chevron-down" size={16} color="#6B49AD" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.lista} showsVerticalScrollIndicator={false}>
        {carregando ? (
          <ActivityIndicator size="large" color="#6B49AD" style={{ marginTop: 60 }} />
        ) : itensFiltrados.length === 0 ? (
          <View style={styles.vazioContainer}>
            <View style={styles.vazioIcone}>
              <Feather name="search" size={36} color="#9163CB" />
            </View>
            <Text style={styles.vazioTitulo}>Nenhum resultado</Text>
            <Text style={styles.vazioSub}>Tente outros termos ou filtros</Text>
          </View>
        ) : (
          itensFiltrados.map((item, i) => {
            const cor = COR_TIPO[item.tipo]
            return (
              <View key={`${item.tipo}-${item.id}-${i}`} style={styles.card}>
                <View style={[styles.cardIconeBox, { backgroundColor: cor.bg }]}>
                  <Feather name={item.icone as any} size={22} color={cor.cor} />
                </View>
                <View style={styles.cardTextos}>
                  <View style={styles.cardTopo}>
                    <Text style={styles.cardTitulo}>{item.titulo}</Text>
                    <View style={[styles.tagTipo, { backgroundColor: cor.bg }]}>
                      <Text style={[styles.tagTipoTexto, { color: cor.cor }]}>
                        {item.tipo.charAt(0).toUpperCase() + item.tipo.slice(1, -1)}
                      </Text>
                    </View>
                  </View>
                  {item.subtitulo ? (
                    <Text style={styles.cardSub}>{item.subtitulo}</Text>
                  ) : null}
                </View>
              </View>
            )
          })
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      <Modal visible={modalFiltro} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalFundo}
          activeOpacity={1}
          onPress={() => setModalFiltro(false)}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitulo}>Filtrar por tipo</Text>
            {FILTROS.map((f) => (
              <TouchableOpacity
                key={f.valor}
                style={[styles.modalOpcao, filtro === f.valor && styles.modalOpcaoAtiva]}
                onPress={() => { setFiltro(f.valor); setModalFiltro(false) }}
              >
                <View style={[styles.modalOpcaoIcone, filtro === f.valor && styles.modalOpcaoIconeAtivo]}>
                  <Feather name={f.icone as any} size={20} color={filtro === f.valor ? '#fff' : '#6B49AD'} />
                </View>
                <Text style={[styles.modalOpcaoTexto, filtro === f.valor && styles.modalOpcaoTextoAtivo]}>
                  {f.label}
                </Text>
                {filtro === f.valor && <Feather name="check" size={18} color="#6B49AD" />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
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
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#6B49AD',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
    gap: 12,
  },
  headerTitulo: { fontSize: 24, fontWeight: '800', color: '#301971' },
  headerSub: { fontSize: 14, color: '#9163CB', marginTop: -6 },

  inputBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#F5F0FF', borderRadius: 16,
    paddingHorizontal: 16, paddingVertical: 14,
    borderWidth: 1.5, borderColor: '#E2D9F3',
  },
  input: { flex: 1, fontSize: 16, color: '#301971' },

  botaoFiltro: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#EDE8FA', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  botaoFiltroTexto: { fontSize: 14, fontWeight: '700', color: '#301971' },

  lista: { padding: 16, gap: 12 },

  vazioContainer: { alignItems: 'center', marginTop: 80, gap: 12 },
  vazioIcone: {
    width: 90, height: 90, borderRadius: 28,
    backgroundColor: '#EDE8FA',
    justifyContent: 'center', alignItems: 'center', marginBottom: 8,
  },
  vazioTitulo: { fontSize: 18, fontWeight: '700', color: '#301971' },
  vazioSub: { fontSize: 15, color: '#9163CB' },

  card: {
    backgroundColor: '#fff', borderRadius: 20,
    padding: 16, flexDirection: 'row',
    alignItems: 'center', gap: 14,
    shadowColor: '#6B49AD',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07, shadowRadius: 10, elevation: 4,
  },
  cardIconeBox: {
    width: 52, height: 52, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
  },
  cardTextos: { flex: 1, gap: 6 },
  cardTopo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitulo: { flex: 1, fontSize: 16, fontWeight: '700', color: '#301971' },
  tagTipo: {
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
  },
  tagTipoTexto: { fontSize: 12, fontWeight: '700' },
  cardSub: { fontSize: 13, color: '#6B49AD' },

  modalFundo: {
    flex: 1, backgroundColor: '#00000055',
    justifyContent: 'center', paddingHorizontal: 32,
  },
  modalCard: {
    backgroundColor: '#fff', borderRadius: 24,
    padding: 24, gap: 8,
  },
  modalTitulo: { fontSize: 18, fontWeight: '800', color: '#301971', marginBottom: 8 },
  modalOpcao: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 14, borderRadius: 16,
  },
  modalOpcaoAtiva: { backgroundColor: '#F0EAFF' },
  modalOpcaoIcone: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#EDE8FA',
    justifyContent: 'center', alignItems: 'center',
  },
  modalOpcaoIconeAtivo: { backgroundColor: '#6B49AD' },
  modalOpcaoTexto: { flex: 1, fontSize: 16, fontWeight: '600', color: '#301971' },
  modalOpcaoTextoAtivo: { fontWeight: '800' },
})