import { Feather } from '@expo/vector-icons'
import { useEffect, useState } from 'react'
import {
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { supabase } from '../../src/lib/supabase'

type Medicamento = {
  id: number
  nome: string
  dosagem: string
  horario: string
}

export default function Medicamentos() {
  const [lista, setLista] = useState<Medicamento[]>([])
  const [modalVisivel, setModalVisivel] = useState(false)
  const [editando, setEditando] = useState<Medicamento | null>(null)
  const [nome, setNome] = useState('')
  const [dosagem, setDosagem] = useState('')
  const [horario, setHorario] = useState('')

  useEffect(() => {
    buscar()
  }, [])

  async function buscar() {
    const { data } = await supabase.from('medicamentos').select().order('id')
    if (data) setLista(data)
  }

  function abrirNovo() {
    setEditando(null)
    setNome('')
    setDosagem('')
    setHorario('')
    setModalVisivel(true)
  }

  function abrirEditar(med: Medicamento) {
    setEditando(med)
    setNome(med.nome)
    setDosagem(med.dosagem)
    setHorario(med.horario)
    setModalVisivel(true)
  }

  async function salvar() {
    if (!nome.trim()) {
      Alert.alert('Campo obrigatório', 'Informe o nome do medicamento.')
      return
    }

    if (editando) {
      const { error } = await supabase
        .from('medicamentos')
        .update({ nome, dosagem, horario })
        .eq('id', editando.id)
      if (error) {
        Alert.alert('Erro', 'Não foi possível atualizar.')
        return
      }
      Alert.alert('Atualizado ✓', `"${nome}" foi atualizado com sucesso.`)
    } else {
      const { error } = await supabase
        .from('medicamentos')
        .insert({ nome, dosagem, horario })
      if (error) {
        Alert.alert('Erro', 'Não foi possível cadastrar.')
        return
      }
      Alert.alert('Cadastrado ✓', `"${nome}" foi adicionado com sucesso.`)
    }

    setModalVisivel(false)
    buscar()
  }

  async function excluir(id: number, nomeMed: string) {
    Alert.alert(
      'Remover medicamento',
      `Deseja remover "${nomeMed}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            await supabase.from('medicamentos').delete().eq('id', id)
            buscar()
          },
        },
      ]
    )
  }

  function mascaraHorario(texto: string) {
    const numeros = texto.replace(/\D/g, '').slice(0, 4)
    if (numeros.length <= 2) return numeros
    return `${numeros.slice(0, 2)}:${numeros.slice(2)}`
  }

  function mascaraDosagem(texto: string) {
    return texto.replace(/[^0-9a-zA-Z.]/g, '').slice(0, 10)
  }

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerEsquerda}>
          {/* Logo — coloque sua imagem em assets/images/logo.png */}
          <Image
            source={require('../../assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <View>
            <Text style={styles.headerSub}>CONTROLE</Text>
            <Text style={styles.titulo}>Medicamentos</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.botaoNovo} onPress={abrirNovo}>
          <Feather name="plus" size={16} color="#fff" />
          <Text style={styles.botaoNovoTexto}>Novo</Text>
        </TouchableOpacity>
      </View>

      {/* Lista */}
      <ScrollView contentContainerStyle={styles.lista}>
        {lista.length === 0 && (
          <View style={styles.vazioContainer}>
            <Feather name="inbox" size={40} color="#c4b5fd" />
            <Text style={styles.vazio}>Nenhum medicamento cadastrado.</Text>
          </View>
        )}
        {lista.map((med) => (
          <View key={med.id} style={styles.card}>
            <View style={styles.cardTopo}>
              <View style={styles.cardIcone}>
                <Feather name="activity" size={18} color="#7c3aed" />
              </View>
              <Text style={styles.cardNome}>{med.nome}</Text>
            </View>
            <View style={styles.cardDetalhes}>
              {med.dosagem ? (
                <View style={styles.tag}>
                  <Feather name="droplet" size={11} color="#7c3aed" />
                  <Text style={styles.tagTexto}>{med.dosagem}</Text>
                </View>
              ) : null}
              {med.horario ? (
                <View style={styles.tag}>
                  <Feather name="clock" size={11} color="#7c3aed" />
                  <Text style={styles.tagTexto}>{med.horario}</Text>
                </View>
              ) : null}
            </View>
            <View style={styles.cardAcoes}>
              <TouchableOpacity
                style={styles.botaoEditar}
                onPress={() => abrirEditar(med)}
              >
                <Feather name="edit-2" size={14} color="#7c3aed" />
                <Text style={styles.botaoEditarTexto}>Editar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.botaoExcluir}
                onPress={() => excluir(med.id, med.nome)}
              >
                <Feather name="trash-2" size={14} color="#dc2626" />
                <Text style={styles.botaoExcluirTexto}>Remover</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Modal */}
      <Modal visible={modalVisivel} animationType="slide" transparent>
        <View style={styles.modalFundo}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitulo}>
                {editando ? 'Editar Medicamento' : 'Novo Medicamento'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisivel(false)}>
                <Feather name="x" size={22} color="#a78bca" />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>NOME</Text>
            <TextInput
              value={nome}
              onChangeText={setNome}
              placeholder="Ex: Paracetamol"
              placeholderTextColor="#c4b5fd"
              style={styles.input}
            />

            <Text style={styles.label}>DOSAGEM</Text>
            <TextInput
              value={dosagem}
              onChangeText={(t) => setDosagem(mascaraDosagem(t))}
              placeholder="Ex: 500mg"
              placeholderTextColor="#c4b5fd"
              style={styles.input}
            />

            <Text style={styles.label}>HORÁRIO</Text>
            <TextInput
              value={horario}
              onChangeText={(t) => setHorario(mascaraHorario(t))}
              placeholder="Ex: 08:00"
              placeholderTextColor="#c4b5fd"
              style={styles.input}
              keyboardType="numeric"
              maxLength={5}
            />

            <TouchableOpacity style={styles.botaoSalvar} onPress={salvar}>
              <Feather name="check" size={18} color="#fff" />
              <Text style={styles.botaoSalvarTexto}>
                {editando ? 'Atualizar' : 'Cadastrar'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f7ff' },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ede9fe',
  },
  headerEsquerda: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  headerSub: {
    fontSize: 10,
    color: '#a78bca',
    letterSpacing: 1.5,
    fontWeight: '600',
  },
  titulo: { fontSize: 18, fontWeight: '700', color: '#3b0764' },
  botaoNovo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7c3aed',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
  },
  botaoNovoTexto: { color: '#fff', fontWeight: '600', fontSize: 13 },

  lista: { padding: 16, gap: 10 },
  vazioContainer: { alignItems: 'center', marginTop: 60, gap: 12 },
  vazio: { color: '#a78bca', fontSize: 14 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#ede9fe',
  },
  cardTopo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  cardIcone: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#f3eeff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardNome: { fontSize: 15, fontWeight: '600', color: '#3b0764' },
  cardDetalhes: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3eeff',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 4,
  },
  tagTexto: { fontSize: 12, color: '#7c3aed' },
  cardAcoes: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3eeff',
    paddingTop: 10,
  },
  botaoEditar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#f3eeff',
    borderRadius: 7,
    paddingVertical: 8,
  },
  botaoEditarTexto: { fontSize: 13, color: '#7c3aed', fontWeight: '600' },
  botaoExcluir: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#fff1f2',
    borderRadius: 7,
    paddingVertical: 8,
  },
  botaoExcluirTexto: { fontSize: 13, color: '#dc2626', fontWeight: '600' },

  modalFundo: {
    flex: 1,
    backgroundColor: '#00000055',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitulo: { fontSize: 17, fontWeight: '700', color: '#3b0764' },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#a78bca',
    marginBottom: 6,
    letterSpacing: 1,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e9d5ff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
    fontSize: 15,
    color: '#3b0764',
    backgroundColor: '#faf7ff',
  },
  botaoSalvar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#7c3aed',
    borderRadius: 8,
    padding: 14,
    marginTop: 4,
  },
  botaoSalvarTexto: { color: '#fff', fontWeight: '700', fontSize: 15 },
})