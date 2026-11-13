# Acessa+

**Acessibilidade que cada pessoa define.**

O Acessa+ é um protótipo web colaborativo em que visitantes avaliam a acessibilidade de estabelecimentos a partir da própria experiência. Em vez de uma nota única, o site organiza os relatos por perfil de necessidade: TEA, surdez e mobilidade reduzida.

> Protótipo acadêmico. Os resultados são relatos de visitantes e **não** substituem vistoria técnica nem certificação de acessibilidade.

## O que o site faz

1. **Define perfis:** a pessoa escolhe uma ou mais necessidades (ou segue sem perfil). Nome e idade são opcionais e não são enviados ao banco.
2. **Busca o local:** pesquisa estabelecimentos com Google Maps/Places e seleciona o resultado correto.
3. **Mostra avaliações da comunidade:** resumo por perfil, com índice experimental, resultado por pergunta, percentual de quem voltaria e data da última avaliação.
4. **Recebe novas avaliações:** 10 perguntas por área (TEA, Surdez e Mobilidade), com respostas como Sim, Parcial, Não e Não sei, além de "Você voltaria a esse local?".
5. **Responde perguntas com IA:** o assistente resume as avaliações já cadastradas daquele local, cita as referências consultadas e informa quando não há dados suficientes.

## Como a nota é pensada

- Cada resposta vira um valor: por exemplo, Sim = 1, Parcial = 0,5 e Não = 0.
- "Não sei" e "Não se aplica" não entram no cálculo.
- A pergunta "Você voltaria?" é exibida separadamente e não entra na nota.
- Com menos de 3 avaliações, o resultado é sinalizado como pouco confiável.

## Assistente de IA

O botão **Perguntar ao assistente Acessa+** envia o local e a pergunta a uma Edge Function do Supabase (`ask-accessibility`). A função lê as avaliações do local na tabela `avaliacoes`, monta o contexto e consulta o Gemini.

- A chave do Gemini fica guardada como segredo no Supabase, nunca no site.
- A IA responde só com base nas avaliações do Acessa+; não consulta comentários do Google Maps.
- Ela não inventa dados: "Não sei" não é tratado como "Não".
- O resumo da IA não é uma avaliação e não entra no cálculo.

## Tecnologias

| Parte | Tecnologia |
|---|---|
| Interface | HTML, CSS e JavaScript |
| Mapa e busca de locais | Google Maps JavaScript API (Places) |
| Banco de dados | Supabase (PostgreSQL), tabela `avaliacoes` |
| Backend de IA | Supabase Edge Function + Gemini API |
| Hospedagem | Render |

## Estrutura dos arquivos

| Arquivo | Função |
|---|---|
| `index.html` | Estrutura das telas |
| `style.css` | Visual do site |
| `script.js` | Perfis e navegação |
| `maps.js` | Mapa, busca e seleção do local |
| `avaliacao.js` | Formulário de avaliação |
| `banco.js` | Conexão com Supabase e resumo da comunidade |
| `ia.js` | Chamada ao assistente de IA |

## Dados salvos por avaliação

`place_id`, `perfil`, `respostas`, `peso`, `voltaria` e `criado_em`.

## Limitações

- Poucas avaliações geram resultados pouco representativos.
- Relatos são subjetivos e podem estar desatualizados.
- A IA resume dados existentes e pode cometer erros; confira as referências.
- Não há moderação automática de avaliações.

