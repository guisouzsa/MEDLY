import { Feather } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { router, useFocusEffect } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import {
  Image, Modal, Platform,
  ScrollView, StatusBar, StyleSheet, Text,
  TouchableOpacity, View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { getEventsForDate, getProximoLembrete } from '../../src/lib/events'
import { supabase } from '../../src/lib/supabase'
import {
  inicializarNotificacoes,
  pedirPermissaoNotificacoes,
  reagendarTodasNotificacoes
} from '../../src/lib/notifications'

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const ACOES_LINHA1 = [
  { label: 'Remédios', icone: 'activity', rota: '/modulos/medicamentos' },
  { label: 'Consultas', icone: 'calendar', rota: '/modulos/consultas' },
  { label: 'Sintomas', icone: 'thermometer', rota: '/modulos/sintomas' },
  { label: 'Exames', icone: 'file-text', rota: '/modulos/exames' },
]

function getDiasDoMes(ano: number, mes: number) {
  const primeiroDia = new Date(ano, mes, 1).getDay()
  const totalDias = new Date(ano, mes + 1, 0).getDate()
  const celulas: (number | null)[] = Array(primeiroDia).fill(null)
  for (let d = 1; d <= totalDias; d++) celulas.push(d)
  while (celulas.length % 7 !== 0) celulas.push(null)
  return celulas
}

function getSemanas(dias: (number | null)[]): (number | null)[][] {
  const semanas: (number | null)[][] = []
  for (let i = 0; i < dias.length; i += 7) semanas.push(dias.slice(i, i + 7))
  return semanas
}

function getHora() {
  const a = new Date()
  return `${String(a.getHours()).padStart(2, '0')}:${String(a.getMinutes()).padStart(2, '0')}`
}

function getData() {
  const a = new Date()
  return `${a.getDate()} de ${MESES[a.getMonth()]}`
}

function Calendario({ data }: { data: any }) {
  const hoje = new Date()
  const [mes, setMes] = useState(hoje.getMonth())
  const [ano, setAno] = useState(hoje.getFullYear())
  const dias = getDiasDoMes(ano, mes)
  const semanas = getSemanas(dias)

  function anterior() { mes === 0 ? (setMes(11), setAno(a => a - 1)) : setMes(m => m - 1) }
  function proximo() { mes === 11 ? (setMes(0), setAno(a => a + 1)) : setMes(m => m + 1) }

  return (
    <View style={styles.calendarioCard}>
      {/* Nav */}
      <View style={styles.calendarioNav}>
        <TouchableOpacity onPress={anterior} style={styles.navBtn}>
          <Feather name="chevron-left" size={20} color="#6B49AD" />
        </TouchableOpacity>
        <View style={styles.seletorMesAno}>
          <View style={styles.seletorBox}>
            <Text style={styles.seletorTexto}>{MESES[mes]}</Text>
          </View>
          <View style={styles.seletorBox}>
            <Text style={styles.seletorTexto}>{ano}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={proximo} style={styles.navBtn}>
          <Feather name="chevron-right" size={20} color="#6B49AD" />
        </TouchableOpacity>
      </View>

      {/* Dias da semana */}
      <View style={styles.semanaRow}>
        {DIAS_SEMANA.map(d => (
          <Text key={d} style={styles.semanaTexto}>{d}</Text>
        ))}
      </View>

      {/* Grade */}
      <View style={styles.grade}>
        {semanas.map((semana, si) => (
          <View key={si} style={styles.semanaLinha}>
            {semana.map((dia, di) => {
              const isHoje = dia === hoje.getDate() && mes === hoje.getMonth() && ano === hoje.getFullYear()
              let temEvento = false
              if (dia !== null) {
                const dayStr = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
                temEvento = getEventsForDate(dayStr, data).length > 0
              }
              return (
                <View key={di} style={styles.diaCell}>
                  {dia !== null ? (
                    <TouchableOpacity
                      style={[
                        styles.diaBotao,
                        isHoje && styles.diaHoje,
                        temEvento && styles.diaComEvento,
                      ]}
                      onPress={() => router.push({ pathname: '/(tabs)/calendario', params: { dia, mes, ano } })}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.diaTexto,
                        isHoje && styles.diaHojeTexto,
                        temEvento && styles.diaComEventoTexto,
                      ]}>
                        {dia}
                      </Text>
                    </TouchableOpacity>
                  ) : <View style={styles.diaBotao} />}
                </View>
              )
            })}
          </View>
        ))}
      </View>

      {/* Legenda */}
      <View style={styles.legendaDivisor} />
      <View style={styles.legendaRow}>
        <View style={styles.legendaItem}>
          <View style={[styles.legendaQuadrado, { borderWidth: 1.5, borderColor: '#6B49AD', backgroundColor: '#fff' }]} />
          <Text style={styles.legendaTexto}>Hoje</Text>
        </View>
        <View style={styles.legendaItem}>
          <View style={[styles.legendaQuadrado, { backgroundColor: '#EDE8FA' }]} />
          <Text style={styles.legendaTexto}>Com evento</Text>
        </View>
      </View>
    </View>
  )
}

