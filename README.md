# claude-plugins

Claude Code 플러그인(모드) 모음이다. 저장소 하나가 마켓플레이스 하나이고, 플러그인마다 `mods/<이름>/` 폴더를 가진다.

## 플러그인

| 이름 | 설명 | 상세 |
| --- | --- | --- |
| `decide` | [decide](https://github.com/sparktype/decide)의 판정 상태를 패널, 상태 줄, 알림으로 보여주는 모드. `decide` 바이너리, MCP 서버(stdio), bash-risk 게이트 훅을 함께 가진다 | [mods/decide](mods/decide/README.md) |

## 설치

Claude Code 터미널 세션의 프롬프트에서 입력한다.

```
/plugin install decide --marketplace sparktype/claude-plugins
```

1. `Add marketplace?`에 `y`를 답한다. 마켓플레이스는 한 번만 추가되고 이후 설치는 질문이 없다.
2. 범위(scope)를 고른다. 모든 세션에서 쓰려면 user를 고른다.
3. `Installed decide. Plugin is now active.`가 나오면 그 세션에서 바로 동작한다.

데스크톱 앱의 Code 탭에서는 `/plugin install`을 쓸 수 없다. 터미널에서 user 범위로 설치하면 데스크톱의 로컬 세션에서도 로드된다.

비공개 저장소인 동안에는 `gh auth login` 등으로 GitHub 인증이 된 환경에서만 마켓플레이스를 추가할 수 있다.

## 구조

```
claude-plugins/
├── .claude-plugin/marketplace.json   마켓플레이스 정의, plugins 배열에 항목을 더한다
├── mods/
│   └── decide/                       플러그인 하나 (plugin.json, hooks/, types/)
├── scripts/update-binary.sh          릴리스 자산에서 decide 바이너리를 받아 검증하고 mods/decide/bin/에 넣는다
└── docs/decide/                      플러그인별 체크리스트와 결정 기록
```

## 플러그인 추가

1. `mods/<이름>/`에 `.claude-plugin/plugin.json`과 `hooks/`를 만든다.
2. `.claude-plugin/marketplace.json`의 `plugins`에 `{ "name": "<이름>", "source": "./mods/<이름>" }`를 더한다. 이름은 마켓플레이스 안에서 겹치면 안 된다.
3. 저장소 루트에서 `claude plugin validate .`, 플러그인 폴더에서 `claude plugin validate .`와 `claude plugin test .`를 돌린다.

## 개발

```bash
claude --plugin-dir mods/decide   # 폴더를 직접 로드하고, 저장하면 자동으로 다시 로드한다
```

## 라이선스

MIT. 자세한 내용은 [LICENSE](LICENSE)를 본다.
