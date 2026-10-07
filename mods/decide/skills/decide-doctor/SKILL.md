---
name: decide-doctor
description: Use when the decide MCP tools are missing, fail with 연결 실패 or Connection refused, answer from an unexpected backend, or the decide gate hook acts oddly - judged twice, daemon restarting, versions disagree.
---

# decide 진단

증상의 원인은 대개 백엔드 선택, 로컬 서버, 등록 중복, 버전 불일치, 데몬 중 하나다. 추측하기 전에 점검 스크립트부터 돌린다.

```bash
bash "${CLAUDE_SKILL_DIR}/diagnose.sh"
```

읽기 전용이다. 6개 구역을 `[ok]`, `[..]`, `[!!]`로 보여 주고 API 키 값은 출력하지 않는다. `[!!]`가 있는 구역부터 아래 표로 푼다.

| 보이는 것 | 원인 | 고치는 법 |
| --- | --- | --- |
| 로컬 서버 응답 없음, 백엔드가 local | 서버가 꺼져 있다 | decide 저장소의 `scripts/serve-local.sh`를 띄운다. 첫 실행은 모델을 내려받는다. 또는 `DECIDE_BACKEND=typesafe` |
| decide 서버가 플러그인 말고 더 있음 | 도구가 두 벌. 옛 user scope 등록이나 저장소 `.mcp.json` | `claude mcp remove -s user decide`, 저장소 항목이면 `.mcp.json`에서 `decide`를 뺀다 |
| settings.json에 옛 훅이 남음 | 플러그인 게이트와 겹쳐 Bash마다 두 번 판정 | `settings.json`에서 `decide hook`과 `decide gate bash-risk` 항목을 지운다 |
| 버전이 서로 다름 | brew와 플러그인의 `decide`가 같은 데몬을 번갈아 교체 | `brew upgrade decide`, `claude plugin update decide@sparktype-plugins` 뒤 세션을 다시 연다 |
| MCP 서버 없음 | 플러그인 미설치, 비활성, 업데이트 뒤 재시작 전 | `claude plugin list`로 확인하고 세션을 다시 연다 |
| 백엔드가 뜻과 다름 | 키가 있고 백엔드를 안 골라 typesafe가 선택됨 | `DECIDE_BACKEND=local`로 고정한다. 게이트는 가린 명령을 선택된 서버로 보낸다 |
| 게이트 로그에 `failure`가 반복 | 서버 연결 실패나 제한 시간(기본 2초) 초과 | 서버 상태를 먼저 보고 `decide gate stats`의 시간 초과 비율을 본다 |
| 데몬이 옛 동작 | 옛 데몬이 남아 있다 | `pkill -f "decide daemon"`, 다음 호출이 새로 띄운다 |

## 지킬 것

- 점검은 읽기 전용이다. 등록 제거, `settings.json` 편집, 서버 기동, `brew upgrade`는 사용자에게 보여 주고 확인받은 뒤에 한다. `settings.json`은 고치기 전에 백업을 만든다.
- 로컬 서버 기동은 모델 내려받기와 메모리가 드는 일이라 먼저 묻는다.
- 키, 토큰은 출력하거나 붙여 넣지 않는다.
- 고친 뒤에는 스크립트를 다시 돌려 `[!!]`가 사라졌는지 확인한다.
