// decide 모드의 $.state 계약
export type Gate = {
  ts: number
  verdict: string
  allow: number
  ask: number
  deny: number
  backend: string
  model: string
  latencyMs: number
  command: string
  rule: string | null
  failure: string | null
}

export type Route = {
  backend: string
  backendSource: string
  target: string
  targetSource: string
  isDaemonUp: boolean
}

export type Alert = { ts: number; text: string; color: string }

export type Decision = {
  backend: string
  model: string
  latencyMs: number
  cached: boolean
  lines: string[]
}

declare module 'claude-code' {
  interface PluginState {
    decide: {
      gate: Gate | null
      isDaemonUp: boolean
      decision: Decision | null
      isHidden: boolean
      stats: string
      route: Route | null
      alert: Alert | null
    }
  }
}
