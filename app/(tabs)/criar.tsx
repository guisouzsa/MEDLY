import { Feather } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { router, useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import {
  Dimensions, Image, Platform,
  ScrollView,
  StyleSheet, Text,
  TouchableOpacity, View
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '../../src/lib/supabase'

const { width } = Dimensions.get('window')

const OPCOES = [
  { label: 'Medicamento', descricao: 'Agende medicamentos e controle doses diárias', icone: 'activity', rota: '/modulos/medicamentos?action=create&hideList=true', colors: ['#EBE3FF', '#DCCEFF'], iconColor: '#6B49AD', shadow: 'rgba(107, 73, 173, 0.15)' },
  { label: 'Consulta', descricao: 'Organize consultas médicas e acompanhamentos', icone: 'calendar', rota: '/modulos/consultas?action=create&hideList=true', colors: ['#E0EDFF', '#C4DDFF'], iconColor: '#2563EB', shadow: 'rgba(37, 99, 235, 0.15)' },
  { label: 'Sintoma', descricao: 'Registre a intensidade da dor e gatilhos', icone: 'thermometer', rota: '/modulos/sintomas?action=create&hideList=true', colors: ['#FFE4E6', '#FECDD3'], iconColor: '#E11D48', shadow: 'rgba(225, 29, 72, 0.15)' },
  { label: 'Exame', descricao: 'Marque exames e faça o upload de resultados', icone: 'file-text', rota: '/modulos/exames?action=create&hideList=true', colors: ['#E6FDF4', '#C6F6E5'], iconColor: '#059669', shadow: 'rgba(5, 150, 105, 0.15)' },
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
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContainer}>
        {/* Card 1 — Perfil + Logo */}
        <View style={styles.cardPerfil}>
          <TouchableOpacity onPress={() => router.push('/modulos/perfil' as any)} activeOpacity={0.85}>
            {perfilFoto ? (
              <Image source={{ uri: perfilFoto }} style={styles.fotoPerfil} onError={() => setPerfilFoto(null)} />
            ) : (
              <View style={styles.fotoPerfilPlaceholder}>
                <Feather name="user" size={24} color="#6B49AD" />
              </View>
            )}
          </TouchableOpacity>
          <Image source={require('../../assets/images/logo.png')} style={styles.logo} resizeMode="contain" />
          <View style={{ width: 44 }} />
        </View>

        {/* Pergunta */}
        <View style={styles.tituloSecao}>
          <Text style={styles.titulo}>Criar Registro</Text>
          <Text style={styles.subtitulo}>Selecione uma categoria para adicionar</Text>
        </View>

        {/* Lista Vertical Premium */}
        <View style={styles.listaVertical}>
          {OPCOES.map((op) => (
            <TouchableOpacity
              key={op.label}
              style={[
                styles.itemCard,
                { borderLeftWidth: 6, borderLeftColor: op.iconColor },
                Platform.OS === 'web' && { boxShadow: `0px 10px 25px ${op.shadow}` } as any
              ]}
              onPress={() => router.push(op.rota as any)}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={op.colors as [string, string]}
                style={styles.cardIconeWrapper}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Feather name={op.icone as any} size={26} color={op.iconColor} />
              </LinearGradient>
              <View style={styles.cardTextos}>
                <Text style={styles.cardLabel}>{op.label}</Text>
                <Text style={styles.cardDesc}>{op.descricao}</Text>
              </View>
              <View style={[styles.chevronWrapper, { backgroundColor: op.colors[0] }]}>
                <Feather name="chevron-right" size={20} color={op.iconColor} />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F5F0FF',
  },
  scrollContainer: {
    paddingTop: 0,
    paddingBottom: 120,
  },

  cardPerfil: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#6B49AD',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    ...Platform.select({
      web: {
        boxShadow: '0px 4px 12px rgba(107, 73, 173, 0.1)'
      }
    })
  },
  fotoPerfil: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: '#E2D9F3' },
  fotoPerfilPlaceholder: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#EDE8FA',
    justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#E2D9F3',
  },
  logo: { width: 110, height: 36 },

  tituloSecao: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 24,
  },
  titulo: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1C0D3F',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  subtitulo: {
    fontSize: 15,
    color: '#866FA8',
    fontWeight: '500',
  },

  listaVertical: {
    gap: 16,
    marginHorizontal: 16,
  },
  itemCard: {
    flexDirection: 'row', // ← era 'row-reverse', corrigido para 'row'
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1EEF8',
    shadowColor: '#6B49AD',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 5,
  },
  cardIconeWrapper: {
    width: 58,
    height: 58,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTextos: {
    flex: 1,
    marginLeft: 16,
    paddingRight: 8,
  },
  cardLabel: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1C0D3F',
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 13,
    color: '#866FA8',
    fontWeight: '500',
    lineHeight: 18,
  },
  chevronWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F6F3FB',
    justifyContent: 'center',
    alignItems: 'center',
  },
})