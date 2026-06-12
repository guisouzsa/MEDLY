import { supabase } from './supabase'

export interface CalendarEvent {
  id: string
  tipo: 'medicamento' | 'consulta' | 'exame' | 'sintoma'
  titulo: string
  descricao: string
  horario?: string
  horaObj?: Date
  dados: any
}

export function formatarLocalDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function getEventsForDate(
  dateStr: string,
  data: {
    medicamentos: any[]
    consultas: any[]
    exames: any[]
    sintomas: any[]
  }
): CalendarEvent[] {
  const events: CalendarEvent[] = []
  const currentLocalDate = new Date(dateStr + 'T00:00:00')

  for (const con of data.consultas) {
    if (con.data === dateStr) {
      events.push({
        id: `con-${con.id}`,
        tipo: 'consulta',
        titulo: `Consulta: ${con.especialidade}`,
        descricao: `Dr(a). ${con.nome_medico}${con.local ? ` em ${con.local}` : ''}`,
        horario: con.horario ? con.horario.slice(0, 5) : undefined,
        dados: con,
      })
    }
  }

  for (const exa of data.exames) {
    if (exa.data_realizacao === dateStr) {
      events.push({
        id: `exa-${exa.id}-realizacao`,
        tipo: 'exame',
        titulo: `Realização de Exame: ${exa.nome}`,
        descricao: exa.local ? `Local: ${exa.local}` : 'Horário não informado',
        horario: exa.horario ? exa.horario.slice(0, 5) : undefined,
        dados: exa,
      })
    }
    if (exa.data_resultado === dateStr) {
      events.push({
        id: `exa-${exa.id}-resultado`,
        tipo: 'exame',
        titulo: `Resultado de Exame: ${exa.nome}`,
        descricao: 'Data prevista para o resultado',
        dados: exa,
      })
    }
  }

  for (const sin of data.sintomas) {
    if (sin.data === dateStr) {
      events.push({
        id: `sin-${sin.id}`,
        tipo: 'sintoma',
        titulo: `Sintoma: ${sin.nome}`,
        descricao: `Intensidade: ${sin.intensidade}/10${sin.duracao ? ` · Duração: ${sin.duracao}` : ''}`,
        horario: sin.horario ? sin.horario.slice(0, 5) : undefined,
        dados: sin,
      })
    }
  }

  for (const med of data.medicamentos) {
    if (med.status !== 'ativo') continue
    if (dateStr < med.data_inicio) continue
    if (med.data_termino && dateStr > med.data_termino) continue

    const hs = med.medicamento_horarios ?? []

    if (med.frequencia_tipo === 'diario') {
      for (const h of hs) {
        events.push({
          id: `med-${med.id}-${h.horario}`,
          tipo: 'medicamento',
          titulo: med.nome,
          descricao: `${med.dosagem || ''} · ${med.quantidade_por_dose || ''}`.trim(),
          horario: h.horario.slice(0, 5),
          dados: med,
        })
      }
    } else if (med.frequencia_tipo === 'semanal') {
      const weekday = currentLocalDate.getDay()
      const matchingHorarios = hs.filter((h: any) => h.dia_semana === weekday)
      for (const h of matchingHorarios) {
        events.push({
          id: `med-${med.id}-${h.horario}`,
          tipo: 'medicamento',
          titulo: med.nome,
          descricao: `${med.dosagem || ''} · ${med.quantidade_por_dose || ''}`.trim(),
          horario: h.horario.slice(0, 5),
          dados: med,
        })
      }
    } else if (med.frequencia_tipo === 'mensal') {
      const dayOfMonth = currentLocalDate.getDate()
      const matchingHorarios = hs.filter((h: any) => h.dia_mes === dayOfMonth)
      for (const h of matchingHorarios) {
        events.push({
          id: `med-${med.id}-${h.horario}`,
          tipo: 'medicamento',
          titulo: med.nome,
          descricao: `${med.dosagem || ''} · ${med.quantidade_por_dose || ''}`.trim(),
          horario: h.horario.slice(0, 5),
          dados: med,
        })
      }
    } else if (med.frequencia_tipo === 'personalizado') {
      const startHourStr = med.horario ? med.horario.slice(0, 5) : '08:00'
      const [sh, sm] = startHourStr.split(':').map(Number)
      const H = med.intervalo_horas
      if (H && H > 0) {
        const dayStart = new Date(dateStr + 'T00:00:00')
        const dayEnd = new Date(dateStr + 'T23:59:59')
        const start = new Date(med.data_inicio + 'T' + startHourStr + ':00')
        
        if (dayEnd >= start) {
          const msDiff = dayStart.getTime() - start.getTime()
          const hoursDiff = msDiff / (1000 * 60 * 60)
          let k = Math.max(0, Math.ceil(hoursDiff / H))
          
          while (true) {
            const occurrenceTime = new Date(start.getTime() + k * H * 1000 * 60 * 60)
            if (occurrenceTime > dayEnd) break
            
            const hour = occurrenceTime.getHours()
            const min = occurrenceTime.getMinutes()
            const horarioStr = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`
            events.push({
              id: `med-${med.id}-${horarioStr}`,
              tipo: 'medicamento',
              titulo: med.nome,
              descricao: `${med.dosagem || ''} · ${med.quantidade_por_dose || ''}`.trim(),
              horario: horarioStr,
              dados: med,
            })
            k++
          }
        }
      }
    }
  }

  events.sort((a, b) => {
    const timeA = a.horario || '00:00'
    const timeB = b.horario || '00:00'
    return timeA.localeCompare(timeB)
  })

  return events
}

export interface ProximoLembrete {
  tipo: string
  descricao: string
}

export function getProximoLembrete(
  data: {
    medicamentos: any[]
    consultas: any[]
    exames: any[]
    sintomas: any[]
  }
): ProximoLembrete | null {
  const agora = new Date()
  const listEventosFuturos: { datetime: Date; label: string; desc: string }[] = []

  for (let i = 0; i < 30; i++) {
    const checkDate = new Date()
    checkDate.setDate(agora.getDate() + i)
    const dateStr = formatarLocalDate(checkDate)
    const evs = getEventsForDate(dateStr, data)

    for (const ev of evs) {
      if (ev.tipo === 'sintoma') continue
      if (!ev.horario) continue // pular eventos sem horário definido

      const timeStr = ev.horario
      const [h, m] = timeStr.split(':').map(Number)
      const evDatetime = new Date(dateStr + `T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`)

      if (evDatetime >= agora) {
        let label = 'Tomar o medicamento'
        if (ev.tipo === 'consulta') label = 'Consulta marcada'
        if (ev.tipo === 'exame') label = 'Exame agendado'

        let desc = `${ev.titulo} às ${timeStr}`
        if (ev.tipo === 'medicamento') {
          desc = `${ev.titulo} (${ev.descricao}) às ${timeStr}`
        }

        listEventosFuturos.push({ datetime: evDatetime, label, desc })
      }
    }
  }

  if (listEventosFuturos.length === 0) return null

  listEventosFuturos.sort((a, b) => a.datetime.getTime() - b.datetime.getTime())

  return {
    tipo: listEventosFuturos[0].label,
    descricao: listEventosFuturos[0].desc,
  }
}


export async function salvarHistorico(usuarioId: string, descricao: string, tipo: string = 'geral') {
  try {
    const { error } = await supabase.from('historico').insert({
      usuario_id: usuarioId,
      user_id: usuarioId,
      descricao,
      tipo,
      data: new Date().toISOString(),
    })
    if (error) console.warn('[Historico] Falha ao salvar (RLS):', error.message)
  } catch (err) {
    console.warn('[Historico] Catch ao salvar:', err)
  }
}