import { createContext, useContext, useState } from 'react'

type CadastroData = {
  nome: string
  email: string
  senha: string
  fotoUri: string | null
}

type CadastroContextType = {
  dados: CadastroData
  setNome: (v: string) => void
  setEmail: (v: string) => void
  setSenha: (v: string) => void
  setFotoUri: (v: string | null) => void
  limpar: () => void
}

const CadastroContext = createContext<CadastroContextType | null>(null)

const dadosVazios: CadastroData = {
  nome: '',
  email: '',
  senha: '',
  fotoUri: null,
}

export function CadastroProvider({ children }: { children: React.ReactNode }) {
  const [dados, setDados] = useState<CadastroData>(dadosVazios)

  return (
    <CadastroContext.Provider
      value={{
        dados,
        setNome: (nome) => setDados((d) => ({ ...d, nome })),
        setEmail: (email) => setDados((d) => ({ ...d, email })),
        setSenha: (senha) => setDados((d) => ({ ...d, senha })),
        setFotoUri: (fotoUri) => setDados((d) => ({ ...d, fotoUri })),
        limpar: () => setDados(dadosVazios),
      }}
    >
      {children}
    </CadastroContext.Provider>
  )
}

export function useCadastro() {
  const ctx = useContext(CadastroContext)
  if (!ctx) throw new Error('useCadastro deve estar dentro de CadastroProvider')
  return ctx
}