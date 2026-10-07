# decide 플러그인

[decide](https://github.com/sparktype/decide) 바이너리(v0.8.0)와 그 MCP 서버, bash-risk 게이트 훅, 판정 상태 화면을 한 번에 설치한다.

- **`/decide-stats` 패널.** 백엔드와 엔드포인트, 게이트 판정 분포, 판정 방식(규칙·사전 필터·모델·실패), 선택된 백엔드의 최근 10건 지연을 박스 네 개로 보여준다. 5초마다 스스로 갱신한다.
- **상태 줄.** 백엔드와 모델, 마지막 지연, 데몬 생존 여부를 한 줄로 보여준다.
- **게이트 알림.** Bash 명령이 ask나 deny로 판정되면 토스트와 프롬프트 위 밴드(색 있는 ●, 10초)로 알린다.
- **판정 밴드.** `decide`, `decide_many` 도구 결과를 프롬프트 위에 보여준다.
- **bash-risk 게이트 훅.** Bash 명령을 실행하기 전에 `bin/decide gate bash-risk`(PreToolUse, 10초)로 위험을 판정한다. 정적 규칙이 명백한 위험을 먼저 잡고 나머지는 모델이 판정한다. 기본이 감사 모드라 막지 않고 알리기만 한다(설정은 `decide gate --show`).
- **MCP 서버.** `decide`, `decide_many` 도구를 가진 stdio MCP 서버(`bin/decide mcp`)를 플러그인이 함께 등록한다. 서버 이름은 `plugin:decide:decide`, 도구 이름은 `mcp__plugin_decide_decide__decide`, `mcp__plugin_decide_decide__decide_many`다.

## 요구 사항

- Apple Silicon macOS. 플러그인에 든 `bin/decide`가 arm64 바이너리뿐이다.
- 바이너리는 플러그인이 갖고 있어 따로 설치할 것이 없다. 다만 터미널에서 `decide gate --show` 같은 명령을 직접 쓰려면 `brew install sparktype/tap/decide`가 필요하다.
- Claude Code 터미널 세션. 데스크톱 앱의 Code 탭에서는 설치 명령을 쓸 수 없다.
- 모드가 `~/.cache/decide/gate.log`와 `~/.cache/decide/decide.sock`을 읽고 `pgrep`, `ps`, `sh`를 부른다. 다른 경로나 OS에서는 상태가 비어 보인다.

## 설치

```
/plugin install decide --marketplace sparktype/claude-plugins
```

`Add marketplace?`에 `y`를 답하고 범위(user 권장)를 고른다. 설치 직후부터 이 세션에서 동작한다.

이미 `decide install --claude`를 실행했다면 같은 일이 두 번 일어난다. MCP 도구가 두 벌(`mcp__decide__*`와 `mcp__plugin_decide_decide__*`) 보이고, 게이트가 Bash 명령마다 두 번 판정한다. 하나를 지운다.

```bash
claude mcp remove -s user decide
```

그리고 `~/.claude/settings.json`의 `hooks`에서 `decide hook`(PostToolUse)과 `decide gate bash-risk`(PreToolUse) 항목을 지운다. 서로 다른 버전의 `decide`가 같은 데몬 소켓을 쓰면 데몬이 매번 교체되므로, 옛 훅을 남겨 두려면 `brew upgrade decide`로 버전을 맞춘다. 판정 밴드는 두 도구 이름을 모두 처리한다.

결과 한 줄 표시 훅(`decide hook`)은 플러그인에 넣지 않았다. 같은 내용을 판정 밴드가 보여 주고, `decide hook`이 도구 이름 `mcp__decide__decide`만 처리해 플러그인 MCP(`mcp__plugin_decide_decide__*`)에서는 출력하지 않기 때문이다.

플러그인에 든 바이너리는 `scripts/update-binary.sh <태그>`로 갱신한다(릴리스 자산을 받아 sha256을 검증하고 `bin/decide`에 넣는다).

## 읽는 것과 읽지 않는 것

읽기 전용이다. `gate.log`의 마지막 줄들과 실행 중 데몬의 환경변수 일부(`DECIDE_BACKEND`, `DECIDE_TYPESAFE_URL`, `DECIDE_LOCAL_REPO`, `CLEF_WEIGHTS`)만 읽는다. `TYPESAFE_API_KEY`는 값이 아니라 있는지만 확인하고, 엔드포인트 URL의 `user:pass@`는 화면에 내지 않는다. 명령 문자열은 화면에 내지 않고 알림 대조에만 쓴다. 파일을 쓰거나 게이트 판정에 관여하지 않는다.

## 개발

```bash
claude plugin validate .      # 이 폴더에서. 매니페스트와 훅 모듈 검사(저장소 루트에서는 마켓플레이스까지)
claude plugin test .          # hooks/logic.test.ts 실행
claude --plugin-dir .         # 이 폴더를 직접 로드(저장하면 자동으로 다시 로드)
```

설계 결정과 변경 기록은 저장소 루트의 `docs/decide/context-notes.md`에 있다.
