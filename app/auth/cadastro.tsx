import { Feather } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import {
    Dimensions, Image, KeyboardAvoidingView, Platform,
    ScrollView, StyleSheet,
    Text, TextInput, TouchableOpacity, View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import ModalAlerta from '../../src/components/ModalAlerta'
import { useCadastro } from '../../src/context/CadastroContext'

const { width } = Dimensions.get('window')
const CARD_W = Math.min(width * 0.88, 420)

function Campo({
  label, value, onChangeText, placeholder, secureTextEntry = false,
  keyboardType = 'default' as any, autoCapitalize = 'none' as any,
  erro = '', icone, mostrarOlho = false,
}: {
  label: string, value: string, onChangeText: (t: string) => void,
  placeholder?: string, secureTextEntry?: boolean, keyboardType?: any,
  autoCapitalize?: any, erro?: string, icone: any, mostrarOlho?: boolean,
}) {
  const [visivel, setVisivel] = useState(false)
  return (
    <View style={styles.campoWrapper}>
      <Text style={styles.campoLabel}>{label}</Text>
      <View style={[styles.campoRow, !!erro && styles.campoRowErro]}>
        <Image source={icone} style={styles.icone} resizeMode="contain" />
        <TextInput
          style={styles.input} value={value} onChangeText={onChangeText}
          placeholder={placeholder} placeholderTextColor="#B8A5D8"
          secureTextEntry={mostrarOlho ? !visivel : secureTextEntry}
          keyboardType={keyboardType} autoCapitalize={autoCapitalize} autoCorrect={false}
        />
        {mostrarOlho && (
          <TouchableOpacity onPress={() => setVisivel(v => !v)} style={styles.olho}>
            <Feather name={visivel ? 'eye' : 'eye-off'} size={18} color="#6B49AD" />
          </TouchableOpacity>
        )}
      </View>
      {!!erro && <Text style={styles.erroTexto}>{erro}</Text>}
    </View>
  )
}

export default function Cadastro() {
  const { dados, setNome, setEmail, setSenha, setErroEmail } = useCadastro()
  const [confirmar, setConfirmar] = useState('')
  const [erros, setErros] = useState({ nome: '', email: '', senha: '', confirmar: '' })
  const [modal, setModal] = useState({ visivel: false, titulo: '', mensagem: '' })

  useEffect(() => {
    if (dados.erroEmail) {
      setErros(e => ({ ...e, email: dados.erroEmail }))
      setErroEmail('')
    }
  }, [dados.erroEmail])

  function avancar() {
    const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dados.email)
    const novosErros = { nome: '', email: '', senha: '', confirmar: '' }
    let temErro = false
    if (dados.nome.trim().length < 2) { novosErros.nome = 'Digite seu nome completo'; temErro = true }
    if (!emailValido) { novosErros.email = 'Digite um e-mail válido'; temErro = true }
    if (!dados.senha) { novosErros.senha = 'Digite uma senha'; temErro = true }
    else if (dados.senha.length < 6) { novosErros.senha = 'Mínimo 6 caracteres'; temErro = true }
    if (!confirmar) { novosErros.confirmar = 'Confirme sua senha'; temErro = true }
    else if (dados.senha !== confirmar) { novosErros.confirmar = 'As senhas não são iguais'; temErro = true }
    
    setErros(novosErros)
    if (temErro) return
    router.push('/auth/cadastro-foto' as any)
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.centro}>
            <Image source={require('../../assets/images/logo.png')} style={styles.logo} resizeMode="contain" />
            <Text style={styles.titulo}>CADASTRO</Text>
          </View>

          <View style={[styles.card, { width: CARD_W }]}>
            <Campo label="NOME" value={dados.nome}
              onChangeText={(t) => { setNome(t); setErros(e => ({ ...e, nome: '' })) }}
              placeholder="Seu nome completo" autoCapitalize="words" erro={erros.nome}
              icone={require('../../assets/images/icone-nome.png')} />
            <Campo label="EMAIL" value={dados.email}
              onChangeText={(t) => { setEmail(t); setErros(e => ({ ...e, email: '' })) }}
              placeholder="seu@email.com" keyboardType="email-address" erro={erros.email}
              icone={require('../../assets/images/icone-email.png')} />
            <Campo label="SENHA" value={dados.senha}
              onChangeText={(t) => { setSenha(t); setErros(e => ({ ...e, senha: '' })) }}
              placeholder="Mínimo 6 caracteres" secureTextEntry mostrarOlho erro={erros.senha}
              icone={require('../../assets/images/icone-senha.png')} />
            <Campo label="CONFIRME SUA SENHA" value={confirmar}
              onChangeText={(t) => { setConfirmar(t); setErros(e => ({ ...e, confirmar: '' })) }}
              placeholder="Repita sua senha" secureTextEntry mostrarOlho erro={erros.confirmar}
              icone={require('../../assets/images/icone-senha.png')} />
          </View>

          <View style={styles.linkRow}>
            <Text style={styles.linkTexto}>Já possui uma conta? </Text>
            <TouchableOpacity onPress={() => router.replace('/auth/login' as any)}>
              <Text style={styles.link}>Entre aqui</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={avancar} activeOpacity={0.85}
            style={[styles.botaoWrapper, { width: CARD_W }]}>
            <LinearGradient colors={['#5E44A7', '#481D94', '#301971']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.botao}>
              <Text style={styles.botaoTexto}>REGISTRAR</Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <ModalAlerta 
        visivel={modal.visivel} 
        titulo={modal.titulo} 
        mensagem={modal.mensagem} 
        onFechar={() => setModal(m => ({ ...m, visivel: false }))} 
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 48, backgroundColor: '#fff' },
  centro: { alignItems: 'center', marginBottom: 24 },
  logo: { width: 200, height: 120, marginBottom: 8 },
  titulo: { fontSize: 24, fontWeight: '800', color: '#301971', letterSpacing: 3 },
  card: { backgroundColor: '#fff', borderRadius: 24, paddingHorizontal: 24, paddingVertical: 28, shadowColor: '#6B49AD', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 8, marginBottom: 20 },
  campoWrapper: { marginBottom: 16 },
  campoLabel: { fontSize: 11, fontWeight: '700', color: '#301971', letterSpacing: 1.2, marginBottom: 7, marginLeft: 4 },
  campoRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#6B49AD', borderRadius: 60, paddingHorizontal: 18, paddingVertical: Platform.OS === 'ios' ? 14 : 10 },
  campoRowErro: { borderColor: '#e53e3e' },
  icone: { width: 20, height: 20, marginRight: 12 },
  input: { flex: 1, fontSize: 15, color: '#301971', paddingVertical: 0 },
  olho: { padding: 4, marginLeft: 8 },
  erroTexto: { color: '#e53e3e', fontSize: 12, marginTop: 5, marginLeft: 16 },
  linkRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  linkTexto: { fontSize: 14, color: '#666' },
  link: { fontSize: 14, color: '#6B49AD', fontWeight: '700' },
  botaoWrapper: { shadowColor: '#301971', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 10 },
  botao: { borderRadius: 60, paddingVertical: 18, alignItems: 'center' },
  botaoTexto: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 2 },
})