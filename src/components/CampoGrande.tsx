import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native'

type Props = TextInputProps & {
  label: string
  erro?: string
}

export default function CampoGrande({ label, erro, ...rest }: Props) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, erro ? styles.inputErro : null]}
        placeholderTextColor="#c4a8f0"
        {...rest}
      />
      {erro ? <Text style={styles.erro}>{erro}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 24,
  },
  label: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3f2b76',
    marginBottom: 10,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#d6b9ff',
    paddingHorizontal: 20,
    paddingVertical: 18,
    fontSize: 20,
    color: '#3f2b76',
  },
  inputErro: {
    borderColor: '#dc2626',
  },
  erro: {
    color: '#dc2626',
    fontSize: 15,
    marginTop: 8,
  },
})