import { Link, Stack } from 'expo-router'
import { StyleSheet, Text, View } from 'react-native'

export default function NotFound() {
  return (
    <>
      <Stack.Screen options={{ title: 'Ops!' }} />
      <View style={styles.tela}>
        <Text style={styles.texto}>Página não encontrada.</Text>
        <Link href="/" style={styles.link}>
          <Text>Voltar ao início</Text>
        </Link>
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  tela: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  texto: { fontSize: 18, marginBottom: 16 },
  link: { color: '#3f2b76' },
})
