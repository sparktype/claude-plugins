// gate.log 한 줄과 decide 도구 결과를 화면용 값으로 바꾸는 순수 함수
import type { Alert, Decision, Gate, Route } from '../types'

const pct = (n: number) => Math.round(n * 100)

export function parseGate(line: string): Gate | null {
  try {
    const o = JSON.parse(line)
    if (typeof o.ts !== 'number') return null
    return {
      ts: o.ts,
      verdict: typeof o.verdict === 'string' ? o.verdict : 'none',
      allow: o.probs?.allow ?? 0,
      ask: o.probs?.ask ?? 0,
      deny: o.probs?.deny ?? 0,
      backend: o.backend ?? '-',
      model: o.model ?? '-',
      latencyMs: o.latency_ms ?? 0,
      command: o.command ?? '',
      rule: o.rule ?? null,
      failure: o.failure ?? null,
    }
  } catch {
    return null
  }
}

// 방금 실행한 Bash 명령에 대한 기록인지 앞부분으로 대조한다. 로그의 명령은 잘리거나 가려질 수 있다.
export function matchesCommand(gate: Gate, command: string): boolean {
  const n = 40
  return gate.command.slice(0, n) === command.trim().slice(0, n)
}

// ask·deny일 때 띄울 알림. 토스트는 글자 색을 못 입혀서 같은 문구를 프롬프트 위 밴드에도 색 있는 ●로 보인다. allow와 판정 없음은 없다.
export function gateAlert(gate: Gate): Alert | undefined {
  const color = gate.verdict === 'ask' ? COLORS.ask : gate.verdict === 'deny' ? COLORS.deny : undefined
  if (!color) return undefined
  const top = Math.max(gate.allow, gate.ask, gate.deny)
  const why = gate.rule ? `rule ${gate.rule}` : `${pct(top)}%`
  return { ts: gate.ts, text: `gate ${gate.verdict} · ${why}`, color }
}

// 엔진이 상태 줄 앞에 플러그인 이름(decide:)을 붙이므로 문구에는 다시 넣지 않는다.
export function statusText(gate: Gate | null, isDaemonUp: boolean): string {
  const daemon = isDaemonUp ? 'daemon ●' : 'daemon ○'
  if (!gate) return daemon
  return `${gate.backend}/${gate.model} · ${Math.round(gate.latencyMs)}ms · ${daemon}`
}

// gate.log 마지막 줄, 모델이 답한 마지막 줄, 데몬 소켓을 읽는 스크립트. 로그 줄은 echo가 아니라 printf로 낸다.
// macOS의 sh는 echo가 \n 같은 이스케이프를 해석해, 명령에 줄바꿈이 든 줄의 JSON을 깨뜨린다.
export const STATUS_SCRIPT = `f=~/.cache/decide/gate.log
printf 'LAST=%s\\n' "$(tail -n 1 $f)"
printf 'MODEL=%s\\n' "$(grep '"backend":"' $f | tail -n 1)"
test -S ~/.cache/decide/decide.sock && echo UP || echo DOWN`

function answerLine(id: string, a: any): string | null {
  if (!a || typeof a.type !== 'string') return null
  if (a.type === 'choice') return `${id}: ${a.choice} (${pct(a.confidence ?? 0)}%)`
  if (a.type === 'score') return `${id}: score ${a.score} (${pct(a.confidence ?? 0)}%)`
  if (a.type === 'noul') return `${id}: noul ${pct(a.noul ?? 0)}%`
  return null
}

// decide는 {answer, routing, latency_ms}, decide_many는 {answers:{id:answer}, ...} 형태를 가정한다.
export function parseDecision(text: string): Decision | null {
  try {
    const o = JSON.parse(text)
    const answers: Record<string, unknown> = o.answers ?? (o.answer ? { q: o.answer } : {})
    const lines = Object.entries(answers)
      .map(([id, a]) => answerLine(id, a))
      .filter((l): l is string => l !== null)
    if (lines.length === 0) return null
    return {
      backend: o.routing?.backend ?? '-',
      model: o.routing?.model ?? '-',
      latencyMs: o.latency_ms ?? 0,
      cached: o.routing?.cached === true,
      lines,
    }
  } catch {
    return null
  }
}

export type Latency = { n: number; avg: number; p90: number; max: number; recent: number[] }
export type Stats = {
  total: number
  verdicts: Record<string, number>
  kinds: Record<string, number>
  latency: Record<string, Latency>
}

export const RECENT = 10

