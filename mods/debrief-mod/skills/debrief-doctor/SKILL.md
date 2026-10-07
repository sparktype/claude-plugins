---
name: debrief-doctor
description: Use when debrief is silent or misbehaving - no sound, "말을 안 해요", the 오류 토스트 appeared, debrief doctor reports a problem, speak fails, or the MCP tool / hooks seem missing. 소리가 안 날 때, 데몬·모델·소켓·훅 진단.
---

# debrief 진단

소리가 안 나는 원인은 대개 음소거·모드, 데몬·소켓, 모델, 호스트 배선, 에이전트가 말하지 않음 중 하나다. 고치기 전에 읽기 전용 명령 두 개부터 돌린다.

```bash
~/.local/bin/debrief status
~/.local/bin/debrief doctor     # 정상이 아니면 종료 코드 1
cat ~/Library/Caches/debrief/last-error.json 2>/dev/null
```

`last-error.json`이 없으면 전송·합성 실패가 기록된 적이 없다는 뜻이다.

## 위에서부터 하나씩

| 순서 | 확인 | 증상이면 |
| --- | --- | --- |
| 1 | `status`의 `음소거: 켜짐` | `debrief mute off` |
| 2 | `모드`가 `night`·`quiet` | 볼륨 상한이 0.20·0.45라 작게 들린다. 서브에이전트는 `focus`·`quiet`·`night`에서 아예 안 나온다. `debrief mode normal` |
| 3 | `도우미 음성: 꺼짐` | 도우미(companion) 브리핑만 빠진다. `debrief companion on` |
| 4 | `doctor`의 `dnd.readable` 등이 보이고 방해금지가 켜져 있다 | 방해금지 연동(`dnd`)이 모드를 최소 `quiet`로 올린 상태다. `debrief dnd off` |
| 5 | `프로세스`·`소켓`·`LaunchAgent` | 아래 복구표 |
| 6 | `모델`이 없거나 `(사용할 수 없음)` | 아래 복구표 |
| 7 | 위가 모두 정상인데 에이전트가 말하지 않는다 | 호스트 배선을 본다(아래) |

## 복구표

`doctor`가 안내하는 처음 맞는 한 줄만 따른다.

| doctor 코드 | 뜻 | 복구 |
| --- | --- | --- |
| `daemon.missing` | plist는 있는데 프로세스가 없다 | `debrief start` |
| `daemon.stale_pid` · `daemon.invalid_pid` | pid 파일이 낡았거나 깨졌다 | `debrief install --repair` |
| `socket.missing` | 프로세스는 있는데 소켓이 없다 | `debrief install --repair` |
| `launch_agent.missing` | plist가 없다 | `debrief install --repair` |
| `model.missing` · `model.invalid_marker` | 모델이 없거나 손상됐다 | 모델을 둔 뒤 `debrief install --repair` |

모델이 없으면 데몬은 `last-error.json`만 남기고 소켓을 열지 않은 채 대기한다. 이때 `debrief start`는 이미 실행 중이라 프로세스를 바꾸지 않는다. `install --repair`로 교체해야 한다.

## 에이전트가 말하지 않을 때

- `doctor`에 `mcp.claude.missing`이 있으면 Claude의 MCP 배선이 없다. `debrief install --claude --repair`를 하고 Claude를 재시작한다. MCP가 이미 보이면 `mcp__debrief__install`에 `{ "hosts": ["claude"], "repair": true }`를 넘겨도 된다.
- `hooks.claude.missing`은 시작 훅 이벤트가 빠졌다는 뜻이다. 누락 이벤트와 복구 명령이 같이 나온다. Codex는 훅을 설치한 뒤 `/hooks`에서 신뢰해야 한다.
- `host.<호스트>.invalid_json` · `invalid_toml`은 설정 파일이 깨졌다. 직접 고친 파일은 다이제스트가 달라 `--repair`가 건드리지 않고 남긴다. 파일을 고친 뒤 다시 돌린다.
- Grok은 훅이 없다. 도구 이름이 `debrief__speak`이고 `/mcps`로 도구를 갱신해야 보인다.
- debrief-mod가 켜져 있으면 speak가 가드에 거부됐을 수 있다(한 턴 2회, 240자 초과, 3문장 초과, 목록). 거부 문구가 도구 오류로 보인다. 에이전트가 짧게 다시 한 번 부르면 된다.

## 하지 않는 것

- `debrief mute`, `debrief companion`, `debrief dnd`를 인자 없이 쓰지 않는다. 인자가 없으면 **토글**이라 상태를 모르고 부르면 반대로 바뀐다. 항상 `on`, `off`로 쓴다.
- 사용자 확인 없이 `install --repair`, `uninstall`, `stop`을 실행하지 않는다. 진단은 읽기 전용이고 고치는 일은 제안한 뒤 한다.
- `last-error.json`이나 `config.json`을 지우거나 손으로 쓰지 않는다. `config.json`을 바꿔야 하면 `debrief-tune`을 쓴다.
