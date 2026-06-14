import { Platform } from 'react-native'
import * as FileSystem from 'expo-file-system/legacy'
import { decode } from 'base64-arraybuffer'

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp']
const FILE_EXTENSIONS = [...IMAGE_EXTENSIONS, 'pdf']

export async function readUriAsArrayBuffer(uri: string): Promise<ArrayBuffer> {
  if (Platform.OS === 'web') {
    const response = await fetch(uri)
    if (!response.ok) throw new Error('Não foi possível ler o arquivo.')
    return response.arrayBuffer()
  }

  // No React Native (Android/iOS), sempre usar FileSystem + base64
  // O construtor `new Response(blob).arrayBuffer()` não é confiável no Hermes/JSC
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  })
  return decode(base64)
}

export function normalizeExtension(ext?: string | null, fallback = 'jpg'): string {
  const raw = (ext ?? fallback).toLowerCase().replace('jpeg', 'jpg')
  return FILE_EXTENSIONS.includes(raw) ? raw : fallback
}

export function extensionFromName(name?: string | null, fallback = 'jpg'): string {
  if (!name) return fallback
  const parts = name.split('.')
  if (parts.length < 2) return fallback
  return normalizeExtension(parts.pop(), fallback)
}

export function extensionFromUri(uri: string, fallback = 'jpg'): string {
  const path = uri.split('?')[0]
  const parts = path.split('.')
  if (parts.length < 2) return fallback
  return normalizeExtension(parts.pop(), fallback)
}

export function mimeFromExtension(ext: string): string {
  if (ext === 'pdf') return 'application/pdf'
  if (IMAGE_EXTENSIONS.includes(ext)) {
    return `image/${ext === 'jpg' ? 'jpeg' : ext}`
  }
  return 'application/octet-stream'
}

export async function mimeFromUri(uri: string, fallbackExt = 'jpg'): Promise<string> {
  if (Platform.OS === 'web') {
    const response = await fetch(uri)
    if (response.headers.get('content-type')) {
      return response.headers.get('content-type')!
    }
  } else {
    try {
      const response = await fetch(uri)
      if (response.headers.get('content-type')) {
        return response.headers.get('content-type')!
      }
      const blob = await response.blob()
      if (blob.type) return blob.type
    } catch {
      // fallback abaixo
    }
  }
  return mimeFromExtension(extensionFromUri(uri, fallbackExt))
}
