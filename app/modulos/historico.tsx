import { Feather } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useFocusEffect, router, useLocalSearchParams } from 'expo-router'
import { useCallback, useState } from 'react'
import {
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '../../src/lib/supabase'

type HistoricoEntry = {
  id: number
  usuario_id: string
  descricao: string
  data: string
}

function formatarDataHora(isoString: string): string {
  if (!isoString) return ''
  try {
    const dataObj = new Date(isoString)
    const d = String(dataObj.getDate()).padStart(2, '0')
    const m = String(dataObj.getMonth() + 1).padStart(2, '0')
    const a = dataObj.getFullYear()
    const h = String(dataObj.getHours()).padStart(2, '0')
    const min = String(dataObj.getMinutes()).padStart(2, '0')
    return `${d}/${m}/${a} às ${h}:${min}`
  } catch (e) {
    return ''
  }
}

function getIconeDetails(descricao: string) {
  const desc = descricao.toLowerCase()
  if (desc.includes('medicamento')) {
    return { name: 'activity' as const, bg: '#E8F5E9', color: '#2E7D32', label: 'Medicamento' }
  }
  if (desc.includes('consulta')) {
    return { name: 'calendar' as const, bg: '#E3F2FD', color: '#1565C0', label: 'Consulta' }
  }
  if (desc.includes('exame')) {
    return { name: 'file-text' as const, bg: '#E0F2F1', color: '#00695C', label: 'Exame' }
  }
  if (desc.includes('sintoma')) {
    return { name: 'thermometer' as const, bg: '#FFEBEE', color: '#C62828', label: 'Sintoma' }
  }
  return { name: 'clock' as const, bg: '#F0EAFF', color: '#6B49AD', label: 'Sistema' }
}

export default function TelaHistorico() {
  const { modulo } = useLocalSearchParams()
  const [lista, setLista] = useState<HistoricoEntry[]>([])
  const [perfilFoto, setPerfilFoto] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(true)

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

          // 2. Carrega Histórico
          const { data: rows, error } = await supabase
            .from('historico')
            .select('*')
            .eq('usuario_id', user.id)
            .order('data', { ascending: false })

          if (error) throw error

          // Filtra a lista com base no parâmetro 'modulo'
          let filtered = rows || []
          if (modulo) {
            const modLower = String(modulo).toLowerCase()
            filtered = filtered.filter(item => {
              const desc = item.descricao.toLowerCase()
              if (modLower === 'consulta') return desc.includes('consulta')
              if (modLower === 'medicamento') return desc.includes('medicamento')
              if (modLower === 'exame') return desc.includes('exame')
              if (modLower === 'sintoma') return desc.includes('sintoma')
              return true
            })
          }

          setLista(filtered)
        } catch (err) {
          console.error('Erro ao carregar histórico:', err)
        } finally {
          setCarregando(false)
        }
      }
      carregarDados()
    }, [modulo])
  )

  let tituloText = 'HISTÓRICO GERAL'
  if (modulo === 'consulta') tituloText = 'HISTÓRICO - CONSULTAS'
  if (modulo === 'medicamento') tituloText = 'HISTÓRICO - REMÉDIOS'
  if (modulo === 'exame') tituloText = 'HISTÓRICO - EXAMES'
  if (modulo === 'sintoma') tituloText = 'HISTÓRICO - SINTOMAS'

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Card 1 — Perfil + Logo (Padrão) */}
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

        {/* Card 2 — Título (Padrão) */}
        <LinearGradient
          colors={['#6B49AD', '#6843B1', '#481D94']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={styles.cardTituloLista}
        >
          <Text style={styles.cardTituloTexto}>{tituloText}</Text>
        </LinearGradient>

        {/* Timeline Content */}
        <View style={styles.timelineContainer}>
          {carregando ? (
            <View style={styles.centroLoader}>
              <ActivityIndicator size="large" color="#6B49AD" />
              <Text style={styles.carregandoTexto}>Carregando histórico...</Text>
            </View>
          ) : lista.length === 0 ? (
            <View style={styles.vazioContainer}>
              <View style={styles.vazioIcone}>
                <Feather name="clock" size={36} color="#9163CB" />
              </View>
              <Text style={styles.vazioTitulo}>Histórico limpo</Text>
              <Text style={styles.vazioSub}>Ações realizadas nos CRUDs aparecerão aqui.</Text>
            </View>
          ) : (
            <View style={styles.timelineList}>
              {lista.map((entry, index) => {
                const icone = getIconeDetails(entry.descricao)
                const isLast = index === lista.length - 1

                return (
                  <View key={entry.id} style={styles.timelineItem}>
                    {/* Linha vertical e Indicador */}
                    <View style={styles.timelineLeft}>
                      <View style={[styles.timelineNode, { backgroundColor: icone.color }]} />
                      {!isLast && <View style={styles.timelineLine} />}
                    </View>

                    {/* Conteúdo do Log */}
                    <View style={styles.timelineRight}>
                      <View style={styles.logCard}>
                        <View style={styles.logHeader}>
                          <View style={[styles.logTag, { backgroundColor: icone.bg }]}>
                            <Text style={[styles.logTagTexto, { color: icone.color }]}>{icone.label}</Text>
                          </View>
                          <Text style={styles.logData}>{formatarDataHora(entry.data)}</Text>
                        </View>
                        <Text style={styles.logDesc}>{entry.descricao}</Text>
                      </View>
                    </View>
                  </View>
                )
              })}
            </View>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F5F0FF',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
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
  fotoPerfil: { width: 38, height: 38, borderRadius: 19, borderWidth: 2, borderColor: '#E2D9F3' },
  fotoPerfilPlaceholder: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: '#EDE8FA',
    justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#E2D9F3',
  },
  logo: { width: 110, height: 36 },
  voltarBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#F0EAFF',
    justifyContent: 'center', alignItems: 'center',
  },
  cardTituloLista: {
    marginHorizontal: 0, marginTop: 0, borderRadius: 50,
    paddingVertical: 14, alignItems: 'center',
    shadowColor: '#481D94', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 5,
    marginBottom: 20,
  },
  cardTituloTexto: { fontSize: 14, fontWeight: '800', color: '#fff', letterSpacing: 3 },
  timelineContainer: {
    paddingHorizontal: 4,
  },
  centroLoader: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  carregandoTexto: {
    fontSize: 14,
    color: '#6B49AD',
    fontWeight: '600',
    marginTop: 12,
  },
  vazioContainer: {
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 32,
    borderRadius: 24,
    shadowColor: '#6B49AD',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    marginTop: 20,
  },
  vazioIcone: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: '#EDE8FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  vazioTitulo: {
    fontSize: 18,
    fontWeight: '700',
    color: '#301971',
    marginBottom: 6,
  },
  vazioSub: {
    fontSize: 14,
    color: '#9163CB',
    textAlign: 'center',
  },
  timelineList: {
    paddingLeft: 4,
  },
  timelineItem: {
    flexDirection: 'row',
  },
  timelineLeft: {
    width: 24,
    alignItems: 'center',
    position: 'relative',
  },
  timelineNode: {
    width: 12,
    height: 12,
    borderRadius: 6,
    zIndex: 2,
    marginTop: 26,
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  timelineLine: {
    position: 'absolute',
    top: 32,
    bottom: -16,
    width: 2,
    backgroundColor: '#E2D9F3',
    zIndex: 1,
  },
  timelineRight: {
    flex: 1,
    paddingLeft: 12,
    paddingBottom: 16,
  },
  logCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    shadowColor: '#6B49AD',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2.5,
    borderWidth: 1,
    borderColor: '#F0EAFF',
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  logTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  logTagTexto: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  logData: {
    fontSize: 11,
    color: '#9163CB',
    fontWeight: '600',
  },
  logDesc: {
    fontSize: 13,
    color: '#301971',
    fontWeight: '600',
    lineHeight: 18,
  },
})
