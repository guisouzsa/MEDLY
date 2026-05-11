import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from 'react-native'

type Props = {
  texto: string
  carregando?: boolean
  variante?: 'primario' | 'secundario'
  onPress?: () => void
  disabled?: boolean
  style?: ViewStyle
}

export default function BotaoGrande({ texto, carregando, variante = 'primario', onPress, disabled, style }: Props) {
  const isPrimario = variante === 'primario'

  return (
    <Pressable
      style={[styles.botao, isPrimario ? styles.primario : styles.secundario, style]}
      onPress={onPress}
      disabled={carregando || disabled}
    >
      {carregando ? (
        <ActivityIndicator color={isPrimario ? '#fff' : '#3f2b76'} size="small" />
      ) : (
        <Text style={[styles.texto, isPrimario ? styles.textoPrimario : styles.textoSecundario]}>
          {texto}
        </Text>
      )}
    </Pressable>
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