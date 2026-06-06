import { Feather } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import {
    Animated, Dimensions, Image, KeyboardAvoidingView, Modal,
    Platform, ScrollView, StyleSheet, Text, TextInput,
    TouchableOpacity, View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import ModalAlerta from '../../src/components/ModalAlerta'
import { salvarHistorico } from '../../src/lib/events'
import { supabase } from '../../src/lib/supabase'

const { height } = Dimensions.get('window')

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Consulta = {
    id: number
    especialidade: string
    nome_medico: string
    data: string
    horario: string | null
    local: string | null
    motivo: string | null
    observacoes: string | null
}

type Filtro = 'proximas' | 'realizadas' | 'todas'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function converterData(data: string): string | null {
    if (!data || data.length < 10) return null
    const [d, m, a] = data.split('/')
    if (!d || !m || !a) return null
    return `${a}-${m}-${d}`
}

function formatarDataParaTela(data: string): string {
    if (!data) return ''
    const match = data.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (!match) return data
    const [, a, m, d] = match
    return `${d}/${m}/${a}`
}

function mascaraData(texto: string): string {
    const n = texto.replace(/\D/g, '').slice(0, 8)
    if (n.length <= 2) return n
    if (n.length <= 4) return `${n.slice(0, 2)}/${n.slice(2)}`
    return `${n.slice(0, 2)}/${n.slice(2, 4)}/${n.slice(4)}`
}

function mascaraHorario(texto: string): string {
    const n = texto.replace(/\D/g, '').slice(0, 4)
    return n.length <= 2 ? n : `${n.slice(0, 2)}:${n.slice(2)}`
}

function formatarHorario(horario: string | null): string {
    if (!horario) return ''
    return horario.slice(0, 5)
}

/**
 * Retorna true se a consulta já passou (realizada).
 * Compara data+hora atual com data+hora da consulta.
 * Se não tiver horário, considera o fim do dia (23:59).
 */
function jaPassou(consulta: Consulta): boolean {
    const agora = new Date()
    const [ano, mes, dia] = consulta.data.split('-').map(Number)
    const horarioStr = consulta.horario ? consulta.horario.slice(0, 5) : '23:59'
    const [hora, minuto] = horarioStr.split(':').map(Number)
    const dataConsulta = new Date(ano, mes - 1, dia, hora, minuto)
    return dataConsulta < agora
}

/**
 * Converte uma consulta para Date para ordenação.
 */
function toDate(consulta: Consulta): Date {
    const [ano, mes, dia] = consulta.data.split('-').map(Number)
    const horarioStr = consulta.horario ? consulta.horario.slice(0, 5) : '00:00'
    const [hora, minuto] = horarioStr.split(':').map(Number)
    return new Date(ano, mes - 1, dia, hora, minuto)
}

// ─── Campo ────────────────────────────────────────────────────────────────────

function Campo({
    label, value, onChangeText, placeholder,
    keyboardType = 'default' as any,
    opcional = false,
    multiline = false,
    erro,
}: {
    label: string
    value: string
    onChangeText: (t: string) => void
    placeholder?: string
    keyboardType?: any
    opcional?: boolean
    multiline?: boolean
    erro?: boolean
}) {
    return (
        <View style={styles.campoWrapper}>
            <View style={styles.campoLabelRow}>
                <Text style={styles.campoLabel}>{label}</Text>
                {opcional && (
                    <View style={styles.tagOpcional}>
                        <Text style={styles.tagOpcionalTexto}>opcional</Text>
                    </View>
                )}
            </View>
            <TextInput
                style={[styles.input, multiline && styles.inputMultiline, erro && styles.inputErro]}
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor="#9163CB"
                keyboardType={keyboardType}
                autoCorrect={false}
                multiline={multiline}
                textAlignVertical={multiline ? 'top' : 'center'}
            />
            {erro && (
                <View style={styles.erroRow}>
                    <Feather name="alert-circle" size={13} color="#dc2626" />
                    <Text style={styles.erroTexto}>Este campo é obrigatório</Text>
                </View>
            )}
        </View>
    )
}

// ─── Card de consulta colapsável ──────────────────────────────────────────────

function CardConsulta({
    consulta,
    onEditar,
    onExcluir,
}: {
    consulta: Consulta
    onEditar: () => void
    onExcluir: () => void
}) {
    const [expandido, setExpandido] = useState(false)
    const isFutura = !jaPassou(consulta)

    const temDetalhes = !!(consulta.local || consulta.motivo || consulta.observacoes)

    return (
        <View style={styles.card}>
            {/* Topo sempre visível */}
            <View style={styles.cardTopo}>
                <LinearGradient
                    colors={isFutura ? ['#6B49AD', '#481D94'] : ['#9163CB', '#7C4FBD']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={styles.cardIconeBox}
                >
                    <Feather name="calendar" size={22} color="#fff" />
                </LinearGradient>
                <View style={styles.cardTextos}>
                    <Text style={styles.cardNome}>{consulta.especialidade}</Text>
                    <Text style={styles.cardSubtitulo}>{consulta.nome_medico}</Text>
                </View>
                <View style={styles.cardAcoes}>
                    <TouchableOpacity style={styles.btnEditar} onPress={onEditar}>
                        <Feather name="edit-2" size={17} color="#6B49AD" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.btnExcluirCard} onPress={onExcluir}>
                        <Feather name="trash-2" size={17} color="#dc2626" />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.cardDivisor} />

            {/* Infos sempre visíveis */}
            <View style={styles.cardInfos}>
                {/* Badge próxima/realizada */}
                <View style={isFutura ? styles.badgeProxima : styles.badgeRealizada}>
                    <Feather name={isFutura ? 'clock' : 'check-circle'} size={11} color={isFutura ? '#185FA5' : '#6B49AD'} />
                    <Text style={isFutura ? styles.badgeProximaTexto : styles.badgeRealizadaTexto}>
                        {isFutura ? 'Próxima' : 'Realizada'}
                    </Text>
                </View>

                {consulta.data ? (
                    <View style={styles.infoLinha}>
                        <Feather name="calendar" size={15} color="#6B49AD" />
                        <Text style={styles.infoLinhaLabel}>Data e Hora</Text>
                        <Text style={styles.infoLinhaTexto}>
                            {formatarDataParaTela(consulta.data)}
                            {consulta.horario ? ` às ${formatarHorario(consulta.horario)}` : ''}
                        </Text>
                    </View>
                ) : null}
            </View>

            {/* Detalhes expandidos */}
            {expandido && temDetalhes && (
                <View style={styles.cardDetalhes}>
                    <View style={styles.cardDivisor} />
                    {consulta.local ? (
                        <View style={styles.infoLinha}>
                            <Feather name="map-pin" size={15} color="#6B49AD" />
                            <Text style={styles.infoLinhaLabel}>Local</Text>
                            <Text style={styles.infoLinhaTexto}>{consulta.local}</Text>
                        </View>
                    ) : null}
                    {consulta.motivo ? (
                        <View style={[styles.infoLinha, { alignItems: 'flex-start' }]}>
                            <Feather name="file-text" size={15} color="#6B49AD" style={{ marginTop: 2 }} />
                            <Text style={styles.infoLinhaLabel}>Motivo</Text>
                            <Text style={[styles.infoLinhaTexto, { flex: 1 }]}>{consulta.motivo}</Text>
                        </View>
                    ) : null}
                    {consulta.observacoes ? (
                        <View style={[styles.infoLinha, { alignItems: 'flex-start' }]}>
                            <Feather name="message-square" size={15} color="#6B49AD" style={{ marginTop: 2 }} />
                            <Text style={styles.infoLinhaLabel}>Obs.</Text>
                            <Text style={[styles.infoLinhaTexto, { flex: 1 }]}>{consulta.observacoes}</Text>
                        </View>
                    ) : null}
                </View>
            )}

            {/* Botão ver mais / ver menos — só se tiver detalhes */}
            {temDetalhes && (
                <TouchableOpacity
                    onPress={() => setExpandido(e => !e)}
                    activeOpacity={0.7}
                    style={styles.verMaisBtn}
                >
                    <Text style={styles.verMaisTexto}>{expandido ? 'Ver menos' : 'Ver mais'}</Text>
                    <Feather name={expandido ? 'chevron-up' : 'chevron-down'} size={14} color="#6B49AD" />
                </TouchableOpacity>
            )}
        </View>
    )
}

