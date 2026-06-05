import { Feather } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import {
  Dimensions, Image, Modal, Platform,
  ScrollView, StatusBar, StyleSheet, Text,
  TouchableOpacity, View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '../../src/lib/supabase'

const { width } = Dimensions.get('window')
const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const DIAS_SEMANA = ['Su','Mo','Tu','We','Th','Fr','Sa']
const DIAS_COM_EVENTOS = [9, 10, 11, 12, 13]
const PROXIMO_LEMBRETE = { tipo: 'Tomar o medicamento', descricao: 'Loratadina às 18:40' }

const ACOES_LINHA1 = [
  { label: 'Medicamentos', icone: 'activity',    rota: '/modulos/medicamentos' },
  { label: 'Consultas',    icone: 'calendar',    rota: '/modulos/consultas' },
  { label: 'Sintomas',     icone: 'thermometer', rota: '/modulos/sintomas' },
]
const ACOES_LINHA2 = [
  { label: 'Exames',    icone: 'file-text', rota: '/modulos/exames' },
  { label: 'Histórico', icone: 'clock',     rota: '/modulos/historico' },
]

function getDiasDoMes(ano: number, mes: number) {
  const primeiroDia = new Date(ano, mes, 1).getDay()
  const totalDias = new Date(ano, mes + 1, 0).getDate()
  const celulas: (number | null)[] = Array(primeiroDia).fill(null)
  for (let d = 1; d <= totalDias; d++) celulas.push(d)
  while (celulas.length % 7 !== 0) celulas.push(null)
  return celulas
}

function getHora() {
  const a = new Date()
  return `${String(a.getHours()).padStart(2,'0')}:${String(a.getMinutes()).padStart(2,'0')}`
}

function getData() {
  const a = new Date()
  return `${a.getDate()} de ${MESES[a.getMonth()]}`
}

function Calendario() {
  const hoje = new Date()
  const [mes, setMes] = useState(hoje.getMonth())
  const [ano, setAno] = useState(hoje.getFullYear())
  const dias = getDiasDoMes(ano, mes)

  function anterior() { mes === 0 ? (setMes(11), setAno(a => a-1)) : setMes(m => m-1) }
  function proximo()  { mes === 11 ? (setMes(0), setAno(a => a+1)) : setMes(m => m+1) }

  return (
    <View style={styles.calendarioCard}>
      <View style={styles.calendarioNav}>
        <TouchableOpacity onPress={anterior} style={styles.navBtn}>
          <Feather name="chevron-left" size={20} color="#6B49AD" />
        </TouchableOpacity>
        <View style={styles.seletorMesAno}>
          <View style={styles.seletorBox}>
            <Text style={styles.seletorTexto}>{MESES[mes]}</Text>
            <Feather name="chevron-down" size={14} color="#6B49AD" />
          </View>
          <View style={styles.seletorBox}>
            <Text style={styles.seletorTexto}>{ano}</Text>
            <Feather name="chevron-down" size={14} color="#6B49AD" />
          </View>
        </View>
        <TouchableOpacity onPress={proximo} style={styles.navBtn}>
          <Feather name="chevron-right" size={20} color="#6B49AD" />
        </TouchableOpacity>
      </View>
      <View style={styles.semanaRow}>
        {DIAS_SEMANA.map(d => <Text key={d} style={styles.semanaTexto}>{d}</Text>)}
      </View>
      <View style={styles.grade}>
        {dias.map((dia, i) => {
          const isHoje = dia === hoje.getDate() && mes === hoje.getMonth() && ano === hoje.getFullYear()
          const temEvento = dia !== null && DIAS_COM_EVENTOS.includes(dia)
          return (
            <View key={i} style={styles.diaCell}>
              {dia !== null ? (
                <TouchableOpacity style={[styles.diaBotao, isHoje && styles.diaHoje]}>
                  <Text style={[styles.diaTexto, isHoje && styles.diaHojeTexto]}>{dia}</Text>
                  {temEvento && !isHoje && <View style={styles.pontinho} />}
                </TouchableOpacity>
              ) : <View style={styles.diaBotao} />}
            </View>
          )
        })}
      </View>
    </View>
  )
}

function ModalSair({ visivel, onCancelar, onConfirmar }: { visivel: boolean, onCancelar: () => void, onConfirmar: () => void }) {
  return (
    <Modal visible={visivel} transparent animationType="fade">
      <View style={styles.modalFundo}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitulo}>Sair da conta</Text>
          <Text style={styles.modalMensagem}>Tem certeza que deseja sair? Você precisará fazer login novamente.</Text>
          <TouchableOpacity onPress={onConfirmar} activeOpacity={0.85} style={styles.modalBotaoWrapper}>
            <LinearGradient
              colors={['#5E44A7', '#481D94', '#301971']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.modalBotao}
            >
              <Text style={styles.modalBotaoTexto}>SIM, SAIR</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity onPress={onCancelar} style={styles.modalBotaoCancelar}>
            <Text style={styles.modalBotaoCancelarTexto}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
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
            <Feather name={acao.icone as any} size={30} color="#fff" />
          </LinearGradient>
          <Text style={styles.acaoLabel}>{acao.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  )
}

export default function Dashboard() {
  const [hora, setHora] = useState(getHora())
  const [nome, setNome] = useState('')
  const [fotoUri, setFotoUri] = useState<string | null>(null)
  const [modalSair, setModalSair] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => setHora(getHora()), 60000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    async function carregarPerfil() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: perfil } = await supabase
        .from('perfis')
        .select('foto_url, nome')
        .eq('id', user.id)
        .single()
      if (perfil?.nome) setNome(perfil.nome)
      if (perfil?.foto_url) setFotoUri(perfil.foto_url)
    }
    carregarPerfil()
  }, [])

  async function sair() {
    await supabase.auth.signOut()
    router.replace('/auth')
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* CARD 1 — header */}
        <View style={styles.card1}>
          {fotoUri ? (
            <Image source={{ uri: fotoUri }} style={styles.fotoPerfil} />
          ) : (
            <View style={styles.fotoPerfilPlaceholder}>
              <Feather name="user" size={22} color="#6B49AD" />
            </View>
          )}
          <Image
            source={require('../../assets/images/logo.png')}
            style={styles.logoHeader}
            resizeMode="contain"
          />
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
              <Text style={styles.card3Tipo}>{PROXIMO_LEMBRETE.tipo}</Text>
              <Text style={styles.card3Desc}>{PROXIMO_LEMBRETE.descricao}</Text>
            </View>
            <Image
              source={require('../../assets/images/foto-card-lembrete.png')}
              style={styles.card3Img}
              resizeMode="contain"
            />
          </LinearGradient>
        </View>

        {/* CARD 4 — ações rápidas */}
        <View style={styles.acoesCard}>
          <Text style={styles.acoesTitle}>Veja o que você já criou</Text>
          <LinhaAcoes acoes={ACOES_LINHA1} />
          <LinhaAcoes acoes={ACOES_LINHA2} />
        </View>

        {/* CARD 5 — calendário */}
        <Calendario />

        {/* botão sair */}
        <TouchableOpacity
          style={styles.botaoSair}
          onPress={() => setModalSair(true)}
          activeOpacity={0.8}
        >
          <Feather name="log-out" size={18} color="#6B49AD" />
          <Text style={styles.botaoSairTexto}>Sair da conta</Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>

      <ModalSair
        visivel={modalSair}
        onCancelar={() => setModalSair(false)}
        onConfirmar={sair}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F5F0FF',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 12 },

  card1: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 60,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    shadowColor: '#6B49AD',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  fotoPerfil: { width: 48, height: 48, borderRadius: 24 },
  fotoPerfilPlaceholder: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#EDE8FA',
    justifyContent: 'center', alignItems: 'center',
  },
  logoHeader: { width: 100, height: 36 },

  card2: {
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 28,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#301971',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 10,
  },
  card2Esquerda: { flex: 1 },
  card2Ola: { color: '#D6B9FF', fontSize: 14, fontWeight: '600', marginBottom: 6 },
  card2BemVindo: { color: '#fff', fontSize: 22, fontWeight: '700', lineHeight: 28 },
  card2Direita: { alignItems: 'flex-end' },
  card2Data: { color: '#C9A8FF', fontSize: 13, fontWeight: '600', marginBottom: 4 },
  card2Hora: { color: '#fff', fontSize: 42, fontWeight: '800', lineHeight: 46 },

  card3Fora: {
    backgroundColor: '#EDE8FA',
    borderRadius: 24,
    padding: 6,
    marginBottom: 12,
  },
  card3Inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 20,
    overflow: 'hidden',
    paddingLeft: 20,
    minHeight: 120,
  },
  card3Esquerda: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 20,
  },
  card3Label: { fontSize: 10, fontWeight: '700', color: '#6B49AD', letterSpacing: 1, marginBottom: 8 },
  card3Tipo: { fontSize: 16, fontWeight: '700', color: '#301971', marginBottom: 4 },
  card3Desc: { fontSize: 14, fontWeight: '600', color: '#301971' },
  card3Img: { width: 120, height: 120, marginRight: -2 },

  acoesCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#6B49AD',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  acoesTitle: { fontSize: 15, fontWeight: '700', color: '#301971', marginBottom: 18 },
  acoesLinha: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 16,
  },
  acaoBotao: { alignItems: 'center', width: 80 },
  acaoIconeBox: {
    width: 72, height: 72, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#481D94',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  acaoLabel: { fontSize: 12, fontWeight: '700', color: '#301971', textAlign: 'center' },

  calendarioCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 16,
    marginBottom: 12,
  },
  calendarioNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
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
  semanaTexto: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '600', color: '#9163CB' },
  grade: { flexDirection: 'row', flexWrap: 'wrap' },
  diaCell: { width: `${100 / 7}%`, alignItems: 'center', marginBottom: 4 },
  diaBotao: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  diaHoje: { borderWidth: 1.5, borderColor: '#6B49AD' },
  diaTexto: { fontSize: 14, color: '#301971', fontWeight: '500' },
  diaHojeTexto: { color: '#6B49AD', fontWeight: '700' },
  pontinho: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#6B49AD', position: 'absolute', bottom: 3 },

  botaoSair: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: '#6B49AD',
    borderRadius: 60,
    paddingVertical: 16,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  botaoSairTexto: { fontSize: 15, fontWeight: '700', color: '#6B49AD' },

  modalFundo: {
    flex: 1,
    backgroundColor: '#00000066',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 28,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#6B49AD',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 12,
  },
  modalTitulo: { fontSize: 18, fontWeight: '800', color: '#301971', marginBottom: 10, letterSpacing: 0.5 },
  modalMensagem: { fontSize: 15, color: '#6B49AD', textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  modalBotaoWrapper: {
    width: '100%',
    shadowColor: '#301971',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    marginBottom: 12,
  },
  modalBotao: { borderRadius: 60, paddingVertical: 14, alignItems: 'center' },
  modalBotaoTexto: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 2 },
  modalBotaoCancelar: { paddingVertical: 12, paddingHorizontal: 24 },
  modalBotaoCancelarTexto: { fontSize: 14, fontWeight: '600', color: '#9163CB' },
})