import { Feather } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useState } from 'react'
import {
    Alert,
    Dimensions,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '../../src/lib/supabase'

const { width } = Dimensions.get('window')
const CARD_W = Math.min(width * 0.88, 420)

function Campo({
  label, value, onChangeText, placeholder,
  secureTextEntry = false, keyboardType = 'default' as any,
  icone, mostrarOlho = false,
}: {
  label: string, value: string, onChangeText: (t: string) => void,
  placeholder?: string, secureTextEntry?: boolean, keyboardType?: any,
  icone: any, mostrarOlho?: boolean,
}) {
  const [visivel, setVisivel] = useState(false)
  return (
    <View style={styles.campoWrapper}>
      <Text style={styles.campoLabel}>{label}</Text>
      <View style={styles.campoRow}>
        <Image source={icone} style={styles.icone} resizeMode="contain" />
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#B8A5D8"
          secureTextEntry={mostrarOlho ? !visivel : secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {mostrarOlho && (
          <TouchableOpacity onPress={() => setVisivel(v => !v)} style={styles.olho}>
            <Feather name={visivel ? 'eye' : 'eye-off'} size={18} color="#6B49AD" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

export default function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function handleLogin() {
    if (!email.trim() || !senha.trim()) {
      Alert.alert('Atenção', 'Preencha todos os campos.')
      return
    }
    setCarregando(true)

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: senha,
    })

    setCarregando(false)

    if (error) {
      Alert.alert('Erro', 'E-mail ou senha incorretos.')
      return
    }

    router.replace('/(tabs)' as any)
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.centro}>
            <Image
              source={require('../../assets/images/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.titulo}>ENTRAR</Text>
          </View>

          <View style={[styles.card, { width: CARD_W }]}>
            <Campo
              label="EMAIL" value={email} onChangeText={setEmail}
              placeholder="seu@email.com" keyboardType="email-address"
              icone={require('../../assets/images/icone-email.png')}
            />
            <Campo
              label="SENHA" value={senha} onChangeText={setSenha}
              placeholder="Sua senha" secureTextEntry mostrarOlho
              icone={require('../../assets/images/icone-senha.png')}
            />
          </View>

          <View style={styles.linkRow}>
            <Text style={styles.linkTexto}>Não tem conta? </Text>
            <TouchableOpacity onPress={() => router.push('/auth/cadastro' as any)}>
              <Text style={styles.link}>Cadastre-se</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={handleLogin} activeOpacity={0.85}
            style={[styles.botaoWrapper, { width: CARD_W }]}
            disabled={carregando}
          >
            <LinearGradient
              colors={['#5E44A7', '#481D94', '#301971']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={[styles.botao, carregando && { opacity: 0.7 }]}
            >
              <Text style={styles.botaoTexto}>
                {carregando ? 'ENTRANDO...' : 'ENTRAR'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1, backgroundColor: '#fff',
  },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1, alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20, paddingVertical: 48,
    backgroundColor: '#fff',
  },
  centro: { alignItems: 'center', marginBottom: 24 },
  logo: { width: 200, height: 120, marginBottom: 8 },
  titulo: { fontSize: 24, fontWeight: '800', color: '#301971', letterSpacing: 3 },
  card: {
    backgroundColor: '#fff', borderRadius: 24,
    paddingHorizontal: 24, paddingVertical: 28,
    shadowColor: '#6B49AD', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15, shadowRadius: 16, elevation: 8, marginBottom: 20,
  },
  campoWrapper: { marginBottom: 16 },
  campoLabel: { fontSize: 11, fontWeight: '700', color: '#301971', letterSpacing: 1.2, marginBottom: 7, marginLeft: 4 },
  campoRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#6B49AD', borderRadius: 60,
    paddingHorizontal: 18, paddingVertical: Platform.OS === 'ios' ? 14 : 10,
  },
  icone: { width: 20, height: 20, marginRight: 12 },
  input: { flex: 1, fontSize: 15, color: '#301971', paddingVertical: 0 },
  olho: { padding: 4, marginLeft: 8 },
  linkRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  linkTexto: { fontSize: 14, color: '#666' },
  link: { fontSize: 14, color: '#6B49AD', fontWeight: '700' },
  botaoWrapper: {
    shadowColor: '#301971', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 10,
  },
  botao: { borderRadius: 60, paddingVertical: 18, alignItems: 'center' },
  botaoTexto: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 2 },
})