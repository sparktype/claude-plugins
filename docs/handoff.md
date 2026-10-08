# 작업 인수인계 (2026-10-08)

다른 PC에서 이어 작업하기 위한 현재 상태 정리다. `main`에 직접 커밋하는 저장소라
(이 저장소는 `develop` 브랜치 없이 `main` 직커밋 컨벤션) 아래 커밋이 그대로
`origin/main`에 push돼 있다.

## 이번 세션에서 한 일

### 1. debrief-mod: 마지막 AskUserQuestion 질문·답 요약

`tool.call{tool: 'AskUserQuestion'}` 훅에서 `next(e)`의 `result`(빌트인 툴이라
`ToolCallResult.result`에 구조화된 `AskUserQuestionOutput`이 바로 온다 — `ran.text`가
아님, `text`는 모델이 읽는 평문 요약)를 읽어 `questions.at(-1)`과 그 질문의 `answers`
값을 뽑는다(`hooks/rules.ts`의 `parseLastQuestion`).

### 2. decide: 게이트 질의 명령을 알림에 포함

`gateAlert`(`hooks/logic.ts`)가 돌려주는 `Alert`에 `command` 필드를 추가해, ask/deny
토스트에 어떤 Bash 명령이 판정됐는지 같이 보인다.

### 3. 두 모드 모두: `AbovePrompt` → `$.ui.toast`로 전환 (이번 세션 핵심 작업)

**원인**: `AbovePrompt`는 화면에 한 인스턴스만 그려지는 슬롯이다
(`claude-code.d.ts`의 doc comment: `A hook draws a tree, or passes; one instance`).
decide 모드와 debrief-mod가 각자 `ui.render({component:'AbovePrompt'})`를 훅하면서
둘의 밴드 내용이 한 줄에 뒤섞여 보이는 문제가 있었다. 사용자 지시로 두 모드 모두
`AbovePrompt` 훅을 완전히 없애고 보여주던 내용을 `$.ui.toast`로 옮겼다.

**debrief-mod** (`mods/debrief-mod/hooks/register.tsx`):
- 상태 한 줄(`status`)은 **화면에 그리지 않고 `$.state`에만 유지**(상태 조회·오류
  토스트 로직은 그대로) — 사용자가 "status는 없애고"로 결정.
- 오너십 요약(수정 파일·위험 Bash·민감 경로)은 `turn.complete`에서 즉시 toast.
- 질문·답 요약은 `tool.call{tool:'AskUserQuestion'}`에서 즉시 toast.
- `ownership`/`isHidden`/`lastQuestion` state와 `Ownership`/`LastQuestion` 타입은
  더는 아무도 읽지 않아 함께 지웠다(`types/index.d.ts`).

**decide** (`mods/decide/hooks/register.tsx`):
- ask/deny 판정은 기존 `tool.call{tool:'Bash'}` 훅의 toast에 질의 명령을 합쳐서 그대로.
- decide/decide_many MCP 결과(`backend/model/latency`, 답변 줄 최대 6개)는 MCP 호출이
  끝나는 즉시 toast.
- `decision`/`isHidden`/`alert` state는 지웠다. `Alert`/`Decision` 타입은
  `logic.ts`의 `gateAlert`/`parseDecision` 반환형으로 여전히 쓰여 남겼다.
- (별개 수정) `register.tsx:27`의 `$.ui.status(statusText(...))` 호출도 지웠다 —
  상태 줄 앞에 엔진이 플러그인 이름을 또 붙여 `decide: decide · daemon ●`로
  중복 표시되던 것(사용자 보고로 발견). `statusText`는 `logic.ts`에 남겨 테스트가
  계속 검증한다.

**검증**: 두 모드 모두 `claude plugin validate`/`claude plugin test` 통과
(debrief-mod 4건, decide 13건). 핫 리로드로 실제 세션에서 질문·답 toast가
뜨는 것까지 확인했다(사용자 확인 "네, 보생겼죠").

## 다른 PC에서 확인할 것

- `claude plugin validate mods/debrief-mod`, `claude plugin validate mods/decide`로
  경고 없이 통과하는지(decide 쪽 `${CLAUDE_PLUGIN_ROOT}` 인용 경고는 이 세션
  이전부터 있던 기존 이슈라 손대지 않았다).
- `claude plugin test mods/debrief-mod`, `claude plugin test mods/decide`.
- 실제 세션에서 `AskUserQuestion`을 한 번 트리거해 toast가 뜨는지, decide
  게이트가 ask/deny를 낼 때 toast에 질의 명령이 같이 뜨는지.

## 디버깅 환경(이 PC 로컬, git에는 없음)

이번 세션에서 로컬 저장소를 `~/.claude/dev-mods/<session-id>/{decide,debrief-mod}`에
심링크해 핫 리로드로 디버깅했고, 설치된 캐시판(`decide@sparktype-plugins`,
`debrief-mod@sparktype-plugins`)은 디버깅 중 한 번 비활성화했다가 다시 켰다.
다른 PC에서 디버깅하려면 같은 방식(`plugin-authoring` 스킬 참고)으로 심링크하거나,
그냥 `claude plugin update decide@sparktype-plugins` 등으로 이 커밋을 반영한
새 릴리스를 받으면 된다(마켓플레이스가 GitHub 소스라 로컬 수정은 설치본에 바로
반영되지 않는다 — `.claude-plugin/marketplace.json`은 저장소 루트에 있다).
