// debrief-mod의 $.state 계약 (브리핑 로그·상태 줄)
export type Brief = {
  at: number
  text: string
  voice?: string
  lane?: string
  emotion?: string
}

declare module 'claude-code' {
  interface PluginState {
    'debrief-mod': {
      briefs: Brief[]
      status: string | null
    }
  }
}
