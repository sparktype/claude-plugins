// rules.ts 순수 함수의 동작을 검증하는 테스트
import { expect, test } from 'claude-code/testing'

import { isRiskyBash, isSensitivePath, parseCommand, parseLastQuestion, speakViolation, statusLine, voiceLabel } from './rules'

test('speak 계약', () => {
  expect(speakViolation('바뀐 점입니다. 다음 행동입니다.')).toBeUndefined()
  expect(speakViolation('- 하나\n- 둘')).toBeDefined()
  expect(speakViolation('가. 나. 다. 라.')).toBeDefined()
  expect(speakViolation('가'.repeat(241))).toBeDefined()
})

test('명령 파싱은 인자 없는 토글을 거부한다', () => {
  expect(parseCommand('mute')).toEqual({ error: '/debrief mute on|off|toggle 로 명시하세요.' })
  expect(parseCommand('mute off')).toEqual({ argv: ['mute', 'off'] })
  expect(parseCommand('mode night')).toEqual({ argv: ['mode', 'night'] })
  expect(parseCommand('mode ; rm')).toHaveProperty('error')
  expect(parseCommand('')).toEqual({ argv: ['status'] })
})

test('상태바와 위험 분류', () => {
  const out = '프로세스: 실행 중\n음소거: 켜짐\n모드: focus\n도우미 음성: 꺼짐'
  expect(statusLine(out)).toBe('🔇 focus · 도우미 꺼짐')
  expect(statusLine('프로세스: 중지됨')).toBe('✖ 중지')
  expect(voiceLabel('F4')).toBe('셰릴(F4)')
  expect(voiceLabel('X9')).toBe('X9')
  expect(isRiskyBash('rm -rf build')).toBe(true)
  expect(isRiskyBash('cargo test')).toBe(false)
  expect(isSensitivePath('/a/.env')).toBe(true)
  expect(isSensitivePath('/a/src/main.rs')).toBe(false)
})

test('AskUserQuestion 결과에서 마지막 질문과 답을 뽑는다', () => {
  expect(
    parseLastQuestion({
      questions: [{ question: '어디에 저장할까요?' }],
      answers: { '어디에 저장할까요?': '건너뜀' },
    })
  ).toEqual({ question: '어디에 저장할까요?', answer: '건너뜀' })

  expect(
    parseLastQuestion({
      questions: [{ question: '첫 번째' }, { question: '두 번째' }],
      answers: { '첫 번째': '답1', '두 번째': '답2' },
    })
  ).toEqual({ question: '두 번째', answer: '답2' })

  expect(parseLastQuestion({})).toBeUndefined()
  expect(parseLastQuestion({ questions: [{ question: '질문' }], answers: {} })).toBeUndefined()
})
