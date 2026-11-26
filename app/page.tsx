'use client'

import { useCallback, useEffect, useState } from 'react'
import { ApiError, carregarAnalise, isAbortError } from '@/lib/api'
import { WAKING_DELAY_MS } from '@/lib/config'
import type { Analise } from '@/lib/types'
import { MfaDashboard } from '@/components/mfa-dashboard'

const errorMessages: Record<string, { title: string; detail: string }> = {
  erro503: { title: 'Serviço temporariamente indisponível', detail: 'O serviço não conseguiu processar a solicitação.' },
  erro500: { title: 'Não foi possível carregar a análise', detail: 'Ocorreu um erro interno ao preparar os dados.' },
  rede: { title: 'Falha de conexão', detail: 'Não foi possível estabelecer conexão com o serviço.' },
  timeout: { title: 'Tempo de resposta excedido', detail: 'A solicitação demorou mais do que o esperado.' },
}

// Mesma estrutura e mesmas classes de layout do dashboard (contêiner, topline, cabeçalho, hero e grade de gráficos),
// com skeletons nos tamanhos reais, para a troca para os dados não dar salto.
function LoadingScreen({ waking }: { waking: boolean }) {
  return <main className="dashboard-shell" aria-busy="true"><div className="topline"><div className="brand-mark" aria-hidden="true">M</div><span>MACRO · BRASIL</span><span className="topline-rule" /></div>
    <header className="page-header"><div><p className="eyebrow">PAINEL DE LEITURA</p><h1>MFA <span>—</span> AI Macro Fund Allocator</h1><p className="generated" role="status" aria-live="polite">{waking ? 'Acordando o servidor (até ~1 min)…' : 'Carregando indicadores e cenário…'}</p></div><div className="header-actions" aria-hidden="true"><span className="skeleton skeleton-switcher" /></div></header>
    <div className="hero-band" aria-hidden="true"><div className="skeleton skeleton-hero-reading" /><div className="skeleton skeleton-hero-criteria" /></div>
    <section className="charts-section" aria-hidden="true"><div className="section-heading chart-section-heading"><div><span className="eyebrow">SÉRIES HISTÓRICAS</span><h2>Dashboard interativo</h2></div><span className="skeleton skeleton-period" /></div>
      <div className="macro-chart-grid">{[0, 1, 2, 3].map((index) => <div className="skeleton skeleton-chart" key={index} />)}</div>
    </section>
  </main>
}

function ErrorScreen({ kind, retry, detail }: { kind: string; retry: () => void; detail?: string }) {
  const base = errorMessages[kind] ?? errorMessages.erro500
  const message = detail ? { ...base, detail } : base
  return <main className="state-shell"><header className="state-header"><span className="brand-mark">M</span><span>MFA · Macro Brasil</span></header><section className="error-content"><span className="error-mark">!</span><span className="eyebrow">ANÁLISE INDISPONÍVEL</span><h1>{message.title}</h1><p>{message.detail}</p><button type="button" className="retry-button" onClick={retry}>Tentar de novo</button></section></main>
}

export default function Page() {
  const [data, setData] = useState<Analise | null>(null)
  const [state, setState] = useState('carregando')
  const [errorDetail, setErrorDetail] = useState<string | undefined>()
  const [attempt, setAttempt] = useState(0)
  // ?estado= (simulação de estados) só vale na primeira carga; "Tentar de novo" chama a API real.
  const load = useCallback((signal: AbortSignal, isFirst: boolean) => {
    setData(null)
    setErrorDetail(undefined)
    setState('carregando')
    const forced = isFirst ? new URLSearchParams(window.location.search).get('estado') : null
    const later = (ms: number, next: string) => { const t = window.setTimeout(() => setState(next), ms); signal.addEventListener('abort', () => window.clearTimeout(t)) }
    if (forced === 'acordando') { later(WAKING_DELAY_MS, 'acordando'); return }
    if (forced && errorMessages[forced]) { later(500, forced); return }
    if (forced === 'carregando') return
    const wakingTimer = window.setTimeout(() => setState('acordando'), WAKING_DELAY_MS)
    carregarAnalise(signal).then((result) => {
      window.clearTimeout(wakingTimer)
      if (!signal.aborted) setData(result)
    }).catch((error) => {
      window.clearTimeout(wakingTimer)
      if (signal.aborted || isAbortError(error)) return
      if (error instanceof ApiError) {
        setErrorDetail(error.kind === 'erro503' && error.message !== error.kind ? error.message : undefined)
        setState(error.kind)
      } else setState('erro500')
    })
  }, [])
  useEffect(() => {
    const controller = new AbortController()
    load(controller.signal, attempt === 0)
    return () => controller.abort()
  }, [load, attempt])
  if (data) return <MfaDashboard data={data} />
  if (state === 'erro503' || state === 'erro500' || state === 'rede' || state === 'timeout') return <ErrorScreen kind={state} detail={errorDetail} retry={() => setAttempt((value) => value + 1)} />
  return <LoadingScreen waking={state === 'acordando'} />
}
