import { Feather } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { router, useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import {
    Dimensions, Image, Platform,
    StatusBar, StyleSheet, Text,
    TouchableOpacity, View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '../../src/lib/supabase'

const { width } = Dimensions.get('window')

const OPCOES = [
  { label: 'Medicamento', descricao: 'Agendar e controlar', icone: 'activity', rota: '/modulos/medicamentos?action=create&hideList=true', colors: ['#6B49AD', '#481D94'], iconColor: '#fff', shadow: '#481D94' },
  { label: 'Consulta',    descricao: 'Acompanhamento',      icone: 'calendar', rota: '/modulos/consultas?action=create&hideList=true',    colors: ['#2563EB', '#1D4ED8'], iconColor: '#fff', shadow: '#1D4ED8' },
  { label: 'Sintoma',     descricao: 'Registrar histórico', icone: 'thermometer', rota: '/modulos/sintomas?action=create&hideList=true',  colors: ['#E11D48', '#BE123C'], iconColor: '#fff', shadow: '#BE123C' },
  { label: 'Exame',       descricao: 'Marcar e resultados', icone: 'file-text', rota: '/modulos/exames?action=create&hideList=true',      colors: ['#059669', '#047857'], iconColor: '#fff', shadow: '#047857' },
]

export default function Criar() {
  const [perfilFoto, setPerfilFoto] = useState<string | null>(null)

  useFocusEffect(
    useCallback(() => {
      async function carregarPerfil() {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.replace('/auth')
          return
        }

        try {
          const { data: perfil } = await supabase
            .from('perfis')
            .select('foto_url')
            .eq('id', user.id)
            .single()
          if (perfil) {
            if (perfil.foto_url) {
              const url = perfil.foto_url.includes('?') ? perfil.foto_url : `${perfil.foto_url}?t=${Date.now()}`
              setPerfilFoto(url)
            } else {
              setPerfilFoto(null)
            }
          }
        } catch (err) {
          console.log('Erro ao carregar perfil em criar:', err)
        }
      }
      carregarPerfil()
    }, [])
  )

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        {/* Card 1 — Perfil + Logo */}
        <View style={styles.cardPerfil}>
          <TouchableOpacity onPress={() => router.push('/modulos/perfil' as any)} activeOpacity={0.85}>
            {perfilFoto ? (
              <Image source={{ uri: perfilFoto }} style={styles.fotoPerfil} onError={() => setPerfilFoto(null)} />
            ) : (
              <View style={styles.fotoPerfilPlaceholder}>
                <Feather name="user" size={24} color="#9163CB" />
              </View>
            )}
          </TouchableOpacity>
          <Image source={require('../../assets/images/logo.png')} style={styles.logo} resizeMode="contain" />
          <View style={{ width: 44 }} />
        </View>

        {/* Pergunta */}
        <View style={styles.tituloSecao}>
          <Text style={styles.titulo}>O que deseja criar hoje?</Text>
          <Text style={styles.subtitulo}>Selecione um registro para adicionar</Text>
        </View>

        {/* Grid de opções maiores (divisão da tela) */}
        <View style={styles.grid}>
          {OPCOES.map((op) => (
            <TouchableOpacity
              key={op.label}
              style={styles.botaoWrapper}
              onPress={() => router.push(op.rota as any)}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={op.colors as [string, string]}
                style={styles.botaoFundo}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.botaoIconeWrapper}>
                  <Feather name={op.icone as any} size={32} color={op.iconColor} />
                </View>
                <View style={styles.botaoTextos}>
                  <Text style={styles.botaoLabel}>{op.label}</Text>
                  <Text style={styles.botaoDesc}>{op.descricao}</Text>
                </View>
                <Feather name="chevron-right" size={20} color="rgba(255,255,255,0.6)" style={{ position: 'absolute', bottom: 20, right: 20 }} />
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F5F0FF',
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  cardPerfil: {
    backgroundColor: '#fff', marginHorizontal: 0, marginTop: 0,
    borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10,
    flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between',
    shadowColor: '#6B49AD', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 12, elevation: 5,
    marginBottom: 20,
  },
  fotoPerfil: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: '#E2D9F3' },
  fotoPerfilPlaceholder: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#EDE8FA',
    justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#E2D9F3',
  },
  logo: { width: 110, height: 36 },

  tituloSecao: {
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  titulo: {
    fontSize: 26,
    fontWeight: '800',
    color: '#301971',
    marginBottom: 4,
  },
  subtitulo: {
    fontSize: 15,
    color: '#9163CB',
    fontWeight: '600',
  },

  grid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignContent: 'flex-start',
    gap: 16,
    paddingBottom: 24,
  },
  botaoWrapper: {
    width: '47%',
    height: 180,
    borderRadius: 28,
    shadowColor: '#481D94',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  botaoFundo: {
    flex: 1,
    borderRadius: 28,
    padding: 20,
    justifyContent: 'space-between',
  },
  botaoIconeWrapper: {
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  botaoTextos: {
    marginTop: 'auto',
  },
  botaoLabel: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  botaoDesc: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
})