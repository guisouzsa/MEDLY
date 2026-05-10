import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, TouchableOpacityProps } from 'react-native'

type Props = TouchableOpacityProps & {
  texto: string
  carregando?: boolean
  variante?: 'primario' | 'secundario'
}

export default function BotaoGrande({ texto, carregando, variante = 'primario', ...rest }: Props) {
  const isPrimario = variante === 'primario'

  return (
    <TouchableOpacity
      style={[styles.botao, isPrimario ? styles.primario : styles.secundario]}
      activeOpacity={0.8}
      disabled={carregando}
      {...rest}
    >
      {carregando ? (
        <ActivityIndicator color={isPrimario ? '#fff' : '#3f2b76'} size="small" />
      ) : (
        <Text style={[styles.texto, isPrimario ? styles.textoPrimario : styles.textoSecundario]}>
          {texto}
        </Text>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  botao: {
    borderRadius: 16,
    paddingVertical: 22,
    alignItems: 'center',
    marginBottom: 16,
  },
  primario: {
    backgroundColor: '#3f2b76',
  },
  secundario: {
    backgroundColor: 'transparent',
  },
  texto: {
    fontSize: 20,
    fontWeight: '700',
  },
  textoPrimario: {
    color: '#fff',
  },
  textoSecundario: {
    color: '#6b49ad',
  },
})