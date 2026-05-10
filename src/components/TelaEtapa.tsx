import { Feather } from '@expo/vector-icons'
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

type Props = {
  titulo: string
  subtitulo: string
  children: React.ReactNode
  onVoltar?: () => void
  etapa?: number
  totalEtapas?: number
}

export default function TelaEtapa({
  titulo,
  subtitulo,
  children,
  onVoltar,
  etapa,
  totalEtapas,
}: Props) {
  return (
    <View style={styles.tela}>
      <View style={styles.topo}>
        {onVoltar && (
          <TouchableOpacity style={styles.voltar} onPress={onVoltar} activeOpacity={0.7}>
            <Feather name="arrow-left" size={28} color="#3f2b76" />
          </TouchableOpacity>
        )}

        <Image
          source={require('../../assets/images/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        {etapa && totalEtapas && (
          <View style={styles.indicadores}>
            {Array.from({ length: totalEtapas }).map((_, i) => (
              <View
                key={i}
                style={[styles.ponto, i + 1 === etapa && styles.pontoAtivo]}
              />
            ))}
          </View>
        )}
      </View>

      <View style={styles.corpo}>
        <Text style={styles.titulo}>{titulo}</Text>
        <Text style={styles.subtitulo}>{subtitulo}</Text>
        {children}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  tela: {
    flex: 1,
    backgroundColor: '#f5f0ff',
    paddingHorizontal: 32,
    paddingTop: 60,
    paddingBottom: 40,
  },
  topo: {
    alignItems: 'center',
    marginBottom: 40,
  },
  voltar: {
    position: 'absolute',
    left: 0,
    top: 0,
    padding: 8,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 20,
  },
  indicadores: {
    flexDirection: 'row',
    gap: 10,
  },
  ponto: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#d6b9ff',
  },
  pontoAtivo: {
    backgroundColor: '#3f2b76',
    width: 28,
  },
  corpo: {
    flex: 1,
  },
  titulo: {
    fontSize: 32,
    fontWeight: '800',
    color: '#3f2b76',
    marginBottom: 10,
    lineHeight: 38,
  },
  subtitulo: {
    fontSize: 18,
    color: '#6b49ad',
    marginBottom: 40,
    lineHeight: 26,
  },
})