import { Feather } from '@expo/vector-icons'
import { router } from 'expo-router'
import {
    Dimensions, Platform, SafeAreaView,
    StatusBar, StyleSheet, Text,
    TouchableOpacity, View,
} from 'react-native'

const { width } = Dimensions.get('window')

const OPCOES = [
  { label: 'Medicamento', icone: 'activity',    rota: '/cruds/medicamentos/novo' },
  { label: 'Consulta',    icone: 'calendar',    rota: '/cruds/consultas/novo' },
  { label: 'Sintoma',     icone: 'thermometer', rota: '/cruds/sintomas/novo' },
  { label: 'Exame',       icone: 'file-text',   rota: '/cruds/exames/novo' },
  { label: 'Histórico',   icone: 'clock',       rota: '/cruds/historico/novo' },
]

export default function Criar() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.titulo}>O que deseja criar hoje?</Text>
        <Text style={styles.subtitulo}>Escolha uma opção abaixo</Text>
        <View style={styles.grid}>
          {OPCOES.map((op) => (
            <TouchableOpacity
              key={op.label}
              style={styles.botao}
              onPress={() => router.push(op.rota as any)}
              activeOpacity={0.8}
            >
              <View style={styles.iconeBox}>
                <Feather name={op.icone as any} size={32} color="#fff" />
              </View>
              <Text style={styles.botaoLabel}>{op.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F5F0FF',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  titulo: {
    fontSize: 26,
    fontWeight: '800',
    color: '#301971',
    marginBottom: 6,
  },
  subtitulo: {
    fontSize: 15,
    color: '#6B49AD',
    marginBottom: 36,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'center',
  },
  botao: {
    alignItems: 'center',
    width: (width - 48 - 32) / 3,
  },
  iconeBox: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: '#6B49AD',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  botaoLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#301971',
    textAlign: 'center',
  },
})