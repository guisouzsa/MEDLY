import { router } from 'expo-router'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

export default function Home() {
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSub}>Olá, bem-vindo 👋</Text>
          <Text style={styles.headerTitle}>Painel Principal</Text>
        </View>
        <TouchableOpacity style={styles.avatarBtn}>
          <Text style={styles.avatarTexto}>👤</Text>
        </TouchableOpacity>
      </View>

      {/* Card destaque */}
      <View style={styles.cardDestaque}>
        <Text style={styles.cardDestaqueEmoji}>💜</Text>
        <Text style={styles.cardDestaqueTitulo}>Tudo certo por hoje!</Text>
        <Text style={styles.cardDestaqueSubtitulo}>Nenhum alerta pendente.</Text>
      </View>

      {/* Cards rápidos */}
      <Text style={styles.secaoTitulo}>Acesso Rápido</Text>
      <View style={styles.grid}>
        <TouchableOpacity style={[styles.cardGrid, { backgroundColor: '#ede9fe' }]}>
          <Text style={styles.cardGridEmoji}>💊</Text>
          <Text style={styles.cardGridTexto}>Medicamentos</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.cardGrid, { backgroundColor: '#fce7f3' }]}>
          <Text style={styles.cardGridEmoji}>📅</Text>
          <Text style={styles.cardGridTexto}>Consultas</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.cardGrid, { backgroundColor: '#e0f2fe' }]}>
          <Text style={styles.cardGridEmoji}>📋</Text>
          <Text style={styles.cardGridTexto}>Relatórios</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.cardGrid, { backgroundColor: '#dcfce7' }]}>
          <Text style={styles.cardGridEmoji}>🩺</Text>
          <Text style={styles.cardGridTexto}>Saúde</Text>
        </TouchableOpacity>
      </View>

      {/* Atividades recentes */}
      <Text style={styles.secaoTitulo}>Atividades Recentes</Text>
      <View style={styles.cardLista}>
        {[
          { emoji: '💊', texto: 'Medicamento tomado', hora: '08:00' },
          { emoji: '🚶', texto: 'Caminhada realizada', hora: '09:30' },
          { emoji: '📞', texto: 'Ligação com familiar', hora: '11:00' },
          { emoji: '🍽️', texto: 'Refeição registrada', hora: '12:30' },
        ].map((item, i) => (
          <View key={i} style={[styles.listaItem, i !== 3 && styles.listaItemBorda]}>
            <Text style={styles.listaEmoji}>{item.emoji}</Text>
            <Text style={styles.listaTexto}>{item.texto}</Text>
            <Text style={styles.listaHora}>{item.hora}</Text>
          </View>
        ))}
      </View>

      {/* Botão sair */}
      <TouchableOpacity
        style={styles.botaoSair}
        onPress={() => router.replace('/login')}
      >
        <Text style={styles.botaoSairTexto}>Sair</Text>
      </TouchableOpacity>

    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: '#f3eeff',
  },
  container: {
    padding: 20,
    paddingBottom: 40,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 12,
  },
  headerSub: {
    fontSize: 13,
    color: '#a78bca',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#6d28d9',
  },
  avatarBtn: {
    backgroundColor: '#ede9fe',
    borderRadius: 50,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarTexto: {
    fontSize: 22,
  },

  // Card destaque
  cardDestaque: {
    backgroundColor: '#7c3aed',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 28,
  },
  cardDestaqueEmoji: {
    fontSize: 36,
    marginBottom: 8,
  },
  cardDestaqueTitulo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  cardDestaqueSubtitulo: {
    fontSize: 13,
    color: '#ddd6fe',
  },

  // Seção título
  secaoTitulo: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6d28d9',
    marginBottom: 12,
  },

  // Grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 28,
  },
  cardGrid: {
    width: '47%',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  cardGridEmoji: {
    fontSize: 30,
    marginBottom: 8,
  },
  cardGridTexto: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4c1d95',
  },

  // Lista
  cardLista: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 8,
    marginBottom: 28,
  },
  listaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  listaItemBorda: {
    borderBottomWidth: 1,
    borderBottomColor: '#f3eeff',
  },
  listaEmoji: {
    fontSize: 20,
    marginRight: 12,
  },
  listaTexto: {
    flex: 1,
    fontSize: 14,
    color: '#3b0764',
  },
  listaHora: {
    fontSize: 12,
    color: '#a78bca',
  },

  // Botão sair
  botaoSair: {
    borderWidth: 1.5,
    borderColor: '#7c3aed',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  botaoSairTexto: {
    color: '#7c3aed',
    fontWeight: 'bold',
    fontSize: 15,
  },
})