---
name: debrief-tune
description: Use when the user wants to change how debrief sounds or when it speaks - 너무 시끄러움, 조용히, 야간 모드, 회의 중 끄기, 알림이 너무 잦음, 볼륨 상한, 목소리·속도 바꾸기, mode / mute / companion / dnd / longTurnSeconds / sessionLabel / teamNotices.
---

# debrief 튜닝

바꾸는 방법은 두 가지다. CLI는 4개 항목(음소거, 모드, 도우미, 방해금지)만 바꾼다. 나머지는 설정 파일을 직접 고친다. 데몬은 발화마다 설정을 다시 읽으므로 재시작이 필요 없다.

## 먼저 현재 상태

```bash
~/.local/bin/debrief status
cat "$HOME/Library/Application Support/debrief/config.json"
```

## CLI로 바꾸는 것

| 하고 싶은 일 | 명령 |
| --- | --- |
| 전부 끈다 | `debrief mute on` (되돌리기 `off`) |
| 도우미 브리핑만 끈다. 훅 알림(work lane)과 서브에이전트 발화는 그대로 | `debrief companion off` |
| 모드를 바꾼다 | `debrief mode <normal\|focus\|quiet\|verbose\|night>` |
| 방해금지가 켜지면 자동으로 조용히 | `debrief dnd on` |

`mute`, `companion`, `dnd`는 **항상 `on` 또는 `off`를 쓴다**. 인자가 없으면 토글이라 현재 상태를 모를 때 반대로 바뀐다.

## 모드

| 모드 | 볼륨 상한 | 서브에이전트 |
| --- | --- | --- |
| `normal` | 1.0 | 재생 |
| `verbose` | 1.0 | 재생 |
| `focus` | 1.0 | 재생 안 함 |
| `quiet` | 0.45 | 재생 안 함 |
| `night` | 0.20 | 재생 안 함 |

상황별로 고르면 이렇다. 집중해서 일할 때는 `focus`(주 브리핑만), 주변이 조용해야 하면 `quiet`, 밤에는 `night`, 서브에이전트까지 다 듣고 싶으면 `verbose`다. `debrief dnd on`이면 방해금지 동안 `normal`·`verbose`·`focus`가 `quiet`로 올라가고 `night`는 그대로다. 저장된 모드는 바뀌지 않는다.

## 설정 파일로 바꾸는 것

파일은 `~/Library/Application Support/debrief/config.json`이고 키는 camelCase다.

| 키 | 기본 | 효과 |
| --- | --- | --- |
| `longTurnSeconds` | 60 | 에이전트가 말하지 않은 턴이 이 초 이상이면 끝날 때 알린다. `0`이면 끈다 |
| `sessionLabel` | true | 다른 프로젝트 세션이 30분 안에 활성이면 발화 앞에 `"<프로젝트>. "`를 붙인다 |
| `teamNotices` | false | 에이전트 팀의 TeammateIdle·TaskCompleted 알림. 잦아서 기본 꺼짐 |
| `decideEnabled` | true | `decide` 판단 모델 보강(침묵 판단, 감정 선택). 불가하면 자동으로 기존 동작 |
| `volumeCeilings` | 위 모드표 | 모드별 볼륨 상한(0.0–1.0). CLI로는 못 바꾼다 |
| `categoryVoices` | `{}` | 역할 이름 → 목소리(`F1`–`M5`). 비면 역할 기본값 |
| `voiceSpeeds` | `{}` | 역할 이름 → 속도(0.7–2.0). 비면 요청의 `speed` |

고치는 순서는 백업, 수정, 검증이다. 한 키만 바꿀 때 예시다.

```bash
C="$HOME/Library/Application Support/debrief/config.json"
cp "$C" "$C.bak"
jq '.longTurnSeconds = 120' "$C.bak" > "$C" && jq . "$C" >/dev/null && echo ok
```

JSON이 깨지면 그 발화는 **기본값(모드 normal, 음소거 꺼짐, 도우미 켜짐)으로 재생**된다. 즉 조용히 해 둔 설정이 풀려 갑자기 큰 소리가 날 수 있다. 수정 직후 `jq .`로 파싱을 확인하고, 실패하면 `.bak`로 되돌린다.

## 증상별 처방

| 증상 | 처방 |
| --- | --- |
| 소리가 너무 크다 | 먼저 `mode quiet`. 더 낮게 고정하려면 `volumeCeilings.normal`을 낮춘다 |
| 서브에이전트 소리가 시끄럽다 | `mode focus` |
| 긴 작업 알림이 거슬린다 | `longTurnSeconds`를 늘리거나 `0` |
| 어느 세션인지 모르겠다 | `sessionLabel`이 true인지 확인(여러 프로젝트 세션이 동시에 활성일 때만 붙는다) |
| 권한 요청·입력 대기 알림도 끄고 싶다 | 이 알림은 `lane=work`라 `companion off`로 안 꺼진다. `mute on`만 끈다 |
| 특정 역할 목소리를 바꾸고 싶다 | `categoryVoices`에 `{"reviewer": "F3"}` 식으로 넣는다 |

## 하지 않는 것

- `config.json`을 통째로 새로 쓰지 않는다. 한 키만 `jq`로 바꾼다.
- 확인 없이 `mute on`을 남겨 두지 않는다. 임시로 껐다면 사용자에게 되돌릴 시점을 말한다.
- 모르는 키를 만들어 넣지 않는다. 위 표에 없는 키는 데몬이 무시한다.
