import { Feather } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import {
    Alert,
    Animated, Dimensions, Image, KeyboardAvoidingView, Modal,
    Platform, ScrollView, StyleSheet, Text, TextInput,
    TouchableOpacity, View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '../../src/lib/supabase'

const { height } = Dimensions.get('window')


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

function Campo({
    label, value, onChangeText, placeholder,
    keyboardType = 'default' as any,
    opcional = false, obrigatorio = false,
    multiline = false, erro,
}: {
    label: string
    value: string
    onChangeText: (t: string) => void
    placeholder?: string
    keyboardType?: any
    opcional?: boolean
    obrigatorio?: boolean
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
                {obrigatorio && (
                    <View style={styles.tagObrigatorio}>
                        <Text style={styles.tagObrigatorioTexto}>obrigatório</Text>
                    </View>
                )}
            </View>
            <TextInput
                style={[styles.input, multiline && styles.inputMultiline, erro && styles.inputErro]}
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor="#C4B5FD"
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

export default function Consultas() {
    const { abrir } = useLocalSearchParams()

    const [usuarioId, setUsuarioId] = useState<string | null>(null)
    const [lista, setLista] = useState<Consulta[]>([])
    const [perfilFoto, setPerfilFoto] = useState<string | null>(null)
    const [perfilNome, setPerfilNome] = useState<string>('')

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
                setPerfilNome(perfil.nome ?? '')
                setPerfilFoto(perfil.foto_url ?? null)
            }

            await buscar(user.id)
            if (abrir === 'true') abrirModal()
        }
        init()
    }, [])

    async function buscar(uid?: string) {
        const id = uid ?? usuarioId
        if (!id) return
        const { data: rows, error } = await supabase
            .from('consultas')
            .select('id, especialidade, nome_medico, data, horario, local, motivo, observacoes')
            .eq('usuario_id', id)
            .order('data', { ascending: false })
        if (error) { console.error('Erro ao buscar:', error.message); return }
        if (rows) setLista(rows as Consulta[])
    }

    function resetForm() {
        setEspecialidade('')
        setNomeMedico('')
        setData('')
        setHorario('')
        setLocal('')
        setMotivo('')
        setObservacoes('')
        setErros({})
    }

    function abrirModal(consulta?: Consulta) {
        setEditando(consulta ?? null)
        if (consulta) {
            setEspecialidade(consulta.especialidade)
            setNomeMedico(consulta.nome_medico)
            setData(formatarDataParaTela(consulta.data))
            setHorario(consulta.horario ?? '')
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


    function validar(): boolean {
        const novosErros: Record<string, boolean> = {}
        if (!especialidade.trim()) novosErros.especialidade = true
        if (!nomeMedico.trim()) novosErros.nomeMedico = true
        if (!data || data.length < 10) novosErros.data = true
        setErros(novosErros)
        if (Object.keys(novosErros).length > 0) {
            Alert.alert('Campos obrigatórios', 'Preencha todos os campos destacados antes de continuar.')
            return false
        }
        return true
    }


    async function salvar() {
        if (!validar()) return
        if (!usuarioId) { Alert.alert('Erro', 'Usuário não autenticado.'); router.replace('/auth'); return }

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
            } else {
                const { error } = await supabase.from('consultas').insert(payload)
                if (error) throw error
            }

            fecharModal()
            await buscar()
        } catch (err: any) {
            console.error('Erro ao salvar:', err.message)
            Alert.alert('Erro ao salvar', err.message ?? 'Tente novamente.')
        } finally {
            setCarregando(false)
        }
    }

    function confirmarExcluir(id: number) { setExcluirId(id); setModalExcluir(true) }

    async function excluir() {
        if (!excluirId) return
        const { error } = await supabase.from('consultas').delete().eq('id', excluirId)
        if (error) { Alert.alert('Erro ao excluir', error.message); return }
        setModalExcluir(false)
        setExcluirId(null)
        await buscar()
    }


    return (
        <SafeAreaView style={styles.safe} edges={['top']}>
            <ScrollView showsVerticalScrollIndicator={false}>

                {/* Card 1 — Perfil + Logo */}
                <View style={styles.cardPerfil}>
                    <View style={styles.cardPerfilConteudo}>
                        {perfilFoto ? (
                            <Image source={{ uri: perfilFoto }} style={styles.fotoPerfil} />
                        ) : (
                            <View style={styles.fotoPerfilPlaceholder}>
                                <Feather name="user" size={28} color="#9163CB" />
                            </View>
                        )}
                        <View style={styles.logoArea}>
                            <Image
                                source={require('../../assets/images/logo.png')}
                                style={styles.logo}
                                resizeMode="contain"
                            />
                            {perfilNome ? (
                                <Text style={styles.perfilBoasVindas}>Olá, {perfilNome.split(' ')[0]} 👋</Text>
                            ) : null}
                        </View>
                        <TouchableOpacity onPress={() => router.back()} style={styles.voltarBtn}>
                            <Feather name="arrow-left" size={20} color="#6B49AD" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Card 2 — Título */}
                <View style={styles.cardTituloLista}>
                    <LinearGradient
                        colors={['#6B49AD', '#481D94']}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                        style={styles.cardTituloGradient}
                    >
                        <Feather name="calendar" size={22} color="#fff" />
                        <Text style={styles.cardTituloTexto}>CONSULTAS</Text>
                        <TouchableOpacity onPress={() => abrirModal()} activeOpacity={0.8} style={styles.btnNovoHeader}>
                            <Feather name="plus" size={20} color="#fff" />
                            <Text style={styles.btnNovoHeaderTexto}>Cadastrar</Text>
                        </TouchableOpacity>
                    </LinearGradient>
                </View>

                {/* Card 3 — Lista */}
                <View style={styles.cardLista}>
                    {lista.length === 0 ? (
                        <View style={styles.vazioContainer}>
                            <View style={styles.vazioIcone}>
                                <Feather name="calendar" size={36} color="#9163CB" />
                            </View>
                            <Text style={styles.vazioTitulo}>Nenhuma consulta</Text>
                            <Text style={styles.vazioSub}>Toque em "Cadastrar" para adicionar</Text>
                        </View>
                    ) : (
                        lista.map((consulta) => (
                            <View key={consulta.id} style={styles.card}>
                                <View style={styles.cardTopo}>
                                    <LinearGradient
                                        colors={['#6B49AD', '#481D94']}
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
                                        <TouchableOpacity style={styles.btnEditar} onPress={() => abrirModal(consulta)}>
                                            <Feather name="edit-2" size={17} color="#6B49AD" />
                                        </TouchableOpacity>
                                        <TouchableOpacity style={styles.btnExcluirCard} onPress={() => confirmarExcluir(consulta.id)}>
                                            <Feather name="trash-2" size={17} color="#dc2626" />
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                <View style={styles.cardInfoRow}>
                                    {consulta.data ? (
                                        <View style={styles.infoItem}>
                                            <Feather name="calendar" size={13} color="#6B49AD" />
                                            <Text style={styles.infoTexto}>
                                                {formatarDataParaTela(consulta.data)}
                                                {consulta.horario ? `  ${consulta.horario}` : ''}
                                            </Text>
                                        </View>
                                    ) : null}
                                    {consulta.local ? (
                                        <View style={styles.infoItem}>
                                            <Feather name="map-pin" size={13} color="#6B49AD" />
                                            <Text style={styles.infoTexto}>{consulta.local}</Text>
                                        </View>
                                    ) : null}
                                    {consulta.motivo ? (
                                        <View style={styles.infoItem}>
                                            <Feather name="file-text" size={13} color="#6B49AD" />
                                            <Text style={styles.infoTexto}>{consulta.motivo}</Text>
                                        </View>
                                    ) : null}
                                </View>
                            </View>
                        ))
                    )}
                    <View style={{ height: 32 }} />
                </View>

            </ScrollView>

            {/* ── Modal cadastro/edição ── */}
            <Modal visible={modalVisivel} transparent animationType="none">
                <KeyboardAvoidingView
                    style={styles.modalFundo}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                    <TouchableOpacity style={styles.modalOverlay} onPress={fecharModal} activeOpacity={1} />
                    <Animated.View style={[styles.modalCard, { transform: [{ translateY: slideAnim }] }]}>
                        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                            <View style={styles.modalHandle} />
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitulo}>
                                    {editando ? 'Editar consulta' : 'Nova consulta'}
                                </Text>
                                <TouchableOpacity onPress={fecharModal} style={styles.modalFechar}>
                                    <Feather name="x" size={22} color="#9163CB" />
                                </TouchableOpacity>
                            </View>

                            <Campo
                                label="ESPECIALIDADE"
                                value={especialidade}
                                onChangeText={(v) => { setEspecialidade(v); setErros(p => ({ ...p, especialidade: false })) }}
                                placeholder="Ex: Cardiologia"
                                obrigatorio
                                erro={erros.especialidade}
                            />

                            <Campo
                                label="NOME DO MÉDICO"
                                value={nomeMedico}
                                onChangeText={(v) => { setNomeMedico(v); setErros(p => ({ ...p, nomeMedico: false })) }}
                                placeholder="Ex: Dra. Ana Silva"
                                obrigatorio
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
                                        obrigatorio
                                        erro={erros.data}
                                    />
                                </View>
                                <View style={[styles.coluna, { flex: 2 }]}>
                                    <Campo
                                        label="HORÁRIO"
                                        value={horario}
                                        onChangeText={(t) => setHorario(mascaraHorario(t))}
                                        placeholder="HH:MM"
                                        keyboardType="numeric"
                                        opcional
                                    />
                                </View>
                            </View>

                            <Campo
                                label="LOCAL"
                                value={local}
                                onChangeText={setLocal}
                                placeholder="Ex: Clínica Central"
                                opcional
                            />

                            <Campo
                                label="MOTIVO"
                                value={motivo}
                                onChangeText={setMotivo}
                                placeholder="Ex: Consulta de rotina"
                                opcional
                                multiline
                            />

                            <Campo
                                label="OBSERVAÇÕES"
                                value={observacoes}
                                onChangeText={setObservacoes}
                                placeholder="Observações adicionais"
                                opcional
                                multiline
                            />

                            <TouchableOpacity
                                onPress={salvar}
                                disabled={carregando}
                                activeOpacity={0.85}
                                style={styles.botaoSalvarWrapper}
                            >
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

            {/* ── Modal excluir ── */}
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

        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#F5F0FF' },

    cardPerfil: {
        backgroundColor: '#fff',
        marginHorizontal: 16, marginTop: 16,
        borderRadius: 24, padding: 16,
        shadowColor: '#6B49AD',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1, shadowRadius: 12, elevation: 5,
    },
    cardPerfilConteudo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    fotoPerfil: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: '#E2D9F3' },
    fotoPerfilPlaceholder: {
        width: 56, height: 56, borderRadius: 28,
        backgroundColor: '#EDE8FA', justifyContent: 'center', alignItems: 'center',
        borderWidth: 2, borderColor: '#E2D9F3',
    },
    logoArea: { flex: 1, alignItems: 'center', gap: 4 },
    logo: { width: 100, height: 36 },
    perfilBoasVindas: { fontSize: 13, color: '#9163CB', fontWeight: '600' },
    voltarBtn: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: '#F0EAFF', justifyContent: 'center', alignItems: 'center',
    },

    cardTituloLista: {
        marginHorizontal: 16, marginTop: 14,
        borderRadius: 20, overflow: 'hidden',
        shadowColor: '#481D94',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25, shadowRadius: 10, elevation: 6,
    },
    cardTituloGradient: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 20, paddingVertical: 18, gap: 10,
    },
    cardTituloTexto: { flex: 1, fontSize: 18, fontWeight: '800', color: '#fff', letterSpacing: 1.5 },
    btnNovoHeader: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
    },
    btnNovoHeaderTexto: { color: '#fff', fontWeight: '700', fontSize: 14 },

    cardLista: {
        marginHorizontal: 16, marginTop: 14,
        backgroundColor: '#fff', borderRadius: 24, padding: 16,
        shadowColor: '#6B49AD',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08, shadowRadius: 12, elevation: 4, gap: 12,
    },

    vazioContainer: { alignItems: 'center', paddingVertical: 40, gap: 10 },
    vazioIcone: {
        width: 76, height: 76, borderRadius: 24,
        backgroundColor: '#EDE8FA', justifyContent: 'center', alignItems: 'center', marginBottom: 4,
    },
    vazioTitulo: { fontSize: 17, fontWeight: '700', color: '#301971' },
    vazioSub: { fontSize: 14, color: '#9163CB' },

    card: {
        backgroundColor: '#FAFAFE', borderRadius: 18, padding: 16,
        borderWidth: 1, borderColor: '#EDE8FA', gap: 12,
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
    cardInfoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    infoItem: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        backgroundColor: '#F0EAFF', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
    },
    infoTexto: { fontSize: 13, color: '#6B49AD', fontWeight: '600' },

    modalFundo: { flex: 1 },
    modalOverlay: { flex: 1, backgroundColor: '#00000055' },
    modalCard: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
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
    campoLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    campoLabel: { fontSize: 11, fontWeight: '700', color: '#9163CB', letterSpacing: 1.2 },

    tagOpcional: {
        backgroundColor: '#EDE8FA', borderRadius: 20,
        paddingHorizontal: 10, paddingVertical: 3,
        borderWidth: 1, borderColor: '#C4B5FD',
    },
    tagOpcionalTexto: { fontSize: 10, fontWeight: '700', color: '#7C3AED', letterSpacing: 0.5 },
    tagObrigatorio: {
        backgroundColor: '#FFF1F2', borderRadius: 20,
        paddingHorizontal: 10, paddingVertical: 3,
        borderWidth: 1, borderColor: '#FECACA',
    },
    tagObrigatorioTexto: { fontSize: 10, fontWeight: '700', color: '#dc2626', letterSpacing: 0.5 },

    input: {
        borderWidth: 1.5, borderColor: '#C4B5FD', borderRadius: 50,
        paddingHorizontal: 20,
        paddingVertical: Platform.OS === 'ios' ? 16 : 13,
        fontSize: 15, color: '#301971', backgroundColor: '#FAFAFE',
    },
    inputMultiline: {
        borderRadius: 20, minHeight: 96,
        paddingTop: 14, textAlignVertical: 'top',
    },
    inputErro: { borderColor: '#f87171', backgroundColor: '#FFF5F5' },

    erroRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6, marginLeft: 16 },
    erroTexto: { fontSize: 12, color: '#dc2626', fontWeight: '600' },

    botaoSalvarWrapper: {
        marginTop: 8,
        shadowColor: '#481D94',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
    },
    botaoSalvar: { borderRadius: 50, paddingVertical: 18, alignItems: 'center' },
    botaoSalvarTexto: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 2 },

    modalExcluirFundo: { flex: 1, backgroundColor: '#00000066', justifyContent: 'flex-end' },
    modalExcluirCard: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
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