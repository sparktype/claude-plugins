# debrief-mod

[debrief](https://github.com/sparktype/debrief)(로컬 TTS 데몬)를 Claude Code 안에서 제어하고 지켜보는 모드다. debrief가 설치되어 있어야 의미가 있다.

- **`/debrief` 커맨드.** `status`, `doctor`, `log`, `mode [모드]`, `mute|companion|dnd on|off|toggle`을 터미널을 벗어나지 않고 실행한다. `debrief mute`처럼 인자 없는 토글 실수를 막으려고 `on|off|toggle`을 반드시 요구한다.
- **프롬프트 위 상태 한 줄.** `🔊 normal · 셰릴(F4)`처럼 음소거 여부, 모드, 마지막 speak의 목소리를 보여 준다. 데몬이 꺼지면 `✖ 중지`다. 15초마다, 프롬프트를 보낼 때, 그리고 `/debrief` 직후에 갱신한다.
- **오너십 요약.** 코드를 고친 턴이 끝나면 같은 줄에 "직접 확인: 수정 N개 · 위험 명령 · 민감 경로"와 숨김 버튼을 붙인다. 위험 명령과 민감 경로는 휴리스틱이다(`hooks/rules.ts`).
- **오류 토스트.** `~/Library/Caches/debrief/last-error.json`이 바뀌면 알린다. 세션 시작 때의 낡은 오류는 알리지 않는다.
- **speak 가드.** `mcp__debrief__speak`가 한 턴에 두 번 이상, 240자 초과, 3문장 초과, 목록 형태이면 거부한다. `priority: subagent`는 예외다. 가드 코드가 실패하면 speak를 막지 않는다.
- **브리핑 로그 Pane.** `/debrief log`로 최근 50개 브리핑(시각, 목소리, lane, emotion, 문구)을 본다.

## 스킬

| 스킬 | 언제 켜지나 | 하는 일 |
| --- | --- | --- |
| `debrief-mod:debrief-doctor` | 소리가 안 나거나 오류 토스트가 뜰 때, `debrief doctor`가 이상을 보고할 때 | `status`, `doctor`, `last-error.json`을 읽어 음소거·모드·데몬·모델·배선 순으로 원인을 좁히고 복구 명령을 안내(읽기 전용 진단) |
| `debrief-mod:debrief-tune` | 너무 시끄럽거나 알림이 잦을 때, 모드·볼륨·목소리를 바꿀 때 | 모드 효과, CLI로 바꾸는 항목과 `config.json` 키(`longTurnSeconds` 등), 백업-수정-검증 절차 |
| `debrief-mod:debrief-ownership` | 코드를 쓰거나 바꾼 턴을 speak로 마무리할 때, 가드가 거부했을 때 | 다음 행동으로 사용자가 직접 확인할 핵심을 고르는 기준과 두 문장 작성법 |
| `debrief-mod:debrief-voices` | speak 인자(voice, lane, emotion, priority)를 고를 때 | F1–M5 이름·역할, lane·emotion 선택 기준, 값 범위 |
| `debrief-mod:debrief-hooks` | 훅 알림이 잦거나 안 올 때 | 알림 종류와 쿨다운, 안 오는 원인 순서, `teamNotices`·`longTurnSeconds` 조정 |

## 요구 사항

- Apple Silicon macOS, debrief 설치(`brew install sparktype/tap/debrief` 다음 `debrief install`). 모드가 `~/.local/bin/debrief`를 부른다.
- Claude Code 터미널 세션. 프롬프트 위 줄은 터미널과 데스크톱 앱에서만 그려진다.
- speak 가드는 debrief의 Claude 호스트 MCP(`mcp__debrief__speak`)를 대상으로 한다.

## 설치

```
/plugin install debrief-mod --marketplace sparktype/claude-plugins
```

`Add marketplace?`에 `y`를 답하고 범위(user 권장)를 고른다.

## 읽고 쓰는 것

`debrief` 실행 파일(`status`와 사용자가 입력한 `/debrief` 명령)과 `last-error.json` 읽기가 전부다. 명령 인자는 화이트리스트로 검증하고 셸을 거치지 않는다. 파일을 쓰지 않는다.

## 개발

```bash
claude plugin validate .      # 이 폴더에서
claude plugin test .          # hooks/rules.test.ts 실행
claude --plugin-dir .         # 이 폴더를 직접 로드(저장하면 자동으로 다시 로드)
```

설계 결정은 저장소 루트의 `docs/debrief-mod/context-notes.md`에 있다.
