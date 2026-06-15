# Medly

## Aplicativo inteligente para gerenciamento de medicamentos, consultas, lembretes e rotina de saúde

O Medly é um aplicativo desenvolvido com React Native, Expo Router e Supabase para auxiliar usuários no gerenciamento de medicamentos, consultas médicas, lembretes, eventos e compromissos importantes.

O sistema foi projetado com foco em acessibilidade, simplicidade e facilidade de uso, sendo especialmente útil para:

* Pessoas com doenças crônicas
* Idosos
* Pessoas com dificuldades de memória
* Pacientes em tratamento contínuo
* Usuários que desejam organizar melhor sua rotina de saúde

---

# Objetivo

O Medly centraliza todas as informações importantes da rotina de saúde do usuário em um único lugar, permitindo:

* Controle de medicamentos
* Agendamento de consultas
* Gerenciamento de lembretes
* Organização de eventos
* Recebimento de notificações automáticas
* Visualização da agenda em calendário
* Busca rápida com filtros personalizados

O objetivo principal é reduzir esquecimentos e facilitar a organização do dia a dia por meio de uma interface intuitiva e acessível.

---

# Tecnologias Utilizadas

## Frontend

* React Native
* Expo
* Expo Router
* TypeScript

## Backend

* Supabase Auth
* Supabase Database
* Supabase Storage

## Persistência Local

* AsyncStorage

---

# Instalação do Projeto

## Pré-requisitos

Instale os seguintes programas:

### Node.js

Versão recomendada:

```bash
v20+
```

Download:

https://nodejs.org

### Git

Download:

https://git-scm.com

### Expo Go

Android:

https://play.google.com/store/apps/details?id=host.exp.exponent

iOS:

https://apps.apple.com

---

# Clonar o Projeto

```bash
git clone URL_DO_REPOSITORIO

cd medly
```

---

# Instalar Dependências

```bash
npm install
```

ou

```bash
yarn
```

---

# Configurar Variáveis de Ambiente

Crie um arquivo:

```env
.env
```

Exemplo:

```env
EXPO_PUBLIC_SUPABASE_URL=sua_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=sua_chave
```

---

# Executar o Projeto

```bash
npx expo start
```

Após iniciar:

* Pressione A para Android
* Pressione I para iOS
* Escaneie o QR Code com Expo Go

---

# Estrutura do Projeto

```text
app/
├── (tabs)
├── auth
├── modulos
├── _layout.tsx
└── index.tsx

src/
├── components
├── context
├── hooks
├── services
└── lib
```

---

# Fluxo da Aplicação

```text
Aplicativo
     ↓
Verificação de Sessão
     ↓
Login ou Cadastro
     ↓
Home
     ↓
Módulos do Sistema
```

---

# Sistema de Autenticação

## Login

Campos:

* Email
* Senha

Validações:

* Email obrigatório
* Formato válido de email
* Senha obrigatória

---

## Cadastro

Campos:

### Informações Básicas

* Nome completo
* Email
* Senha

### Perfil

* Foto de perfil (opcional)

Validações:

* Nome obrigatório
* Email único
* Senha mínima de segurança

---

# Home

A Home é o painel principal do aplicativo.

Apresenta informações resumidas da rotina do usuário.

## Componentes da Tela

### Saudação

Exemplo:

```text
Bom dia, João
```

### Resumo do Dia

Mostra:

* Medicamentos para hoje
* Consultas próximas
* Eventos próximos
* Lembretes pendentes

### Atalhos Rápidos

Permite criar rapidamente:

* Medicamento
* Consulta
* Evento
* Lembrete

---

# Sistema de Notificações

O sistema envia notificações locais para lembrar o usuário de atividades importantes.

## Tipos

### Medicamentos

Exemplo:

```text
Hora de tomar Dipirona
```

### Consultas

Exemplo:

```text
Consulta amanhã às 14:00
```

### Eventos

Exemplo:

```text
Aniversário hoje
```

### Lembretes

Exemplo:

```text
Levar exames
```

---

# Módulo de Medicamentos

CRUD completo de medicamentos.

## Campos

### Cadastro

* Nome do medicamento
* Dosagem
* Unidade (mg, ml, comprimido, gotas)
* Frequência
* Horário
* Data de início
* Data de término
* Observações

---

## Filtros

### Todos

Exibe todos os medicamentos.

### Ativos

Medicamentos em uso atualmente.

### Finalizados

Medicamentos encerrados.

### Próximos Horários

Medicamentos com administração próxima.

---

## Funcionalidades

* Criar medicamento
* Editar medicamento
* Excluir medicamento
* Visualizar histórico
* Receber notificações automáticas

---

# Módulo de Consultas

CRUD completo de consultas médicas.

## Campos

### Cadastro

* Nome do médico
* Especialidade
* Clínica ou hospital
* Data
* Horário
* Endereço
* Telefone
* Observações