// ─── Tela principal ───────────────────────────────────────────────────────────

export default function Consultas() {
    const { action } = useLocalSearchParams()

    const [usuarioId, setUsuarioId] = useState<string | null>(null)
    const [lista, setLista] = useState<Consulta[]>([])
    const [perfilFoto, setPerfilFoto] = useState<string | null>(null)
    const [filtro, setFiltro] = useState<Filtro>('proximas')

    const [modalVisivel, setModalVisivel] = useState(false)
    const [editando, setEditando] = useState<Consulta | null>(null)
    const slideAnim = useRef(new Animated.Value(height)).current

    const [especialidade, setEspecialidade] = useState('')
    const [nomeMedico, setNomeMedico] = useState('')
    const [data, setData] = useState('')
    const [horario, setHorario] = useState('')
    const [local, setLocal] = useState('')
    const [motivo, setMotivo] = useState('')
    const [observacoes, setObservacoes] = useState('')

    const [carregando, setCarregando] = useState(false)
    const [modalExcluir, setModalExcluir] = useState(false)
    const [excluirId, setExcluirId] = useState<number | null>(null)
    const [erros, setErros] = useState<Record<string, boolean>>({})
    const [modalAlerta, setModalAlerta] = useState({ visivel: false, titulo: '', mensagem: '' })
    const [modalSucesso, setModalSucesso] = useState({ visivel: false, titulo: '', mensagem: '' })

    // ── Init ──────────────────────────────────────────────────────────────────

    useEffect(() => {
        async function init() {
            const { data: { user }, error } = await supabase.auth.getUser()
            if (error || !user) { router.replace('/auth'); return }
            setUsuarioId(user.id)

            const { data: perfil } = await supabase
                .from('perfis')
                .select('nome, foto_url')
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
            await buscar(user.id)
        }
        init()
    }, [])

    useEffect(() => {
        if (action === 'create') abrirModal()
    }, [action])

    // ── Buscar ────────────────────────────────────────────────────────────────

    async function buscar(uid?: string) {
        const id = uid ?? usuarioId
        if (!id) return
        const { data: rows, error } = await supabase
            .from('consultas')
            .select('id, especialidade, nome_medico, data, horario, local, motivo, observacoes')
            .eq('usuario_id', id)
            .order('data', { ascending: true })
        if (error) { console.error('Erro ao buscar:', error.message); return }
        if (rows) setLista(rows as Consulta[])
    }

    // ── Filtro e ordenação ────────────────────────────────────────────────────

    const listaFiltrada = (() => {
        let filtradas = lista.filter((c) => {
            if (filtro === 'proximas') return !jaPassou(c)
            if (filtro === 'realizadas') return jaPassou(c)
            return true
        })

        if (filtro === 'proximas') {
            // Mais próxima primeiro
            filtradas = [...filtradas].sort((a, b) => toDate(a).getTime() - toDate(b).getTime())
        } else if (filtro === 'realizadas') {
            // Mais recente primeiro
            filtradas = [...filtradas].sort((a, b) => toDate(b).getTime() - toDate(a).getTime())
        } else {
            // Todas: próximas primeiro (asc), depois realizadas (desc)
            filtradas = [...filtradas].sort((a, b) => {
                const aPassou = jaPassou(a)
                const bPassou = jaPassou(b)
                if (!aPassou && !bPassou) return toDate(a).getTime() - toDate(b).getTime()
                if (aPassou && bPassou) return toDate(b).getTime() - toDate(a).getTime()
                return aPassou ? 1 : -1
            })
        }

        return filtradas
    })()

    const filtroLabels: Record<Filtro, string> = {
        proximas: 'Próximas',
        realizadas: 'Realizadas',
        todas: 'Todas',
    }

    // ── Modal ─────────────────────────────────────────────────────────────────

    function resetForm() {
        setEspecialidade(''); setNomeMedico(''); setData('')
        setHorario(''); setLocal(''); setMotivo(''); setObservacoes(''); setErros({})
    }

    function abrirModal(consulta?: Consulta) {
        setEditando(consulta ?? null)
        if (consulta) {
            setEspecialidade(consulta.especialidade)
            setNomeMedico(consulta.nome_medico)
            setData(formatarDataParaTela(consulta.data))
            setHorario(formatarHorario(consulta.horario))
            setLocal(consulta.local ?? '')
            setMotivo(consulta.motivo ?? '')
            setObservacoes(consulta.observacoes ?? '')
        } else {
            resetForm()
        }
        setErros({})
        setModalVisivel(true)
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }).start()
    }

    function fecharModal() {
        Animated.timing(slideAnim, { toValue: height, duration: 280, useNativeDriver: true })
            .start(() => setModalVisivel(false))
    }

    // ── Validação ─────────────────────────────────────────────────────────────

    function validar(): boolean {
        const novosErros: Record<string, boolean> = {}
        if (!especialidade.trim()) novosErros.especialidade = true
        if (!nomeMedico.trim()) novosErros.nomeMedico = true
        if (!data || data.length < 10) novosErros.data = true
        if (!horario || horario.length < 5) novosErros.horario = true
        setErros(novosErros)
        if (Object.keys(novosErros).length > 0) {
            setModalAlerta({ visivel: true, titulo: 'Campos obrigatórios', mensagem: 'Preencha todos os campos destacados antes de continuar.' })
            return false
        }
        return true
    }

    // ── Salvar ────────────────────────────────────────────────────────────────

    async function salvar() {
        if (!validar()) return
        if (!usuarioId) {
            setModalAlerta({ visivel: true, titulo: 'Erro', mensagem: 'Usuário não autenticado.' })
            router.replace('/auth')
            return
        }
        setCarregando(true)
        try {
            const payload = {
                usuario_id: usuarioId,
                especialidade: especialidade.trim(),
                nome_medico: nomeMedico.trim(),
                data: converterData(data),
                horario: horario.trim() || null,
                local: local.trim() || null,
                motivo: motivo.trim() || null,
                observacoes: observacoes.trim() || null,
            }
            if (editando) {
                const { error } = await supabase.from('consultas').update(payload).eq('id', editando.id)
                if (error) throw error
                await salvarHistorico(usuarioId, `Consulta de ${especialidade.trim()} com Dr(a). ${nomeMedico.trim()} foi alterada`)
            } else {
                const { error } = await supabase.from('consultas').insert(payload)
                if (error) throw error
                await salvarHistorico(usuarioId, `Consulta de ${especialidade.trim()} com Dr(a). ${nomeMedico.trim()} foi cadastrada`)
            }
            fecharModal()
            await buscar()
            setModalSucesso({
                visivel: true,
                titulo: editando ? 'Consulta atualizada!' : 'Consulta cadastrada!',
                mensagem: editando ? `${especialidade.trim()} foi atualizada com sucesso.` : `${especialidade.trim()} foi agendada.`,
            })
        } catch (err: any) {
            setModalAlerta({ visivel: true, titulo: 'Erro ao salvar', mensagem: err.message ?? 'Tente novamente.' })
        } finally {
            setCarregando(false)
        }
    }

    // ── Excluir ───────────────────────────────────────────────────────────────

    function confirmarExcluir(id: number) { setExcluirId(id); setModalExcluir(true) }

    async function excluir() {
        if (!excluirId) return
        const con = lista.find(c => c.id === excluirId)
        const { error } = await supabase.from('consultas').delete().eq('id', excluirId)
        if (error) {
            setModalAlerta({ visivel: true, titulo: 'Erro ao excluir', mensagem: error.message })
            return
        }
        if (con) {
            await salvarHistorico(usuarioId!, `Consulta de ${con.especialidade} com Dr(a). ${con.nome_medico} foi removida`)
        }
        setModalExcluir(false)
        setExcluirId(null)
        await buscar()
        setModalSucesso({
            visivel: true,
            titulo: 'Consulta excluída!',
            mensagem: `A consulta de ${con?.especialidade ?? 'especialidade'} foi removida com sucesso.`,
        })
    }

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <SafeAreaView style={styles.safe} edges={['top']}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>

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
                    <TouchableOpacity onPress={() => router.back()} style={styles.voltarBtn}>
                        <Feather name="arrow-left" size={18} color="#6B49AD" />
                    </TouchableOpacity>
                </View>

                {/* Título */}
                <LinearGradient
                    colors={['#6B49AD', '#6843B1', '#481D94']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={styles.cardTituloLista}
                >
                    <Text style={styles.cardTituloTexto}>CONSULTAS</Text>
                </LinearGradient>

                {/* Filtros */}
                <View style={styles.filtrosRow}>
                    {(['proximas', 'realizadas', 'todas'] as Filtro[]).map((f) => (
                        <TouchableOpacity
                            key={f}
                            onPress={() => setFiltro(f)}
                            activeOpacity={0.8}
                            style={[styles.chip, filtro === f && styles.chipAtivo]}
                        >
                            {filtro === f ? (
                                <LinearGradient
                                    colors={['#6B49AD', '#481D94']}
                                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                    style={styles.chipGradient}
                                >
                                    <Text style={styles.chipTextoAtivo}>{filtroLabels[f]}</Text>
                                </LinearGradient>
                            ) : (
                                <View style={styles.chipInner}>
                                    <Text style={styles.chipTexto}>{filtroLabels[f]}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Lista */}
                <View style={styles.cardLista}>
                    {listaFiltrada.length === 0 ? (
                        <View style={styles.vazioContainer}>
                            <View style={styles.vazioIcone}>
                                <Feather name="calendar" size={36} color="#9163CB" />
                            </View>
                            <Text style={styles.vazioTitulo}>
                                {filtro === 'proximas' ? 'Nenhuma consulta futura'
                                    : filtro === 'realizadas' ? 'Nenhuma consulta realizada'
                                        : 'Nenhuma consulta'}
                            </Text>
                            <Text style={styles.vazioSub}>Toque em "+" para adicionar</Text>
                        </View>
                    ) : (
                        listaFiltrada.map((consulta) => (
                            <CardConsulta
                                key={consulta.id}
                                consulta={consulta}
                                onEditar={() => abrirModal(consulta)}
                                onExcluir={() => confirmarExcluir(consulta.id)}
                            />
                        ))
                    )}
                </View>

            </ScrollView>

            {/* FAB fixo no canto inferior direito */}
            <TouchableOpacity
                onPress={() => abrirModal()}
                activeOpacity={0.85}
                style={styles.fab}
            >
                <LinearGradient
                    colors={['#6B49AD', '#481D94']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={styles.fabGradient}
                >
                    <Feather name="plus" size={26} color="#fff" />
                </LinearGradient>
            </TouchableOpacity>

            {/* Modal cadastro/edição */}
            <Modal visible={modalVisivel} transparent animationType="none">
                <KeyboardAvoidingView style={styles.modalFundo} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                    <TouchableOpacity style={styles.modalOverlay} onPress={fecharModal} activeOpacity={1} />
                    <Animated.View style={[styles.modalCard, { transform: [{ translateY: slideAnim }] }]}>
                        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                            <View style={styles.modalHandle} />
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitulo}>{editando ? 'Editar consulta' : 'Nova consulta'}</Text>
                                <TouchableOpacity onPress={fecharModal} style={styles.modalFechar}>
                                    <Feather name="x" size={22} color="#9163CB" />
                                </TouchableOpacity>
                            </View>

                            <Campo
                                label="ESPECIALIDADE"
                                value={especialidade}
                                onChangeText={(v) => { setEspecialidade(v); setErros(p => ({ ...p, especialidade: false })) }}
                                placeholder="Ex: Cardiologia"
                                erro={erros.especialidade}
                            />
                            <Campo
                                label="NOME DO MÉDICO"
                                value={nomeMedico}
                                onChangeText={(v) => { setNomeMedico(v); setErros(p => ({ ...p, nomeMedico: false })) }}
                                placeholder="Ex: Dra. Ana Silva"
                                erro={erros.nomeMedico}
                            />
                            <View style={styles.duasColunas}>
                                <View style={[styles.coluna, { flex: 3 }]}>
                                    <Campo
                                        label="DATA"
                                        value={data}
                                        onChangeText={(t) => { setData(mascaraData(t)); setErros(p => ({ ...p, data: false })) }}
                                        placeholder="DD/MM/AAAA"
                                        keyboardType="numeric"
                                        erro={erros.data}
                                    />
                                </View>
                                <View style={[styles.coluna, { flex: 2 }]}>
                                    <Campo
                                        label="HORÁRIO"
                                        value={horario}
                                        onChangeText={(t) => { setHorario(mascaraHorario(t)); setErros(p => ({ ...p, horario: false })) }}
                                        placeholder="HH:MM"
                                        keyboardType="numeric"
                                        erro={erros.horario}
                                    />
                                </View>
                            </View>
                            <Campo label="LOCAL" value={local} onChangeText={setLocal} placeholder="Ex: Clínica Central" opcional />
                            <Campo label="MOTIVO" value={motivo} onChangeText={setMotivo} placeholder="Ex: Consulta de rotina" multiline opcional />
                            <Campo label="OBSERVAÇÕES" value={observacoes} onChangeText={setObservacoes} placeholder="Observações adicionais" multiline opcional />

                            <TouchableOpacity onPress={salvar} disabled={carregando} activeOpacity={0.85} style={styles.botaoSalvarWrapper}>
                                <LinearGradient
                                    colors={['#6B49AD', '#481D94']}
                                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                    style={[styles.botaoSalvar, carregando && { opacity: 0.6 }]}
                                >
                                    <Text style={styles.botaoSalvarTexto}>
                                        {carregando ? 'SALVANDO...' : editando ? 'ATUALIZAR' : 'CADASTRAR'}
                                    </Text>
                                </LinearGradient>
                            </TouchableOpacity>
                            <View style={{ height: 40 }} />
                        </ScrollView>
                    </Animated.View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Modal excluir */}
            <Modal visible={modalExcluir} transparent animationType="fade">
                <View style={styles.modalExcluirFundo}>
                    <View style={styles.modalExcluirCard}>
                        <View style={styles.modalExcluirIcone}>
                            <Feather name="trash-2" size={32} color="#dc2626" />
                        </View>
                        <Text style={styles.modalExcluirTitulo}>Excluir consulta?</Text>
                        <Text style={styles.modalExcluirMsg}>Esta ação não pode ser desfeita.</Text>
                        <TouchableOpacity onPress={excluir} activeOpacity={0.85} style={styles.btnExcluirConfirmar}>
                            <Text style={styles.btnExcluirConfirmarTexto}>SIM, EXCLUIR</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setModalExcluir(false)} style={styles.btnCancelar}>
                            <Text style={styles.btnCancelarTexto}>Cancelar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Modal de alerta (erro/validação) */}
            <ModalAlerta
                visivel={modalAlerta.visivel}
                titulo={modalAlerta.titulo}
                mensagem={modalAlerta.mensagem}
                onFechar={() => setModalAlerta({ visivel: false, titulo: '', mensagem: '' })}
            />

            {/* Modal de sucesso */}
            <ModalAlerta
                visivel={modalSucesso.visivel}
                titulo={modalSucesso.titulo}
                mensagem={modalSucesso.mensagem}
                onFechar={() => setModalSucesso({ visivel: false, titulo: '', mensagem: '' })}
            />

        </SafeAreaView>
    )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#F5F0FF' },

    // ── Header ───────────────────────────────────────────────────────────────
    cardPerfil: {
        backgroundColor: '#fff', marginHorizontal: 16, marginTop: 16,
        borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        shadowColor: '#6B49AD', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1, shadowRadius: 12, elevation: 5,
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

    // ── Título ───────────────────────────────────────────────────────────────
    cardTituloLista: {
        marginHorizontal: 16, marginTop: 12, borderRadius: 50,
        paddingVertical: 14, alignItems: 'center',
        shadowColor: '#481D94', shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2, shadowRadius: 8, elevation: 5,
    },
    cardTituloTexto: { fontSize: 14, fontWeight: '800', color: '#fff', letterSpacing: 3 },

    // ── Filtros ───────────────────────────────────────────────────────────────
    filtrosRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 16,
        marginTop: 12,
        gap: 8,
    },
    chip: {
        flex: 1,
        borderRadius: 999,
        overflow: 'hidden',
        borderWidth: 1.5,
        borderColor: '#6B49AD',
    },
    chipAtivo: {
        borderColor: 'transparent',
        shadowColor: '#481D94',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
        elevation: 4,
    },
    chipGradient: { paddingVertical: 10, alignItems: 'center' },
    chipInner: { paddingVertical: 10, alignItems: 'center', backgroundColor: 'rgba(107,73,173,0.08)' },
    chipTexto: { fontSize: 12, fontWeight: '700', color: '#481D94' },
    chipTextoAtivo: { fontSize: 12, fontWeight: '700', color: '#fff' },

    // ── FAB ───────────────────────────────────────────────────────────────────
    fab: {
        position: 'absolute',
        bottom: 28,
        right: 24,
        borderRadius: 999,
        shadowColor: '#481D94',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
        elevation: 8,
    },
    fabGradient: {
        width: 60,
        height: 60,
        borderRadius: 999,
        justifyContent: 'center',
        alignItems: 'center',
    },

    // ── Lista ─────────────────────────────────────────────────────────────────
    cardLista: {
        marginHorizontal: 16,
        marginTop: 14,
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 16,
        shadowColor: '#6B49AD',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
        gap: 12,
    },
    vazioContainer: { alignItems: 'center', paddingVertical: 40, gap: 10 },
    vazioIcone: {
        width: 76, height: 76, borderRadius: 24, backgroundColor: '#EDE8FA',
        justifyContent: 'center', alignItems: 'center', marginBottom: 4,
    },
    vazioTitulo: { fontSize: 17, fontWeight: '700', color: '#301971' },
    vazioSub: { fontSize: 14, color: '#9163CB' },

    // ── Card colapsável ───────────────────────────────────────────────────────
    card: {
        backgroundColor: '#FAFAFE', borderRadius: 18, padding: 16,
        borderWidth: 1, borderColor: '#EDE8FA',
    },
    cardTopo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    cardIconeBox: { width: 46, height: 46, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    cardTextos: { flex: 1, gap: 4 },
    cardNome: { fontSize: 16, fontWeight: '700', color: '#301971' },
    cardSubtitulo: { fontSize: 13, color: '#6B49AD', fontWeight: '600' },
    cardAcoes: { flexDirection: 'row', gap: 8 },
    btnEditar: {
        width: 38, height: 38, borderRadius: 12,
        backgroundColor: '#F0EAFF', justifyContent: 'center', alignItems: 'center',
    },
    btnExcluirCard: {
        width: 38, height: 38, borderRadius: 12,
        backgroundColor: '#FFF1F2', justifyContent: 'center', alignItems: 'center',
    },
    cardDivisor: { height: 1, backgroundColor: '#F0EAFF', marginVertical: 12 },
    cardInfos: { gap: 8 },
    cardDetalhes: { gap: 8 },

    infoLinha: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    infoLinhaLabel: { fontSize: 13, fontWeight: '700', color: '#9163CB', flexShrink: 0, marginRight: 4 },
    infoLinhaTexto: { fontSize: 13, color: '#301971', fontWeight: '600', flex: 1 },

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

    verMaisBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 4, marginTop: 10, paddingTop: 10,
        borderTopWidth: 1, borderTopColor: '#F0EAFF',
    },
    verMaisTexto: { fontSize: 13, fontWeight: '700', color: '#6B49AD' },

    // ── Modal form ───────────────────────────────────────────────────────────
    modalFundo: { flex: 1 },
    modalOverlay: { flex: 1, backgroundColor: '#00000055' },
    modalCard: {
        backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
        padding: 24, maxHeight: height * 0.92,
    },
    modalHandle: {
        width: 40, height: 4, borderRadius: 2, backgroundColor: '#E2D9F3',
        alignSelf: 'center', marginBottom: 20,
    },
    modalHeader: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: 24,
    },
    modalTitulo: { fontSize: 19, fontWeight: '800', color: '#301971' },
    modalFechar: {
        width: 40, height: 40, borderRadius: 12,
        backgroundColor: '#F0EAFF', justifyContent: 'center', alignItems: 'center',
    },
    duasColunas: { flexDirection: 'row', gap: 12 },
    coluna: { flex: 1 },

    campoWrapper: { marginBottom: 18 },
    campoLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
    campoLabel: { fontSize: 11, fontWeight: '700', color: '#9163CB', letterSpacing: 1.2 },

    tagOpcional: {
        backgroundColor: '#EDE8FA', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3,
        borderWidth: 1, borderColor: '#C4B5FD',
    },
    tagOpcionalTexto: { fontSize: 10, fontWeight: '700', color: '#481D94', letterSpacing: 0.5 },
    input: {
        borderWidth: 1.5, borderColor: '#481D94', borderRadius: 50,
        paddingHorizontal: 20, paddingVertical: Platform.OS === 'ios' ? 16 : 13,
        fontSize: 15, color: '#301971', backgroundColor: '#FAFAFE',
    },
    inputMultiline: { borderRadius: 20, minHeight: 96, paddingTop: 14, textAlignVertical: 'top' },
    inputErro: { borderColor: '#f87171', backgroundColor: '#FFF5F5' },
    erroRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6, marginLeft: 16 },
    erroTexto: { fontSize: 12, color: '#dc2626', fontWeight: '600' },

    botaoSalvarWrapper: {
        marginTop: 8, shadowColor: '#481D94', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
    },
    botaoSalvar: { borderRadius: 50, paddingVertical: 18, alignItems: 'center' },
    botaoSalvarTexto: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 2 },

    // ── Modal excluir ────────────────────────────────────────────────────────
    modalExcluirFundo: { flex: 1, backgroundColor: '#00000066', justifyContent: 'flex-end' },
    modalExcluirCard: {
        backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
        padding: 32, alignItems: 'center', gap: 12,
    },
    modalExcluirIcone: {
        width: 72, height: 72, borderRadius: 24, backgroundColor: '#FFF1F2',
        justifyContent: 'center', alignItems: 'center', marginBottom: 8,
    },
    modalExcluirTitulo: { fontSize: 20, fontWeight: '800', color: '#301971' },
    modalExcluirMsg: { fontSize: 15, color: '#6B49AD', marginBottom: 8 },
    btnExcluirConfirmar: {
        width: '100%', backgroundColor: '#dc2626',
        borderRadius: 50, paddingVertical: 18, alignItems: 'center',
    },
    btnExcluirConfirmarTexto: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 2 },
    btnCancelar: { paddingVertical: 14 },
    btnCancelarTexto: { fontSize: 15, fontWeight: '600', color: '#9163CB' },
})