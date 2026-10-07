#!/usr/bin/env bash
# decide 릴리스 자산에서 바이너리를 받아 sha256을 검증한 뒤 플러그인 bin/에 넣는 스크립트
#
# 사용: scripts/update-binary.sh v0.8.0
#       OUT_DIR=/tmp/x scripts/update-binary.sh v0.8.0   # 넣을 폴더를 바꿔 시험한다
set -euo pipefail

TAG=${1:?"사용법: $0 <릴리스 태그, 예 v0.8.0>"}
REPO=sparktype/decide
ASSET=decide-$TAG-aarch64-apple-darwin.tar.gz
OUT=${OUT_DIR:-$(cd "$(dirname "$0")/.." && pwd)/mods/decide/bin}
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

gh release download "$TAG" -R "$REPO" -p "$ASSET" -p checksums.txt -D "$TMP"
# checksums.txt는 dist/ 경로를 품고 있어 자산 이름만 남겨 같은 폴더에서 검증한다.
(cd "$TMP" && grep "$ASSET\$" checksums.txt | sed 's#  dist/#  #' | shasum -a 256 -c -)
tar -xzf "$TMP/$ASSET" -C "$TMP" decide
mkdir -p "$OUT"
install -m 755 "$TMP/decide" "$OUT/decide"
echo "넣었습니다: $OUT/decide ($("$OUT/decide" --version))"
