// decide 게이트 상태를 패널·상태 줄·알림 밴드로 보여주는 모드의 훅 등록
import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Decision, Gate } from '../types'
import { COLORS, ROUTE_SCRIPT, allowShare, gateAlert, matchesCommand, panelModel, parseDecision, parseGate, resolveRoute, statusText, summarizeLog } from './logic'

const PANE = 'decide-stats'
const gate = atom({ plugin: 'decide', key: 'gate' } as const, null)
const isDaemonUp = atom({ plugin: 'decide', key: 'isDaemonUp' } as const, false)
const decision = atom({ plugin: 'decide', key: 'decision' } as const, null)
const isHidden = atom({ plugin: 'decide', key: 'isHidden' } as const, false)
const stats = atom({ plugin: 'decide', key: 'stats' } as const, '')
const route = atom({ plugin: 'decide', key: 'route' } as const, null)
const alert = atom({ plugin: 'decide', key: 'alert' } as const, null)

// gate.log 마지막 줄, 모델이 답한 마지막 줄, 데몬 소켓을 읽어 상태 줄을 갱신한다. 마지막 줄을 돌려준다.
// 규칙·사전 필터 줄은 backend가 비어 있어 상태 줄에는 모델이 답한 마지막 줄을 쓴다.
async function refresh($: any): Promise<Gate | null> {
  const run = await $.process.run([
    'sh',
    '-c',
    `f=~/.cache/decide/gate.log
echo "LAST=$(tail -n 1 $f)"
echo "MODEL=$(grep '"backend":"' $f | tail -n 1)"
test -S ~/.cache/decide/decide.sock && echo UP || echo DOWN`,
  ])
  const field = (key: string) => run.stdout.split('\n').find((l: string) => l.startsWith(key + '='))?.slice(key.length + 1) ?? ''
  const last = parseGate(field('LAST'))
  const model = parseGate(field('MODEL'))
  const daemon = run.stdout.split('\n').includes('UP')
  await update($, gate, () => model)
  await update($, isDaemonUp, () => daemon)
  $.ui.status(statusText(model, daemon))
  return last
}

async function loadStats($: any) {
  const run = await $.process
    .run(['sh', '-c', 'tail -n 5000 ~/.cache/decide/gate.log'])
    .catch(() => null)
  await update($, stats, () => (run ? run.stdout : ''))
  const found = await $.process.run(['sh', '-c', ROUTE_SCRIPT]).catch(() => null)
  await update($, route, () => (found ? resolveRoute(found.stdout) : null))
}

export const register: Register = on => {
  let seenTs = 0

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'decide-stats',
      description: 'Show decide gate stats in a pane',
    })
    await refresh($).catch(() => undefined)
    $.clock.every(30_000, () => void refresh($).catch(() => undefined))

    return next(e)
  })

  // 2. 게이트 토스트: 명령이 끝난 뒤 로그에서 이 명령의 판정을 찾는다.
  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const ran = await next(e)
    const latest = await refresh($).catch(() => null)

    if (latest && latest.ts > seenTs && matchesCommand(latest, e.command)) {
      seenTs = latest.ts
      const note = gateAlert(latest)
      if (note) {
        $.ui.toast(note.text, { timeoutMs: 10_000 })
        await update($, alert, () => note)
        $.clock.after(10_000, () => void update($, alert, cur => (cur?.ts === note.ts ? null : cur)))
      }
    }

    return ran
  })

  // 4. 판정 밴드: decide, decide_many 결과를 저장해 프롬프트 위에 보여준다.
  for (const tool of ['mcp__decide__decide', 'mcp__decide__decide_many']) {
    on('tool.call', { tool }, async ($, e, next) => {
      const ran = await next(e)
      const parsed = ran.isError || ran.text === undefined ? null : parseDecision(ran.text)

      if (parsed) {
        await update($, decision, () => parsed)
        await update($, isHidden, () => false)
      }

      return ran
    })
  }

  // 3. 통계 패널
  let isPolling = false

  on('command.run', { command: 'decide-stats' }, async $ => {
    await $.ui.open({ id: PANE, title: 'decide stats' })
    await loadStats($)

    // 패널을 처음 연 뒤로는 5초마다 스스로 갱신한다. 닫는 이벤트를 몰라 세션이 끝날 때까지 돈다.
    if (!isPolling) {
      isPolling = true
      $.clock.every(5_000, () => void loadStats($))
    }

    return { text: 'decide stats pane opened.' }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const data = summarizeLog(await read($, stats))
    const width = Math.max(20, Math.min(64, (e.viewport?.columns ?? 80) - 6))
    const badge = allowShare(data)
    const where = await read($, route)

    return (
      <Box flexDirection="column">
        {where && (
          <Box borderStyle="round" borderColor="subtle" paddingX={1} flexDirection="column" width={width + 4}>
            <Box justifyContent="space-between">
              <Text bold>• Backend</Text>
              <Text color={where.isDaemonUp ? COLORS.allow : COLORS.deny}>Daemon {where.isDaemonUp ? '●' : '○ down'}</Text>
            </Box>
            <Text>
              <Text bold>{where.backend}</Text>
              <Text dimColor> (</Text>
              <Text color={COLORS.blue}>{where.target}</Text>
              <Text dimColor>)</Text>
            </Text>
          </Box>
        )}
        {panelModel(data, width, where?.backend ?? '').map((section, index) => (
          <Box borderStyle="round" borderColor="subtle" paddingX={1} flexDirection="column" width={width + 4}>
            <Box justifyContent="space-between">
              <Text bold color={index === 0 ? '#d97757' : undefined}>
                {section.title}
              </Text>
              {index === 0 ? (
                <Text>
                  <Text dimColor>{section.right} · Allow </Text>
                  <Text backgroundColor={COLORS.allow} color="#000000" bold>
                    {` ${badge}% `}
                  </Text>
                </Text>
              ) : (
                <Text color={section.rightColor} dimColor={!section.rightColor}>
                  {section.right}
                </Text>
              )}
            </Box>
            <Box flexDirection="column">
              <Text>
                {section.bar.map(seg => (
                  <Text color={seg.color}>{seg.text}</Text>
                ))}
              </Text>
              <Box flexWrap="wrap" columnGap={1}>
                {section.items.map(item => (
                  <Text>
                    <Text color={item.color}>■ </Text>
                    <Text>{item.label} </Text>
                    <Text bold>{item.n}</Text>
                  </Text>
                ))}
              </Box>
            </Box>
            {section.note && <Text dimColor>{section.note}</Text>}
          </Box>
        ))}
      </Box>
    )
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const last: Decision | null = await read($, decision)
    const flash = await read($, alert)
    const isShown = last !== null && !(await read($, isHidden))

    if (e.props.hasSurvey || (!flash && !isShown)) {
      return next(e)
    }

    const { Box, Button, Text } = $.ui.resolve(e)

    return (
      <Box flexDirection="column">
        {flash && (
          <Text>
            <Text color={flash.color}>● </Text>
            <Text bold>decide </Text>
            <Text>{flash.text}</Text>
          </Text>
        )}
        {isShown && last && (
          <Box flexDirection="column">
            <Box>
              <Text dimColor>
                decide · {last.backend}/{last.model} · {last.cached ? 'cached' : `${Math.round(last.latencyMs)}ms`}{' '}
              </Text>
              <Button key="hide" label="Hide" onPress={() => update($, isHidden, () => true)} />
            </Box>
            {last.lines.slice(0, 6).map(line => (
              <Text>{line}</Text>
            ))}
          </Box>
        )}
      </Box>
    )
  })
}
