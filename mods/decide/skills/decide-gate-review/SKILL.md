---
name: decide-gate-review
description: Use when reviewing the decide bash-risk gate - false positives or missed risks, asks or denies on normal commands, whether to move from audit to enforce, or tuning gates.json rules, prefilter, and thresholds from gate.log or decide gate stats.
---

# decide 게이트 리뷰

게이트는 Bash 명령을 `정적 규칙 → 사전 필터 → 모델` 순으로 판정하고 기본은 감사 모드(막지 않음)다. 이 스킬은 쌓인 로그를 읽고 무엇을 고칠지 제안한다. 적용은 하지 않는다.

## 순서

1. 설정과 출처: `decide gate --show bash-risk`. 임계값(`deny` 0.7, `confidence` 0.7), 사전 필터, 규칙이 어느 층(내장, 사용자, 저장소)에서 왔는지 본다.
2. 숫자: `decide gate stats --since 7d --json`. `kinds`(rule, prefiltered, judged, failed), `verdicts`, `low_confidence`, `timeouts`, `failures`, `latency`, `top_rules`를 읽는다. 표본이 작으면(모델 판정 수십 건 미만) 비율을 결론으로 쓰지 않는다.
3. 사례: `~/.cache/decide/gate.log`의 줄 중 `verdict`가 `ask`나 `deny`인 것과 `failure`가 있는 것을 모은다. 줄 필드는 `ts`, `verdict`, `probs`, `backend`, `model`, `latency_ms`, `prefiltered`, `rule`, `failure`, `command`(가린 명령), `cwd_tail`이다.
4. 사례마다 분류한다.

| 분류 | 뜻 | 고치는 곳 |
| --- | --- | --- |
| 올바른 ask/deny | 실제로 위험하거나 영향이 불분명 | 손대지 않는다 |
| 규칙으로 잡히는 위험 | 모델이 놓쳤거나 확률이 애매한 명백한 위험 | `deny_patterns`/`ask_patterns`에 글롭 추가 |
| 정상인데 되물음 | 읽기 전용 같은 안전한 명령이 모델 판정으로 감 | 사용자 `gates.json`의 `prefilter`에 추가(메타문자가 든 명령은 사전 필터가 건너뛰지 않는다) |
| 낮은 확신 ask | 최고 확률이 임계값 미만이라 ask | `confidence`를 낮추면 통과가 늘고 위험도 늘어난다. 근거와 함께 사용자가 정한다 |
| 정상인데 deny | 모델이 잘못 거부 | 규칙으로 못 고친다. 사례를 모아 질문 문구나 임계값 문제로 보고한다 |
| 실패, 시간 초과 | 서버 문제 | `decide-doctor` |

5. 결과를 표로 낸다. 사례 수, 분류, 제안, 제안의 부작용을 한 줄씩 쓴다.

## 판단 기준

- enforce 조건은 정상 명령을 deny로 거부한 건수 0이다. 한 건이라도 있으면 아직 이르다고 보고한다.
- 임계값은 백엔드마다 보정이 달라, 백엔드를 바꿨으면 같은 값이 같은 뜻이 아니다. 로그의 `backend`별로 나눠 본다.
- 정적 규칙은 `$(…)`, 백틱, `bash -c "…"` 안, 변수·별칭 확장을 못 본다. 규칙이 없다고 안전하다고 하지 않는다.

## 제안을 적용할 때

- 사용자가 확인한 항목만 적용한다. 저장소 `.decide/gates.json`은 더 엄격한 쪽으로만 바꿀 수 있고(deny 임계값 낮추기, 사전 필터 줄이기, 규칙 더하기), 풀어 주는 변경은 사용자 `~/.config/decide/gates.json`에 쓴다.
- 고친 뒤 `decide gate --show bash-risk`로 값과 출처를 확인한다.
- 로그의 명령은 가려져 있어도 경로와 이름이 남는다. 사례를 인용할 때 필요한 만큼만 쓴다.
