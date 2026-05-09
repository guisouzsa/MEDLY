import { router } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { supabase } from '../src/lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [nome, setNome] = useState('')
  const [modo, setModo] = useState<'login' | 'cadastro'>('login')
  const [msg, setMsg] = useState('')

  async function cadastrar() {
    if (!nome.trim() || !email.trim() || senha.length < 6) {
      setMsg('Preencha todos os campos (senha mín. 6 caracteres) ❌')
      return
    }
    const { error } = await supabase
      .from('perfis')
      .insert({ nome: nome.trim(), email: email.trim(), senha })
    if (error) {
      setMsg(error.code === '23505' ? 'Email já cadastrado ❌' : error.message)
      return
    }
    router.replace('/(tabs)')
  }

  async function entrar() {
    if (!email.trim() || !senha) {
      setMsg('Preencha email e senha ❌')
      return
    }
    const { data, error } = await supabase
      .from('perfis')
      .select()
      .eq('email', email.trim())
      .eq('senha', senha)
      .single()
    if (error || !data) {
      setMsg('Email ou senha incorretos ❌')
      return
    }
    router.replace('/(tabs)')
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>
          {modo === 'login' ? '👋 Bem-vindo' : '✨ Criar conta'}
        </Text>
        <Text style={styles.subtitle}>
          {modo === 'login' ? 'Faça login para continuar' : 'Preencha os dados abaixo'}
        </Text>

        {modo === 'cadastro' && (
          <>
            <Text style={styles.label}>Nome</Text>
            <TextInput
              value={nome}
              onChangeText={setNome}
              placeholder="Seu nome"
              placeholderTextColor="#bba5d4"
              style={styles.input}
            />
          </>
        )}

        <Text style={styles.label}>Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="seu@email.com"
          placeholderTextColor="#bba5d4"
          style={styles.input}
        />

        <Text style={styles.label}>Senha</Text>
        <TextInput
          value={senha}
          onChangeText={setSenha}
          secureTextEntry
          placeholder="••••••"
          placeholderTextColor="#bba5d4"
          style={styles.input}
        />

        {msg ? <Text style={styles.msg}>{msg}</Text> : null}

        <TouchableOpacity
          style={styles.botaoPrimario}
          onPress={modo === 'login' ? entrar : cadastrar}
        >
          <Text style={styles.botaoPrimarioTexto}>
            {modo === 'login' ? 'Entrar' : 'Criar conta'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.botaoSecundario}
          onPress={() => { setModo(modo === 'login' ? 'cadastro' : 'login'); setMsg('') }}
        >
          <Text style={styles.botaoSecundarioTexto}>
            {modo === 'login' ? 'Não tenho conta' : 'Já tenho conta'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3eeff',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 28,
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#6d28d9',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#a78bca',
    marginBottom: 24,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6d28d9',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#ddd6fe',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    fontSize: 15,
    color: '#3b0764',
    backgroundColor: '#faf7ff',
  },
  botaoPrimario: {
    backgroundColor: '#7c3aed',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  botaoPrimarioTexto: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  botaoSecundario: {
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  botaoSecundarioTexto: {
    color: '#7c3aed',
    fontSize: 14,
    fontWeight: '600',
  },
  msg: {
    color: '#dc2626',
    fontSize: 13,
    marginBottom: 12,
    textAlign: 'center',
  },
})