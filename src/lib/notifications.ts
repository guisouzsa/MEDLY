import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import { supabase } from './supabase'

// ─── Constantes ──────────────────────────────────────────────────────────────

const CANAL_LEMBRETES = 'lembretes-medly-v2'
const DIAS_AGENDAMENTO = 7 // Agenda apenas 7 dias à frente (evita limite de 500)

// Categorias de ação por tipo
const CATEGORIA_MEDICAMENTO = 'medicamento'
const CATEGORIA_CONSULTA = 'consulta'
const CATEGORIA_EXAME = 'exame'

// ─── Inicialização ───────────────────────────────────────────────────────────

/**
 * Configura o handler de notificações (como exibir quando o app está aberto),
 * cria o canal Android obrigatório e registra as categorias com botões de ação.
 */
export async function inicializarNotificacoes() {
  if (Platform.OS === 'web') {
    console.log('Notificações nativas ignoradas no ambiente Web.')
    return
  }

  // Handler: como exibir notificações quando o app está em primeiro plano
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  })

  // Canal Android (obrigatório no Android 8+)
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CANAL_LEMBRETES, {
      name: 'Lembretes MEDLY',
      description: 'Lembretes de medicamentos, consultas e exames',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
      enableVibrate: true,
      enableLights: true,
      lightColor: '#6B49AD',
    })
  }

  // Registrar categorias com botões de ação personalizados
  await Notifications.setNotificationCategoryAsync(CATEGORIA_MEDICAMENTO, [
    {
      identifier: 'tomei',
      buttonTitle: 'Tomei',
      options: { opensAppToForeground: false },
    },
    {
      identifier: 'abrir',
      buttonTitle: 'Abrir App',
      options: { opensAppToForeground: true },
    },
  ])

  await Notifications.setNotificationCategoryAsync(CATEGORIA_CONSULTA, [
    {
      identifier: 'feita',
      buttonTitle: 'Feita',
      options: { opensAppToForeground: false },
    },
    {
      identifier: 'abrir',
      buttonTitle: 'Abrir App',
      options: { opensAppToForeground: true },
    },
  ])

  await Notifications.setNotificationCategoryAsync(CATEGORIA_EXAME, [
    {
      identifier: 'feito',
      buttonTitle: 'Feito',
      options: { opensAppToForeground: false },
    },
    {
      identifier: 'abrir',
      buttonTitle: 'Abrir App',
      options: { opensAppToForeground: true },
    },
  ])
}

// ─── Permissão ───────────────────────────────────────────────────────────────

/**
 * Pede permissão para enviar notificações. Retorna true se concedido.
 */
export async function pedirPermissaoNotificacoes(): Promise<boolean> {
  if (Platform.OS === 'web') return false
  const { status: existente } = await Notifications.getPermissionsAsync()
  if (existente === 'granted') return true

  const { status } = await Notifications.requestPermissionsAsync()
  return status === 'granted'
}

/**
 * Verifica se a permissão já foi concedida (sem pedir).
 */
export async function verificarPermissao(): Promise<boolean> {
  if (Platform.OS === 'web') return false
  const { status } = await Notifications.getPermissionsAsync()
  return status === 'granted'
}

// ─── Cancelamento ────────────────────────────────────────────────────────────

/**
 * Cancela todas as notificações agendadas.
 */
export async function cancelarTodasNotificacoes() {
  if (Platform.OS === 'web') return
  await Notifications.cancelAllScheduledNotificationsAsync()
}

/**
 * Cancela notificações de um registro específico (por prefixo de ID).
 * Ex: cancelarNotificacoesPorPrefixo('med-42') cancela med-42-08:00, med-42-14:00, etc.
 */
export async function cancelarNotificacoesPorPrefixo(prefixo: string) {
  if (Platform.OS === 'web') return
  const agendadas = await Notifications.getAllScheduledNotificationsAsync()
  for (const notif of agendadas) {
    if (notif.identifier.startsWith(prefixo)) {
      await Notifications.cancelScheduledNotificationAsync(notif.identifier)
    }
  }
}

// ─── Agendamento de Medicamentos ─────────────────────────────────────────────

type MedicamentoParaNotificar = {
  id: number
  nome: string
  dosagem: string
  quantidade_por_dose: string
  frequencia_tipo: 'diario' | 'semanal' | 'mensal' | 'personalizado'
  intervalo_horas: number | null
  horario: string | null
  data_inicio: string
  data_termino: string | null
  status: string
  medicamento_horarios: {
    horario: string
    dia_semana: number | null
    dia_mes: number | null
  }[]
}

