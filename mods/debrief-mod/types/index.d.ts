// debrief-mod의 $.state 계약 (브리핑 로그·오너십 요약·밴드 숨김)
export type Brief = {
  at: number
  text: string
  voice?: string
  lane?: string
  emotion?: string
}

export type Ownership = { files: number; risky: string[]; sensitive: string[] }

declare module 'claude-code' {
  interface PluginState {
    'debrief-mod': {
      briefs: Brief[]
      ownership: Ownership | null
      status: string | null
      isHidden: boolean
    }
  }
}
