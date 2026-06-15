import { Feather } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import {
  Image,
  Platform, ScrollView, StatusBar, StyleSheet,
  Text, TouchableOpacity, View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { CalendarEvent, getEventsForDate } from '../../src/lib/events'
import { supabase } from '../../src/lib/supabase'

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

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
  for (let i = 0; i < dias.length; i += 7) {
    semanas.push(dias.slice(i, i + 7))
  }
  return semanas
}

function formatarDataParaTela(data: string): string {
  if (!data) return ''
  const [a, m, d] = data.split('-')
  return `${d}/${m}/${a}`
}

function labelFrequencia(med: any): string {
  if (med.frequencia_tipo === 'diario') return 'Diário'
  if (med.frequencia_tipo === 'semanal') return 'Semanal'
  if (med.frequencia_tipo === 'mensal') return 'Mensal'
  if (med.frequencia_tipo === 'personalizado' && med.intervalo_horas) return `A cada ${med.intervalo_horas}h`
  return med.frequencia_tipo
}

function getIntensidadeCor(valor: number) {
  if (valor <= 3) return { bg: '#E8F5E9', texto: '#2E7D32', label: 'Leve' }
  if (valor <= 6) return { bg: '#FFF3E0', texto: '#EF6C00', label: 'Moderada' }
  return { bg: '#FFEBEE', texto: '#C62828', label: 'Intensa' }
}

function getStatusMedCor(status: string) {
  if (status === 'ativo') return { bg: '#E8F5E9', texto: '#2E7D32', label: 'Ativo' }
  if (status === 'pausado') return { bg: '#FFF3E0', texto: '#EF6C00', label: 'Pausado' }
  return { bg: '#ECEFF1', texto: '#37474F', label: 'Encerrado' }
}

const TIPO_CONFIG: Record<string, { icon: any; bg: string; color: string; label: string }> = {
  medicamento: { icon: 'activity', bg: '#EDE8FA', color: '#6B49AD', label: 'Remédio' },
  consulta: { icon: 'calendar', bg: '#EDE8FA', color: '#6B49AD', label: 'Consulta' },
  exame: { icon: 'file-text', bg: '#EDE8FA', color: '#6B49AD', label: 'Exame' },
  sintoma: { icon: 'thermometer', bg: '#EDE8FA', color: '#6B49AD', label: 'Sintoma' },
}

