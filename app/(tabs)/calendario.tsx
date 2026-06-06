import { Feather } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useFocusEffect, useLocalSearchParams, router } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import {
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '../../src/lib/supabase'
import { getEventsForDate, formatarLocalDate, CalendarEvent } from '../../src/lib/events'

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const DIAS_SEMANA = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

function getDiasDoMes(ano: number, mes: number) {
  const primeiroDia = new Date(ano, mes, 1).getDay()
  const totalDias = new Date(ano, mes + 1, 0).getDate()
  const celulas: (number | null)[] = Array(primeiroDia).fill(null)
  for (let d = 1; d <= totalDias; d++) celulas.push(d)
  while (celulas.length % 7 !== 0) celulas.push(null)
  return celulas
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

function EventoCard({ event }: { event: CalendarEvent }) {
  let iconName: any = 'activity'
  let iconBg = '#EDE8FA'
  let iconColor = '#6B49AD'
  let labelTipo = ''

  if (event.tipo === 'medicamento') {
    iconName = 'activity'
    iconBg = '#E8F5E9'
    iconColor = '#2E7D32'
    labelTipo = 'Remédio'
  } else if (event.tipo === 'consulta') {
    iconName = 'calendar'
    iconBg = '#E3F2FD'
    iconColor = '#1565C0'
    labelTipo = 'Consulta'
  } else if (event.tipo === 'exame') {
    iconName = 'file-text'
    iconBg = '#E0F2F1'
    iconColor = '#00695C'
    labelTipo = 'Exame'
  } else if (event.tipo === 'sintoma') {
    iconName = 'thermometer'
    iconBg = '#FFEBEE'
    iconColor = '#C62828'
    labelTipo = 'Sintoma'
  }

  return (
    <View style={styles.eventoCard}>
      <View style={[styles.eventoIconBox, { backgroundColor: iconBg }]}>
        <Feather name={iconName} size={22} color={iconColor} />
      </View>
      <View style={styles.eventoTextos}>
        <View style={styles.eventoHeaderRow}>
          <Text style={styles.eventoTitulo} numberOfLines={1}>{event.titulo}</Text>
          <View style={[styles.eventoTag, { backgroundColor: iconBg }]}>
            <Text style={[styles.eventoTagTexto, { color: iconColor }]}>{labelTipo}</Text>
          </View>
        </View>
        <Text style={styles.eventoDescricao}>{event.descricao}</Text>
        {event.horario && (
          <View style={styles.eventoHoraRow}>
            <Feather name="clock" size={13} color="#9163CB" />
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

  const [dbData, setDbData] = useState<{
    medicamentos: any[]
    consultas: any[]
    exames: any[]
    sintomas: any[]
  }>({ medicamentos: [], consultas: [], exames: [], sintomas: [] })

  // Collapsible sections state
  const [medsExpandido, setMedsExpandido] = useState(false)
  const [consExpandido, setConsExpandido] = useState(false)
  const [exasExpandido, setExasExpandido] = useState(false)
  const [sintsExpandido, setSintsExpandido] = useState(false)

  // Sync state if redirected with specific params from dashboard
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

          // 2. Carrega Dados dos Módulos
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
          console.error('Erro ao carregar dados do Calendário:', err)
        }
      }
      carregarDados()
    }, [])
  )

  const dias = getDiasDoMes(ano, mes)

  function anterior() { mes === 0 ? (setMes(11), setAno(a => a - 1)) : setMes(m => m - 1) }
  function proximo() { mes === 11 ? (setMes(0), setAno(a => a + 1)) : setMes(m => m + 1) }

  // Get events of the selected day
  const dataSelecionadaStr = diaSelecionado 
    ? `${ano}-${String(mes + 1).padStart(2, '0')}-${String(diaSelecionado).padStart(2, '0')}`
    : ''
  
  const eventosDoDia = diaSelecionado ? getEventsForDate(dataSelecionadaStr, dbData) : []

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
          <TouchableOpacity onPress={() => router.push('/(tabs)' as any)} style={styles.voltarBtn}>
            <Feather name="arrow-left" size={18} color="#6B49AD" />
          </TouchableOpacity>
        </View>

        {/* Card 2 — Título (Padrão) */}
        <LinearGradient
          colors={['#6B49AD', '#6843B1', '#481D94']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={styles.cardTituloLista}
        >
          <Text style={styles.cardTituloTexto}>CALENDÁRIO</Text>
        </LinearGradient>

        {/* Calendário Completo */}
        <View style={styles.calendarioCard}>
          <View style={styles.calendarioNav}>
            <TouchableOpacity onPress={anterior} style={styles.navBtn}>
              <Feather name="chevron-left" size={24} color="#6B49AD" />
            </TouchableOpacity>
            <View style={styles.seletorMesAno}>
              <Text style={styles.seletorTexto}>{MESES[mes]} de {ano}</Text>
            </View>
            <TouchableOpacity onPress={proximo} style={styles.navBtn}>
              <Feather name="chevron-right" size={24} color="#6B49AD" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.semanaRow}>
            {DIAS_SEMANA.map(d => <Text key={d} style={styles.semanaTexto}>{d}</Text>)}
          </View>
          
          <View style={styles.grade}>
            {dias.map((dia, i) => {
              const isHoje = dia === hoje.getDate() && mes === hoje.getMonth() && ano === hoje.getFullYear()
              const isSelecionado = dia === diaSelecionado
              
              let temEvento = false
              if (dia !== null) {
                const dayStr = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
                const evs = getEventsForDate(dayStr, dbData)
                temEvento = evs.length > 0
              }

              return (
                <View key={i} style={styles.diaCell}>
                  {dia !== null ? (
                    <TouchableOpacity 
                      style={[
                        styles.diaBotao, 
                        isHoje && styles.diaHoje,
                        temEvento && styles.diaComEvento,
                        isSelecionado && styles.diaSelecionado
                      ]}
                      onPress={() => setDiaSelecionado(dia)}
                    >
                      <Text style={[
                        styles.diaTexto, 
                        isHoje && styles.diaHojeTexto,
                        temEvento && styles.diaComEventoTexto,
                        isSelecionado && styles.diaSelecionadoTexto
                      ]}>
                        {dia}
                      </Text>
                    </TouchableOpacity>
                  ) : <View style={styles.diaBotao} />}
                </View>
              )
            })}
          </View>
        </View>

        {/* Eventos do Dia Selecionado */}
        <View style={styles.eventosContainer}>
          <Text style={styles.eventosTitulo}>
            Eventos de {diaSelecionado} de {MESES[mes]}
          </Text>
          
          {eventosDoDia.length === 0 ? (
            <Text style={styles.eventosVazio}>
              Nenhum medicamento, consulta ou exame programado para este dia.
            </Text>
          ) : (
            eventosDoDia.map(ev => <EventoCard key={ev.id} event={ev} />)
          )}
        </View>

        {/* Accordion: Todos os Itens Cadastrados (Premium Details) */}
        <View style={styles.secaoCadastros}>
          <Text style={styles.secaoCadastrosTitulo}>MEUS REGISTROS</Text>

          {/* 1. Medicamentos */}
          <TouchableOpacity 
            style={styles.accordionHeader} 
            activeOpacity={0.8}
            onPress={() => setMedsExpandido(!medsExpandido)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Feather name="activity" size={18} color="#2E7D32" />
              <Text style={styles.accordionTitulo}>Medicamentos ({dbData.medicamentos.length})</Text>
            </View>
            <Feather name={medsExpandido ? 'chevron-up' : 'chevron-down'} size={18} color="#6B49AD" />
          </TouchableOpacity>
          {medsExpandido && (
            <View style={styles.accordionContent}>
              {dbData.medicamentos.length === 0 ? (
                <Text style={styles.registroVazio}>Nenhum medicamento cadastrado.</Text>
              ) : (
                dbData.medicamentos.map(med => {
                  const statusCor = getStatusMedCor(med.status)
                  return (
                    <View key={med.id} style={styles.registroItem}>
                      <View style={[styles.registroItemIconBox, { backgroundColor: '#E8F5E9' }]}>
                        <Feather name="activity" size={16} color="#2E7D32" />
                      </View>
                      <View style={styles.registroTextos}>
                        <View style={styles.registroItemHeader}>
                          <Text style={styles.registroNome}>{med.nome}</Text>
                          <View style={[styles.statusBadge, { backgroundColor: statusCor.bg }]}>
                            <Text style={[styles.statusBadgeTexto, { color: statusCor.texto }]}>
                              {statusCor.label}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.registroSub}>
                          {med.dosagem ? `Dosagem: ${med.dosagem}` : ''} {med.quantidade_por_dose ? `· Dose: ${med.quantidade_por_dose}` : ''}
                        </Text>
                        <Text style={styles.registroSub}>
                          Frequência: {labelFrequencia(med)} · Início: {formatarDataParaTela(med.data_inicio)}
                        </Text>
                      </View>
                    </View>
                  )
                })
              )}
            </View>
          )}

          {/* 2. Consultas */}
          <TouchableOpacity 
            style={styles.accordionHeader} 
            activeOpacity={0.8}
            onPress={() => setConsExpandido(!consExpandido)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Feather name="calendar" size={18} color="#1565C0" />
              <Text style={styles.accordionTitulo}>Consultas ({dbData.consultas.length})</Text>
            </View>
            <Feather name={consExpandido ? 'chevron-up' : 'chevron-down'} size={18} color="#6B49AD" />
          </TouchableOpacity>
          {consExpandido && (
            <View style={styles.accordionContent}>
              {dbData.consultas.length === 0 ? (
                <Text style={styles.registroVazio}>Nenhuma consulta cadastrada.</Text>
              ) : (
                dbData.consultas.map(con => (
                  <View key={con.id} style={styles.registroItem}>
                    <View style={[styles.registroItemIconBox, { backgroundColor: '#E3F2FD' }]}>
                      <Feather name="calendar" size={16} color="#1565C0" />
                    </View>
                    <View style={styles.registroTextos}>
                      <Text style={styles.registroNome}>{con.especialidade}</Text>
                      <Text style={styles.registroSub}>Médico: Dr(a). {con.nome_medico}</Text>
                      <Text style={styles.registroSub}>
                        Agendado para: {formatarDataParaTela(con.data)} às {con.horario || '--:--'}
                      </Text>
                      {con.local ? (
                        <Text style={styles.registroSub}>Local: {con.local}</Text>
                      ) : null}
                    </View>
                  </View>
                ))
              )}
            </View>
          )}

          {/* 3. Exames */}
          <TouchableOpacity 
            style={styles.accordionHeader} 
            activeOpacity={0.8}
            onPress={() => setExasExpandido(!exasExpandido)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Feather name="file-text" size={18} color="#00695C" />
              <Text style={styles.accordionTitulo}>Exames ({dbData.exames.length})</Text>
            </View>
            <Feather name={exasExpandido ? 'chevron-up' : 'chevron-down'} size={18} color="#6B49AD" />
          </TouchableOpacity>
          {exasExpandido && (
            <View style={styles.accordionContent}>
              {dbData.exames.length === 0 ? (
                <Text style={styles.registroVazio}>Nenhum exame cadastrado.</Text>
              ) : (
                dbData.exames.map(exa => (
                  <View key={exa.id} style={styles.registroItem}>
                    <View style={[styles.registroItemIconBox, { backgroundColor: '#E0F2F1' }]}>
                      <Feather name="file-text" size={16} color="#00695C" />
                    </View>
                    <View style={styles.registroTextos}>
                      <View style={styles.registroItemHeader}>
                        <Text style={styles.registroNome}>{exa.nome}</Text>
                        {exa.arquivo_url ? (
                          <View style={[styles.statusBadge, { backgroundColor: '#E0F2F1' }]}>
                            <Feather name="paperclip" size={10} color="#00695C" style={{ marginRight: 2 }} />
                            <Text style={[styles.statusBadgeTexto, { color: '#00695C' }]}>Anexo</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={styles.registroSub}>Realização: {formatarDataParaTela(exa.data_realizacao)}</Text>
                      {exa.local ? (
                        <Text style={styles.registroSub}>Local: {exa.local}</Text>
                      ) : null}
                      {exa.data_resultado ? (
                        <Text style={styles.registroSub}>Resultado previsto: {formatarDataParaTela(exa.data_resultado)}</Text>
                      ) : null}
                    </View>
                  </View>
                ))
              )}
            </View>
          )}

          {/* 4. Sintomas */}
          <TouchableOpacity 
            style={styles.accordionHeader} 
            activeOpacity={0.8}
            onPress={() => setSintsExpandido(!sintsExpandido)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Feather name="thermometer" size={18} color="#C62828" />
              <Text style={styles.accordionTitulo}>Sintomas ({dbData.sintomas.length})</Text>
            </View>
            <Feather name={sintsExpandido ? 'chevron-up' : 'chevron-down'} size={18} color="#6B49AD" />
          </TouchableOpacity>
          {sintsExpandido && (
            <View style={styles.accordionContent}>
              {dbData.sintomas.length === 0 ? (
                <Text style={styles.registroVazio}>Nenhum sintoma registrado.</Text>
              ) : (
                dbData.sintomas.map(sin => {
                  const intCor = getIntensidadeCor(sin.intensidade)
                  return (
                    <View key={sin.id} style={styles.registroItem}>
                      <View style={[styles.registroItemIconBox, { backgroundColor: '#FFEBEE' }]}>
                        <Feather name="thermometer" size={16} color="#C62828" />
                      </View>
                      <View style={styles.registroTextos}>
                        <View style={styles.registroItemHeader}>
                          <Text style={styles.registroNome}>{sin.nome}</Text>
                          <View style={[styles.statusBadge, { backgroundColor: intCor.bg }]}>
                            <Text style={[styles.statusBadgeTexto, { color: intCor.texto }]}>
                              {sin.intensidade}/10 · {intCor.label}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.registroSub}>
                          Data: {formatarDataParaTela(sin.data)} {sin.horario ? `às ${sin.horario.slice(0, 5)}` : ''}
                        </Text>
                        {sin.duracao ? (
                          <Text style={styles.registroSub}>Duração: {sin.duracao}</Text>
                        ) : null}
                        {sin.gatilho ? (
                          <Text style={styles.registroSub}>Gatilho: {sin.gatilho}</Text>
                        ) : null}
                      </View>
                    </View>
                  )
                })
              )}
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
  voltarBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#F0EAFF',
    justifyContent: 'center', alignItems: 'center',
  },
  cardTituloLista: {
    marginHorizontal: 0, marginTop: 0, borderRadius: 50,
    paddingVertical: 14, alignItems: 'center',
    shadowColor: '#481D94', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 5,
    marginBottom: 16,
  },
  cardTituloTexto: { fontSize: 14, fontWeight: '800', color: '#fff', letterSpacing: 3 },
  calendarioCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#6B49AD',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  calendarioNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  navBtn: { padding: 6 },
  seletorMesAno: { alignItems: 'center' },
  seletorTexto: { fontSize: 18, fontWeight: '800', color: '#301971' },
  semanaRow: { flexDirection: 'row', marginBottom: 12 },
  semanaTexto: { flex: 1, textAlign: 'center', fontSize: 13, fontWeight: '700', color: '#9163CB' },
  grade: { flexDirection: 'row', flexWrap: 'wrap' },
  diaCell: { width: `${100 / 7}%`, alignItems: 'center', marginBottom: 8 },
  diaBotao: { width: 42, height: 42, borderRadius: 8, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  diaHoje: { borderWidth: 2, borderColor: '#6B49AD' },
  diaSelecionado: { backgroundColor: '#6B49AD' },
  diaTexto: { fontSize: 15, color: '#301971', fontWeight: '600' },
  diaHojeTexto: { color: '#6B49AD', fontWeight: '800' },
  diaSelecionadoTexto: { color: '#fff', fontWeight: '800' },
  diaComEvento: { backgroundColor: '#EDE8FA' },
  diaComEventoTexto: { color: '#6B49AD', fontWeight: '700' },
  eventosContainer: {
    paddingHorizontal: 4,
    marginBottom: 10,
  },
  eventosTitulo: {
    fontSize: 18,
    fontWeight: '700',
    color: '#301971',
    marginBottom: 16,
  },
  eventosVazio: {
    fontSize: 14,
    color: '#9163CB',
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 8,
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 20,
    shadowColor: '#6B49AD',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  eventoCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#6B49AD',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  eventoIconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  eventoTextos: {
    flex: 1,
  },
  eventoHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  eventoTitulo: {
    fontSize: 15,
    fontWeight: '700',
    color: '#301971',
    flex: 1,
    marginRight: 8,
  },
  eventoTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  eventoTagTexto: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  eventoDescricao: {
    fontSize: 13,
    color: '#9163CB',
    fontWeight: '500',
    marginBottom: 4,
  },
  eventoHoraRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  eventoHoraTexto: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9163CB',
  },
  // Collapsible registers
  secaoCadastros: {
    marginTop: 20,
    paddingHorizontal: 4,
  },
  secaoCadastrosTitulo: {
    fontSize: 16,
    fontWeight: '800',
    color: '#301971',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
    shadowColor: '#6B49AD',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  accordionTitulo: {
    fontSize: 14,
    fontWeight: '700',
    color: '#301971',
  },
  accordionContent: {
    backgroundColor: '#FAF8FF',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EFEAFF',
  },
  registroItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#6B49AD',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1.5,
    borderWidth: 1,
    borderColor: '#F0EAFF',
  },
  registroItemIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  registroTextos: {
    flex: 1,
  },
  registroItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  registroNome: {
    fontSize: 14,
    fontWeight: '700',
    color: '#301971',
    flex: 1,
    marginRight: 8,
  },
  registroSub: {
    fontSize: 12,
    color: '#9163CB',
    fontWeight: '500',
    lineHeight: 16,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadgeTexto: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  registroVazio: {
    fontSize: 13,
    color: '#9163CB',
    textAlign: 'center',
    paddingVertical: 12,
    fontStyle: 'italic',
  }
})