// 가장 최근 RECENT건의 지연으로 평균·p90·최대를 낸다. xs는 로그 순서(오래된 것부터)다.
function latencyOf(all: number[]): Latency {
  const xs = all.slice(-RECENT)
  const sorted = [...xs].sort((a, b) => a - b)
  return {
    n: xs.length,
    avg: xs.reduce((a, b) => a + b, 0) / xs.length,
    p90: sorted[Math.floor(sorted.length * 0.9)] ?? 0,
    max: sorted[sorted.length - 1],
    recent: xs,
  }
}

// gate.log 줄들을 모아 막대에 필요한 수치로 만든다. 지연은 백엔드별 모델 판정의 최근 RECENT건만 센다.
export function summarizeLog(text: string): Stats {
  const stats: Stats = { total: 0, verdicts: {}, kinds: {}, latency: {} }
  const samples: Record<string, number[]> = {}

  for (const line of text.split('\n')) {
    let o: any
    try {
      o = JSON.parse(line)
    } catch {
      continue
    }
    if (typeof o?.ts !== 'number') continue
    stats.total += 1
    const kind = o.failure ? 'fail-open' : o.rule ? 'static rule' : o.prefiltered ? 'prefilter' : 'model'
    stats.kinds[kind] = (stats.kinds[kind] ?? 0) + 1
    if (typeof o.verdict === 'string') stats.verdicts[o.verdict] = (stats.verdicts[o.verdict] ?? 0) + 1
    if (kind === 'model' && o.latency_ms > 0) (samples[o.backend] ??= []).push(o.latency_ms)
  }

  for (const [backend, xs] of Object.entries(samples)) stats.latency[backend] = latencyOf(xs)
  return stats
}

export type Seg = { text: string; color: string }
export type Item = { label: string; n: number; color: string }
export type Section = { title: string; right: string; rightColor?: string; bar: Seg[]; items: Item[]; note?: string }

export const COLORS = {
  allow: '#6fbf73',
  ask: '#e5b567',
  deny: '#e06c75',
  rule: '#61afef',
  prefilter: '#c792ea',
  model: '#56b6c2',
  failure: '#d19a66',
  green: '#6fbf73',
  blue: '#61afef',
  yellow: '#e5b567',
  red: '#e06c75',
}

// 개수 비율대로 width칸을 나눠 칠한다. 0이 아닌 항목은 최소 1칸, 합은 정확히 width다.
export function segments(items: Item[], width: number): Seg[] {
  const total = items.reduce((a, i) => a + i.n, 0)
  if (total === 0) return []
  const cols = items.map(i => (i.n === 0 ? 0 : Math.max(1, Math.round((i.n / total) * width))))
  let diff = width - cols.reduce((a, b) => a + b, 0)
  const order = cols.map((c, i) => i).sort((a, b) => cols[b] - cols[a])
  for (let k = 0; diff !== 0 && k < 100; k++) {
    const i = order[k % order.length]
    if (diff > 0) { cols[i] += 1; diff -= 1 } else if (cols[i] > 1) { cols[i] -= 1; diff += 1 }
  }
  return items.map((it, i) => ({ text: '━'.repeat(cols[i]), color: it.color })).filter(sg => sg.text !== '')
}

// 지연 등급. 기준은 ms이고 막대 조각의 색과 머리줄 평균의 색에 쓴다.
export const LEVELS: { under: number; label: string; color: string }[] = [
  { under: 300, label: '<300ms', color: COLORS.green },
  { under: 800, label: '<800ms', color: COLORS.blue },
  { under: 1500, label: '<1500ms', color: COLORS.yellow },
  { under: Infinity, label: '≥1500ms', color: COLORS.red },
]

export const levelOf = (ms: number) => LEVELS.find(l => ms < l.under)!

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const VERDICTS = ['allow', 'ask', 'deny'] as const
const KINDS: [string, string][] = [['static rule', COLORS.rule], ['prefilter', COLORS.prefilter], ['model', COLORS.model], ['fail-open', COLORS.failure]]

