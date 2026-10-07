---
name: debrief-voices
description: Use when choosing or explaining debrief speak arguments - which voice (F1-M5), lane (companion or work), emotion, priority, speed and volume to pass, or what a voice name in the status line means. 목소리 선택, lane, emotion, subagent 발화.
---

# 목소리·lane·emotion 고르기

`speak`는 `text`, `voice`, `speed`, `volume`이 필수다. 아래 기준으로 나머지를 정한다. 세션 훅이 목소리·속도·볼륨·세션 아이디를 알려 주면 그 값을 우선한다.

## 목소리

| 코드 | 이름 | 역할(work lane 기본) |
| --- | --- | --- |
| F1 | 연아 | 기본(역할을 모를 때) |
| F2 | 마리 | tester |
| F3 | 제인 | explorer |
| F4 | 셰릴 | ops |
| F5 | 리사 | specialist |
| M1 | 스티브 | planner |
| M2 | 빌 | reviewer |
| M3 | 일론 | optimizer |
| M4 | 리누스 | builder |
| M5 | 팀 | guardian |

- **companion lane**의 목소리는 세션마다 F1부터 M5까지 돌아간다. 같은 `session`을 넘기면 같은 목소리를 유지하고, 열 개를 넘기면 처음부터 다시 쓴다. `session`을 빼면 그 MCP 프로세스가 받은 목소리를 쓴다.
- **work lane**은 역할표를 쓴다. 서브에이전트는 `agent_type`에 따라 목소리가 정해지고, 등록되지 않은 유형은 `F1`이다.
- 설정의 `categoryVoices`가 비어 있지 않으면 거기 적힌 역할 목소리가 우선한다.

## lane

| lane | 용도 | 기본 속도·볼륨 |
| --- | --- | --- |
| `companion` (기본) | 사용자에게 하는 턴 브리핑. 바뀐 점 + 다음 행동 | 속도 약 0.93, 볼륨 약 0.85 |
| `work` | 사실만 전하는 보고. 서브에이전트 완료, 훅 알림 | 역할표 속도 |

`debrief companion off`면 companion lane은 재생되지 않고 work lane은 음소거가 아닌 한 계속 나온다. 훅 알림(권한 요청, 입력 대기 등)이 companion을 꺼도 들리는 이유다.

## emotion

재생 성향만 바꾸며 말의 내용은 바꾸지 않는다. 닫힌 목록이다.

| 값 | 쓰는 때 |
| --- | --- |
| `neutral` (기본) | 평범한 보고 |
| `focused` | 구현·분석을 끝내고 다음 확인을 요청할 때 |
| `warm` | 잘 풀린 결과를 알릴 때 |
| `relieved` | 문제가 해결됐을 때 |
| `concerned` | 위험하거나 되돌리기 어려운 일을 확인받아야 할 때 |
| `tired` | 길게 시도해도 못 푼 막힘을 알릴 때 |

고르기 어려우면 생략한다. `emotion: "auto"`는 `decide`가 켜져 있을 때만 의미가 있고 불가하면 기본 성향으로 돌아간다.

## priority

- `main` (기본): 사용자에게 하는 말.
- `subagent`: 서브에이전트가 끝나고 한 줄 보고할 때. `focus`·`quiet`·`night` 모드에서는 재생되지 않는다. 작업이 오래 걸린 서브에이전트가 `main`으로 말하면 `decide`가 `main`으로 올릴 수도 있다.

## 값의 범위

| 필드 | 범위 |
| --- | --- |
| `speed` | 0.7–2.0 |
| `volume` | 0.0–1.0 (모드의 볼륨 상한이 한 번 더 깎는다) |
| `text` | 800자 이하 |

숫자는 문자열로 와도 받는다(`"0.9"`). 볼륨은 모드의 상한으로 깎인다. 범위를 벗어난 값을 어떻게 처리하는지는 확인하지 못했으니 항상 범위 안에서 쓴다.

## 화면의 목소리 이름

debrief-mod의 프롬프트 위 줄은 `🔊 normal · 셰릴(F4)`처럼 **마지막으로 말한 speak의 voice**를 이름으로 바꿔 보여 준다. 서브에이전트가 마지막에 말했다면 그 역할 목소리가 보인다. 모듈이 다시 로드되면 다음 speak 전까지는 이름이 비어 있다.
