import { Feather } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'
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

type Sintoma = {
    id: number
    nome: string
    intensidade: number
    data: string
    horario: string | null
    duracao: string | null
    gatilho: string | null
    observacoes: string | null
}

type Filtro = 'hoje' | 'semana' | 'todos'

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

function converterData(data: string): string | null {
    if (!data || data.length < 10) return null
    const [d, m, a] = data.split('/')
    if (!d || !m || !a) return null
    return `${a}-${m}-${d}`
}

function formatarDataParaTela(data: string): string {
    if (!data) return ''
    const [a, m, d] = data.split('-')
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

function filtrarPorPeriodo(lista: Sintoma[], filtro: Filtro): Sintoma[] {
    if (filtro === 'todos') return lista
    const agora = new Date()
    const hojeStr = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(agora.getDate()).padStart(2, '0')}`
    return lista.filter((sint) => {
        if (!sint.data) return false
        const dataStr = sint.data.slice(0, 10)
        if (filtro === 'hoje') return dataStr === hojeStr
        if (filtro === 'semana') {
            const seteDias = new Date(agora)
            seteDias.setDate(agora.getDate() - 6)
            const seteDiasStr = `${seteDias.getFullYear()}-${String(seteDias.getMonth() + 1).padStart(2, '0')}-${String(seteDias.getDate()).padStart(2, '0')}`
            return dataStr >= seteDiasStr && dataStr <= hojeStr
        }
        return true
    })
}

function Campo({
    label, value, onChangeText, placeholder, keyboardType = 'default' as any,
    opcional = false, dica, erro, erroTexto,
}: {
    label: string
    value: string
    onChangeText: (t: string) => void
    placeholder?: string
    keyboardType?: any
    opcional?: boolean
    dica?: string
    erro?: boolean
    erroTexto?: string
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
                style={[styles.input, erro && styles.inputErro]}
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor="#9163CB"
                keyboardType={keyboardType}
                autoCorrect={false}
            />
            {erro && (
                <View style={styles.erroRow}>
                    <Feather name="alert-circle" size={13} color="#dc2626" />
                    <Text style={styles.erroTexto}>{erroTexto ?? 'Este campo é obrigatório'}</Text>
                </View>
            )}
            {dica && !erro && <Text style={styles.dicaTexto}>{dica}</Text>}
        </View>
    )
}

function PainScale({ value, onChange }: { value: number, onChange: (v: number) => void }) {
    const atual = PAIN_SCALE[value]
    return (
        <View style={styles.campoWrapper}>
            <View style={styles.campoLabelRow}>
                <Text style={styles.campoLabel}>INTENSIDADE DA DOR</Text>
            </View>
            <View style={[styles.painCentro, { backgroundColor: atual.roxo }]}>
                <Text style={styles.painEmoji}>{atual.emoji}</Text>
                <Text style={[styles.painValor, { color: value <= 3 ? '#481D94' : '#fff' }]}>{value}/10</Text>
                <Text style={[styles.painLabel, { color: value <= 3 ? '#6B49AD' : '#E2D9F3' }]}>{atual.label}</Text>
            </View>
            <View style={styles.painNumeros}>
                {PAIN_SCALE.map((item) => (
                    <TouchableOpacity
                        key={item.valor}
                        onPress={() => onChange(item.valor)}
                        style={[
                            styles.painNumeroBtn,
                            { backgroundColor: item.roxo },
                            value === item.valor && styles.painNumeroBtnAtivo,
                        ]}
                    >
                        <Text style={[
                            styles.painNumeroTexto,
                            { color: item.valor <= 3 ? '#481D94' : '#fff' },
                            value === item.valor && { fontWeight: '900' },
                        ]}>
                            {item.valor}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
            <Text style={styles.painDica}>Quanto mais roxo, maior a intensidade da dor.</Text>
        </View>
    )
}

export default function Sintomas() {
    const { action } = useLocalSearchParams()
    const [usuarioId, setUsuarioId] = useState<string | null>(null)
    const [lista, setLista] = useState<Sintoma[]>([])
    const [perfilFoto, setPerfilFoto] = useState<string | null>(null)
    const [filtro, setFiltro] = useState<Filtro>('hoje')

    const [modalVisivel, setModalVisivel] = useState(false)
    const [editando, setEditando] = useState<Sintoma | null>(null)
    const slideAnim = useRef(new Animated.Value(height)).current

    const [nome, setNome] = useState('')
    const [intensidade, setIntensidade] = useState(0)
    const [data, setData] = useState('')
    const [horario, setHorario] = useState('')
    const [duracao, setDuracao] = useState('')
    const [gatilho, setGatilho] = useState('')
    const [observacoes, setObservacoes] = useState('')

    const [carregando, setCarregando] = useState(false)
    const [erros, setErros] = useState<Record<string, boolean>>({})

    const [modalExcluir, setModalExcluir] = useState(false)
    const [excluirId, setExcluirId] = useState<number | null>(null)
    const [modalAlerta, setModalAlerta] = useState({ visivel: false, titulo: '', mensagem: '' })
    const [modalSucesso, setModalSucesso] = useState({ visivel: false, titulo: '', mensagem: '' })

    useFocusEffect(
        useCallback(() => {
            async function init() {
                const { data: { user }, error } = await supabase.auth.getUser()
                if (error || !user) { router.replace('/auth'); return }
                setUsuarioId(user.id)
                const { data: perfil } = await supabase
                    .from('perfis').select('foto_url').eq('id', user.id).single()
                if (perfil?.foto_url) {
                    const url = perfil.foto_url.includes('?') ? perfil.foto_url : `${perfil.foto_url}?t=${Date.now()}`
                    setPerfilFoto(url)
                } else {
                    setPerfilFoto(null)
                }
                await buscar(user.id)
            }
            init()
        }, [])
    )

    useEffect(() => {
        if (action === 'create') abrirModal()
    }, [action])

    async function buscar(uid?: string) {
        const id = uid ?? usuarioId
        if (!id) return
        const { data: result, error } = await supabase
            .from('sintomas')
            .select('*')
            .eq('usuario_id', id)
            .order('data', { ascending: false })
        if (error) { console.error('Erro ao buscar:', error.message); return }
        if (result) setLista(result as Sintoma[])
    }

    function resetForm() {
        setNome(''); setIntensidade(0); setData('')
        setHorario(''); setDuracao(''); setGatilho('')
        setObservacoes(''); setErros({})
    }

    function abrirModal(sint?: Sintoma) {
        setEditando(sint ?? null)
        if (sint) {
            setNome(sint.nome)
            setIntensidade(sint.intensidade)
            setData(sint.data ? formatarDataParaTela(sint.data) : '')
            setHorario(sint.horario ? sint.horario.slice(0, 5) : '')
            setDuracao(sint.duracao ?? '')
            setGatilho(sint.gatilho ?? '')
            setObservacoes(sint.observacoes ?? '')
            setErros({})
        } else {
            resetForm()
        }
        setModalVisivel(true)
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }).start()
    }

    function fecharModal() {
        Animated.timing(slideAnim, { toValue: height, duration: 280, useNativeDriver: true }).start(() => setModalVisivel(false))
    }

    function validar(): boolean {
        const e: Record<string, boolean> = {}
        if (!nome.trim()) e.nome = true
        if (!data || data.length < 10) e.data = true
        setErros(e)
        if (Object.keys(e).length > 0) {
            setModalAlerta({ visivel: true, titulo: 'Campos obrigatórios', mensagem: 'Preencha todos os campos destacados antes de continuar.' })
            return false
        }
        return true
    }

    async function salvar() {
        if (!validar()) return
        if (!usuarioId) { router.replace('/auth'); return }
        setCarregando(true)
        try {
            const payload = {
                usuario_id: usuarioId,
                nome: nome.trim(),
                intensidade,
                data: converterData(data),
                horario: horario.length === 5 ? horario : null,
                duracao: duracao.trim() || null,
                gatilho: gatilho.trim() || null,
                observacoes: observacoes.trim() || null,
            }
            if (editando) {
                const { error } = await supabase.from('sintomas').update(payload).eq('id', editando.id)
                if (error) throw error
                await salvarHistorico(usuarioId, `Sintoma ${nome.trim()} com intensidade ${intensidade}/10 foi alterado`)
            } else {
                const { error } = await supabase.from('sintomas').insert(payload)
                if (error) throw error
                await salvarHistorico(usuarioId, `Sintoma ${nome.trim()} com intensidade ${intensidade}/10 foi registrado`)
            }
            fecharModal()
            await buscar()
            setModalSucesso({
                visivel: true,
                titulo: editando ? 'Sintoma atualizado!' : 'Sintoma cadastrado!',
                mensagem: editando ? `${nome.trim()} foi atualizado com sucesso.` : `${nome.trim()} foi cadastrado.`,
            })
        } catch (err: any) {
            setModalAlerta({ visivel: true, titulo: 'Erro ao salvar', mensagem: err.message ?? 'Tente novamente.' })
        } finally {
            setCarregando(false)
        }
    }

    function confirmarExcluir(id: number) { setExcluirId(id); setModalExcluir(true) }

    async function excluir() {
        if (!excluirId) return
        const sint = lista.find(s => s.id === excluirId)
        const { error } = await supabase.from('sintomas').delete().eq('id', excluirId)
        if (error) {
            setModalAlerta({ visivel: true, titulo: 'Erro ao excluir', mensagem: error.message })
            return
        }
        if (sint) await salvarHistorico(usuarioId!, `Sintoma ${sint.nome} foi removido`)
        setModalExcluir(false)
        setExcluirId(null)
        await buscar()
        setModalSucesso({
            visivel: true,
            titulo: 'Sintoma excluído!',
            mensagem: `${sint?.nome ?? 'O sintoma'} foi removido com sucesso.`,
        })
    }

    // ordem: Hoje → Semana → Todos
    const filtroLabels: Record<Filtro, string> = { hoje: 'Hoje', semana: 'Semana', todos: 'Todos' }
    const filtroOrdem: Filtro[] = ['hoje', 'semana', 'todos']
    const listaFiltrada = filtrarPorPeriodo(lista, filtro)

    return (
        <SafeAreaView style={styles.safe} edges={['top']}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>

                {/* Header */}
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
                    <Text style={styles.cardTituloTexto}>SINTOMAS</Text>
                </LinearGradient>

                {/* Filtros — ordem: Hoje → Semana → Todos */}
                <View style={styles.filtrosRow}>
                    {filtroOrdem.map((f) => (
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
                                <Feather name="thermometer" size={36} color="#9163CB" />
                            </View>
                            <Text style={styles.vazioTitulo}>
                                {filtro === 'hoje' ? 'Nenhum sintoma hoje'
                                    : filtro === 'semana' ? 'Nenhum sintoma esta semana'
                                        : 'Nenhum sintoma'}
                            </Text>
                            <Text style={styles.vazioSub}>Toque em "+" para adicionar</Text>
                        </View>
                    ) : (
                        listaFiltrada.map((sint) => {
                            const pain = PAIN_SCALE[sint.intensidade]
                            return (
                                <View key={sint.id} style={styles.card}>
                                    <View style={styles.cardTopo}>
                                        <View style={[styles.cardIconeBox, { backgroundColor: pain.roxo }]}>
                                            <Text style={styles.cardEmoji}>{pain.emoji}</Text>
                                        </View>
                                        <View style={styles.cardTextos}>
                                            <Text style={styles.cardNome}>{sint.nome}</Text>
                                            <View style={[styles.tagIntensidade, { backgroundColor: pain.roxo }]}>
                                                <Text style={[
                                                    styles.tagIntensidadeTexto,
                                                    { color: sint.intensidade <= 3 ? '#481D94' : '#fff' }
                                                ]}>
                                                    {sint.intensidade}/10 — {pain.label}
                                                </Text>
                                            </View>
                                        </View>
                                        <View style={styles.cardAcoes}>
                                            <TouchableOpacity style={styles.btnEditar} onPress={() => abrirModal(sint)}>
                                                <Feather name="edit-2" size={17} color="#6B49AD" />
                                            </TouchableOpacity>
                                            <TouchableOpacity style={styles.btnExcluirCard} onPress={() => confirmarExcluir(sint.id)}>
                                                <Feather name="trash-2" size={17} color="#dc2626" />
                                            </TouchableOpacity>
                                        </View>
                                    </View>

                                    <View style={styles.cardDivisor} />

                                    <View style={styles.cardInfos}>
                                        <View style={styles.infoLinha}>
                                            <Feather name="calendar" size={15} color="#6B49AD" />
                                            <Text style={styles.infoLinhaLabel}>Data</Text>
                                            <Text style={styles.infoLinhaTexto}>{formatarDataParaTela(sint.data)}</Text>
                                        </View>
                                        {sint.horario ? (
                                            <View style={styles.infoLinha}>
                                                <Feather name="clock" size={15} color="#6B49AD" />
                                                <Text style={styles.infoLinhaLabel}>Horário</Text>
                                                <Text style={styles.infoLinhaTexto}>{sint.horario.slice(0, 5)}</Text>
                                            </View>
                                        ) : null}
                                        {sint.duracao ? (
                                            <View style={styles.infoLinha}>
                                                <Feather name="watch" size={15} color="#6B49AD" />
                                                <Text style={styles.infoLinhaLabel}>Duração</Text>
                                                <Text style={styles.infoLinhaTexto}>{sint.duracao}</Text>
                                            </View>
                                        ) : null}
                                        {sint.gatilho ? (
                                            <View style={styles.infoLinha}>
                                                <Feather name="zap" size={15} color="#6B49AD" />
                                                <Text style={styles.infoLinhaLabel}>Gatilho</Text>
                                                <Text style={styles.infoLinhaTexto}>{sint.gatilho}</Text>
                                            </View>
                                        ) : null}
                                        {sint.observacoes ? (
                                            <View style={[styles.infoLinha, { alignItems: 'flex-start' }]}>
                                                <Feather name="file-text" size={15} color="#6B49AD" style={{ marginTop: 2 }} />
                                                <Text style={styles.infoLinhaLabel}>Obs.</Text>
                                                <Text style={[styles.infoLinhaTexto, { flex: 1 }]}>{sint.observacoes}</Text>
                                            </View>
                                        ) : null}
                                    </View>
                                </View>
                            )
                        })
                    )}
                </View>
            </ScrollView>

            {/* FAB */}
            <TouchableOpacity onPress={() => abrirModal()} activeOpacity={0.85} style={styles.fab}>
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
                                <Text style={styles.modalTitulo}>{editando ? 'Editar sintoma' : 'Novo sintoma'}</Text>
                                <TouchableOpacity onPress={fecharModal} style={styles.modalFechar}>
                                    <Feather name="x" size={22} color="#9163CB" />
                                </TouchableOpacity>
                            </View>

                            <Campo label="NOME DO SINTOMA" value={nome}
                                onChangeText={(v) => { setNome(v); setErros(p => ({ ...p, nome: false })) }}
                                placeholder="Ex: Dor de cabeça" erro={erros.nome} />

                            <PainScale value={intensidade} onChange={setIntensidade} />

                            <View style={styles.duasColunas}>
                                <View style={styles.coluna}>
                                    <Campo label="DATA" value={data}
                                        onChangeText={(t) => { setData(mascaraData(t)); setErros(p => ({ ...p, data: false })) }}
                                        placeholder="DD/MM/AAAA" keyboardType="numeric" erro={erros.data} />
                                </View>
                                <View style={styles.coluna}>
                                    <Campo label="HORÁRIO" value={horario}
                                        onChangeText={(t) => setHorario(mascaraHorario(t))}
                                        placeholder="08:00" keyboardType="numeric" opcional />
                                </View>
                            </View>

                            <Campo label="DURAÇÃO" value={duracao} onChangeText={setDuracao}
                                placeholder="Ex: 2 horas" opcional />
                            <Campo label="GATILHO" value={gatilho} onChangeText={setGatilho}
                                placeholder="Ex: Estresse, alimentação" opcional
                                dica="O que pode ter causado este sintoma?" />
                            <Campo label="OBSERVAÇÕES" value={observacoes} onChangeText={setObservacoes}
                                placeholder="Informações adicionais" opcional />

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

            {/* Modal excluir — flutuando no centro, sem encostar em bordas */}
            <Modal visible={modalExcluir} transparent animationType="fade">
                <View style={styles.modalExcluirFundo}>
                    <View style={styles.modalExcluirCard}>
                        <View style={styles.modalExcluirIcone}>
                            <Feather name="trash-2" size={32} color="#dc2626" />
                        </View>
                        <Text style={styles.modalExcluirTitulo}>Excluir sintoma?</Text>
                        <Text style={styles.modalExcluirMsg}>Tem certeza? Esta ação não pode ser desfeita.</Text>
                        <TouchableOpacity onPress={excluir} activeOpacity={0.85} style={styles.btnExcluirConfirmar}>
                            <Text style={styles.btnExcluirConfirmarTexto}>SIM, EXCLUIR</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setModalExcluir(false)} style={styles.btnCancelar}>
                            <Text style={styles.btnCancelarTexto}>Cancelar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Modal alerta (erros) */}
            <ModalAlerta
                visivel={modalAlerta.visivel}
                titulo={modalAlerta.titulo}
                mensagem={modalAlerta.mensagem}
                onFechar={() => setModalAlerta(m => ({ ...m, visivel: false }))}
            />

            {/* Modal sucesso (salvar/editar) */}
            <ModalAlerta
                visivel={modalSucesso.visivel}
                titulo={modalSucesso.titulo}
                mensagem={modalSucesso.mensagem}
                onFechar={() => setModalSucesso(m => ({ ...m, visivel: false }))}
            />

        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#F5F0FF' },

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

    cardTituloLista: {
        marginHorizontal: 16, marginTop: 12, borderRadius: 50,
        paddingVertical: 14, alignItems: 'center',
        shadowColor: '#481D94', shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2, shadowRadius: 8, elevation: 5,
    },
    cardTituloTexto: { fontSize: 14, fontWeight: '800', color: '#fff', letterSpacing: 3 },

    filtrosRow: {
        flexDirection: 'row', alignItems: 'center',
        marginHorizontal: 16, marginTop: 12, gap: 8,
    },
    chip: {
        flex: 1, borderRadius: 999, overflow: 'hidden',
        borderWidth: 1.5, borderColor: '#6B49AD',
    },
    chipAtivo: {
        borderColor: 'transparent',
        shadowColor: '#481D94', shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25, shadowRadius: 6, elevation: 4,
    },
    chipGradient: { paddingVertical: 10, alignItems: 'center' },
    chipInner: { paddingVertical: 10, alignItems: 'center', backgroundColor: 'rgba(107,73,173,0.08)' },
    chipTexto: { fontSize: 12, fontWeight: '700', color: '#481D94' },
    chipTextoAtivo: { fontSize: 12, fontWeight: '700', color: '#fff' },

    fab: {
        position: 'absolute', bottom: 28, right: 24,
        borderRadius: 999,
        shadowColor: '#481D94', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35, shadowRadius: 10, elevation: 8,
    },
    fabGradient: { width: 60, height: 60, borderRadius: 999, justifyContent: 'center', alignItems: 'center' },

    cardLista: {
        marginHorizontal: 16, marginTop: 14, backgroundColor: '#fff',
        borderRadius: 24, padding: 16,
        shadowColor: '#6B49AD', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08, shadowRadius: 12, elevation: 4, gap: 12,
    },
    vazioContainer: { alignItems: 'center', paddingVertical: 40, gap: 10 },
    vazioIcone: {
        width: 76, height: 76, borderRadius: 24, backgroundColor: '#EDE8FA',
        justifyContent: 'center', alignItems: 'center', marginBottom: 4,
    },
    vazioTitulo: { fontSize: 17, fontWeight: '700', color: '#301971' },
    vazioSub: { fontSize: 14, color: '#9163CB' },

    card: {
        backgroundColor: '#FAFAFE', borderRadius: 18, padding: 16,
        borderWidth: 1, borderColor: '#EDE8FA',
    },
    cardTopo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    cardIconeBox: { width: 46, height: 46, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    cardEmoji: { fontSize: 24 },
    cardTextos: { flex: 1, gap: 4 },
    cardNome: { fontSize: 16, fontWeight: '700', color: '#301971' },
    tagIntensidade: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
    tagIntensidadeTexto: { fontSize: 12, fontWeight: '700' },
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
    infoLinha: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    infoLinhaLabel: { fontSize: 13, fontWeight: '700', color: '#9163CB', flexShrink: 0, marginRight: 4 },
    infoLinhaTexto: { fontSize: 13, color: '#301971', fontWeight: '600', flex: 1 },

    painCentro: {
        alignItems: 'center', borderRadius: 20,
        paddingVertical: 24, marginBottom: 16,
    },
    painEmoji: { fontSize: 52, marginBottom: 10 },
    painValor: { fontSize: 28, fontWeight: '800', lineHeight: 32 },
    painLabel: { fontSize: 14, fontWeight: '700', marginTop: 6 },
    painNumeros: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
    painNumeroBtn: {
        width: 44, height: 44, borderRadius: 22,
        justifyContent: 'center', alignItems: 'center',
    },
    painNumeroBtnAtivo: {
        borderWidth: 2.5, borderColor: '#481D94',
        transform: [{ scale: 1.12 }],
    },
    painNumeroTexto: { fontSize: 15, fontWeight: '700' },
    painDica: {
        fontSize: 12, color: '#9163CB', textAlign: 'center',
        marginTop: 12, fontStyle: 'italic',
    },

    modalFundo: { flex: 1 },
    modalOverlay: { flex: 1, backgroundColor: '#00000055' },
    modalCard: {
        backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
        padding: 24, maxHeight: height * 0.92,
    },
    modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E2D9F3', alignSelf: 'center', marginBottom: 20 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    modalTitulo: { fontSize: 19, fontWeight: '800', color: '#301971' },
    modalFechar: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#F0EAFF', justifyContent: 'center', alignItems: 'center' },
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
    inputErro: { borderColor: '#f87171', backgroundColor: '#FFF5F5' },
    dicaTexto: { fontSize: 12, color: '#9163CB', marginTop: 6, marginLeft: 4 },
    erroRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6, marginLeft: 4 },
    erroTexto: { fontSize: 12, color: '#dc2626', fontWeight: '600' },

    botaoSalvarWrapper: {
        marginTop: 8, shadowColor: '#481D94',
        shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
    },
    botaoSalvar: { borderRadius: 50, paddingVertical: 18, alignItems: 'center' },
    botaoSalvarTexto: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 2 },

    // Modal excluir — flutuando no centro
    modalExcluirFundo: {
        flex: 1,
        backgroundColor: '#00000066',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,   // margem lateral para não encostar nas bordas
    },
    modalExcluirCard: {
        backgroundColor: '#fff',
        borderRadius: 28,
        padding: 32,
        width: '100%',
        alignItems: 'center',
        gap: 12,
        shadowColor: '#301971',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 14,
    },
    modalExcluirIcone: {
        width: 72, height: 72, borderRadius: 24, backgroundColor: '#FFF1F2',
        justifyContent: 'center', alignItems: 'center', marginBottom: 4,
    },
    modalExcluirTitulo: { fontSize: 20, fontWeight: '800', color: '#301971' },
    modalExcluirMsg: { fontSize: 14, color: '#6B49AD', textAlign: 'center', lineHeight: 20 },
    btnExcluirConfirmar: {
        width: '100%', backgroundColor: '#dc2626',
        borderRadius: 50, paddingVertical: 16, alignItems: 'center', marginTop: 4,
    },
    btnExcluirConfirmarTexto: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 2 },
    btnCancelar: { paddingVertical: 12 },
    btnCancelarTexto: { fontSize: 15, fontWeight: '600', color: '#9163CB' },

    // Modal roxo de confirmação pós-exclusão
})