/**
 * Agenda notificações para um medicamento nos próximos DIAS_AGENDAMENTO dias.
 * Retorna o número de notificações agendadas.
 */
async function agendarMedicamento(med: MedicamentoParaNotificar): Promise<number> {
  if (med.status !== 'ativo') return 0

  const agora = new Date()
  const horarios = med.medicamento_horarios ?? []
  let count = 0

  for (let diaOffset = 0; diaOffset < DIAS_AGENDAMENTO; diaOffset++) {
    const dia = new Date()
    dia.setDate(agora.getDate() + diaOffset)
    const diaStr = formatarLocalDate(dia)

    // Verificar se está dentro do período do medicamento
    if (diaStr < med.data_inicio) continue
    if (med.data_termino && diaStr > med.data_termino) continue

    const horariosHoje = obterHorariosParaDia(med, dia, horarios)

    for (const horarioStr of horariosHoje) {
      const [h, m] = horarioStr.split(':').map(Number)
      const dataNotificacao = new Date(dia)
      dataNotificacao.setHours(h, m, 0, 0)

      // Não agendar se já passou
      if (dataNotificacao <= agora) continue

      const descricao = [med.dosagem, med.quantidade_por_dose].filter(Boolean).join(' · ')
      const identificador = `med-${med.id}-${diaStr}-${horarioStr}`

      await Notifications.scheduleNotificationAsync({
        identifier: identificador,
        content: {
          title: 'Medicação',
          body: `Tomar ${med.nome}${descricao ? ` (${descricao})` : ''}`,
          sound: 'default',
          categoryIdentifier: CATEGORIA_MEDICAMENTO,
          data: { tipo: 'medicamento', id: med.id },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: dataNotificacao,
        },
      })
      count++
    }
  }

  return count
}

/**
 * Retorna os horários que um medicamento deve tocar num dia específico.
 */
function obterHorariosParaDia(
  med: MedicamentoParaNotificar,
  dia: Date,
  horarios: MedicamentoParaNotificar['medicamento_horarios']
): string[] {
  if (med.frequencia_tipo === 'diario') {
    return horarios.map(h => h.horario.slice(0, 5))
  }

  if (med.frequencia_tipo === 'semanal') {
    const weekday = dia.getDay()
    return horarios
      .filter(h => h.dia_semana === weekday)
      .map(h => h.horario.slice(0, 5))
  }

  if (med.frequencia_tipo === 'mensal') {
    const dayOfMonth = dia.getDate()
    return horarios
      .filter(h => h.dia_mes === dayOfMonth)
      .map(h => h.horario.slice(0, 5))
  }

  if (med.frequencia_tipo === 'personalizado' && med.intervalo_horas) {
    const startHourStr = med.horario ? med.horario.slice(0, 5) : '00:00'
    const [sh, sm] = startHourStr.split(':').map(Number)
    const H = med.intervalo_horas
    const resultado: string[] = []
    
    const [startYear, startMonth, startDay] = med.data_inicio.split('-').map(Number)
    const start = new Date(startYear, startMonth - 1, startDay, sh, sm, 0)
    
    const dayStart = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate(), 0, 0, 0)
    const dayEnd = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate(), 23, 59, 59)
    
    if (dayEnd >= start) {
      const msDiff = dayStart.getTime() - start.getTime()
      const hoursDiff = msDiff / (1000 * 60 * 60)
      let k = Math.max(0, Math.ceil(hoursDiff / H))
      
      while (true) {
        const occurrenceTime = new Date(start.getTime() + k * H * 1000 * 60 * 60)
        if (occurrenceTime > dayEnd) break
        
        const hour = occurrenceTime.getHours()
        const min = occurrenceTime.getMinutes()
        resultado.push(`${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`)
        k++
      }
    }
    return resultado
  }

  return []
}

// ─── Agendamento de Consultas ────────────────────────────────────────────────

type ConsultaParaNotificar = {
  id: number
  especialidade: string
  nome_medico: string
  data: string
  horario: string | null
}

/**
 * Agenda notificação para uma consulta no horário exato.
 */
