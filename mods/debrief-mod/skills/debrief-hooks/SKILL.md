---
name: debrief-hooks
description: Use when debrief hook notices are too frequent, never arrive, or the user asks what each notice means - 권한 요청 알림, 입력 대기, 긴 턴 완료, StopFailure, 쿨다운, teamNotices, hooks.<host>.missing. 훅 알림 이해와 조정.
---

# debrief 훅 알림

에이전트가 스스로 말할 수 없는 순간에 debrief가 **고정 문구**로 알린다. 텍스트를 생성하지 않고 코드에 박힌 경어체 문구를 `lane=work`로 보낸다. 그래서 `debrief companion off`로는 꺼지지 않고 `debrief mute on`으로만 꺼진다.

## 알림 종류

| 이벤트 | 알림 | 쿨다운 | 호스트 |
| --- | --- | --- | --- |
| PermissionRequest | 권한 승인을 기다리고 있습니다 | 연속 요청은 합쳐짐 | Claude, Codex |
| Stop | 에이전트가 말하지 않은 `longTurnSeconds` 이상 턴이 끝났습니다 | 없음 | Claude, Codex |
| StopFailure | API 오류로 중단(한도·과부하 / 계정 / 그 외로 문구 구분) | 없음 | Claude |
| Notification | 입력을 기다리고 있습니다(`idle_prompt`, `agent_needs_input`만) | 300초 | Claude |
| Elicitation | 추가 입력이 필요합니다 | 없음 | Claude |
| PermissionDenied | 자동 모드가 도구 호출을 거부했습니다 | 120초 | Claude |
| TeammateIdle · TaskCompleted | 팀 이벤트. `teamNotices`를 켠 경우만 | 120초 | Claude |

문서화된 동작 외에 알림이 더 나오지 않는다. SessionStart·UserPromptSubmit·SubagentStart 훅은 말하지 않고 speak 규약 context만 넣는다. SessionEnd는 세션 상태를 지울 뿐 알림이 없다.

Grok은 훅이 없어 알림도 없다. 대신 스킬과 MCP 도구 설명이 계약이다.

## 알림이 안 올 때

1. **배선.** `debrief doctor`에서 `hooks.claude.missing`이나 `hooks.codex.missing`을 찾는다. 누락 이벤트와 복구 명령이 같이 나온다(보통 `debrief install --claude --repair`). Codex는 설치 후 `/hooks`에서 신뢰해야 한다.
2. **음소거.** `debrief status`가 `음소거: 켜짐`이면 훅 알림도 안 나온다.
3. **긴 턴 알림.** 에이전트가 이미 speak로 브리핑한 턴, 또는 `longTurnSeconds`보다 짧은 턴은 침묵이 정상이다. `longTurnSeconds`가 `0`이면 꺼져 있다.
4. **쿨다운.** 같은 종류가 120–300초 안에 반복되면 두 번째는 건너뛴다.
5. **상태 저장소를 못 쓸 때.** 쿨다운이 필요한 알림은 조용히 건너뛴다. `last-error.json`을 확인한다.
6. **필드 이름.** Notification의 `notification_type`, StopFailure의 `error_type` 같은 호스트 필드가 달라지면 알림이 나가지 않는 쪽(침묵)으로 실패한다. 호스트 버전이 바뀐 직후면 의심한다.

## 너무 잦을 때

| 원인 | 처방 |
| --- | --- |
| 긴 작업마다 울린다 | `longTurnSeconds`를 늘리거나 `0`(설정 파일. `debrief-tune`) |
| 팀 알림이 잦다 | `teamNotices`를 `false`로 |
| 모든 알림이 거슬린다 | `debrief mute on`. 훅 알림만 끄는 설정은 없다 |
| 여러 프로젝트 세션에서 어디인지 모르겠다 | `sessionLabel`이 true면 프로젝트 이름이 앞에 붙는다 |

## 하지 않는 것

- 알림 문구를 바꾸려고 하지 않는다. 문구는 코드에 박혀 있고 설정화하지 않는다.
- 훅을 직접 `settings.json`에서 고치지 않는다. 직접 고친 파일은 다이제스트가 달라 `--repair`가 남겨 두므로 이후 복구가 어긋난다. `debrief install --repair`를 쓴다.
