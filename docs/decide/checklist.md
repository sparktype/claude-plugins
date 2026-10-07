# decide-view 모드 체크리스트

- [x] 계획·결정 기록 (`context-notes.md`)
- [x] 모드 뼈대 (`plugin.json`, `hooks.json`, 타입 계약)
- [x] 1. 판정 상태 줄 (백엔드·모델·지연·데몬 생존)
- [x] 2. 게이트 판정 토스트 (ask·deny)
- [x] 3. `/decide-stats` 패널 (`decide gate stats` 출력)
- [x] 4. 판정 결과 밴드 (`decide`·`decide_many` 결과)
- [x] 단위 테스트 (`claude plugin test`)
- [x] `claude plugin validate` 통과
- [x] 핫리로딩 활성화 후 실제 세션에서 확인 (패널·상태 줄·토스트·밴드)

경로 `~/.claude/dev-mods/00929dfc-6328-4a43-9cb6-94594948beed/decide-view/`. 타입 검사(`tsc`)는 설치돼 있지 않아 하지 않았다.

## 배포 준비
- [x] 별도 저장소 폴더 구성 (`~/Develop/Workspaces/claude-plugins`, 모드는 `mods/decide/`)
- [x] `marketplace.json`, README, `.gitignore`
- [x] `claude plugin validate .`, `claude plugin test .` 통과
- [x] GitHub 저장소 생성 (`sparktype/claude-plugins`, 비공개)와 push
- [ ] 라이선스 결정 (미정, 파일 없음)
- [ ] 다른 세션에서 `/plugin install decide --marketplace sparktype/claude-plugins`로 설치 확인
- [ ] 플러그인 이름 `decide`가 MCP 서버 `decide`와 겹치지 않는지 확인

## MCP 서버와 바이너리 묶기 (2026-10-07)

- [x] `.mcp.json`(`${CLAUDE_PLUGIN_ROOT}/bin/decide mcp`)과 연결·도구 이름 확인
- [x] 판정 밴드 매처에 `mcp__plugin_decide_decide__*` 추가
- [x] `scripts/update-binary.sh`와 v0.7.0 자산으로 검증 시험
- [x] README(루트, 모드) 갱신
- [ ] decide 0.8.0 릴리스 뒤 `scripts/update-binary.sh v0.8.0`, `bin/decide` 커밋, plugin.json 버전 0.2.0
- [ ] 푸시 후 `claude plugin update decide@sparktype-plugins`, user scope의 `decide` 등록 제거
- [ ] (별도) 표시·게이트 훅과 `CLEF_WEIGHTS` 표시를 `DECIDE_LOCAL_URL` 기준으로
