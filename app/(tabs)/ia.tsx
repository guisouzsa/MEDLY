import { Feather } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function AgenteIa() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>MEDLY INTELLIGENCE</Text>
            <Text style={styles.title}>Agente IA</Text>
          </View>
          <View style={styles.statusPill}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Em breve</Text>
          </View>
        </View>

        <View style={styles.content}>
          <LinearGradient
            colors={['#8A62D8', '#4E278F']}
            start={{ x: 0.15, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={styles.agentOrb}
          >
            <View style={styles.orbInner}>
              <Feather name="cpu" size={44} color="#fff" />
            </View>
            <View style={[styles.orbSpark, styles.sparkTop]} />
            <View style={[styles.orbSpark, styles.sparkRight]} />
            <View style={[styles.orbSpark, styles.sparkBottom]} />
          </LinearGradient>

          <Text style={styles.heading}>Sua saúde, mais inteligente</Text>
          <Text style={styles.description}>
            Em breve, você poderá conversar com sua agente para entender melhor sua rotina de cuidados.
          </Text>

          <View style={styles.featureList}>
            <View style={styles.featureItem}>
              <View style={[styles.featureIcon, { backgroundColor: '#EDE7FB' }]}>
                <Feather name="message-circle" size={19} color="#6B49AD" />
              </View>
              <Text style={styles.featureText}>Converse sobre seus registros</Text>
            </View>
            <View style={styles.featureItem}>
              <View style={[styles.featureIcon, { backgroundColor: '#E5F5F1' }]}>
                <Feather name="activity" size={19} color="#16846E" />
              </View>
              <Text style={styles.featureText}>Acompanhe seus sinais</Text>
            </View>
          </View>
        </View>

        <View style={styles.composer}>
          <TextInput
            editable={false}
            placeholder="A agente estará disponível em breve"
            placeholderTextColor="#A7A0B8"
            style={styles.input}
          />
          <TouchableOpacity disabled style={styles.sendButton} activeOpacity={0.8}>
            <Feather name="arrow-up" size={19} color="#C7BEDB" />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F7F4FC',
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 92,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
  },
  eyebrow: {
    color: '#8A7BA7',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 5,
  },
  title: {
    color: '#24183B',
    fontSize: 28,
    fontWeight: '800',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEE9F8',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#A789D9',
    marginRight: 6,
  },
  statusText: {
    color: '#6B49AD',
    fontSize: 12,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 22,
  },
  agentOrb: {
    width: 142,
    height: 142,
    borderRadius: 71,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6B49AD',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
    marginBottom: 30,
  },
  orbInner: {
    width: 86,
    height: 86,
    borderRadius: 43,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    backgroundColor: 'rgba(255,255,255,0.13)',
  },
  orbSpark: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D9C9FF',
  },
  sparkTop: { top: 11, left: 45 },
  sparkRight: { right: 17, top: 53, width: 5, height: 5 },
  sparkBottom: { bottom: 19, left: 27, width: 5, height: 5 },
  heading: {
    color: '#24183B',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
  },
  description: {
    maxWidth: 310,
    color: '#756B87',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  featureList: {
    width: '100%',
    maxWidth: 340,
    marginTop: 28,
    gap: 10,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 11,
  },
  featureIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },
  featureText: {
    color: '#514666',
    fontSize: 13,
    fontWeight: '600',
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5DFF0',
    borderRadius: 18,
    paddingLeft: 15,
    paddingRight: 7,
    minHeight: 56,
  },
  input: {
    flex: 1,
    color: '#756B87',
    fontSize: 13,
    paddingVertical: 0,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEE9F8',
  },
})