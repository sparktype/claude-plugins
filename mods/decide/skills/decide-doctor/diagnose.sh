#!/usr/bin/env bash
# decide의 백엔드, 로컬 서버, MCP·훅 등록, 버전, 데몬 상태를 읽기 전용으로 점검해 한 번에 출력하는 스크립트
# 아무것도 바꾸지 않고, API 키 값은 출력하지 않는다(있는지만 본다).
set -u
ok() { printf '  [ok] %s\n' "$*"; }
ng() { printf '  [!!] %s\n' "$*"; }
info() { printf '  [..] %s\n' "$*"; }

CFG="$HOME/.config/decide/config.toml"
SETTINGS="$HOME/.claude/settings.json"
cfg_get() { [ -f "$CFG" ] && sed -n "s/^$1[[:space:]]*=[[:space:]]*\"\(.*\)\"[[:space:]]*\$/\1/p" "$CFG" | head -1; }

echo "1. 백엔드 선택"
settings_backend=""
[ -f "$SETTINGS" ] && settings_backend=$(grep -o '"DECIDE_BACKEND"[[:space:]]*:[[:space:]]*"[^"]*"' "$SETTINGS" | head -1 | sed 's/.*: *"\(.*\)"/\1/')
backend=${DECIDE_BACKEND:-${settings_backend:-$(cfg_get backend)}}
if [ -n "${TYPESAFE_API_KEY:-}" ]; then key=yes; else key=no; fi
if [ -n "$backend" ]; then
  info "DECIDE_BACKEND=$backend (환경변수 > settings.json env > config.toml 순)"
elif [ "$key" = yes ]; then
  backend=typesafe; info "고르지 않았고 TYPESAFE_API_KEY가 있어 typesafe가 선택됩니다"
else
  backend=local; info "고르지 않았고 키가 없어 local이 선택됩니다"
fi
info "이 셸의 TYPESAFE_API_KEY: $key (훅과 MCP는 자기 환경을 쓰므로 다를 수 있습니다)"

echo "2. 로컬 서버"
url=${DECIDE_LOCAL_URL:-$(cfg_get url)}
url=${url:-http://127.0.0.1:8009/v1/systemone}
base=${url%/v1/systemone}
if curl -sf -m 2 "$base/v1/models" >/dev/null 2>&1; then ok "$base 가 응답합니다"
else
  if [ "$backend" = local ]; then ng "$base 가 응답하지 않습니다 (local 백엔드가 선택돼 있어 모든 판단이 연결 실패입니다)"
  else info "$base 가 응답하지 않습니다 (지금 백엔드는 $backend 이라 영향 없음)"; fi
fi

echo "3. MCP 등록"
# 서버 줄은 이름이 첫 칸에서 시작한다(들여쓴 줄은 위치와 경고 같은 부가 정보).
mcp=$(timeout 60 claude mcp list 2>/dev/null | grep -E '^[^[:space:]]*decide[^[:space:]]*: ' || true)
count=$(printf '%s' "$mcp" | grep -c . || true)
printf '%s\n' "$mcp" | sed 's/^/       /'
plugin_mcp=$(printf '%s\n' "$mcp" | grep -c '^plugin:decide:decide: ' || true)
if [ "$count" -eq 0 ]; then ng "decide MCP 서버가 없습니다 (플러그인을 설치하고 세션을 다시 여세요)"
elif [ "$plugin_mcp" -ge 1 ] && [ "$count" -gt 1 ]; then ng "플러그인 서버 말고 decide 서버가 더 있습니다. 도구가 두 벌 보입니다 (user scope는 claude mcp remove -s user decide, 저장소 .mcp.json이면 그 항목)"
else ok "decide MCP 서버 ${count}개"; fi
printf '%s' "$mcp" | grep -q 'Connected' || { [ "$count" -ge 1 ] && ng "Connected인 서버가 없습니다"; }

echo "4. 플러그인과 훅"
plug=$(claude plugin list 2>/dev/null | grep -A3 'decide@' | tr -s ' ' | tr '\n' ' ')
[ -n "$plug" ] && info "$plug" || ng "decide 플러그인이 설치돼 있지 않습니다"
if [ -f "$SETTINGS" ]; then
  old=$(grep -o '[^"]*decide \(hook\|gate [a-z-]*\)' "$SETTINGS" | sort -u)
  if [ -n "$old" ]; then ng "settings.json에 옛 훅이 남아 있습니다(플러그인 훅과 중복): $(printf '%s' "$old" | tr '\n' ',')"
  else ok "settings.json에 decide 훅이 없습니다(플러그인 훅만 사용)"; fi
fi

echo "5. 버전"
versions=""
for bin in /opt/homebrew/bin/decide $(ls "$HOME"/.claude/plugins/cache/*/decide/*/bin/decide 2>/dev/null); do
  [ -x "$bin" ] || continue
  v=$("$bin" --version 2>/dev/null | awk '{print $2}')
  info "$v  $bin"
  versions="$versions $v"
done
if [ "$(printf '%s\n' $versions | sort -u | grep -c .)" -gt 1 ]; then
  ng "버전이 서로 다릅니다. 서로 다른 버전이 같은 데몬을 쓰면 데몬이 계속 교체됩니다"
else ok "버전이 같습니다"; fi

echo "6. 데몬과 게이트 로그"
if [ -S "$HOME/.cache/decide/decide.sock" ]; then ok "데몬 소켓이 있습니다"; else info "데몬 소켓이 없습니다(게이트 훅이 필요할 때 띄웁니다)"; fi
daemons=$(pgrep -fl 'decide daemon' || true)
printf '%s\n' "$daemons" | sed 's/^/       /' | head -4
if [ "$(printf '%s\n' "$daemons" | grep -c .)" -gt 1 ]; then
  info "데몬 프로세스가 여럿입니다. 옛 버전 데몬은 소켓을 넘겨준 뒤에도 HTTP(0.7.0까지)로 30분 동안 남을 수 있어 곧 스스로 끝납니다(급하면 해당 경로만 pkill -f)"
fi
log="$HOME/.cache/decide/gate.log"
if [ -f "$log" ]; then
  tail -n 5 "$log" | python3 -c '
import sys, json
for line in sys.stdin:
    try: d = json.loads(line)
    except Exception: continue
    kind = "규칙" if d.get("rule") else ("사전필터" if d.get("prefiltered") else ("실패" if d.get("failure") else "모델"))
    print("       %s %s %s %s %s" % (d.get("ts"), kind, d.get("verdict"), d.get("backend"), d.get("failure") or ""))'
else info "gate.log가 없습니다"; fi
