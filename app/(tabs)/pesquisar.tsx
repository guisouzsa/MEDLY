import { Feather } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { router, useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import {
    ActivityIndicator,
    Image,
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
  const [perfilFoto, setPerfilFoto] = useState<string | null>(null)

  useFocusEffect(
    useCallback(() => {
      async function carregarDados() {
        setCarregando(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.replace('/auth')
          return
        }

        try {
          // 1. Carrega Perfil
          const { data: perfil } = await supabase
            .from('perfis')
            .select('foto_url')
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

          // 2. Carrega Dados
          const resultado: Item[] = []

          if (filtro === 'todos' || filtro === 'medicamentos') {
            const { data } = await supabase.from('medicamentos').select('id, nome, dosagem, horario, status').eq('usuario_id', user.id)
            data?.forEach(m => resultado.push({
              id: m.id, tipo: 'medicamentos',
              titulo: m.nome,
              subtitulo: [m.dosagem, m.horario, m.status].filter(Boolean).join(' · '),
              icone: 'activity',
            }))
          }

          if (filtro === 'todos' || filtro === 'consultas') {
            const { data } = await supabase.from('consultas').select('id, especialidade, nome_medico, data, horario, local').eq('usuario_id', user.id)
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
            const { data } = await supabase.from('sintomas').select('id, nome, intensidade, data').eq('usuario_id', user.id)
            data?.forEach(s => {
              const dataFormatada = (() => {
                if (!s.data) return ''
                const parts = s.data.split('-')
                if (parts.length < 3) return s.data
                return `${parts[2]}/${parts[1]}/${parts[0]}`
              })()
              resultado.push({
                id: s.id, tipo: 'sintomas',
                titulo: s.nome,
                subtitulo: [`Intensidade ${s.intensidade}/10`, dataFormatada].filter(Boolean).join(' · '),
                icone: 'thermometer',
              })
            })
          }

          if (filtro === 'todos' || filtro === 'exames') {
            const { data } = await supabase.from('exames').select('id, nome, data_realizacao, status').eq('usuario_id', user.id)
            data?.forEach(e => {
              const dataFormatada = (() => {
                if (!e.data_realizacao) return ''
                const parts = e.data_realizacao.split('-')
                if (parts.length < 3) return e.data_realizacao
                return `${parts[2]}/${parts[1]}/${parts[0]}`
              })()
              resultado.push({
                id: e.id, tipo: 'exames',
                titulo: e.nome,
                subtitulo: [dataFormatada, e.status].filter(Boolean).join(' · '),
                icone: 'file-text',
              })
            })
          }

          setItens(resultado)
        } catch (err) {
          console.error('Erro ao carregar dados de pesquisa:', err)
        } finally {
          setCarregando(false)
        }
      }
      carregarDados()
    }, [filtro])
  )

  const itensFiltrados = itens.filter(item =>
    item.titulo.toLowerCase().includes(busca.toLowerCase()) ||
    item.subtitulo.toLowerCase().includes(busca.toLowerCase())
  )

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
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
          <View style={{ width: 44 }} />
        </View>

        {/* Card 2 — Título */}
        <LinearGradient
          colors={['#6B49AD', '#6843B1', '#481D94']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={styles.cardTituloLista}
        >
          <Text style={styles.cardTituloTexto}>PESQUISAS</Text>
        </LinearGradient>

        {/* Caixa de pesquisa */}
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

        {/* Filtros em linha horizontal scrollable */}
        <View style={styles.filtrosContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtrosScroll}>
            {FILTROS.map((f) => {
              const ativo = filtro === f.valor
              return (
                <TouchableOpacity
                  key={f.valor}
                  onPress={() => setFiltro(f.valor)}
                  activeOpacity={0.8}
                  style={[styles.filtroPil, ativo && styles.filtroPilAtivo]}
                >
                  <Feather name={f.icone as any} size={13} color={ativo ? '#fff' : '#6B49AD'} />
                  <Text style={[styles.filtroPilTexto, ativo && styles.filtroPilTextoAtivo]}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </ScrollView>
        </View>

        {/* Lista de Resultados */}
        {carregando ? (
          <ActivityIndicator size="large" color="#6B49AD" style={{ marginTop: 40 }} />
        ) : itensFiltrados.length === 0 ? (
          <View style={styles.vazioContainer}>
            <View style={styles.vazioIcone}>
              <Feather name="search" size={36} color="#9163CB" />
            </View>
            <Text style={styles.vazioTitulo}>Nenhum resultado</Text>
            <Text style={styles.vazioSub}>Tente outros termos ou filtros</Text>
          </View>
        ) : (
          <View style={styles.lista}>
            {itensFiltrados.map((item, i) => {
              const cor = COR_TIPO[item.tipo]
              return (
                <View key={`${item.tipo}-${item.id}-${i}`} style={styles.card}>
                  <View style={[styles.cardIconeBox, { backgroundColor: cor.bg }]}>
                    <Feather name={item.icone as any} size={22} color={cor.cor} />
                  </View>
                  <View style={styles.cardTextos}>
                    <View style={styles.cardTopo}>
                      <Text style={styles.cardTitulo} numberOfLines={1}>{item.titulo}</Text>
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
            })}
          </View>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F5F0FF',
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  cardPerfil: {
    backgroundColor: '#fff', marginHorizontal: 0, marginTop: 0,
    borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    shadowColor: '#6B49AD', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 12, elevation: 5,
    marginBottom: 14,
  },
  fotoPerfil: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: '#E2D9F3' },
  fotoPerfilPlaceholder: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#EDE8FA',
    justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#E2D9F3',
  },
  logo: { width: 110, height: 36 },
  
  cardTituloLista: {
    marginHorizontal: 0, marginTop: 0, borderRadius: 50,
    paddingVertical: 14, alignItems: 'center',
    shadowColor: '#481D94', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 5,
    marginBottom: 20,
  },
  cardTituloTexto: { fontSize: 14, fontWeight: '800', color: '#fff', letterSpacing: 3 },

  inputBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 14,
    borderWidth: 1.5, borderColor: '#E2D9F3',
    shadowColor: '#6B49AD', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 3,
    marginBottom: 16,
  },
  input: { flex: 1, fontSize: 16, color: '#301971' },

  filtrosContainer: {
    marginBottom: 20,
    marginHorizontal: -16,
  },
  filtrosScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filtroPil: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#E2D9F3',
    borderRadius: 50,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  filtroPilAtivo: {
    backgroundColor: '#6B49AD',
    borderColor: '#6B49AD',
  },
  filtroPilTexto: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B49AD',
  },
  filtroPilTextoAtivo: {
    color: '#fff',
  },

  lista: { gap: 12 },

  vazioContainer: { alignItems: 'center', marginTop: 40, gap: 12 },
  vazioIcone: {
    width: 76, height: 76, borderRadius: 24,
    backgroundColor: '#EDE8FA',
    justifyContent: 'center', alignItems: 'center', marginBottom: 4,
  },
  vazioTitulo: { fontSize: 17, fontWeight: '700', color: '#301971' },
  vazioSub: { fontSize: 14, color: '#9163CB' },

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
  tagTipoTexto: { fontSize: 11, fontWeight: '700' },
  cardSub: { fontSize: 13, color: '#6B49AD' },
})