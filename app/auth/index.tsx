import { router } from 'expo-router'
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

export default function BoasVindas() {
  return (
    <View style={styles.tela}>
      <View style={styles.topo}>
        <Image
          source={require('../../assets/images/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      <View style={styles.botoes}>
        <TouchableOpacity
          style={styles.botaoPrimario}
          activeOpacity={0.8}
          onPress={() => router.push('/auth/login-email')}
        >
          <Text style={styles.botaoPrimarioTexto}>Já tenho uma conta</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.botaoSecundario}
          activeOpacity={0.8}
          onPress={() => router.push('/auth/cadastro-nome')}
        >
          <Text style={styles.botaoSecundarioTexto}>Não tenho uma conta</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  tela: {
    flex: 1,
    backgroundColor: '#f5f0ff',
    justifyContent: 'space-between',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  topo: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 200,
    height: 200,
  },
  botoes: {
    gap: 16,
  },
  botaoPrimario: {
    backgroundColor: '#3f2b76',
    borderRadius: 16,
    paddingVertical: 22,
    alignItems: 'center',
  },
  botaoPrimarioTexto: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  botaoSecundario: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 22,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#9163cb',
  },
  botaoSecundarioTexto: {
    color: '#3f2b76',
    fontSize: 20,
    fontWeight: '700',
  },
})