async function agendarConsulta(consulta: ConsultaParaNotificar): Promise<number> {
  const agora = new Date()
  let count = 0

  if (!consulta.data || !consulta.horario) return 0

  const [ano, mes, dia] = consulta.data.split('-').map(Number)
  const [h, m] = consulta.horario.slice(0, 5).split(':').map(Number)
  const dataNotificacao = new Date(ano, mes - 1, dia, h, m, 0)

  // Não agendar se já passou ou se está além do período
  if (dataNotificacao <= agora) return 0
  const limite = new Date()
  limite.setDate(agora.getDate() + DIAS_AGENDAMENTO)
  if (dataNotificacao > limite) return 0

  const identificador = `con-${consulta.id}`

  await Notifications.scheduleNotificationAsync({
    identifier: identificador,
    content: {
      title: 'Consulta',
      body: `${consulta.especialidade} com Dr(a). ${consulta.nome_medico} às ${consulta.horario.slice(0, 5)}`,
      sound: 'default',
      categoryIdentifier: CATEGORIA_CONSULTA,
      data: { tipo: 'consulta', id: consulta.id },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: dataNotificacao,
    },
  })
  count++

  return count
}

// ─── Agendamento de Exames ───────────────────────────────────────────────────

type ExameParaNotificar = {
  id: number
  nome: string
  data_realizacao: string
  horario: string | null
  local: string | null
}

/**
 * Agenda notificação para um exame no horário exato.
 */
async function agendarExame(exame: ExameParaNotificar): Promise<number> {
  const agora = new Date()
  let count = 0

  if (!exame.data_realizacao) return 0

  const [ano, mes, dia] = exame.data_realizacao.split('-').map(Number)
  const horarioStr = exame.horario ? exame.horario.slice(0, 5) : '08:00'
  const [h, m] = horarioStr.split(':').map(Number)
  const dataNotificacao = new Date(ano, mes - 1, dia, h, m, 0)

  // Não agendar se já passou ou se está além do período
  if (dataNotificacao <= agora) return 0
  const limite = new Date()
  limite.setDate(agora.getDate() + DIAS_AGENDAMENTO)
  if (dataNotificacao > limite) return 0

  const identificador = `exa-${exame.id}`
  const localTexto = exame.local ? ` em ${exame.local}` : ''

  await Notifications.scheduleNotificationAsync({
    identifier: identificador,
    content: {
      title: 'Exame',
      body: `${exame.nome} às ${horarioStr}${localTexto}`,
      sound: 'default',
      categoryIdentifier: CATEGORIA_EXAME,
      data: { tipo: 'exame', id: exame.id },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: dataNotificacao,
    },
  })
  count++

  return count
}

// ─── Reagendamento geral ─────────────────────────────────────────────────────

/**
 * Cancela TODAS as notificações e reagenda os próximos 7 dias.
 * Deve ser chamado: ao abrir o app, ao salvar/excluir qualquer CRUD.
 */
export async function reagendarTodasNotificacoes(userId: string): Promise<number> {
  try {
    const permitido = await verificarPermissao()
    if (!permitido) return 0

    // Cancela tudo para reconstruir
    await cancelarTodasNotificacoes()

    let totalAgendadas = 0

    // ── Medicamentos ativos ────────────────────────────────────────────────
    const { data: meds } = await supabase
      .from('medicamentos')
      .select('id, nome, dosagem, quantidade_por_dose, frequencia_tipo, intervalo_horas, data_inicio, data_termino, status, medicamento_horarios(horario, dia_semana, dia_mes)')
      .eq('usuario_id', userId)
      .eq('status', 'ativo')

    if (meds) {
      for (const med of meds) {
        totalAgendadas += await agendarMedicamento(med as MedicamentoParaNotificar)
      }
    }

    // ── Consultas futuras ──────────────────────────────────────────────────
    const { data: consultas } = await supabase
      .from('consultas')
      .select('id, especialidade, nome_medico, data, horario')
      .eq('usuario_id', userId)
      .gte('data', formatarLocalDate(new Date()))

    if (consultas) {
      for (const con of consultas) {
        totalAgendadas += await agendarConsulta(con as ConsultaParaNotificar)
      }
    }

    // ── Exames futuros ─────────────────────────────────────────────────────
    const { data: exames } = await supabase
      .from('exames')
      .select('id, nome, data_realizacao, horario, local')
      .eq('usuario_id', userId)
      .gte('data_realizacao', formatarLocalDate(new Date()))

    if (exames) {
      for (const exa of exames) {
        totalAgendadas += await agendarExame(exa as ExameParaNotificar)
      }
    }

    console.log(`[MEDLY Notificações] ${totalAgendadas} notificações agendadas para os próximos ${DIAS_AGENDAMENTO} dias`)
    return totalAgendadas
  } catch (err) {
    console.error('[MEDLY Notificações] Erro ao reagendar:', err)
    return 0
  }
}

// ─── Helper ──────────────────────────────────────────────────────────────────

function formatarLocalDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
