// logic.ts 순수 함수 검증
import { expect, test } from 'claude-code/testing'

import { STATUS_SCRIPT, allowShare, levelOf, resolveRoute, panelModel, segments, gateAlert, matchesCommand, parseDecision, parseGate, statusText, summarizeLog } from './logic'

const ASK = '{"ts":1,"gate":"bash-risk","mode":"audit","verdict":"ask","probs":{"allow":0.3,"ask":0.65,"deny":0.05},"backend":"local","model":"clef-flash","latency_ms":1107.4,"rule":null,"failure":null,"command":"rm -rf build"}'

test('게이트 로그 한 줄을 읽는다', () => {
  const gate = parseGate(ASK)
  expect(gate?.verdict).toBe('ask')
  expect(gate?.backend).toBe('local')
  expect(parseGate('not json')).toBe(null)
  expect(parseGate(JSON.stringify({ ts: 1, verdict: null, prefiltered: true }))?.verdict).toBe('none')
  expect(gateAlert(parseGate(JSON.stringify({ ts: 1, verdict: null }))!)).toBe(undefined)
})

test('ask와 deny만 알림이 되고 색이 다르다', () => {
  const ask = parseGate(ASK)!
  expect(gateAlert(ask)).toEqual({ ts: 1, text: 'gate ask · 65%', color: '#e5b567' })
  expect(gateAlert({ ...ask, verdict: 'allow' })).toBe(undefined)
  const deny = gateAlert({ ...ask, verdict: 'deny', rule: 'grep *.env *' })
  expect(deny?.text).toBe('gate deny · rule grep *.env *')
  expect(deny?.color).toBe('#e06c75')
})

test('명령 앞부분으로 로그와 대조한다', () => {
  const ask = parseGate(ASK)!
  expect(matchesCommand(ask, ' rm -rf build ')).toBe(true)
  expect(matchesCommand(ask, 'ls')).toBe(false)
})

test('상태 줄에 백엔드·지연·데몬을 보인다', () => {
  // 엔진이 상태 줄 앞에 플러그인 이름(decide:)을 붙이므로 문구에 다시 넣지 않는다.
  expect(statusText(parseGate(ASK), true)).toBe('local/clef-flash · 1107ms · daemon ●')
  expect(statusText(null, false)).toBe('daemon ○')
})

test('상태 스크립트는 로그 줄을 echo가 아니라 printf로 낸다', () => {
  // macOS의 sh는 echo가 \\n 같은 이스케이프를 해석한다. 명령에 줄바꿈이 든 게이트 로그 줄이 깨져 상태 줄에서 게이트 정보가 사라졌다.
  expect(STATUS_SCRIPT).not.toContain('echo "LAST=')
  expect(STATUS_SCRIPT).not.toContain('echo "MODEL=')
  expect(STATUS_SCRIPT).toContain("printf 'LAST=%s")
  expect(STATUS_SCRIPT).toContain("printf 'MODEL=%s")
})

test('decide와 decide_many 결과를 줄로 바꾼다', () => {
  const one = '{"answer":{"type":"noul","noul":0.56},"routing":{"backend":"typesafe","model":"jev-1.13.0"},"latency_ms":460.4}'
  expect(parseDecision(one)?.lines).toEqual(['q: noul 56%'])

  const many = '{"answers":{"a":{"type":"choice","choice":"푸시","confidence":0.94},"b":{"type":"score","score":1.2,"confidence":0.8}},"routing":{"backend":"local","model":"clef-flash","cached":true},"latency_ms":0}'
  const parsed = parseDecision(many)
  expect(parsed?.lines).toEqual(['a: 푸시 (94%)', 'b: score 1.2 (80%)'])
  expect(parsed?.cached).toBe(true)
  expect(parseDecision('{"routing":{}}')).toBe(null)
})

const row = (o: object) => JSON.stringify({ ts: 1, verdict: 'allow', backend: 'local', failure: null, rule: null, prefiltered: false, latency_ms: 100, ...o })

test('로그를 판정·방식·지연 분포로 집계한다', () => {
  const log = [
    row({ latency_ms: 100 }),
    row({ latency_ms: 600, verdict: 'ask' }),
    row({ latency_ms: 2500, backend: 'typesafe' }),
    row({ prefiltered: true, verdict: null, latency_ms: 0 }),
    row({ failure: '데몬이 2000ms 안에 답하지 않았습니다', verdict: null }),
    row({ rule: 'grep *.env *', verdict: 'deny', latency_ms: 0 }),
    'broken line',
  ].join('\n')
  const s = summarizeLog(log)
  expect(s.total).toBe(6)
  expect(s.verdicts).toEqual({ allow: 2, ask: 1, deny: 1 })
  expect(s.kinds['prefilter']).toBe(1)
  expect(s.kinds['fail-open']).toBe(1)
  expect(s.latency.local.n).toBe(2)
  expect(s.latency.local.avg).toBe(350)
  expect(s.latency.typesafe.max).toBe(2500)
})

