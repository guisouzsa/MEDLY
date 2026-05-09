import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

export default function ExploreScreen() {
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>

      <Text style={styles.title}>Explorar ✨</Text>
      <Text style={styles.subtitle}>Recursos do aplicativo</Text>

      <View style={styles.card}>
        <Text style={styles.cardEmoji}>📅</Text>
        <View>
          <Text style={styles.cardTitle}>Consultas</Text>
          <Text style={styles.cardText}>Gerencie consultas médicas de forma simples.</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardEmoji}>⏰</Text>
        <View>
          <Text style={styles.cardTitle}>Lembretes</Text>
          <Text style={styles.cardText}>Nunca esqueça seus medicamentos.</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardEmoji}>🩺</Text>
        <View>
          <Text style={styles.cardTitle}>Saúde</Text>
          <Text style={styles.cardText}>Acompanhe informações importantes.</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardEmoji}>👨‍👩‍👧</Text>
        <View>
          <Text style={styles.cardTitle}>Família</Text>
          <Text style={styles.cardText}>Conecte-se com seus cuidadores.</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Saiba mais</Text>
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
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#6d28d9',
    marginTop: 12,
  },
  subtitle: {
    color: '#a78bca',
    marginBottom: 24,
    fontSize: 14,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  cardEmoji: {
    fontSize: 32,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#4c1d95',
    marginBottom: 4,
  },
  cardText: {
    fontSize: 13,
    color: '#a78bca',
  },
  button: {
    marginTop: 8,
    backgroundColor: '#7c3aed',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
})