function EventoCard({ event }: { event: CalendarEvent }) {
  const cfg = TIPO_CONFIG[event.tipo] ?? TIPO_CONFIG.sintoma
  return (
    <View style={styles.eventoCard}>
      <View style={[styles.eventoIconBox, { backgroundColor: cfg.bg }]}>
        <Feather name={cfg.icon} size={18} color={cfg.color} />
      </View>
      <View style={styles.eventoTextos}>
        <View style={styles.eventoHeaderRow}>
          <Text style={styles.eventoTitulo} numberOfLines={1}>{event.titulo}</Text>
          <View style={[styles.eventoTag, { backgroundColor: cfg.bg }]}>
            <Text style={[styles.eventoTagTexto, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
        </View>
        <Text style={styles.eventoDescricao} numberOfLines={2}>{event.descricao}</Text>
        {event.horario && (
          <View style={styles.eventoHoraRow}>
            <Feather name="clock" size={10} color="#9163CB" />
            <Text style={styles.eventoHoraTexto}>{event.horario}</Text>
          </View>
        )}
      </View>
    </View>
  )
}

export default function TelaCalendario() {
  const params = useLocalSearchParams()
  const hoje = new Date()

  const [mes, setMes] = useState(hoje.getMonth())
  const [ano, setAno] = useState(hoje.getFullYear())
  const [diaSelecionado, setDiaSelecionado] = useState<number | null>(hoje.getDate())
  const [perfilFoto, setPerfilFoto] = useState<string | null>(null)
  const [aberto, setAberto] = useState<string | null>(null)

  const [dbData, setDbData] = useState<{
    medicamentos: any[]; consultas: any[]; exames: any[]; sintomas: any[]
  }>({ medicamentos: [], consultas: [], exames: [], sintomas: [] })

  function toggleAcordion(key: string) {
    setAberto(prev => prev === key ? null : key)
  }

  useEffect(() => {
    if (params.dia) setDiaSelecionado(Number(params.dia))
    if (params.mes) setMes(Number(params.mes))
    if (params.ano) setAno(Number(params.ano))
  }, [params.dia, params.mes, params.ano])

  useFocusEffect(
    useCallback(() => {
      async function carregarDados() {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        try {
          const { data: perfil } = await supabase.from('perfis').select('foto_url').eq('id', user.id).single()
          if (perfil?.foto_url) {
            const url = perfil.foto_url.includes('?') ? perfil.foto_url : `${perfil.foto_url}?t=${Date.now()}`
            setPerfilFoto(url)
          } else {
            setPerfilFoto(null)
          }
          const [medsRes, consRes, exasRes, sintsRes] = await Promise.all([
            supabase.from('medicamentos').select('*, medicamento_horarios(*)').eq('usuario_id', user.id),
            supabase.from('consultas').select('*').eq('usuario_id', user.id),
            supabase.from('exames').select('*').eq('usuario_id', user.id),
            supabase.from('sintomas').select('*').eq('usuario_id', user.id),
          ])
          setDbData({
            medicamentos: medsRes.data || [],
            consultas: consRes.data || [],
            exames: exasRes.data || [],
            sintomas: sintsRes.data || [],
          })
        } catch (err) {
          console.error('Erro ao carregar dados:', err)
        }
      }
      carregarDados()
    }, [])
  )

  const dias = getDiasDoMes(ano, mes)
  const semanas = getSemanas(dias)

  function anterior() { mes === 0 ? (setMes(11), setAno(a => a - 1)) : setMes(m => m - 1) }
  function proximo() { mes === 11 ? (setMes(0), setAno(a => a + 1)) : setMes(m => m + 1) }

  const dataSelecionadaStr = diaSelecionado
    ? `${ano}-${String(mes + 1).padStart(2, '0')}-${String(diaSelecionado).padStart(2, '0')}`
    : ''
  const eventosDoDia = diaSelecionado ? getEventsForDate(dataSelecionadaStr, dbData) : []

  const acordions = [
    {
      // Ponto 4 — V1: label "Remédios"
      key: 'meds', icon: 'activity' as any, label: `Remédios (${dbData.medicamentos.length})`,
      render: () => dbData.medicamentos.length === 0
        ? <Text style={styles.registroVazio}>Nenhum medicamento cadastrado.</Text>
        : dbData.medicamentos.map(med => {
          const sc = getStatusMedCor(med.status)
          return (
            <View key={med.id} style={styles.registroItem}>
              <View style={[styles.registroItemIconBox, { backgroundColor: '#EDE8FA' }]}>
                <Feather name="activity" size={14} color="#6B49AD" />
              </View>
              <View style={styles.registroTextos}>
                <View style={styles.registroItemHeader}>
                  <Text style={styles.registroNome} numberOfLines={1}>{med.nome}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                    <Text style={[styles.statusBadgeTexto, { color: sc.texto }]}>{sc.label}</Text>
                  </View>
                </View>
                {med.dosagem ? <Text style={styles.registroSub}>Dosagem: {med.dosagem}</Text> : null}
                <Text style={styles.registroSub}>Frequência: {labelFrequencia(med)} · Início: {formatarDataParaTela(med.data_inicio)}</Text>
              </View>
            </View>
          )
        }),
    },
    {
      key: 'cons', icon: 'calendar' as any, label: `Consultas (${dbData.consultas.length})`,
      render: () => dbData.consultas.length === 0
        ? <Text style={styles.registroVazio}>Nenhuma consulta cadastrada.</Text>
        : dbData.consultas.map(con => (
          <View key={con.id} style={styles.registroItem}>
            <View style={[styles.registroItemIconBox, { backgroundColor: '#EDE8FA' }]}>
              <Feather name="calendar" size={14} color="#6B49AD" />
            </View>
            <View style={styles.registroTextos}>
              <Text style={styles.registroNome} numberOfLines={1}>{con.especialidade}</Text>
              <Text style={styles.registroSub}>Dr(a). {con.nome_medico}</Text>
              <Text style={styles.registroSub}>{formatarDataParaTela(con.data)} às {con.horario?.slice(0, 5) || '--:--'}</Text>
              {con.local ? <Text style={styles.registroSub}>{con.local}</Text> : null}
            </View>
          </View>
        )),
    },
    {
      key: 'exas', icon: 'file-text' as any, label: `Exames (${dbData.exames.length})`,
      render: () => dbData.exames.length === 0
        ? <Text style={styles.registroVazio}>Nenhum exame cadastrado.</Text>
        : dbData.exames.map(exa => (
          <View key={exa.id} style={styles.registroItem}>
            <View style={[styles.registroItemIconBox, { backgroundColor: '#EDE8FA' }]}>
              <Feather name="file-text" size={14} color="#6B49AD" />
            </View>
            <View style={styles.registroTextos}>
              <View style={styles.registroItemHeader}>
                <Text style={styles.registroNome} numberOfLines={1}>{exa.nome}</Text>
                {exa.arquivo_url ? (
                  <View style={[styles.statusBadge, { backgroundColor: '#EDE8FA' }]}>
                    <Text style={[styles.statusBadgeTexto, { color: '#6B49AD' }]}>Anexo</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.registroSub}>Realização: {formatarDataParaTela(exa.data_realizacao)}</Text>
              {exa.local ? <Text style={styles.registroSub}>{exa.local}</Text> : null}
              {exa.data_resultado ? <Text style={styles.registroSub}>Resultado: {formatarDataParaTela(exa.data_resultado)}</Text> : null}
            </View>
          </View>
        )),
    },
    {
      key: 'sints', icon: 'thermometer' as any, label: `Sintomas (${dbData.sintomas.length})`,
      render: () => dbData.sintomas.length === 0
        ? <Text style={styles.registroVazio}>Nenhum sintoma registrado.</Text>
        : dbData.sintomas.map(sin => {
          const ic = getIntensidadeCor(sin.intensidade)
          return (
            <View key={sin.id} style={styles.registroItem}>
              <View style={[styles.registroItemIconBox, { backgroundColor: '#EDE8FA' }]}>
                <Feather name="thermometer" size={14} color="#6B49AD" />
              </View>
              <View style={styles.registroTextos}>
                <View style={styles.registroItemHeader}>
                  <Text style={styles.registroNome} numberOfLines={1}>{sin.nome}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: ic.bg }]}>
                    <Text style={[styles.statusBadgeTexto, { color: ic.texto }]}>{sin.intensidade}/10 · {ic.label}</Text>
                  </View>
                </View>
                <Text style={styles.registroSub}>{formatarDataParaTela(sin.data)}{sin.horario ? ` às ${sin.horario.slice(0, 5)}` : ''}</Text>
                {sin.duracao ? <Text style={styles.registroSub}>Duração: {sin.duracao}</Text> : null}
                {sin.gatilho ? <Text style={styles.registroSub}>Gatilho: {sin.gatilho}</Text> : null}
              </View>
            </View>
          )
        }),
    },
  ]

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header — Ponto 2: V1 (imports Platform/StatusBar mantidos), Ponto 3: V2 (foto 44x44),
            botão voltar removido, substituído por View vazia para manter espaçamento */}
        <View style={styles.cardPerfil}>
          <TouchableOpacity onPress={() => router.push('/modulos/perfil' as any)} activeOpacity={0.85}>
            {perfilFoto ? (
              <Image source={{ uri: perfilFoto }} style={styles.fotoPerfil} onError={() => setPerfilFoto(null)} />
            ) : (
              <View style={styles.fotoPerfilPlaceholder}>
                <Feather name="user" size={20} color="#9163CB" />
              </View>
            )}
          </TouchableOpacity>
          <Image source={require('../../assets/images/logo.png')} style={styles.logo} resizeMode="contain" />
          <View style={{ width: 44 }} />
        </View>

        {/* Título */}
        <LinearGradient
          colors={['#6B49AD', '#6843B1', '#481D94']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={styles.cardTituloLista}
        >
          <Text style={styles.cardTituloTexto}>CALENDÁRIO</Text>
        </LinearGradient>

        {/* Calendário */}
        <View style={styles.calendarioCard}>
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

          <View style={styles.semanaRow}>
            {DIAS_SEMANA.map(d => (
              <Text key={d} style={styles.semanaTexto}>{d}</Text>
            ))}
          </View>

          <View style={styles.grade}>
            {semanas.map((semana, si) => (
              <View key={si} style={styles.semanaLinha}>
                {semana.map((dia, di) => {
                  const isHoje = dia === hoje.getDate() && mes === hoje.getMonth() && ano === hoje.getFullYear()
                  const isSelecionado = dia === diaSelecionado
                  let temEvento = false
                  if (dia !== null) {
                    const dayStr = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
                    temEvento = getEventsForDate(dayStr, dbData).length > 0
                  }
                  return (
                    <View key={di} style={styles.diaCell}>
                      {dia !== null ? (
                        <TouchableOpacity
                          style={[
                            styles.diaBotao,
                            isHoje && styles.diaHoje,
                            temEvento && !isSelecionado && styles.diaComEvento,
                            isSelecionado && styles.diaSelecionado,
                          ]}
                          onPress={() => setDiaSelecionado(dia)}
                          activeOpacity={0.7}
                        >
                          <Text style={[
                            styles.diaTexto,
                            isHoje && styles.diaHojeTexto,
                            temEvento && !isSelecionado && styles.diaComEventoTexto,
                            isSelecionado && styles.diaSelecionadoTexto,
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

          <View style={styles.legendaDivisor} />
          <View style={styles.legendaRow}>
            <View style={styles.legendaItem}>
              <View style={[styles.legendaQuadrado, { borderWidth: 1.5, borderColor: '#6B49AD', backgroundColor: '#fff' }]} />
              <Text style={styles.legendaTexto}>Hoje</Text>
            </View>
            <View style={styles.legendaItem}>
              <View style={[styles.legendaQuadrado, { backgroundColor: '#6B49AD' }]} />
              <Text style={styles.legendaTexto}>Selecionado</Text>
            </View>
            <View style={styles.legendaItem}>
              <View style={[styles.legendaQuadrado, { backgroundColor: '#EDE8FA' }]} />
              <Text style={styles.legendaTexto}>Com evento</Text>
            </View>
          </View>
        </View>

        {/* Eventos do dia */}
        <View style={styles.eventosCard}>
          <View style={styles.eventosTituloRow}>
            <View style={styles.eventosTituloIcone}>
              <Feather name="calendar" size={13} color="#6B49AD" />
            </View>
            <Text style={styles.eventosTitulo}>
              {diaSelecionado ? `${diaSelecionado} de ${MESES[mes]}` : 'Selecione um dia'}
            </Text>
            <View style={[styles.eventosBadge, { backgroundColor: eventosDoDia.length > 0 ? '#EDE8FA' : '#F5F0FF' }]}>
              <Text style={[styles.eventosBadgeTexto, { color: eventosDoDia.length > 0 ? '#6B49AD' : '#C4B5FD' }]}>
                {eventosDoDia.length} evento{eventosDoDia.length !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>

          {eventosDoDia.length === 0 ? (
            <View style={styles.eventosVazioBox}>
              <Feather name="inbox" size={24} color="#C4B5FD" />
              <Text style={styles.eventosVazio}>Nenhum evento neste dia</Text>
            </View>
          ) : (
            eventosDoDia.map(ev => <EventoCard key={ev.id} event={ev} />)
          )}
        </View>

        {/* Divisor */}
        <View style={styles.secaoDivisor}>
          <View style={styles.secaoDivisorLinha} />
          <Text style={styles.secaoDivisorTexto}>MEUS REGISTROS</Text>
          <View style={styles.secaoDivisorLinha} />
        </View>

        {/* Acordions */}
        <View style={styles.acordionsContainer}>
          {acordions.map(ac => (
            <View key={ac.key} style={styles.acordionWrapper}>
              <TouchableOpacity
                style={[styles.accordionHeader, aberto === ac.key && styles.accordionHeaderAberto]}
                activeOpacity={0.8}
                onPress={() => toggleAcordion(ac.key)}
              >
                <View style={styles.accordionHeaderLeft}>
                  <View style={styles.accordionIconBox}>
                    <Feather name={ac.icon} size={14} color="#6B49AD" />
                  </View>
                  <Text style={styles.accordionTitulo}>{ac.label}</Text>
                </View>
                <Feather name={aberto === ac.key ? 'chevron-up' : 'chevron-down'} size={15} color="#9163CB" />
              </TouchableOpacity>
              {aberto === ac.key && (
                <View style={styles.accordionContent}>
                  {ac.render()}
                </View>
              )}
            </View>
          ))}
        </View>

        <View style={{ height: 160 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  // Ponto 2 — V1: paddingTop Android via Platform/StatusBar
  safe: {
    flex: 1,
    backgroundColor: '#F5F0FF',
  },
  // Ponto 2 — V1: paddingTop: 12
  scroll: { paddingHorizontal: 16, paddingTop: 12  },

  // Ponto 3 — V1: borderRadius 60, foto 38x38, sem marginTop extra (consistente com criar.tsx)
  // Botão voltar removido — substituído por View vazia width:44
  cardPerfil: {
    backgroundColor: '#fff', borderRadius: 60, paddingHorizontal: 12, paddingVertical: 8,
    flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between',
    shadowColor: '#6B49AD', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 12, elevation: 6,
    marginBottom: 14,
  },
  fotoPerfil: { width: 38, height: 38, borderRadius: 19, borderWidth: 2, borderColor: '#E2D9F3' },
  fotoPerfilPlaceholder: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: '#EDE8FA',
    justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#E2D9F3',
  },
  logo: { width: 110, height: 36 },

  cardTituloLista: {
    borderRadius: 50, paddingVertical: 14, alignItems: 'center',
    shadowColor: '#481D94', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 5, marginBottom: 12,
  },
  cardTituloTexto: { fontSize: 14, fontWeight: '800', color: '#fff', letterSpacing: 3 },

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
  diaSelecionado: { backgroundColor: '#6B49AD' },
  diaTexto: { fontSize: 13, color: '#301971', fontWeight: '500' },
  diaHojeTexto: { color: '#6B49AD', fontWeight: '700' },
  diaSelecionadoTexto: { color: '#fff', fontWeight: '700' },
  diaComEvento: { backgroundColor: '#EDE8FA' },
  diaComEventoTexto: { color: '#6B49AD', fontWeight: '700' },

  legendaDivisor: { height: 1, backgroundColor: '#F0EAFF', marginVertical: 10 },
  legendaRow: { flexDirection: 'row', justifyContent: 'center', gap: 20 },
  legendaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendaQuadrado: { width: 14, height: 14, borderRadius: 4 },
  legendaTexto: { fontSize: 10, color: '#9163CB', fontWeight: '600' },

  eventosCard: {
    backgroundColor: '#fff', borderRadius: 24, padding: 16, marginBottom: 12,
    shadowColor: '#6B49AD', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
  },
  eventosTituloRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  eventosTituloIcone: {
    width: 28, height: 28, borderRadius: 8, backgroundColor: '#EDE8FA',
    justifyContent: 'center', alignItems: 'center',
  },
  eventosTitulo: { fontSize: 14, fontWeight: '800', color: '#301971', flex: 1 },
  eventosBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  eventosBadgeTexto: { fontSize: 11, fontWeight: '700' },
  eventosVazioBox: { alignItems: 'center', paddingVertical: 20, gap: 6 },
  eventosVazio: { fontSize: 12, color: '#C4B5FD', fontWeight: '600' },

  eventoCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FAFAFE', borderRadius: 14, padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: '#EDE8FA',
  },
  eventoIconBox: {
    width: 40, height: 40, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  eventoTextos: { flex: 1 },
  eventoHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
  eventoTitulo: { fontSize: 13, fontWeight: '700', color: '#301971', flex: 1, marginRight: 6 },
  eventoTag: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  eventoTagTexto: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase' },
  eventoDescricao: { fontSize: 12, color: '#9163CB', fontWeight: '500', marginBottom: 3 },
  eventoHoraRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  eventoHoraTexto: { fontSize: 11, fontWeight: '600', color: '#9163CB' },

  secaoDivisor: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  secaoDivisorLinha: { flex: 1, height: 1, backgroundColor: '#DDD6FE' },
  secaoDivisorTexto: { fontSize: 10, fontWeight: '800', color: '#9163CB', letterSpacing: 1 },

  acordionsContainer: { gap: 6 },
  acordionWrapper: {},
  accordionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: 16, borderWidth: 1, borderColor: '#EDE8FA',
  },
  accordionHeaderAberto: {
    borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderBottomWidth: 0,
  },
  accordionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  accordionIconBox: {
    width: 28, height: 28, borderRadius: 8, backgroundColor: '#EDE8FA',
    justifyContent: 'center', alignItems: 'center',
  },
  accordionTitulo: { fontSize: 13, fontWeight: '700', color: '#301971' },
  // Ponto 5 — V2: gap: 12
  accordionContent: {
    backgroundColor: '#FAFAFE', borderWidth: 1, borderTopWidth: 0,
    borderColor: '#EDE8FA', borderBottomLeftRadius: 16, borderBottomRightRadius: 16,
    padding: 8, gap: 12,
  },

  registroItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 12, padding: 11,
    borderWidth: 1, borderColor: '#F0EAFF',
  },
  registroItemIconBox: {
    width: 32, height: 32, borderRadius: 9,
    justifyContent: 'center', alignItems: 'center', marginRight: 10,
  },
  registroTextos: { flex: 1 },
  registroItemHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2,
  },
  registroNome: { fontSize: 13, fontWeight: '700', color: '#301971', flex: 1, marginRight: 6 },
  registroSub: { fontSize: 11, color: '#9163CB', fontWeight: '500', lineHeight: 15, marginTop: 1 },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, flexDirection: 'row', alignItems: 'center' },
  statusBadgeTexto: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase' },
  registroVazio: { fontSize: 11, color: '#C4B5FD', textAlign: 'center', paddingVertical: 8, fontStyle: 'italic' },
})