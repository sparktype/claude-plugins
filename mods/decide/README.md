# decide 모드

[decide](https://github.com/sparktype/decide)의 판정 상태를 Claude Code 안에서 보여주는 읽기 전용 모드다.

- **`/decide-stats` 패널.** 백엔드와 엔드포인트, 게이트 판정 분포, 판정 방식(규칙·사전 필터·모델·실패), 선택된 백엔드의 최근 10건 지연을 박스 네 개로 보여준다. 5초마다 스스로 갱신한다.
- **상태 줄.** 백엔드와 모델, 마지막 지연, 데몬 생존 여부를 한 줄로 보여준다.
- **게이트 알림.** Bash 명령이 ask나 deny로 판정되면 토스트와 프롬프트 위 밴드(색 있는 ●, 10초)로 알린다.
- **판정 밴드.** `decide`, `decide_many` 도구 결과를 프롬프트 위에 보여준다.

## 요구 사항

- Apple Silicon macOS에 `brew install sparktype/tap/decide`로 설치한 `decide` (데몬 경로 `/opt/homebrew/bin/decide`).
- Claude Code 터미널 세션. 데스크톱 앱의 Code 탭에서는 설치 명령을 쓸 수 없다.
- 모드가 `~/.cache/decide/gate.log`와 `~/.cache/decide/decide.sock`을 읽고 `pgrep`, `ps`, `sh`를 부른다. 다른 경로나 OS에서는 상태가 비어 보인다.

## 설치

```
/plugin install decide --marketplace sparktype/decide-tools
```

`Add marketplace?`에 `y`를 답하고 범위(user 권장)를 고른다. 설치 직후부터 이 세션에서 동작한다.

## 읽는 것과 읽지 않는 것

읽기 전용이다. `gate.log`의 마지막 줄들과 실행 중 데몬의 환경변수 일부(`DECIDE_BACKEND`, `DECIDE_TYPESAFE_URL`, `DECIDE_LOCAL_REPO`, `CLEF_WEIGHTS`)만 읽는다. `TYPESAFE_API_KEY`는 값이 아니라 있는지만 확인하고, 엔드포인트 URL의 `user:pass@`는 화면에 내지 않는다. 명령 문자열은 화면에 내지 않고 알림 대조에만 쓴다. 파일을 쓰거나 게이트 판정에 관여하지 않는다.

## 개발

```bash
claude plugin validate .      # 이 폴더에서. 매니페스트와 훅 모듈 검사(저장소 루트에서는 마켓플레이스까지)
claude plugin test .          # hooks/logic.test.ts 실행
claude --plugin-dir .         # 이 폴더를 직접 로드(저장하면 자동으로 다시 로드)
```

설계 결정과 변경 기록은 저장소 루트의 `docs/decide/context-notes.md`에 있다.