test('누적 막대는 항상 정확히 width칸이고 0이 아닌 항목은 최소 1칸이다', () => {
  const items = [
    { label: 'a', n: 1000, color: 'x' },
    { label: 'b', n: 1, color: 'y' },
    { label: 'c', n: 0, color: 'z' },
  ]
  const segs = segments(items, 40)
  expect(segs.reduce((a, g) => a + g.text.length, 0)).toBe(40)
  expect(segs.length).toBe(2)
  expect(segs[1].text.length).toBe(1)
  expect(segments([{ label: 'a', n: 0, color: 'x' }], 40)).toEqual([])
})

test('패널 구역과 허용 비율', () => {
  const log = [row({ latency_ms: 100 }), row({ latency_ms: 300, verdict: 'ask' }), row({ latency_ms: 2500, backend: 'typesafe' })].join('\n')
  const stats = summarizeLog(log)
  const sections = panelModel(stats, 30, 'local')
  expect(sections.map(s => s.title)).toEqual(['• Gate', '• Type', '• Latency'])
  expect(sections[0].right).toBe('3 calls')
  expect(allowShare(stats)).toBe(67)
  expect(sections[2].bar.reduce((a, g) => a + g.text.length, 0)).toBe(30)
  expect(sections[2].right).toBe('Avg 2 200ms')
  expect(sections[2].rightColor).toBe('#6fbf73')
  expect(sections[2].note).toBe('Last 2 · P90 300ms · Max 300ms')
  expect(panelModel(stats, 30, 'typesafe')[2].rightColor).toBe('#e06c75')
  expect(panelModel(stats, 30, 'nothing')[2].note).toBe('No samples yet')
})

test('백엔드와 접속 대상은 환경변수, 설정 파일, 기본값 순으로 정한다', () => {
  const env = resolveRoute('PID=99\nDECIDE_BACKEND=typesafe\nKEY=1\nCFG_backend=local')
  expect(env.backend).toBe('typesafe')
  expect(env.backendSource).toBe('env')
  expect(env.target).toBe('https://api.typesafe.ai/v1/systemone')
  expect(env.targetSource).toBe('default')
  expect(env.isDaemonUp).toBe(true)

  const file = resolveRoute('PID=\nKEY=0\nCFG_backend=typesafe\nCFG_url=http://127.0.0.1:8009/v1/systemone')
  expect(file.backendSource).toBe('config.toml')
  expect(file.target).toBe('http://127.0.0.1:8009/v1/systemone')
  expect(file.isDaemonUp).toBe(false)

  const bare = resolveRoute('PID=1\nKEY=0')
  expect(bare.backend).toBe('local')
  expect(bare.target).toBe('mlx-community/clef-flash-8bit')
  expect(resolveRoute('KEY=1').backend).toBe('typesafe')
})

test('URL의 사용자 정보는 가린다', () => {
  expect(resolveRoute('KEY=1\nDECIDE_TYPESAFE_URL=http://user:pw@host:8009/v1/systemone').target).toBe('http://host:8009/v1/systemone')
})

test('지연은 백엔드별 최근 10건만 평균에 넣고 등급 색이 달라진다', () => {
  const old = Array.from({ length: 3 }, () => row({ latency_ms: 5000 }))
  const recent = Array.from({ length: 10 }, (_, i) => row({ latency_ms: 100 + i * 20 }))
  const l = summarizeLog([...old, ...recent].join('\n')).latency.local
  expect(l.n).toBe(10)
  expect(l.recent[0]).toBe(100)
  expect(l.avg).toBe(190)
  expect(levelOf(299).color).toBe('#6fbf73')
  expect(levelOf(300).color).toBe('#61afef')
  expect(levelOf(800).color).toBe('#e5b567')
  expect(levelOf(1500).color).toBe('#e06c75')
})

test('최근 10건 누적 막대는 지연에 비례하고 조각마다 등급 색이다', () => {
  const log = [row({ latency_ms: 100 }), row({ latency_ms: 900 }), row({ latency_ms: 2000 })].join('\n')
  const bar = panelModel(summarizeLog(log), 60, 'local')[2].bar
  expect(bar.map(g => g.color)).toEqual(['#6fbf73', '#e5b567', '#e06c75'])
  expect(bar.reduce((a, g) => a + g.text.length, 0)).toBe(60)
  expect(bar[2].text.length).toBeGreaterThan(bar[1].text.length)
})
