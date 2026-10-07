---
name: decide
description: Use before calling the decide or decide_many MCP tools, and whenever a judgment must come back as a fixed choice, rating, or probability - classify, route, triage, rate severity, "is this urgent, risky, or done?". 분류, 선택, 점수, 확률 판단.
---

# decide 판단 도구 쓰기

`decide`는 글을 만들지 않고 선택, 점수, 확률 하나를 돌려주는 판단 모델이다. 질문이 작을수록 정확하다.

## 도구

- `decide`: 질문 하나. 인자는 `state`(판단할 내용), `instructions`(질문), `type`, `options`, `criteria`.
- `decide_many`: 같은 state에 대한 질문 여럿을 백엔드 한 번 호출로 보낸다. `questions`는 `{id: {type, instructions, options|criteria}}`. 하나라도 틀리면 전체가 오류이고 부분 결과는 없다.

| type | 넣는 것 | 돌아오는 것 |
| --- | --- | --- |
| `choice` | `options` 2개 이상(TypeSafe는 255개까지) | `choice`, `confidence`, `probabilities` |
| `score` | `criteria` 2개 이상, 낮은 등급부터(10개까지) | `score`(0부터 등급 수-1 사이 기대값), `legend` |
| `noul` | 없음(주면 오류) | `noul` = 참일 확률 0.0~1.0, `confidence` 없음 |

## 질문 쓰기

1. state에 판단에 필요한 사실을 모두 넣는다. 질문이 가리키는 대상도 state 안에 있어야 한다. 키, 토큰, 비밀번호는 뺀다.
2. instructions는 상태를 바로 묻는 한 문장이다. "긴급한가?"로 쓰고 "긴급하지 않은가?" 같은 반문은 쓰지 않는다. 방향이 쉽게 뒤집힌다.
3. 질문 하나에 판단 하나. 복합 질문은 쪼개서 `decide_many`로 한 번에 보낸다. 앞 답에 따라 뒤 질문이 달라지면 호출을 나눈다.
4. 갈림이 분명해야 하면 `noul` 대신 `choice`에 `positive`와 `negative`를 넣는다.

예(같은 상황, 질문 셋):

```text
decide_many(state="결제 API가 500을 반환하고 재시도가 늘었습니다.", questions={
  "urgent": {type: "noul",   instructions: "이 건이 긴급한가?"},
  "team":   {type: "choice", instructions: "어느 팀이 처리해야 하는가?", options: ["billing", "infra", "frontend"]},
  "impact": {type: "score",  instructions: "사용자 영향의 크기는?", criteria: ["낮음", "보통", "높음"]}})
```

상황별 질문 묶음은 `recipes.md`에 있다.

## 결과 읽기

- 임계값은 부르는 쪽이 정한다. `noul`이 0.3~0.7이면 판단이 선 것이 아니니 한 번 더 확인하거나 사용자에게 묻는다.
- `choice`는 `confidence`와 `probabilities`를 보고, 1위와 2위 차이가 작으면 확정하지 않는다.
- `routing.backend`(`typesafe` 또는 `local`)를 본다. 백엔드가 다르면 같은 확률도 같은 뜻이 아니므로 섞어서 비교하지 않는다.

## 실패하면

도구 오류로 작업을 멈추지 않는다. 직접 추론해서 계속하고 사용자에게 한 줄로 알린다. 연결 실패이거나 도구가 안 보이면 `decide-doctor` 스킬로 원인을 찾는다.

## 쓰지 않는 때

- 요약, 설명, 계획, 코드 작성 같은 개방형 작업.
- 정규식이나 타입 검사로 확정되는 판단.
- 사용자가 직접 정해야 하는 가치 판단. 이것은 사용자에게 묻는다.