function LinhaAcoes({ acoes }: { acoes: typeof ACOES_LINHA1 }) {
  return (
    <View style={styles.acoesLinha}>
      {acoes.map((acao) => (
        <TouchableOpacity
          key={acao.label}
          style={styles.acaoBotao}
          onPress={() => router.push(acao.rota as any)}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#7B52D3', '#481D94']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.acaoIconeBox}
          >
            <Feather name={acao.icone as any} size={26} color="#fff" />
          </LinearGradient>
          <Text style={styles.acaoLabel} numberOfLines={2}>{acao.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  )
}

export default function Dashboard() {
  const [hora, setHora] = useState(getHora())
  const [nome, setNome] = useState('')
  const [fotoUri, setFotoUri] = useState<string | null>(null)

  const [dbData, setDbData] = useState<{
    medicamentos: any[]; consultas: any[]; exames: any[]; sintomas: any[]
  }>({ medicamentos: [], consultas: [], exames: [], sintomas: [] })
  const [proximoLembrete, setProximoLembrete] = useState<{ tipo: string; descricao: string } | null>(null)

  useEffect(() => {
    const timer = setInterval(() => setHora(getHora()), 60000)
    return () => clearInterval(timer)
  }, [])

  useFocusEffect(
    useCallback(() => {
      async function carregarTudo() {
        try {
          const { data: { user }, error: userError } = await supabase.auth.getUser()
          if (userError) throw userError
          if (!user) return

          // Ponto 1 — V1: inicializa e agenda notificações ao abrir o app
          await inicializarNotificacoes()
          await pedirPermissaoNotificacoes()
          await reagendarTodasNotificacoes(user.id)

          const { data: perfil, error: perfilError } = await supabase
            .from('perfis').select('foto_url, nome').eq('id', user.id).single()

          if (perfilError && perfilError.code !== 'PGRST116') {
            console.log('Erro ao carregar perfil:', perfilError.message)
          }

          if (perfil) {
            setNome(perfil.nome ?? '')
            if (perfil.foto_url) {
              const url = perfil.foto_url.includes('?') ? perfil.foto_url : `${perfil.foto_url}?t=${Date.now()}`
              setFotoUri(url)
            } else {
              setFotoUri(null)
            }
          }

          const [medsRes, consRes, exasRes, sintsRes] = await Promise.all([
            supabase.from('medicamentos').select('*, medicamento_horarios(*)').eq('usuario_id', user.id),
            supabase.from('consultas').select('*').eq('usuario_id', user.id),
            supabase.from('exames').select('*').eq('usuario_id', user.id),
            supabase.from('sintomas').select('*').eq('usuario_id', user.id),
          ])

          if (medsRes.error) console.log('Erro ao carregar medicamentos:', medsRes.error.message)
          if (consRes.error) console.log('Erro ao carregar consultas:', consRes.error.message)
          if (exasRes.error) console.log('Erro ao carregar exames:', exasRes.error.message)
          if (sintsRes.error) console.log('Erro ao carregar sintomas:', sintsRes.error.message)

          const payload = {
            medicamentos: medsRes.data || [],
            consultas: consRes.data || [],
            exames: exasRes.data || [],
            sintomas: sintsRes.data || [],
          }
          setDbData(payload)
          setProximoLembrete(getProximoLembrete(payload))
        } catch (err) {
          console.error('Erro ao carregar dados do Dashboard:', err)
        }
      }
      carregarTudo()
    }, [])
  )

  return (
    // Ponto 4 — V1: sem edges, paddingTop via StatusBar no StyleSheet
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* CARD 1 — header */}
        <View style={styles.card1}>
          <View style={{ width: 48 }} />
          <Image source={require('../../assets/images/logo.png')} style={styles.logoHeader} resizeMode="contain" />
          <TouchableOpacity onPress={() => router.push('/modulos/perfil' as any)} activeOpacity={0.85}>
            {fotoUri ? (
              <Image source={{ uri: fotoUri }} style={styles.fotoPerfil} onError={() => setFotoUri(null)} />
            ) : (
              <View style={styles.fotoPerfilPlaceholder}>
                <Feather name="user" size={22} color="#6B49AD" />
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* CARD 2 — saudação */}
        <LinearGradient
          colors={['#51309A', '#6843B1', '#481D94']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.card2}
        >
          <View style={styles.card2Esquerda}>
            <Text style={styles.card2Ola}>Olá, {nome || 'bem-vindo'}</Text>
            <Text style={styles.card2BemVindo}>Seja bem-{'\n'}vindo(a)</Text>
          </View>
          <View style={styles.card2Direita}>
            <Text style={styles.card2Data}>{getData()}</Text>
            <Text style={styles.card2Hora}>{hora}</Text>
          </View>
        </LinearGradient>

        {/* CARD 3 — próximo lembrete */}
        <View style={styles.card3Fora}>
          <LinearGradient
            colors={['#E7DDFF', '#A780FF']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.card3Inner}
          >
            <View style={styles.card3Esquerda}>
              <Text style={styles.card3Label}>PRÓXIMO LEMBRETE</Text>
              <Text style={styles.card3Tipo}>
                {proximoLembrete ? proximoLembrete.tipo : 'Tudo em dia!'}
              </Text>
              <Text style={styles.card3Desc}>
                {proximoLembrete ? proximoLembrete.descricao : 'Nenhum lembrete para os próximos 30 dias.'}
              </Text>
            </View>
            <Image
              source={require('../../assets/images/foto-card-lembrete.png')}
              style={styles.card3Img}
              resizeMode="cover"
            />
          </LinearGradient>
        </View>

        {/* CARD 4 — ações rápidas */}
        <View style={styles.acoesCard}>
          <Text style={styles.acoesTitle}>Veja o que você já criou</Text>
          <LinhaAcoes acoes={ACOES_LINHA1} />
        </View>

        {/* CARD 5 — calendário */}
        <Calendario data={dbData} />
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  // Ponto 4 — V1: paddingTop via StatusBar (sem edges no SafeAreaView)
  safe: {
    flex: 1,
    backgroundColor: '#F5F0FF',
  },
  scroll: { flex: 1 },
  // Ponto 4 — V1: paddingTop: 12
  scrollContent: { paddingHorizontal: 16, paddingTop: 12 },

  // ── Header ──────────────────────────────────────────────────────────────────
  // Ponto 3 — V1: borderRadius 60, foto 38x38, espaçador 48, sem marginTop extra
  card1: {
    backgroundColor: '#fff',
    borderRadius: 60,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#6B49AD',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    marginBottom: 14,
  },
  // Ponto 3 — V1: 38x38
  fotoPerfil: { width: 38, height: 38, borderRadius: 19, borderWidth: 2, borderColor: '#E2D9F3' },
  fotoPerfilPlaceholder: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: '#EDE8FA',
    justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#E2D9F3',
  },
  logoHeader: { width: 110, height: 36 },

  // ── Saudação ─────────────────────────────────────────────────────────────────
  card2: {
    borderRadius: 24, paddingHorizontal: 24, paddingVertical: 28,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#301971', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 14, elevation: 10,
    ...Platform.select({ web: { boxShadow: '0px 6px 14px rgba(48, 25, 113, 0.3)' } })
  },
  card2Esquerda: { flex: 1 },
  card2Ola: { color: '#D6B9FF', fontSize: 14, fontWeight: '600', marginBottom: 6 },
  card2BemVindo: { color: '#fff', fontSize: 22, fontWeight: '700', lineHeight: 28 },
  card2Direita: { alignItems: 'flex-end' },
  card2Data: { color: '#C9A8FF', fontSize: 13, fontWeight: '600', marginBottom: 4 },
  card2Hora: { color: '#fff', fontSize: 42, fontWeight: '800', lineHeight: 46 },

  // ── Lembrete ─────────────────────────────────────────────────────────────────
  card3Fora: {
    backgroundColor: '#EDE8FA', borderRadius: 26, padding: 6, marginBottom: 12,
  },
  card3Inner: {
    flexDirection: 'row', alignItems: 'stretch',
    borderRadius: 22, overflow: 'hidden', paddingLeft: 20, minHeight: 130,
  },
  card3Esquerda: {
    flex: 1, justifyContent: 'center', paddingVertical: 20, paddingRight: 8,
  },
  card3Label: { fontSize: 10, fontWeight: '700', color: '#6B49AD', letterSpacing: 1, marginBottom: 8 },
  card3Tipo: { fontSize: 16, fontWeight: '700', color: '#301971', marginBottom: 4 },
  card3Desc: { fontSize: 13, fontWeight: '600', color: '#301971', lineHeight: 18 },
  card3Img: {
    width: 130, height: 150, marginBottom: -5, marginRight: -5, alignSelf: 'flex-end',
  },

  // ── Ações rápidas ────────────────────────────────────────────────────────────
  acoesCard: {
    backgroundColor: '#fff', borderRadius: 24, padding: 20, marginBottom: 12,
    shadowColor: '#6B49AD', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
    ...Platform.select({ web: { boxShadow: '0px 4px 12px rgba(107, 73, 173, 0.08)' } })
  },
  acoesTitle: { fontSize: 15, fontWeight: '700', color: '#301971', marginBottom: 16 },
  acoesLinha: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  acaoBotao: { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
  acaoIconeBox: {
    width: 60, height: 60, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center', marginBottom: 8,
    shadowColor: '#481D94', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
    ...Platform.select({ web: { boxShadow: '0px 4px 8px rgba(72, 29, 148, 0.3)' } })
  },
  acaoLabel: { fontSize: 11, fontWeight: '700', color: '#301971', textAlign: 'center' },

  // ── Calendário ───────────────────────────────────────────────────────────────
  calendarioCard: {
    backgroundColor: '#fff', borderRadius: 24, padding: 16, marginBottom: 12,
  },
  calendarioNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16,
  },
  navBtn: { padding: 4 },
  seletorMesAno: { flexDirection: 'row', gap: 8 },
  seletorBox: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#6B49AD',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, gap: 4,
  },
  seletorTexto: { fontSize: 13, fontWeight: '700', color: '#301971' },

  semanaRow: { flexDirection: 'row', marginBottom: 8 },
  semanaTexto: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700', color: '#9163CB' },

  grade: { flexDirection: 'column' },
  semanaLinha: { flexDirection: 'row', marginBottom: 4 },
  diaCell: { flex: 1, alignItems: 'center' },
  diaBotao: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  diaHoje: { borderWidth: 1.5, borderColor: '#6B49AD' },
  diaTexto: { fontSize: 13, color: '#301971', fontWeight: '500' },
  diaHojeTexto: { color: '#6B49AD', fontWeight: '700' },
  diaComEvento: { backgroundColor: '#EDE8FA' },
  diaComEventoTexto: { color: '#6B49AD', fontWeight: '700' },

  legendaDivisor: { height: 1, backgroundColor: '#F0EAFF', marginVertical: 10 },
  legendaRow: { flexDirection: 'row', justifyContent: 'center', gap: 20 },
  legendaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendaQuadrado: { width: 14, height: 14, borderRadius: 4 },
  legendaTexto: { fontSize: 10, color: '#9163CB', fontWeight: '600' },
})