---

## Filtros

### Próximas

Consultas futuras.

### Hoje

Consultas agendadas para hoje.

### Concluídas

Consultas realizadas.

### Canceladas

Consultas canceladas.

---

## Funcionalidades

* Criar consulta
* Editar consulta
* Excluir consulta
* Histórico médico
* Notificações automáticas

---

# Módulo de Lembretes

CRUD completo de lembretes.

## Campos

### Cadastro

* Título
* Descrição
* Data
* Horário
* Prioridade
* Categoria

---

## Prioridades

* Baixa
* Média
* Alta

---

## Filtros

### Pendentes

Lembretes ainda não concluídos.

### Concluídos

Lembretes finalizados.

### Hoje

Lembretes do dia atual.

### Alta Prioridade

Lembretes urgentes.

---

## Funcionalidades

* Criar lembrete
* Editar lembrete
* Excluir lembrete
* Marcar como concluído
* Receber notificações

---

# Módulo de Eventos

CRUD completo de eventos.

## Campos

### Cadastro

* Título
* Descrição
* Data
* Horário
* Local
* Tipo de evento

---

## Tipos

* Pessoal
* Familiar
* Médico
* Trabalho
* Outros

---

## Filtros

### Hoje

Eventos do dia atual.

### Semana

Eventos da semana.

### Mês

Eventos do mês.

### Próximos

Próximos eventos cadastrados.

---

## Funcionalidades

* Criar evento
* Editar evento
* Excluir evento
* Visualizar agenda

---

# Calendário

O calendário reúne informações de todos os módulos.

Exibe:

* Medicamentos
* Consultas
* Eventos
* Lembretes

---

## Interação

Ao clicar em uma data:

* Abre um modal
* Exibe compromissos do dia
* Exibe medicamentos agendados
* Exibe consultas
* Exibe eventos
* Exibe lembretes

---

## Criar pelo Calendário

Ao selecionar uma data:

```text
Adicionar Evento
```

O sistema já preenche automaticamente a data selecionada.

---

# Pesquisa Global

Sistema de busca centralizado.

Permite pesquisar:

* Medicamentos
* Consultas
* Eventos
* Lembretes

---

## Filtros Disponíveis

### Categoria

* Medicamentos
* Consultas
* Eventos
* Lembretes

### Período

* Hoje
* Semana
* Mês
* Personalizado

### Status

* Ativo
* Pendente
* Concluído
* Cancelado

### Ordenação

* Mais recente
* Mais antigo
* Ordem alfabética

---

# Aba Criar

Centraliza a criação de registros.

## Opções

### Novo Medicamento

Gera um card de medicamento.

### Nova Consulta

Gera um card de consulta.

### Novo Evento

Gera um card de evento.

### Novo Lembrete

Gera um card de lembrete.

---

# Sistema de Cards

Todas as informações cadastradas são exibidas em cards.

## Card de Medicamento

Exibe:

* Nome
* Dosagem
* Próximo horário
* Status

## Card de Consulta

Exibe:

* Médico
* Especialidade
* Data
* Horário

## Card de Evento

Exibe:

* Título
* Data
* Local

## Card de Lembrete

Exibe:

* Título
* Horário
* Prioridade
* Status

---

# Componentes Reutilizáveis

## BotaoGrande.tsx

Botão padrão utilizado em todo o sistema.

Recursos:

* Variante sólida
* Variante transparente
* Estado de carregamento
* Estado desabilitado

---

## CampoGrande.tsx

Campo de formulário reutilizável.

Recursos:

* Label
* Placeholder
* Mensagem de erro
* Validação visual

---

## TelaEtapa.tsx

Estrutura visual compartilhada pelas telas de autenticação.

Responsável por:

* Logo
* Navegação
* Indicadores de progresso
* Título
* Subtítulo

---

# Context API

## CadastroContext

Responsável por armazenar temporariamente:

* Nome
* Email
* Senha
* Foto

Permite compartilhar os dados entre as etapas do cadastro.

---

# Integração com Supabase

Arquivo:

```text
src/lib/supabase.ts
```

Responsável por:

* Autenticação
* Persistência de sessão
* Banco de dados
* Upload de imagens
* Operações CRUD

---

# Segurança

O sistema utiliza:

* Supabase Auth
* Sessão persistente
* AsyncStorage
* Criptografia de senha gerenciada pelo Supabase
* Controle de autenticação por usuário

---

# Público-Alvo

O Medly foi desenvolvido para:

* Pessoas com doenças crônicas
* Idosos
* Pacientes em tratamento contínuo
* Pessoas com dificuldades de memória
* Usuários que desejam organizar compromissos e medicamentos

---

# Licença

Este projeto é de uso acadêmico e educacional, podendo ser adaptado conforme as necessidades da equipe de desenvolvimento.