// 통계 패널의 구역들. 구역마다 누적 막대 한 줄과 범례를 가진다.
export function panelModel(stats: Stats, width: number, backend: string): Section[] {
  const verdicts: Item[] = VERDICTS.map(v => ({ label: cap(v), n: stats.verdicts[v] ?? 0, color: COLORS[v] }))
  const decided = verdicts.reduce((a, i) => a + i.n, 0)
  const kinds: Item[] = KINDS.map(([label, color]) => ({ label: cap(label), n: stats.kinds[label] ?? 0, color }))

  const sections: Section[] = [
    { title: `• Gate`, right: `${stats.total} calls`, bar: segments(verdicts, width), items: verdicts },
    { title: '• Type', right: `Model ${Math.round(((stats.kinds['model'] ?? 0) / Math.max(stats.total, 1)) * 100)}%`, bar: segments(kinds, width), items: kinds },
  ]
  void decided

  // 지연은 지금 선택된 백엔드의 최근 RECENT건을 한 줄로 쌓는다. 조각 길이는 그 건의 지연에 비례하고 색은 그 건의 등급이다.
  const l = stats.latency[backend]
  const count = (i: number) => (l ? l.recent.filter(ms => levelOf(ms) === LEVELS[i]).length : 0)
  const levels: Item[] = LEVELS.map((lv, i) => ({ label: lv.label, n: count(i), color: lv.color }))
  if (l) {
    const pieces: Item[] = l.recent.map(ms => ({ label: '', n: ms, color: levelOf(ms).color }))
    sections.push({
      title: `• Latency`,
      right: `Avg ${l.n} ${Math.round(l.avg)}ms`,
      rightColor: levelOf(l.avg).color,
      bar: segments(pieces, width),
      items: levels,
      note: `Last ${l.n} · P90 ${Math.round(l.p90)}ms · Max ${Math.round(l.max)}ms`,
    })
  } else {
    sections.push({ title: `• Latency`, right: `Avg ${RECENT}`, bar: [], items: levels, note: 'No samples yet' })
  }
  return sections
}

// 머리줄 오른쪽 배지에 쓰는 허용 비율.
export function allowShare(stats: Stats): number {
  const total = Object.values(stats.verdicts).reduce((a, b) => a + b, 0)
  return Math.round(((stats.verdicts.allow ?? 0) / Math.max(total, 1)) * 100)
}

export const ROUTE_SCRIPT = `pid=$(pgrep -f '^/opt/homebrew/bin/decide daemon' | head -1)
env=$([ -n "$pid" ] && ps eww -p $pid | tr ' ' '\\n')
echo "PID=$pid"
echo "$env" | grep -E '^(DECIDE_BACKEND|DECIDE_TYPESAFE_URL|DECIDE_LOCAL_REPO|CLEF_WEIGHTS)='
echo "KEY=$(echo "$env" | grep -c '^TYPESAFE_API_KEY=.')"
f=$HOME/.config/decide/config.toml
[ -f "$f" ] && grep -E '^(backend|url|repo|weights) *=' "$f" | sed 's/ *= */=/; s/"//g; s/^/CFG_/'
true`

const DEFAULT_URL = 'https://api.typesafe.ai/v1/systemone'
const DEFAULT_REPO = 'mlx-community/clef-flash-8bit'

// URL의 사용자 정보(user:pass@)는 화면에 내지 않는다.
const maskUrl = (url: string) => url.replace(/\/\/[^/@]*@/, '//')

// 데몬 환경변수와 config.toml로 백엔드와 접속 대상을 정한다. 우선순위는 환경변수, 설정 파일, 기본값이다(키가 있으면 typesafe, 없으면 local).
export function resolveRoute(text: string): Route {
  const kv: Record<string, string> = {}
  for (const line of text.split('\n')) {
    const i = line.indexOf('=')
    if (i > 0) kv[line.slice(0, i)] = line.slice(i + 1).trim()
  }
  const first = (...pairs: [string | undefined, string][]) => pairs.find(([v]) => v)
  const picked = first(
    [kv.DECIDE_BACKEND, 'env'],
    [kv.CFG_backend, 'config.toml'],
    [kv.KEY && kv.KEY !== '0' ? 'typesafe' : 'local', 'by API key'],
  )!
  const backend = picked[0]!
  const target =
    backend === 'typesafe'
      ? first([kv.DECIDE_TYPESAFE_URL, 'env'], [kv.CFG_url, 'config.toml'], [DEFAULT_URL, 'default'])!
      : first([kv.CLEF_WEIGHTS, 'CLEF_WEIGHTS'], [kv.DECIDE_LOCAL_REPO, 'env'], [kv.CFG_weights, 'config.toml'], [kv.CFG_repo, 'config.toml'], [DEFAULT_REPO, 'default'])!
  return {
    backend,
    backendSource: picked[1],
    target: maskUrl(target[0]!),
    targetSource: target[1],
    isDaemonUp: kv.PID !== undefined && kv.PID !== '',
  }
}
