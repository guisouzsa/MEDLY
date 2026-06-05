import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import {
  Dimensions,
  Image,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'

const { width } = Dimensions.get('window')
const CARD_W = Math.min(width * 0.88, 420)

export default function BoasVindas() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.tela}>

        <View style={styles.centro}>
          <Image
            source={require('../../assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <View style={[styles.botoes, { width: CARD_W }]}>
          <TouchableOpacity
            onPress={() => router.push('/auth/login' as any)}
            activeOpacity={0.85}
            style={styles.botaoPrimarioWrapper}
          >
            <LinearGradient
              colors={['#5E44A7', '#481D94', '#301971']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.botaoPrimario}
            >
              <Text style={styles.botaoPrimarioTexto}>Já tenho uma conta</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.botaoSecundario}
            activeOpacity={0.8}
            onPress={() => router.push('/auth/cadastro' as any)}
          >
            <Text style={styles.botaoSecundarioTexto}>Não tenho uma conta</Text>
          </TouchableOpacity>
        </View>

      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  tela: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 40,
    paddingBottom: 48,
    backgroundColor: '#fff',
  },
  centro: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 240,
    height: 160,
  },
  botoes: {
    gap: 16,
  },
  botaoPrimarioWrapper: {
    shadowColor: '#301971',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  botaoPrimario: {
    borderRadius: 60,
    paddingVertical: 20,
    alignItems: 'center',
  },
  botaoPrimarioTexto: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1,
  },
  botaoSecundario: {
    borderRadius: 60,
    paddingVertical: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#6B49AD',
  },
  botaoSecundarioTexto: {
    color: '#301971',
    fontSize: 18,
    fontWeight: '700',
  },
})