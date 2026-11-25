# MFA — AI Macro Fund Allocator (Web)

> **Simulação educacional. Não é recomendação de investimento.**

Painel de leitura macro do Brasil: mostra o cenário (expansão, contração ou estagflação) calculado pela API do MFA, a
carteira-modelo, o juro real, as séries históricas e um simulador "E se". Next 16, React 19, Tailwind 4, Recharts e pnpm.
A interface foi gerada com o v0 (Vercel) e integrada à API real.

- Interface publicada: <https://mfa-ai-macro-fund-allocator.vercel.app>
- API (FastAPI): <https://mfa-api-4u7m.onrender.com> — repositório
  [MFA-AI-macro-fund-allocator-API](https://github.com/jmarcosvm/MFA-AI-macro-fund-allocator-API)

Consome `GET /api/v1/macro/analyze` (análise) e `GET /api/v1/macro/simulate` (simulador). Todas as regras e números vêm da
API; o front só exibe e formata.

## O que a tela mostra

- **Cenário** e os critérios (crescimento do IBC-Br e IPCA em 12 meses, contra os limiares), com o texto de resumo.
- **O que mudaria**: distância aos limiares e a narração.
- **Carteira-modelo**: pesos base e sugerido, diferença e preferência de indexador da renda fixa. O ajuste sugerido é
  ilustração didática.
- **Juro real** ex-post e projetado (Focus), e os indicadores: Selic efetiva, meta da Selic, IPCA 12m, dólar e volatilidade
  do dólar (63 dias, anualizada).
- **IBC-Br**: médias das janelas recente e anterior, com os 3 meses de cada uma em tabelas.
- **Avisos de qualidade** devolvidos pela API.
- **Dashboard interativo**: IBC-Br, IPCA 12m, Selic efetiva e dólar, com período de 3 meses, 6 meses, 12 meses ou máximo.
- **Simulador "E se"**: sliders de IPCA (−5 a 20) e crescimento do IBC-Br (−10 a 10); a Selic efetiva, a Selic esperada e
  a meta partem dos valores atuais. Roda na API (`/simulate`), sem LLM.
- **Tema** claro, escuro ou do sistema.

## Como rodar

```bash
corepack pnpm install        # packageManager: pnpm@12.3.4
corepack pnpm dev            # http://localhost:3000
corepack pnpm exec tsc --noEmit
corepack pnpm build
```

Por padrão usa a API em `https://mfa-api-4u7m.onrender.com` (Render free: a primeira chamada pode levar de ~25 a 50 s para
"acordar"; a tela mostra "Conectando à análise").

## API_BASE_URL

Definida em `lib/config.ts`. Override opcional (não é segredo) para testar contra a API local:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000 corepack pnpm dev
```

A API precisa liberar a origem do front em `CORS_ORIGINS`. Se o navegador bloquear, a mensagem aparece no console.

## Parâmetros de URL

| Parâmetro | Efeito |
|---|---|
| `?fonte=exemplo` | Usa `lib/sample-data.ts` (fixture local) em vez da API e mostra o selo "Dados de exemplo". Nunca é o padrão. |
| `?estado=carregando\|acordando\|erro503\|erro500\|rede\|timeout` | Simula o estado de tela **apenas na primeira carga**. "Tentar de novo" chama a API real. |

## Estados e erros

- Mais de ~4 s sem resposta → "acordando". Timeout de 90 s → `timeout`.
- 503 → `erro503` (mostra o `detail` se vier); outros 5xx → `erro500`; falha de rede → `rede`.
- "Tentar de novo" só refaz a requisição quando o usuário clica (sem repetição automática).
- Simulador: debounce de 300 ms, cancela a requisição anterior; 422 mostra as mensagens do `detail` abaixo dos sliders.

## Estrutura

| Pasta | Conteúdo |
|---|---|
| `app/` | Layout, página e `globals.css` (App Router). |
| `components/` | `mfa-dashboard.tsx` (painéis), `mfa-extras.tsx` (gráficos e simulador), seletor de tema e componentes de UI (shadcn). |
| `lib/` | `api.ts` (chamadas), `config.ts` (URL, limites e opções), `types.ts`, `scenario.ts`, `datas.ts`, `sample-data.ts` (fixture). |

## Deploy

Vercel. A URL da API vem de `lib/config.ts`; para apontar para outra, defina `NEXT_PUBLIC_API_BASE_URL` no ambiente do
projeto na Vercel.

## Como foi desenvolvido

A interface foi gerada com o v0 (Vercel). A integração com a API e os ajustes seguintes foram feitos no Cursor, com o
Claude Code (pela API da Anthropic) como motor de IA. As decisões, as revisões e a aprovação de cada mudança foram minhas.

## Limitações

- `criterios.crescimento_ibcbr_pct` vem arredondado a 2 casas e o back classifica o valor bruto: um slider em 0,00 pode
  classificar diferente do `/analyze`.
- Os sliders do simulador cobrem uma faixa menor que a aceita pela API (IPCA −5 a 30 e crescimento −20 a 20 na API).
- Cold start do Render (~25–50 s).
- `next.config.mjs` tem `typescript.ignoreBuildErrors: true`: o `build` não barra erro de tipo; use `tsc --noEmit`.
- O botão "Tentar de novo" mantém o visual aprovado do v0 (altura ~38 px, abaixo dos 40 px de toque pedidos).
- Não há testes automatizados neste repositório; a verificação é `tsc --noEmit` e conferência na tela.
