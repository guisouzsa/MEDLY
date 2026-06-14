import { Feather } from '@expo/vector-icons'
import { BlurView } from 'expo-blur'
import { LinearGradient } from 'expo-linear-gradient'
import { router, useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StyleSheet, Text,
  TextInput, TouchableOpacity, View
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '../../src/lib/supabase'

const { height, width } = Dimensions.get('window')

// ─── Tipos ────────────────────────────────────────────────────────────────────

type TipoFiltro = 'medicamentos' | 'consultas' | 'sintomas' | 'exames'

type Item = {
  id: number
  tipo: TipoFiltro
  titulo: string
  subtitulo: string
  icone: string
  dados: any
}

const FILTROS: { label: string, valor: TipoFiltro, icone: string }[] = [
  { label: 'Medicamentos', valor: 'medicamentos', icone: 'activity' },
  { label: 'Consultas', valor: 'consultas', icone: 'calendar' },
  { label: 'Sintomas', valor: 'sintomas', icone: 'thermometer' },
  { label: 'Exames', valor: 'exames', icone: 'file-text' },
]

const DIAS_SEMANA_LABEL = [
  { label: 'Seg', valor: 1 }, { label: 'Ter', valor: 2 },
  { label: 'Qua', valor: 3 }, { label: 'Qui', valor: 4 },
  { label: 'Sex', valor: 5 }, { label: 'Sáb', valor: 6 },
  { label: 'Dom', valor: 0 },
]

const PAIN_SCALE = [
  { valor: 0, emoji: '😌', label: 'Sem dor', roxo: '#F3EEFF' },
  { valor: 1, emoji: '🙂', label: 'Muito leve', roxo: '#E9E0FF' },
  { valor: 2, emoji: '😐', label: 'Leve', roxo: '#D9CCFF' },
  { valor: 3, emoji: '😑', label: 'Tolerável', roxo: '#C4B0FF' },
  { valor: 4, emoji: '😟', label: 'Moderada', roxo: '#A98EE8' },
  { valor: 5, emoji: '😧', label: 'Intensa', roxo: '#8B6FCC' },
  { valor: 6, emoji: '😮', label: 'Muito intensa', roxo: '#7055B0' },
  { valor: 7, emoji: '😣', label: 'Severa', roxo: '#5A3E96' },
  { valor: 8, emoji: '😖', label: 'Muito severa', roxo: '#44297C' },
  { valor: 9, emoji: '😭', label: 'Insuportável', roxo: '#2E1760' },
  { valor: 10, emoji: '🤯', label: 'Inimaginável', roxo: '#1A0A3D' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatarData(data: string): string {
  if (!data) return ''
  const parts = data.split('-')
  if (parts.length < 3) return data
  return `${parts[2]}/${parts[1]}/${parts[0]}`
}

function formatarHorario(horario: string): string {
  if (!horario) return ''
  return horario.slice(0, 5)
}

function labelFrequencia(med: any): string {
  if (med.frequencia_tipo === 'diario') return 'Diário'
  if (med.frequencia_tipo === 'semanal') return 'Semanal'
  if (med.frequencia_tipo === 'mensal') return 'Mensal'
  if (med.frequencia_tipo === 'personalizado' && med.intervalo_horas) return `A cada ${med.intervalo_horas}h`
  return med.frequencia_tipo || ''
}

function statusCor(status: string): { bg: string; cor: string } {
  if (status === 'ativo') return { bg: '#DCFCE7', cor: '#16A34A' }
  if (status === 'pausado') return { bg: '#FFF3E0', cor: '#EF6C00' }
  return { bg: '#EDE8FA', cor: '#481D94' }
}

function jaPassouConsulta(consulta: any): boolean {
  if (!consulta.data) return false
  const agora = new Date()
  const [ano, mes, dia] = consulta.data.split('-').map(Number)
  const horarioStr = consulta.horario ? consulta.horario.slice(0, 5) : '23:59'
  const [hora, minuto] = horarioStr.split(':').map(Number)
  const dataConsulta = new Date(ano, mes - 1, dia, hora, minuto)
  return dataConsulta < agora
}

function jaPassouExame(exame: any): boolean {
  if (!exame.data_realizacao) return false
  const agora = new Date()
  const [ano, mes, dia] = exame.data_realizacao.split('-').map(Number)
  const horarioStr = exame.horario ? exame.horario.slice(0, 5) : '23:59'
  const [hora, minuto] = horarioStr.split(':').map(Number)
  return new Date(ano, mes - 1, dia, hora, minuto) < agora
}

function isImageUrl(url: string) {
  if (!url) return false
  const u = url.toLowerCase()
  return (
    u.includes('.png') || u.includes('.jpg') || u.includes('.jpeg') ||
    u.includes('.gif') || u.includes('.webp') ||
    u.startsWith('data:image') ||
    u.startsWith('ph://') ||
    u.startsWith('assets-library://')
  )
}

// ─── Modal visualizador de arquivo ───────────────────────────────────────────

function ModalVisualizarArquivo({
  visivel,
  url,
  isImage,
  onFechar,
}: {
  visivel: boolean
  url: string
  isImage: boolean
  onFechar: () => void
}) {
  return (
    <Modal visible={visivel} transparent animationType="fade" statusBarTranslucent>
      <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFillObject} experimentalBlurMethod="dimezisBlurView" />
      <LinearGradient
        colors={['rgba(26, 10, 61, 0.85)', 'rgba(48, 25, 113, 0.85)']}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.viewerFundo}>
        <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
          {/* Header */}
          <View style={styles.viewerHeader}>
            <TouchableOpacity onPress={onFechar} style={styles.viewerVoltarBtn} activeOpacity={0.8}>
              <Feather name="arrow-left" size={16} color="#fff" style={{ marginRight: 4 }} />
              <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>Voltar</Text>
            </TouchableOpacity>

            <Text style={styles.viewerTitulo} numberOfLines={1}>
              {isImage ? 'Visualizar imagem' : 'Visualizar arquivo'}
            </Text>

            <View style={styles.viewerRightContainer}>
              <TouchableOpacity
                onPress={() => import('expo-web-browser').then(wb => wb.openBrowserAsync(url))}
                style={styles.viewerAbrirExterno}
                activeOpacity={0.8}
              >
                <Feather name="external-link" size={18} color="#fff" />
              </TouchableOpacity>

              <TouchableOpacity onPress={onFechar} style={styles.viewerFechar} activeOpacity={0.8}>
                <Feather name="x" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Conteúdo */}
          <View style={styles.viewerConteudo}>
            {isImage ? (
              <Image
                source={{ uri: url }}
                style={styles.viewerImagem}
                resizeMode="contain"
              />
            ) : (
              <View style={styles.viewerPdfContainer}>
                <View style={styles.viewerPdfIcone}>
                  <Feather name="file-text" size={64} color="#dc2626" />
                  <Text style={styles.viewerPdfLabel}>PDF</Text>
                </View>
                <Text style={styles.viewerPdfTexto}>
                  Visualização de PDF disponível no navegador externo
                </Text>
                <TouchableOpacity
                  onPress={() => import('expo-web-browser').then(wb => wb.openBrowserAsync(url))}
                  activeOpacity={0.85}
                  style={styles.viewerPdfBotao}
                >
                  <LinearGradient
                    colors={['#6B49AD', '#481D94']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={styles.viewerPdfBotaoGradient}
                  >
                    <Feather name="external-link" size={16} color="#fff" />
                    <Text style={styles.viewerPdfBotaoTexto}>Abrir PDF</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  )
}

// ─── Cards ────────────────────────────────────────────────────────────────────

function CardMedicamento({ dados }: { dados: any }) {
  const [expandido, setExpandido] = useState(false)
  const sc = statusCor(dados.status)
  const hs = dados.medicamento_horarios ?? []

  function horariosTexto(): string | null {
    if (dados.frequencia_tipo === 'diario') {
      const h = hs.map((x: any) => x.horario.slice(0, 5)).join(' · ')
      return h || null
    }
    if (dados.frequencia_tipo === 'semanal' || dados.frequencia_tipo === 'mensal') {
      const unicos = [...new Set(hs.map((x: any) => x.horario.slice(0, 5)))] as string[]
      return unicos.length > 0 ? unicos.join(' · ') : null
    }
    if (dados.frequencia_tipo === 'personalizado' && dados.intervalo_horas) {
      const H = dados.intervalo_horas
      const startStr = dados.horario ? dados.horario.slice(0, 5) : '00:00'
      const [sh, sm] = startStr.split(':').map(Number)
      const hrs: string[] = []
      for (let hOffset = 0; hOffset < 24; hOffset += H) {
        const h = (sh + hOffset) % 24
        hrs.push(`${String(h).padStart(2, '0')}:${String(sm).padStart(2, '0')}`)
      }
      return hrs.sort().join(' · ')
    }
    return null
  }

  function diasTexto(): string | null {
    if (dados.frequencia_tipo === 'semanal') {
      const dias = [...new Set(hs.map((x: any) => DIAS_SEMANA_LABEL.find(d => d.valor === x.dia_semana)?.label ?? ''))].filter(Boolean) as string[]
      return dias.length > 0 ? dias.join(', ') : null
    }
    if (dados.frequencia_tipo === 'mensal') {
      const dias = [...new Set(hs.map((x: any) => x.dia_mes))].filter(Boolean).sort((a: any, b: any) => a - b)
      return dias.length > 0 ? `Dias ${dias.join(', ')}` : null
    }
    return null
  }

  const ht = horariosTexto()
  const dt = diasTexto()
  const temDetalhes = !!(dados.quantidade_por_dose || ht || dt || dados.data_termino || dados.data_retorno || dados.motivo_encerramento || dados.observacoes)

  return (
    <View style={styles.card}>
      <View style={styles.cardTopo}>
        <LinearGradient
          colors={dados.status === 'ativo' ? ['#6B49AD', '#481D94'] : ['#9163CB', '#7C4FBD']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.cardIconeBox}
        >
          <Feather name="activity" size={22} color="#fff" />
        </LinearGradient>
        <View style={styles.cardTextos}>
          <Text style={styles.cardNome}>{dados.nome}</Text>
          {dados.dosagem ? <Text style={styles.cardSubtitulo}>{dados.dosagem}</Text> : null}
        </View>
      </View>
      <View style={styles.cardDivisor} />
      <View style={styles.cardInfos}>
        <View style={[styles.badgeStatus, { backgroundColor: sc.bg }]}>
          <Feather name={dados.status === 'ativo' ? 'check-circle' : dados.status === 'pausado' ? 'pause-circle' : 'x-circle'} size={11} color={sc.cor} />
          <Text style={[styles.badgeStatusTexto, { color: sc.cor }]}>{dados.status?.charAt(0).toUpperCase() + dados.status?.slice(1)}</Text>
        </View>
        <View style={styles.infoLinha}>
          <Feather name="refresh-cw" size={15} color="#6B49AD" />
          <Text style={styles.infoLinhaLabel}>Frequência</Text>
          <Text style={styles.infoLinhaTexto}>{labelFrequencia(dados)}</Text>
        </View>
        {dados.data_inicio ? (
          <View style={styles.infoLinha}>
            <Feather name="calendar" size={15} color="#6B49AD" />
            <Text style={styles.infoLinhaLabel}>Início</Text>
            <Text style={styles.infoLinhaTexto}>{formatarData(dados.data_inicio)}</Text>
          </View>
        ) : null}
      </View>
      {expandido && temDetalhes && (
        <View style={styles.cardDetalhes}>
          <View style={styles.cardDivisor} />
          {dados.quantidade_por_dose ? (
            <View style={styles.infoLinha}>
              <Feather name="package" size={15} color="#6B49AD" />
              <Text style={styles.infoLinhaLabel}>Por dose</Text>
              <Text style={styles.infoLinhaTexto}>{dados.quantidade_por_dose}</Text>
            </View>
          ) : null}
          {dt ? (
            <View style={styles.infoLinha}>
              <Feather name="calendar" size={15} color="#6B49AD" />
              <Text style={styles.infoLinhaLabel}>Dias</Text>
              <Text style={styles.infoLinhaTexto}>{dt}</Text>
            </View>
          ) : null}
          {ht ? (
            <View style={styles.infoLinha}>
              <Feather name="clock" size={15} color="#6B49AD" />
              <Text style={styles.infoLinhaLabel}>Horários</Text>
              <Text style={styles.infoLinhaTexto}>{ht}</Text>
            </View>
          ) : null}
          {dados.data_termino ? (
            <View style={styles.infoLinha}>
              <Feather name="calendar" size={15} color="#6B49AD" />
              <Text style={styles.infoLinhaLabel}>Término</Text>
              <Text style={styles.infoLinhaTexto}>{formatarData(dados.data_termino)}</Text>
            </View>
          ) : null}
          {dados.status === 'pausado' && dados.data_retorno ? (
            <View style={styles.infoLinha}>
              <Feather name="clock" size={15} color="#6B49AD" />
              <Text style={styles.infoLinhaLabel}>Retorno</Text>
              <Text style={styles.infoLinhaTexto}>{formatarData(dados.data_retorno)}</Text>
            </View>
          ) : null}
          {dados.status === 'encerrado' && dados.motivo_encerramento ? (
            <View style={[styles.infoLinha, { alignItems: 'flex-start' }]}>
              <Feather name="x-circle" size={15} color="#6B49AD" style={{ marginTop: 2 }} />
              <Text style={styles.infoLinhaLabel}>Motivo</Text>
              <Text style={[styles.infoLinhaTexto, { flex: 1 }]}>{dados.motivo_encerramento}</Text>
            </View>
          ) : null}
          {dados.observacoes ? (
            <View style={[styles.infoLinha, { alignItems: 'flex-start' }]}>
              <Feather name="file-text" size={15} color="#6B49AD" style={{ marginTop: 2 }} />
              <Text style={styles.infoLinhaLabel}>Obs.</Text>
              <Text style={[styles.infoLinhaTexto, { flex: 1 }]}>{dados.observacoes}</Text>
            </View>
          ) : null}
        </View>
      )}
      {temDetalhes && (
        <TouchableOpacity onPress={() => setExpandido(e => !e)} activeOpacity={0.7} style={styles.verMaisBtn}>
          <Text style={styles.verMaisTexto}>{expandido ? 'Ver menos' : 'Ver mais'}</Text>
          <Feather name={expandido ? 'chevron-up' : 'chevron-down'} size={14} color="#6B49AD" />
        </TouchableOpacity>
      )}
    </View>
  )
}

function CardConsulta({ dados }: { dados: any }) {
  const [expandido, setExpandido] = useState(false)
  const isFutura = !jaPassouConsulta(dados)
  const temDetalhes = !!(dados.local || dados.motivo || dados.observacoes)

  return (
    <View style={styles.card}>
      <View style={styles.cardTopo}>
        <LinearGradient
          colors={isFutura ? ['#6B49AD', '#481D94'] : ['#9163CB', '#7C4FBD']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.cardIconeBox}
        >
          <Feather name="calendar" size={22} color="#fff" />
        </LinearGradient>
        <View style={styles.cardTextos}>
          <Text style={styles.cardNome}>{dados.especialidade}</Text>
          <Text style={styles.cardSubtitulo}>{dados.nome_medico}</Text>
        </View>
      </View>
      <View style={styles.cardDivisor} />
      <View style={styles.cardInfos}>
        <View style={isFutura ? styles.badgeProxima : styles.badgeRealizada}>
          <Feather name={isFutura ? 'clock' : 'check-circle'} size={11} color={isFutura ? '#185FA5' : '#6B49AD'} />
          <Text style={isFutura ? styles.badgeProximaTexto : styles.badgeRealizadaTexto}>{isFutura ? 'Próxima' : 'Realizada'}</Text>
        </View>
        {dados.data ? (
          <View style={styles.infoLinha}>
            <Feather name="calendar" size={15} color="#6B49AD" />
            <Text style={styles.infoLinhaLabel}>Data e Hora</Text>
            <Text style={styles.infoLinhaTexto}>{formatarData(dados.data)}{dados.horario ? ` às ${formatarHorario(dados.horario)}` : ''}</Text>
          </View>
        ) : null}
      </View>
      {expandido && temDetalhes && (
        <View style={styles.cardDetalhes}>
          <View style={styles.cardDivisor} />
          {dados.local ? (
            <View style={styles.infoLinha}>
              <Feather name="map-pin" size={15} color="#6B49AD" />
              <Text style={styles.infoLinhaLabel}>Local</Text>
              <Text style={styles.infoLinhaTexto}>{dados.local}</Text>
            </View>
          ) : null}
          {dados.motivo ? (
            <View style={[styles.infoLinha, { alignItems: 'flex-start' }]}>
              <Feather name="file-text" size={15} color="#6B49AD" style={{ marginTop: 2 }} />
              <Text style={styles.infoLinhaLabel}>Motivo</Text>
              <Text style={[styles.infoLinhaTexto, { flex: 1 }]}>{dados.motivo}</Text>
            </View>
          ) : null}
          {dados.observacoes ? (
            <View style={[styles.infoLinha, { alignItems: 'flex-start' }]}>
              <Feather name="message-square" size={15} color="#6B49AD" style={{ marginTop: 2 }} />
              <Text style={styles.infoLinhaLabel}>Obs.</Text>
              <Text style={[styles.infoLinhaTexto, { flex: 1 }]}>{dados.observacoes}</Text>
            </View>
          ) : null}
        </View>
      )}
      {temDetalhes && (
        <TouchableOpacity onPress={() => setExpandido(e => !e)} activeOpacity={0.7} style={styles.verMaisBtn}>
          <Text style={styles.verMaisTexto}>{expandido ? 'Ver menos' : 'Ver mais'}</Text>
          <Feather name={expandido ? 'chevron-up' : 'chevron-down'} size={14} color="#6B49AD" />
        </TouchableOpacity>
      )}
    </View>
  )
}

// ── CardExame agora recebe onVerArquivo ao invés de abrir WebBrowser direto ──

function CardExame({ dados, onVerArquivo }: {
  dados: any
  onVerArquivo: (url: string, isImage: boolean) => void
}) {
  const [expandido, setExpandido] = useState(false)
  const isFuturo = !jaPassouExame(dados)
  const temDetalhes = !!(dados.data_resultado || dados.arquivo_url)

  return (
    <View style={styles.card}>
      <View style={styles.cardTopo}>
        <LinearGradient
          colors={isFuturo ? ['#6B49AD', '#481D94'] : ['#9163CB', '#7C4FBD']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.cardIconeBox}
        >
          <Feather name="file-text" size={22} color="#fff" />
        </LinearGradient>
        <View style={styles.cardTextos}>
          <Text style={styles.cardNome}>{dados.nome}</Text>
          {dados.local ? <Text style={styles.cardSubtitulo}>{dados.local}</Text> : null}
        </View>
      </View>
      <View style={styles.cardDivisor} />
      <View style={styles.cardInfos}>
        <View style={isFuturo ? styles.badgeProxima : styles.badgeRealizada}>
          <Feather name={isFuturo ? 'clock' : 'check-circle'} size={11} color={isFuturo ? '#185FA5' : '#6B49AD'} />
          <Text style={isFuturo ? styles.badgeProximaTexto : styles.badgeRealizadaTexto}>{isFuturo ? 'Próximo' : 'Realizado'}</Text>
        </View>
        {dados.data_realizacao ? (
          <View style={styles.infoLinha}>
            <Feather name="calendar" size={15} color="#6B49AD" />
            <Text style={styles.infoLinhaLabel}>Data e Hora</Text>
            <Text style={styles.infoLinhaTexto}>{formatarData(dados.data_realizacao)}{dados.horario ? ` às ${formatarHorario(dados.horario)}` : ''}</Text>
          </View>
        ) : null}
      </View>
      {expandido && temDetalhes && (
        <View style={styles.cardDetalhes}>
          <View style={styles.cardDivisor} />
          {dados.data_resultado ? (
            <View style={styles.infoLinha}>
              <Feather name="check-circle" size={15} color="#6B49AD" />
              <Text style={styles.infoLinhaLabel}>Result.</Text>
              <Text style={styles.infoLinhaTexto}>{formatarData(dados.data_resultado)}</Text>
            </View>
          ) : null}
          {dados.arquivo_url ? (
            <TouchableOpacity
              onPress={() => onVerArquivo(dados.arquivo_url!, isImageUrl(dados.arquivo_url!))}
              activeOpacity={0.75}
              style={styles.btnArquivoCard}
            >
              <View style={styles.btnArquivoCardIcone}>
                {isImageUrl(dados.arquivo_url) ? (
                  <Feather name="image" size={16} color="#6B49AD" />
                ) : (
                  <Feather name="file-text" size={16} color="#dc2626" />
                )}
              </View>
              <Text style={styles.btnArquivoCardTexto}>
                {isImageUrl(dados.arquivo_url) ? 'Ver imagem' : 'Ver PDF'}
              </Text>
              <Feather name="external-link" size={14} color="#6B49AD" style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>
          ) : null}
        </View>
      )}
      {temDetalhes && (
        <TouchableOpacity onPress={() => setExpandido(e => !e)} activeOpacity={0.7} style={styles.verMaisBtn}>
          <Text style={styles.verMaisTexto}>{expandido ? 'Ver menos' : 'Ver mais'}</Text>
          <Feather name={expandido ? 'chevron-up' : 'chevron-down'} size={14} color="#6B49AD" />
        </TouchableOpacity>
      )}
    </View>
  )
}

function CardSintoma({ dados }: { dados: any }) {
  const [expandido, setExpandido] = useState(false)
  const pain = PAIN_SCALE[dados.intensidade] ?? PAIN_SCALE[0]
  const temDetalhes = !!(dados.horario || dados.duracao || dados.observacoes)

  return (
    <View style={styles.card}>
      <View style={styles.cardTopo}>
        <View style={[styles.cardIconeBox, { backgroundColor: pain.roxo }]}>
          <Text style={styles.cardEmoji}>{pain.emoji}</Text>
        </View>
        <View style={styles.cardTextos}>
          <Text style={styles.cardNome}>{dados.nome}</Text>
        </View>
      </View>
      <View style={styles.cardDivisor} />
      <View style={styles.cardInfos}>
        <View style={[styles.badgeIntensidade, { backgroundColor: pain.roxo }]}>
          <Feather name="activity" size={11} color={dados.intensidade <= 3 ? '#481D94' : '#fff'} />
          <Text style={[styles.badgeIntensidadeTexto, { color: dados.intensidade <= 3 ? '#481D94' : '#fff' }]}>
            {dados.intensidade}/10 — {pain.label}
          </Text>
        </View>
        <View style={styles.infoLinha}>
          <Feather name="calendar" size={15} color="#6B49AD" />
          <Text style={styles.infoLinhaLabel}>Data</Text>
          <Text style={styles.infoLinhaTexto}>{formatarData(dados.data)}</Text>
        </View>
        {dados.gatilho ? (
          <View style={styles.infoLinha}>
            <Feather name="zap" size={15} color="#6B49AD" />
            <Text style={styles.infoLinhaLabel}>Gatilho</Text>
            <Text style={styles.infoLinhaTexto}>{dados.gatilho}</Text>
          </View>
        ) : null}
      </View>
      {expandido && temDetalhes && (
        <View style={styles.cardDetalhes}>
          <View style={styles.cardDivisor} />
          {dados.horario ? (
            <View style={styles.infoLinha}>
              <Feather name="clock" size={15} color="#6B49AD" />
              <Text style={styles.infoLinhaLabel}>Horário</Text>
              <Text style={styles.infoLinhaTexto}>{dados.horario.slice(0, 5)}</Text>
            </View>
          ) : null}
          {dados.duracao ? (
            <View style={styles.infoLinha}>
              <Feather name="watch" size={15} color="#6B49AD" />
              <Text style={styles.infoLinhaLabel}>Duração</Text>
              <Text style={styles.infoLinhaTexto}>{dados.duracao}</Text>
            </View>
          ) : null}
          {dados.observacoes ? (
            <View style={[styles.infoLinha, { alignItems: 'flex-start' }]}>
              <Feather name="file-text" size={15} color="#6B49AD" style={{ marginTop: 2 }} />
              <Text style={styles.infoLinhaLabel}>Obs.</Text>
              <Text style={[styles.infoLinhaTexto, { flex: 1 }]}>{dados.observacoes}</Text>
            </View>
          ) : null}
        </View>
      )}
      {temDetalhes && (
        <TouchableOpacity onPress={() => setExpandido(e => !e)} activeOpacity={0.7} style={styles.verMaisBtn}>
          <Text style={styles.verMaisTexto}>{expandido ? 'Ver menos' : 'Ver mais'}</Text>
          <Feather name={expandido ? 'chevron-up' : 'chevron-down'} size={14} color="#6B49AD" />
        </TouchableOpacity>
      )}
    </View>
  )
}

// ─── Tela principal ───────────────────────────────────────────────────────────

export default function Pesquisar() {
  const [busca, setBusca] = useState('')
  const [filtros, setFiltros] = useState<TipoFiltro[]>([])
  const [itens, setItens] = useState<Item[]>([])
  const [carregando, setCarregando] = useState(false)
  const [perfilFoto, setPerfilFoto] = useState<string | null>(null)
  const [modalFiltroVisivel, setModalFiltroVisivel] = useState(false)

  // ── Viewer de arquivo ────────────────────────────────────────────────────
  const [viewerVisivel, setViewerVisivel] = useState(false)
  const [viewerUrl, setViewerUrl] = useState('')
  const [viewerIsImage, setViewerIsImage] = useState(false)

  function abrirVisualizador(url: string, isImage: boolean) {
    setViewerUrl(url)
    setViewerIsImage(isImage)
    setViewerVisivel(true)
  }

  useFocusEffect(
    useCallback(() => {
      async function carregarDados() {
        setCarregando(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.replace('/auth'); return }

        try {
          const { data: perfil } = await supabase
            .from('perfis').select('foto_url').eq('id', user.id).single()
          if (perfil?.foto_url) {
            const url = perfil.foto_url.includes('?') ? perfil.foto_url : `${perfil.foto_url}?t=${Date.now()}`
            setPerfilFoto(url)
          } else {
            setPerfilFoto(null)
          }

          const resultado: Item[] = []
          const deveBuscar = (tipo: TipoFiltro) => filtros.length === 0 || filtros.includes(tipo)

          if (deveBuscar('medicamentos')) {
            const { data } = await supabase
              .from('medicamentos')
              .select('*, medicamento_horarios(id, horario, dia_semana, dia_mes)')
              .eq('usuario_id', user.id)
            data?.forEach(m => resultado.push({
              id: m.id, tipo: 'medicamentos',
              titulo: m.nome,
              subtitulo: [m.dosagem, m.status].filter(Boolean).join(' · '),
              icone: 'activity', dados: m,
            }))
          }

          if (deveBuscar('consultas')) {
            const { data } = await supabase
              .from('consultas')
              .select('id, especialidade, nome_medico, data, horario, local, motivo, observacoes')
              .eq('usuario_id', user.id)
            data?.forEach(c => resultado.push({
              id: c.id, tipo: 'consultas',
              titulo: c.especialidade,
              subtitulo: [c.nome_medico, formatarData(c.data)].filter(Boolean).join(' · '),
              icone: 'calendar', dados: c,
            }))
          }

          if (deveBuscar('sintomas')) {
            const { data } = await supabase
              .from('sintomas')
              .select('id, nome, intensidade, data, horario, duracao, gatilho, observacoes')
              .eq('usuario_id', user.id)
            data?.forEach(s => resultado.push({
              id: s.id, tipo: 'sintomas',
              titulo: s.nome,
              subtitulo: `Intensidade ${s.intensidade}/10`,
              icone: 'thermometer', dados: s,
            }))
          }

          if (deveBuscar('exames')) {
            const { data } = await supabase
              .from('exames')
              .select('id, nome, data_realizacao, horario, local, data_resultado, arquivo_url')
              .eq('usuario_id', user.id)
            data?.forEach(e => resultado.push({
              id: e.id, tipo: 'exames',
              titulo: e.nome,
              subtitulo: formatarData(e.data_realizacao),
              icone: 'file-text', dados: e,
            }))
          }

          setItens(resultado)
        } catch (err) {
          console.error('Erro ao carregar dados de pesquisa:', err)
        } finally {
          setCarregando(false)
        }
      }
      carregarDados()
    }, [filtros])
  )

  function toggleFiltro(valor: TipoFiltro) {
    setFiltros(prev =>
      prev.includes(valor) ? prev.filter(f => f !== valor) : [...prev, valor]
    )
  }

  const itensFiltrados = itens.filter(item =>
    item.titulo.toLowerCase().includes(busca.toLowerCase()) ||
    item.subtitulo.toLowerCase().includes(busca.toLowerCase())
  )

  function renderCard(item: Item) {
    if (item.tipo === 'medicamentos') return <CardMedicamento key={`med-${item.id}`} dados={item.dados} />
    if (item.tipo === 'consultas') return <CardConsulta key={`con-${item.id}`} dados={item.dados} />
    if (item.tipo === 'exames') return (
      <CardExame
        key={`exa-${item.id}`}
        dados={item.dados}
        onVerArquivo={abrirVisualizador}
      />
    )
    if (item.tipo === 'sintomas') return <CardSintoma key={`sin-${item.id}`} dados={item.dados} />
    return null
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Card Perfil */}
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

        {/* Header */}
        <View style={styles.headerTitleBox}>
          <Text style={styles.headerTitleText}>Pesquisar no Medly</Text>
          <Text style={styles.headerSubText}>Encontre seus registros rapidamente</Text>
        </View>

        {/* Input de pesquisa */}
        <View style={styles.inputBox}>
          <Feather name="search" size={18} color="#6B49AD" />
          <TextInput
            style={styles.input}
            value={busca}
            onChangeText={setBusca}
            placeholder="Digite o que procura..."
            placeholderTextColor="#9163CB"
            autoCorrect={false}
          />
          {busca.length > 0 && (
            <TouchableOpacity onPress={() => setBusca('')} style={styles.clearBtn}>
              <Feather name="x" size={14} color="#fff" />
            </TouchableOpacity>
          )}
        </View>

        {/* Botão de filtro compacto */}
        <TouchableOpacity
          onPress={() => setModalFiltroVisivel(true)}
          activeOpacity={0.8}
          style={styles.botaoEscolherFiltro}
        >
          <Feather name="filter" size={14} color="#fff" />
          <Text style={styles.botaoFiltroTexto}>Filtrar categoria</Text>
          {filtros.length > 0 && (
            <View style={styles.filtrosBadge}>
              <Text style={styles.filtrosBadgeTexto}>{filtros.length}</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Lista */}
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
            {itensFiltrados.map(item => renderCard(item))}
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Modal de filtros com multi-select */}
      <Modal visible={modalFiltroVisivel} transparent animationType="fade" onRequestClose={() => setModalFiltroVisivel(false)}>
        <View style={styles.modalFundo}>
          <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFillObject} experimentalBlurMethod="dimezisBlurView" />
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setModalFiltroVisivel(false)} />
          <View style={styles.modalCardFiltro}>
            <View style={styles.modalFiltroHeader}>
              <Text style={styles.modalFiltroTitulo}>Filtrar por tipo</Text>
              <TouchableOpacity onPress={() => setModalFiltroVisivel(false)} style={styles.modalFiltroFechar}>
                <Feather name="x" size={20} color="#6B49AD" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalFiltroSub}>Selecione um ou mais tipos de registro</Text>
            <View style={styles.modalFiltroLinha} />

            {/* Opção "Todos" */}
            <TouchableOpacity
              onPress={() => setFiltros([])}
              activeOpacity={0.7}
              style={[styles.opcaoFiltro, filtros.length === 0 && styles.opcaoFiltroAtiva]}
            >
              <View style={[styles.opcaoFiltroIconeBox, { backgroundColor: filtros.length === 0 ? '#6B49AD' : '#F5F0FF' }]}>
                <Feather name="grid" size={16} color={filtros.length === 0 ? '#fff' : '#6B49AD'} />
              </View>
              <Text style={[styles.opcaoFiltroLabel, filtros.length === 0 && styles.opcaoFiltroLabelAtiva]}>
                Todos os registros
              </Text>
              {filtros.length === 0 && <Feather name="check" size={18} color="#6B49AD" style={{ marginLeft: 'auto' }} />}
            </TouchableOpacity>

            {FILTROS.map((f) => {
              const ativo = filtros.includes(f.valor)
              return (
                <TouchableOpacity
                  key={f.valor}
                  onPress={() => toggleFiltro(f.valor)}
                  activeOpacity={0.7}
                  style={[styles.opcaoFiltro, ativo && styles.opcaoFiltroAtiva]}
                >
                  <View style={[styles.opcaoFiltroIconeBox, { backgroundColor: ativo ? '#6B49AD' : '#F5F0FF' }]}>
                    <Feather name={f.icone as any} size={16} color={ativo ? '#fff' : '#6B49AD'} />
                  </View>
                  <Text style={[styles.opcaoFiltroLabel, ativo && styles.opcaoFiltroLabelAtiva]}>
                    {f.label}
                  </Text>
                  <View style={[styles.checkbox, ativo && styles.checkboxAtivo]}>
                    {ativo && <Feather name="check" size={12} color="#fff" />}
                  </View>
                </TouchableOpacity>
              )
            })}

            {filtros.length > 0 && (
              <TouchableOpacity
                onPress={() => { setFiltros([]); setModalFiltroVisivel(false) }}
                style={styles.btnLimparFiltros}
              >
                <Text style={styles.btnLimparFiltrosTexto}>Limpar filtros</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={() => setModalFiltroVisivel(false)}
              activeOpacity={0.85}
              style={styles.btnAplicarFiltros}
            >
              <LinearGradient
                colors={['#6B49AD', '#481D94']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.btnAplicarGradient}
              >
                <Text style={styles.btnAplicarTexto}>
                  {filtros.length === 0 ? 'VER TODOS' : `APLICAR ${filtros.length} FILTRO${filtros.length > 1 ? 'S' : ''}`}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal visualizador de arquivo */}
      <ModalVisualizarArquivo
        visivel={viewerVisivel}
        url={viewerUrl}
        isImage={viewerIsImage}
        onFechar={() => setViewerVisivel(false)}
      />
    </SafeAreaView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F0FF' },
  scroll: { paddingHorizontal: 16, paddingTop: 12 },

  // Header
  cardPerfil: {
    backgroundColor: '#fff', marginHorizontal: 0, marginTop: 0,
    borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10,
    flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between',
    shadowColor: '#6B49AD', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 12, elevation: 5, marginBottom: 14,
  },
  fotoPerfil: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: '#E2D9F3' },
  fotoPerfilPlaceholder: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#EDE8FA',
    justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#E2D9F3',
  },
  logo: { width: 110, height: 36 },

  headerTitleBox: { marginBottom: 16, paddingHorizontal: 4 },
  headerTitleText: { fontSize: 26, fontWeight: '800', color: '#301971', marginBottom: 4 },
  headerSubText: { fontSize: 15, color: '#9163CB', fontWeight: '600' },

  // Input
  inputBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: 999,
    paddingHorizontal: 16, paddingVertical: 8,
    borderWidth: 1, borderColor: '#EDE8FA',
    marginBottom: 12,
    shadowColor: '#481D94', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 10, elevation: 5,
  },
  input: { flex: 1, fontSize: 14, color: '#301971', fontWeight: '600' },
  clearBtn: { backgroundColor: '#C4B5FD', padding: 4, borderRadius: 10 },

  // Botão filtro compacto
  botaoEscolherFiltro: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    backgroundColor: '#6B49AD', borderRadius: 999,
    paddingHorizontal: 14, paddingVertical: 8, marginBottom: 20, gap: 6,
  },
  botaoFiltroTexto: { fontSize: 13, fontWeight: '700', color: '#fff' },
  filtrosBadge: {
    backgroundColor: '#fff', borderRadius: 999,
    minWidth: 18, height: 18, paddingHorizontal: 5,
    justifyContent: 'center', alignItems: 'center',
  },
  filtrosBadgeTexto: { fontSize: 10, fontWeight: '800', color: '#6B49AD' },

  // Lista
  lista: { gap: 12 },
  vazioContainer: { alignItems: 'center', marginTop: 40, gap: 12 },
  vazioIcone: {
    width: 76, height: 76, borderRadius: 24, backgroundColor: '#EDE8FA',
    justifyContent: 'center', alignItems: 'center', marginBottom: 4,
  },
  vazioTitulo: { fontSize: 17, fontWeight: '700', color: '#301971' },
  vazioSub: { fontSize: 14, color: '#9163CB' },

  // Cards
  card: {
    backgroundColor: '#FAFAFE', borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: '#EDE8FA',
  },
  cardTopo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardIconeBox: { width: 46, height: 46, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  cardEmoji: { fontSize: 24 },
  cardTextos: { flex: 1, gap: 4 },
  cardNome: { fontSize: 16, fontWeight: '700', color: '#301971' },
  cardSubtitulo: { fontSize: 13, color: '#6B49AD', fontWeight: '600' },
  cardDivisor: { height: 1, backgroundColor: '#F0EAFF', marginVertical: 12 },
  cardInfos: { gap: 8 },
  cardDetalhes: { gap: 10 },

  infoLinha: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoLinhaLabel: { fontSize: 13, fontWeight: '700', color: '#9163CB', flexShrink: 0, marginRight: 4 },
  infoLinhaTexto: { fontSize: 13, color: '#301971', fontWeight: '600', flex: 1 },

  badgeStatus: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4,
  },
  badgeStatusTexto: { fontSize: 11, fontWeight: '700' },
  badgeProxima: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-start', backgroundColor: '#E6F1FB',
    borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4,
  },
  badgeProximaTexto: { fontSize: 11, fontWeight: '700', color: '#185FA5' },
  badgeRealizada: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-start', backgroundColor: '#EDE8FA',
    borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4,
  },
  badgeRealizadaTexto: { fontSize: 11, fontWeight: '700', color: '#6B49AD' },
  badgeIntensidade: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4,
  },
  badgeIntensidadeTexto: { fontSize: 11, fontWeight: '700' },

  verMaisBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, marginTop: 10, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: '#F0EAFF',
  },
  verMaisTexto: { fontSize: 13, fontWeight: '700', color: '#6B49AD' },

  btnArquivoCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#F0EAFF', borderRadius: 14,
    paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: '#E2D9F3',
  },
  btnArquivoCardIcone: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center',
  },
  btnArquivoCardTexto: { fontSize: 13, fontWeight: '700', color: '#481D94', flex: 1 },

  // Modal filtro
  modalFundo: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'transparent' },
  modalCardFiltro: {
    backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32,
    padding: 24, paddingBottom: 40,
    shadowColor: '#301971', shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.15, shadowRadius: 20, elevation: 10,
  },
  modalFiltroHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 4,
  },
  modalFiltroTitulo: { fontSize: 18, fontWeight: '800', color: '#301971' },
  modalFiltroSub: { fontSize: 13, color: '#9163CB', marginBottom: 16 },
  modalFiltroFechar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#F5F0FF', justifyContent: 'center', alignItems: 'center',
  },
  modalFiltroLinha: { height: 1, backgroundColor: '#F0EAFF', marginBottom: 12 },

  opcaoFiltro: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 14,
    borderRadius: 16, marginBottom: 8,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  opcaoFiltroAtiva: { borderColor: '#EDE8FA', backgroundColor: '#FDFBFF' },
  opcaoFiltroIconeBox: {
    width: 36, height: 36, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  opcaoFiltroLabel: { fontSize: 15, fontWeight: '600', color: '#6B49AD', flex: 1 },
  opcaoFiltroLabelAtiva: { fontWeight: '800', color: '#301971' },

  checkbox: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 1.5, borderColor: '#C4B5FD',
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#F5F0FF',
  },
  checkboxAtivo: { backgroundColor: '#6B49AD', borderColor: '#6B49AD' },

  btnLimparFiltros: { alignItems: 'center', paddingVertical: 10, marginTop: 4 },
  btnLimparFiltrosTexto: { fontSize: 14, color: '#9163CB', fontWeight: '600' },

  btnAplicarFiltros: {
    marginTop: 12,
    shadowColor: '#481D94', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  btnAplicarGradient: { borderRadius: 999, paddingVertical: 16, alignItems: 'center' },
  btnAplicarTexto: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 2 },

  // ── Visualizador de arquivo ───────────────────────────────────────────────
  viewerFundo: { flex: 1, backgroundColor: 'transparent' },
  viewerHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14,
  },
  viewerVoltarBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(107, 73, 173, 0.4)',
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    minWidth: 80, justifyContent: 'center',
  },
  viewerRightContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  viewerFechar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(107, 73, 173, 0.4)',
    justifyContent: 'center', alignItems: 'center',
  },
  viewerTitulo: {
    flex: 1, fontSize: 16, fontWeight: '700',
    color: '#fff', textAlign: 'center', marginHorizontal: 8,
  },
  viewerAbrirExterno: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(107, 73, 173, 0.4)',
    justifyContent: 'center', alignItems: 'center',
  },
  viewerConteudo: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  viewerImagem: { width: width, height: height * 0.75 },
  viewerPdfContainer: { alignItems: 'center', padding: 32, gap: 20 },
  viewerPdfIcone: {
    width: 120, height: 120, borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center',
  },
  viewerPdfLabel: {
    fontSize: 11, fontWeight: '800', color: '#dc2626', marginTop: 6, letterSpacing: 2,
  },
  viewerPdfTexto: {
    fontSize: 15, color: 'rgba(255,255,255,0.7)', textAlign: 'center', lineHeight: 22,
  },
  viewerPdfBotao: {
    borderRadius: 999,
    shadowColor: '#481D94', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 10, elevation: 6, marginTop: 8,
  },
  viewerPdfBotaoGradient: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 999, paddingHorizontal: 28, paddingVertical: 16,
  },
  viewerPdfBotaoTexto: { fontSize: 15, fontWeight: '800', color: '#fff', letterSpacing: 1 },
})