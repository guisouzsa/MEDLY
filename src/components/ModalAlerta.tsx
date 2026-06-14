import { BlurView } from 'expo-blur'
import { LinearGradient } from 'expo-linear-gradient'
import { Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

type Props = {
  visivel: boolean
  titulo: string
  mensagem: string
  onFechar: () => void
}

export default function ModalAlerta({ visivel, titulo, mensagem, onFechar }: Props) {
  return (
    <Modal visible={visivel} transparent animationType="fade" onRequestClose={() => {}}>
      <View style={styles.fundoEscuro}>
        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFillObject} experimentalBlurMethod="dimezisBlurView" />
        <View style={styles.card}>
          <Text style={styles.titulo}>{titulo}</Text>
          <Text style={styles.mensagem}>{mensagem}</Text>
          <TouchableOpacity onPress={onFechar} activeOpacity={0.85} style={styles.botaoWrapper}>
            <LinearGradient
              colors={['#5E44A7', '#481D94', '#301971']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.botao}
            >
              <Text style={styles.botaoTexto}>OK</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  fundoEscuro: {
    flex: 1,
    backgroundColor: Platform.OS === 'android' ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  card: {
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
  titulo: {
    fontSize: 18,
    fontWeight: '800',
    color: '#301971',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  mensagem: {
    fontSize: 15,
    color: '#6B49AD',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  botaoWrapper: {
    width: '100%',
    shadowColor: '#301971',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  botao: {
    borderRadius: 60,
    paddingVertical: 14,
    alignItems: 'center',
  },
  botaoTexto: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 2,
  },
})