// speak 계약 검사·상태 파싱·위험 명령 분류를 담당하는 순수 함수 모음
const VOICES: Record<string, string> = {
  F1: '연아', F2: '마리', F3: '제인', F4: '셰릴', F5: '리사',
  M1: '스티브', M2: '빌', M3: '일론', M4: '리누스', M5: '팀',
}

// 목소리 코드(F4)를 "셰릴(F4)"로. 모르는 코드는 그대로 보인다.
export const voiceLabel = (code: string): string => (VOICES[code] ? `${VOICES[code]}(${code})` : code)

export const MODES = ['normal', 'focus', 'quiet', 'verbose', 'night'] as const
export const SWITCHES = ['mute', 'companion', 'dnd'] as const
export const CHOICES = ['on', 'off', 'toggle'] as const

const RISKY_BASH =
  /\b(rm|rmdir|truncate|sudo|launchctl)\b|\bgit\s+(reset|clean|push|checkout\s+--)|\bdrop\s+(table|database)\b|\|\s*(ba)?sh\b/i
const SENSITIVE_PATH = /(^|\/)(\.env|credentials|secrets?|auth|\.ssh)([./]|$)|\.(pem|key)$/i

export const isRiskyBash = (command: string): boolean => RISKY_BASH.test(command)
export const isSensitivePath = (path: string): boolean => SENSITIVE_PATH.test(path)

// speak 문구가 "두 문장, 목록 없음" 계약을 어기면 이유를 돌려준다.
export function speakViolation(text: string): string | undefined {
  if (text.length > 240) return `${text.length}자입니다. 240자 이내 두 문장으로 줄이세요.`
  if (/^\s*([-*•]|\d+[.)])\s/m.test(text)) return '목록·체크리스트는 말하지 않습니다. 문장으로 쓰세요.'
  const sentences = text.split(/[.!?。]+(?:\s|$)/).filter(s => s.trim()).length
  if (sentences > 3) return `${sentences}문장입니다. 두 문장으로 줄이세요.`
  return undefined
}

// `debrief status` 출력을 상태바 한 줄로 바꾼다.
export function statusLine(out: string): string {
  const pick = (label: string) => out.match(new RegExp(`${label}: (.+)`))?.[1]?.trim()
  if (pick('프로세스') !== '실행 중') return '✖ 중지'
  const muted = pick('음소거') === '켜짐'
  const companionOff = pick('도우미 음성') === '꺼짐'
  return `${muted ? '🔇' : '🔊'} ${pick('모드') ?? '?'}${companionOff ? ' · 도우미 꺼짐' : ''}`
}

// AskUserQuestion 결과에서 마지막 질문과 사용자가 고른 답을 뽑는다. 여러 질문 중 배열의 마지막 항목을 쓴다.
export function parseLastQuestion(output: {
  questions?: { question?: string }[]
  answers?: Record<string, string>
}): { question: string; answer: string } | undefined {
  const last = output.questions?.at(-1)
  if (!last?.question) return undefined
  const answer = output.answers?.[last.question]
  if (answer === undefined) return undefined
  return { question: last.question, answer }
}

export type Parsed =
  | { argv: string[] }
  | { open: 'log' }
  | { error: string }

// /debrief 인자를 화이트리스트로 검증해 debrief CLI argv로 바꾼다. 인자 없는 토글은 거부한다.
export function parseCommand(args: string): Parsed {
  const [first, value] = args.trim().split(/\s+/)
  const head = first || 'status'
  if (head === 'status' || head === 'doctor') return { argv: [head] }
  if (head === 'log') return { open: 'log' }
  if (head === 'mode') {
    if (value === undefined) return { argv: ['mode'] }
    return (MODES as readonly string[]).includes(value)
      ? { argv: ['mode', value] }
      : { error: `모드는 ${MODES.join('|')} 중 하나여야 합니다.` }
  }
  if ((SWITCHES as readonly string[]).includes(head)) {
    return (CHOICES as readonly string[]).includes(value ?? '')
      ? { argv: [head, value as string] }
      : { error: `/debrief ${head} on|off|toggle 로 명시하세요.` }
  }
  return { error: '사용법: /debrief status|doctor|log|mode [모드]|mute|companion|dnd on|off|toggle' }
}
