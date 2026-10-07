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
- [x] 별도 저장소 폴더 구성 (`~/Develop/Workspaces/decide-view`)
- [x] `marketplace.json`, README, `.gitignore`
- [x] `claude plugin validate .`, `claude plugin test .` 통과
- [ ] GitHub 저장소 생성 (`sparktype/decide-view`)과 push
- [ ] 라이선스 결정 (미정, 파일 없음)
- [ ] 다른 세션에서 `/plugin install decide --marketplace sparktype/decide-view`로 설치 확인
- [ ] 플러그인 이름 `decide`가 MCP 서버 `decide`와 겹치지 않는지 확인
