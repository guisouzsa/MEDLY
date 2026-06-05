import { StyleSheet, Text, View } from 'react-native'

export default function Pesquisar() { // troca o nome em cada um
  return (
    <View style={styles.tela}>
      <Text style={styles.texto}>Pesquisar</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: '#f5f0ff', justifyContent: 'center', alignItems: 'center' },
  texto: { fontSize: 24, fontWeight: '700', color: '#3f2b76' },
})