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

// Ponto 2: label e descrição do primeiro item vêm da Versão 1 ('Remédios')
const OPCOES = [
  { label: 'Remédios', descricao: 'Cadastre remédios e controle doses diárias', icone: 'activity', rota: '/modulos/medicamentos?action=create&hideList=true', colors: ['#EBE3FF', '#DCCEFF'], iconColor: '#6B49AD', shadow: 'rgba(107, 73, 173, 0.15)' },
  { label: 'Consulta',    descricao: 'Organize consultas médicas e acompanhamentos',      icone: 'calendar', rota: '/modulos/consultas?action=create&hideList=true',    colors: ['#E0EDFF', '#C4DDFF'], iconColor: '#2563EB', shadow: 'rgba(37, 99, 235, 0.15)' },
  { label: 'Sintoma',     descricao: 'Registre a intensidade da dor e gatilhos', icone: 'thermometer', rota: '/modulos/sintomas?action=create&hideList=true',  colors: ['#FFE4E6', '#FECDD3'], iconColor: '#E11D48', shadow: 'rgba(225, 29, 72, 0.15)' },
  { label: 'Exame',       descricao: 'Marque exames e faça o upload de resultados',       icone: 'file-text', rota: '/modulos/exames?action=create&hideList=true',      colors: ['#E6FDF4', '#C6F6E5'], iconColor: '#059669', shadow: 'rgba(5, 150, 105, 0.15)' },
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
      {/* Ponto 1: ScrollView — mantida a Versão 2 (import organizado junto aos demais).
          Funcionalmente idênticas; a V2 apenas agrupa ScrollView na mesma linha dos outros imports. */}
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

        {/* Lista Vertical */}
        <View style={styles.listaVertical}>
          {OPCOES.map((op) => (
            <TouchableOpacity
              key={op.label}
              style={[
                styles.itemCard,
                // Ponto 7: borda lateral colorida da V2 + sombra leve da V1
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
              {/* Chevron da V2 — cor de fundo e ícone dinâmicos por categoria */}
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
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 120,
  },

  // Ponto 3: cardPerfil da V1 (borderRadius: 60, sem marginHorizontal extra).
  // V2 usava borderRadius: 999 (pill total), marginHorizontal: 16, marginTop: 16
  // e Platform.select para sombra web — visual mais "flutuante" e separado das bordas.
  cardPerfil: {
    backgroundColor: '#fff',
    borderRadius: 60,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#6B49AD',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    marginBottom: 14,
  },

  // Ponto 4: foto de perfil da V1 (38x38)
  fotoPerfil: { width: 38, height: 38, borderRadius: 19, borderWidth: 2, borderColor: '#E2D9F3' },
  fotoPerfilPlaceholder: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: '#EDE8FA',
    justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#E2D9F3',
  },
  logo: { width: 110, height: 36 },

  // Ponto 5: tituloSecao da V1 (paddingHorizontal: 4, cor #301971, subtitulo #9163CB)
  tituloSecao: {
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  titulo: {
    fontSize: 28,
    fontWeight: '800',
    color: '#301971',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  subtitulo: {
    fontSize: 15,
    color: '#9163CB',
    fontWeight: '500',
  },

  listaVertical: {
    gap: 16,
  },

  // Ponto 7: borderLeft da V2 + shadow fraca da V1
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1EEF8',
    shadowColor: '#481D94',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
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

  // Chevron da V2 — backgroundColor e cor do ícone são dinâmicos (aplicados inline)
  chevronWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
})