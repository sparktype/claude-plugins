# decide-tools

[decide](https://github.com/sparktype/decide)를 쓰는 Claude Code 모드 모음이다. 저장소 하나가 마켓플레이스 하나이고, 모드마다 `mods/<이름>/` 폴더를 가진다.

| 모드 | 설명 |
| --- | --- |
| [decide](mods/decide/README.md) | 판정 상태를 패널, 상태 줄, 알림 밴드로 보여주는 읽기 전용 모드 |

## 설치

터미널 세션의 프롬프트에서 입력한다. `Add marketplace?`에 `y`를 답하고 범위(user 권장)를 고른다. 마켓플레이스는 한 번만 추가되고 이후 설치는 질문이 없다.

```
/plugin install decide --marketplace sparktype/decide-tools
```

## 모드 추가

1. `mods/<이름>/`에 `.claude-plugin/plugin.json`과 `hooks/`를 만든다.
2. `.claude-plugin/marketplace.json`의 `plugins`에 `{ "name": "<이름>", "source": "./mods/<이름>" }`를 더한다. 이름은 마켓플레이스 안에서 겹치면 안 된다.
3. 저장소 루트에서 `claude plugin validate .`, 모드 폴더에서 `claude plugin test .`를 돌린다.
