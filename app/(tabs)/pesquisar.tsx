import { Feather } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { router, useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import {
    ActivityIndicator,
    Image,
    Platform,
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
            const { data } = await supabase.from('exames').select('id, nome, data_realizacao, horario').eq('usuario_id', user.id)
            data?.forEach(e => {
              const dataFormatada = (() => {
                if (!e.data_realizacao) return ''
                const parts = e.data_realizacao.split('-')
                if (parts.length < 3) return e.data_realizacao
                return `${parts[2]}/${parts[1]}/${parts[0]}`
              })()
              const status = (() => {
                if (!e.data_realizacao) return ''
                const agora = new Date()
                const [ano, mes, dia] = e.data_realizacao.split('-').map(Number)
                const horarioStr = e.horario ? e.horario.slice(0, 5) : '23:59'
                const [hora, minuto] = horarioStr.split(':').map(Number)
                const dataExame = new Date(ano, mes - 1, dia, hora, minuto)
                return dataExame < agora ? 'Realizado' : 'Próximo'
              })()
              resultado.push({
                id: e.id, tipo: 'exames',
                titulo: e.nome,
                subtitulo: [dataFormatada, status].filter(Boolean).join(' · '),
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
        <View style={styles.headerTitleBox}>
          <Text style={styles.headerTitleText}>Pesquisar no Medly</Text>
          <Text style={styles.headerSubText}>Encontre seus registros rapidamente</Text>
        </View>

        {/* Caixa de pesquisa */}
        <View style={styles.inputContainer}>
          <View style={styles.inputBox}>
            <Feather name="search" size={20} color="#6B49AD" />
            <TextInput
              style={styles.input}
              value={busca}
              onChangeText={setBusca}
              placeholder="Digite o que procura..."
              placeholderTextColor="#A78BFA"
              autoCorrect={false}
            />
            {busca.length > 0 && (
              <TouchableOpacity onPress={() => setBusca('')} style={styles.clearBtn}>
                <Feather name="x" size={16} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
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
                    <Feather name={item.icone as any} size={24} color={cor.cor} />
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
                  <Feather name="chevron-right" size={20} color="#D1D5DB" />
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
    flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between',
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
  headerTitleBox: {
    marginBottom: 20, paddingHorizontal: 4,
  },
  headerTitleText: {
    fontSize: 26, fontWeight: '800', color: '#301971', marginBottom: 4,
  },
  headerSubText: {
    fontSize: 15, color: '#9163CB', fontWeight: '600',
  },

  inputContainer: {
    shadowColor: '#481D94', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1, shadowRadius: 14, elevation: 8,
    marginBottom: 24,
    ...Platform.select({
      web: {
        boxShadow: '0px 6px 14px rgba(72, 29, 148, 0.1)'
      }
    })
  },
  inputBox: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 24,
    paddingHorizontal: 20, paddingVertical: 16,
    borderWidth: 1, borderColor: '#EDE8FA',
  },
  input: { flex: 1, fontSize: 16, color: '#301971', fontWeight: '500' },
  clearBtn: {
    backgroundColor: '#C4B5FD', padding: 4, borderRadius: 12,
  },

  filtrosContainer: {
    marginBottom: 24, marginHorizontal: -16,
  },
  filtrosScroll: {
    paddingHorizontal: 16, gap: 10,
  },
  filtroPil: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#EDE8FA',
    borderRadius: 50, paddingHorizontal: 16, paddingVertical: 10,
    shadowColor: '#6B49AD', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
    ...Platform.select({
      web: {
        boxShadow: '0px 2px 4px rgba(107, 73, 173, 0.04)'
      }
    })
  },
  filtroPilAtivo: {
    backgroundColor: '#6B49AD', borderColor: '#6B49AD',
    shadowOpacity: 0.15, shadowRadius: 8, elevation: 4, shadowOffset: { width: 0, height: 4 },
    ...Platform.select({
      web: {
        boxShadow: '0px 4px 8px rgba(107, 73, 173, 0.15)'
      }
    })
  },
  filtroPilTexto: {
    fontSize: 14, fontWeight: '700', color: '#6B49AD',
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
    backgroundColor: '#fff', borderRadius: 24,
    padding: 18, flexDirection: 'row',
    alignItems: 'center', gap: 16,
    shadowColor: '#481D94', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
    borderWidth: 1, borderColor: '#F5F0FF',
    ...Platform.select({
      web: {
        boxShadow: '0px 4px 12px rgba(72, 29, 148, 0.08)'
      }
    })
  },
  cardIconeBox: {
    width: 56, height: 56, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
  },
  cardTextos: { flex: 1, gap: 6 },
  cardTopo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardTitulo: { flex: 1, fontSize: 17, fontWeight: '800', color: '#301971' },
  tagTipo: {
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
  },
  tagTipoTexto: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  cardSub: { fontSize: 14, color: '#6B49AD', fontWeight: '500' },
})