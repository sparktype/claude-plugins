# debrief-mod

[debrief](https://github.com/sparktype/debrief)(로컬 TTS 데몬)를 Claude Code 안에서 제어하고 지켜보는 모드다. debrief가 설치되어 있어야 의미가 있다.

- **`/debrief` 커맨드.** `status`, `doctor`, `log`, `mode [모드]`, `mute|companion|dnd on|off|toggle`을 터미널을 벗어나지 않고 실행한다. `debrief mute`처럼 인자 없는 토글 실수를 막으려고 `on|off|toggle`을 반드시 요구한다.
- **프롬프트 위 상태 한 줄.** `🔊 normal · 셰릴(F4)`처럼 음소거 여부, 모드, 마지막 speak의 목소리를 보여 준다. 데몬이 꺼지면 `✖ 중지`다. 15초마다, 프롬프트를 보낼 때, 그리고 `/debrief` 직후에 갱신한다.
- **오너십 요약.** 코드를 고친 턴이 끝나면 같은 줄에 "직접 확인: 수정 N개 · 위험 명령 · 민감 경로"와 숨김 버튼을 붙인다. 위험 명령과 민감 경로는 휴리스틱이다(`hooks/rules.ts`).
- **오류 토스트.** `~/Library/Caches/debrief/last-error.json`이 바뀌면 알린다. 세션 시작 때의 낡은 오류는 알리지 않는다.
- **speak 가드.** `mcp__debrief__speak`가 한 턴에 두 번 이상, 240자 초과, 3문장 초과, 목록 형태이면 거부한다. `priority: subagent`는 예외다. 가드 코드가 실패하면 speak를 막지 않는다.
- **브리핑 로그 Pane.** `/debrief log`로 최근 50개 브리핑(시각, 목소리, lane, emotion, 문구)을 본다.

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
