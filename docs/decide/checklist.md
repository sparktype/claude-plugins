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
- [x] decide 0.8.0 릴리스 뒤 `scripts/update-binary.sh v0.8.0`, `bin/decide` 커밋, plugin.json 버전 0.2.0
- [ ] 푸시 후 `claude plugin update decide@sparktype-plugins`, user scope의 `decide` 등록 제거
- [x] 게이트 훅을 플러그인 hooks.json에 넣고 실제 실행 확인
- [ ] (별도) 표시 훅은 decide가 플러그인 도구 이름을 받게 고친 뒤 넣을지 결정
- [ ] (별도) 모드의 `CLEF_WEIGHTS`·`DECIDE_LOCAL_REPO` 표시를 `DECIDE_LOCAL_URL` 기준으로

## 스킬 (2026-10-07)

- [x] `decide`, `decide-doctor`, `decide-gate-review` 작성, 플러그인 0.3.0
- [x] 목록 노출과 호출 시험(찾기 4건, 무관 요청 1건)
- [ ] (별도) 압력 시험으로 스킬을 읽은 뒤 질문 품질이 나아지는지 재기
- [ ] (별도) `decide` 저장소 `.mcp.json`의 `decide` 항목 제거 여부(플러그인과 도구가 두 벌)

## 상태 줄 정리 (2026-10-07)

- [x] 문구에서 중복된 `decide · ` 제거, 상태 스크립트의 `echo`를 `printf`로, 정적 회귀 테스트
- [x] 실제 로그로 상태 문구 확인
- [ ] `⚠` 표시가 엔진 것인지 확인하고, 불필요하면 상태 줄을 끌지 결정
