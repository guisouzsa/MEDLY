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
  { label: 'Medicamento', icone: 'activity',    rota: '/modulos/medicamentos?action=create', colors: ['#F0EAFF', '#EDE8FA'], iconColor: '#6B49AD' },
  { label: 'Consulta',    icone: 'calendar',    rota: '/modulos/consultas?action=create', colors: ['#E3F2FD', '#DBEAFE'], iconColor: '#1565C0' },
  { label: 'Sintoma',     icone: 'thermometer', rota: '/modulos/sintomas?action=create', colors: ['#FFEBEE', '#FFCDD2'], iconColor: '#C62828' },
  { label: 'Exame',       icone: 'file-text',   rota: '/modulos/exames?action=create', colors: ['#E0F2F1', '#B2DFDB'], iconColor: '#00695C' },
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
              style={styles.botao}
              onPress={() => router.push(op.rota as any)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={op.colors as [string, string]}
                style={styles.iconeBox}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Feather name={op.icone as any} size={36} color={op.iconColor} />
              </LinearGradient>
              <Text style={styles.botaoLabel}>{op.label}</Text>
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
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
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
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  titulo: {
    fontSize: 24,
    fontWeight: '800',
    color: '#301971',
    marginBottom: 4,
  },
  subtitulo: {
    fontSize: 14,
    color: '#9163CB',
    fontWeight: '600',
  },

  grid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignContent: 'stretch',
    gap: 12,
    paddingBottom: 24,
  },
  botao: {
    width: '48%',
    height: '47%',
    backgroundColor: '#fff',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6B49AD',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#EDE8FA',
  },
  iconeBox: {
    width: 88,
    height: 88,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  botaoLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: '#301971',
  },
})