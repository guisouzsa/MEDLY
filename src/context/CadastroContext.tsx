import { createContext, useContext, useState } from 'react'

type Dados = {
  nome: string
  email: string
  senha: string
  fotoUri: string
  erroEmail: string  // ← novo
}

type Ctx = {
  dados: Dados
  setNome: (v: string) => void
  setEmail: (v: string) => void
  setSenha: (v: string) => void
  setFotoUri: (v: string) => void
  setErroEmail: (v: string) => void 
  limpar: () => void
}

const CadastroContext = createContext<Ctx>({} as Ctx)

const inicial: Dados = { nome: '', email: '', senha: '', fotoUri: '', erroEmail: '' }

export function CadastroProvider({ children }: { children: React.ReactNode }) {
  const [dados, setDados] = useState<Dados>(inicial)

  return (
    <CadastroContext.Provider value={{
      dados,
      setNome: (v) => setDados(d => ({ ...d, nome: v })),
      setEmail: (v) => setDados(d => ({ ...d, email: v })),
      setSenha: (v) => setDados(d => ({ ...d, senha: v })),
      setFotoUri: (v) => setDados(d => ({ ...d, fotoUri: v })),
      setErroEmail: (v) => setDados(d => ({ ...d, erroEmail: v })),  // ← novo
      limpar: () => setDados(inicial),
    }}>
      {children}
    </CadastroContext.Provider>
  )
}

export function useCadastro() {
  return useContext(CadastroContext)
}