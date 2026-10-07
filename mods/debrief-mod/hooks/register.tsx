// debrief 데몬 제어 커맨드·상태바·오류 토스트·speak 가드·오너십 밴드·브리핑 로그 Pane을 묶은 훅 모듈
import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Brief, Ownership } from '../types'
import { isRiskyBash, isSensitivePath, parseCommand, speakViolation, statusLine, voiceLabel } from './rules'

const SPEAK = 'mcp__debrief__speak'
const PANE = 'debrief-log'
const EDIT_TOOLS = ['Edit', 'Write', 'MultiEdit', 'NotebookEdit']

const briefs = atom({ plugin: 'debrief-mod', key: 'briefs' } as const, [])
const ownership = atom({ plugin: 'debrief-mod', key: 'ownership' } as const, null)
const status = atom({ plugin: 'debrief-mod', key: 'status' } as const, null)
const isHidden = atom({ plugin: 'debrief-mod', key: 'isHidden' } as const, false)

export const register: Register = on => {
  // ponytail: 모듈 변수라 핫 리로드 때 초기화됨. 세션 걸쳐 유지가 필요하면 $.state로 이전.
  let hasSpoken = false
  let lastErrorStamp: string | undefined
  let files = new Set<string>()
  let risky: string[] = []
  let sensitive: string[] = []

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'debrief',
      description: 'debrief 제어: status|doctor|log|mode|mute|companion|dnd',
      argumentHint: 'status | doctor | log | mode [모드] | mute|companion|dnd on|off|toggle',
    })
    const home = (await $.env.get('HOME')) ?? ''
    const errorFile = `${home}/Library/Caches/debrief/last-error.json`
    const refreshStatus = async () => {
      try {
        const ran = await $.process.run([`${home}/.local/bin/debrief`, 'status'], { timeoutMs: 15000 })
        await update($, status, () => statusLine(ran.stdout))
      } catch {
        await update($, status, () => '✖ 실행 불가')
      }
    }
    // 첫 호출은 기준선만 잡고 토스트하지 않는다(이전 세션의 낡은 오류 방지).
    const checkError = async (isFirst: boolean) => {
      try {
        const err = JSON.parse(await $.fs.read(errorFile)) as {
          timestamp?: string
          component?: string
          message?: string
        }
        if (err.timestamp === lastErrorStamp) return
        lastErrorStamp = err.timestamp
        if (!isFirst) {
          $.ui.toast(`debrief 오류(${err.component ?? '?'}): ${(err.message ?? '').slice(0, 80)} — /debrief doctor`, {
            timeoutMs: 10000,
          })
        }
      } catch {
        // 파일 없음 = 오류 없음
      }
    }
    await checkError(true)
    await refreshStatus()
    $.clock.every(15000, () => void refreshStatus())
    $.clock.every(10000, () => void checkError(false))

    return next(e)
  })

  on('command.run', { command: 'debrief' }, async ($, e) => {
    const parsed = parseCommand(e.args)
    if ('error' in parsed) return { text: parsed.error }
    if ('open' in parsed) {
      await $.ui.open({ id: PANE, title: 'debrief 브리핑 로그' })
      return { text: '브리핑 로그 Pane을 열었습니다.' }
    }
    const home = (await $.env.get('HOME')) ?? ''
    const ran = await $.process.run([`${home}/.local/bin/debrief`, ...parsed.argv], { timeoutMs: 15000 })
    // 다음 15초 타이머를 기다리지 않고 상태바를 바로 갱신한다.
    const after = await $.process.run([`${home}/.local/bin/debrief`, 'status'], { timeoutMs: 15000 })
    await update($, status, () => statusLine(after.stdout))

    return { text: (ran.stdout || ran.stderr).trim() || `(exit ${ran.exitCode})` }
  })

  on('prompt.submit', async ($, e, next) => {
    hasSpoken = false
    files = new Set()
    risky = []
    sensitive = []
    await update($, ownership, () => null)
    const home = (await $.env.get('HOME')) ?? ''
    try {
      const ran = await $.process.run([`${home}/.local/bin/debrief`, 'status'], { timeoutMs: 15000 })
      await update($, status, () => statusLine(ran.stdout))
    } catch {
      await update($, status, () => '✖ 실행 불가')
    }

    return next(e)
  })

  // speak 계약 가드: 턴당 1회, 두 문장, 목록 금지. 서브에이전트 priority는 예외.
  on('tool.call', { tool: SPEAK }, async ($, e, next) => {
    const input = e as unknown as Record<string, string | undefined>
    const text = input.text ?? ''
    if (input.priority !== 'subagent') {
      if (hasSpoken) return { deny: 'debrief: 한 턴에 speak는 한 번만 호출합니다.' }
      const violation = speakViolation(text)
      if (violation) return { deny: `debrief: ${violation}` }
    }
    const ran = await next(e)
    if (ran.deny === undefined) {
      hasSpoken = true
      const brief: Brief = {
        at: await $.clock.now(),
        text,
        voice: input.voice,
        lane: input.lane,
        emotion: input.emotion,
      }
      await update($, briefs, list => [...list, brief].slice(-50))
    }

    return ran
  })

  // 오너십 수집: 수정 파일·위험 명령·민감 경로
  on('tool.call', async ($, e, next) => {
    const input = e as unknown as { file_path?: string; command?: string }
    if (EDIT_TOOLS.includes(e.tool) && input.file_path) {
      files.add(input.file_path)
      if (isSensitivePath(input.file_path)) sensitive.push(input.file_path)
    } else if (e.tool === 'Bash' && input.command && isRiskyBash(input.command)) {
      risky.push(input.command.replace(/\s+/g, ' ').slice(0, 60))
    }

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    if (files.size + risky.length > 0) {
      const summary: Ownership = { files: files.size, risky: [...risky], sensitive: [...sensitive] }
      await update($, ownership, () => summary)
      await update($, isHidden, () => false)
    }

    return next(e)
  })

  // 프롬프트 위 테두리 없는 한 줄: 상태 한 줄 + (있으면) 오너십 요약. 상태가 아직 없으면 '…'를 보인다. 마지막 speak의 목소리를 덧붙인다.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const line = (await read($, status)) ?? '…'
    if (e.props.hasSurvey) return next(e)

    const lastVoice = (await read($, briefs)).at(-1)?.voice
    const summary = await read($, ownership)
    const isShown = summary !== null && !(await read($, isHidden))
    const { Box, Button, Text } = $.ui.resolve(e)
    const parts: string[] = []
    if (isShown) {
      parts.push(`수정 ${summary.files}개`)
      if (summary.risky.length) parts.push(`위험 명령 ${summary.risky.length}개(${summary.risky[0]})`)
      if (summary.sensitive.length) parts.push(`민감 경로 ${summary.sensitive.length}개`)
    }

    return (
      <Box paddingX={1} gap={2}>
        <Text>{lastVoice ? `${line} · ${voiceLabel(lastVoice)}` : line}</Text>
        {isShown && <Text dimColor>직접 확인: {parts.join(' · ')}</Text>}
        {isShown && <Button key="hide" label="숨김" onPress={() => update($, isHidden, () => true)} />}
      </Box>
    )
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const list = await read($, briefs)
    const room = Math.max(1, Math.floor(((e.viewport?.rows ?? 24) - 4) / 2))

    return (
      <Box flexDirection="column">
        {list.length === 0 && <Text dimColor>아직 브리핑이 없습니다.</Text>}
        {list
          .slice(-room)
          .reverse()
          .map(b => (
            <Box key={String(b.at)} flexDirection="column">
              <Text dimColor>
                {new Date(b.at).toTimeString().slice(0, 8)} {b.voice ?? '-'} {b.lane ?? 'companion'}
                {b.emotion ? ` · ${b.emotion}` : ''}
              </Text>
              <Text>{b.text}</Text>
            </Box>
          ))}
      </Box>
    )
  })
}
