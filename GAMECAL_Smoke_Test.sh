#!/usr/bin/env bash
# GAMECAL API Smoke Test
# Usage: BASE=http://localhost:3001 ./GAMECAL_Smoke_Test.sh

set -euo pipefail

BASE="${BASE:-http://localhost:3001}"
ADMIN_SECRET="${ADMIN_SECRET:-dev-admin-secret}"
PASS=0
FAIL=0

check() {
  local label="$1"
  local expected="$2"
  local actual="$3"
  if [ "$actual" = "$expected" ]; then
    echo "  ✓ $label ($actual)"
    PASS=$((PASS + 1))
  else
    echo "  ✗ $label — expected $expected, got $actual"
    FAIL=$((FAIL + 1))
  fi
}

echo "GAMECAL Smoke Test — $BASE"
echo "================================"

# ── 1. Homepage ───────────────────────────────
echo ""
echo "[ 1. Homepage loads ]"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/")
check "GET /" "200" "$STATUS"

# ── 2. Games API ───────────────────────────────
echo ""
echo "[ 2. Games API ]"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/games")
check "GET /api/games" "200" "$STATUS"

# ── 3. Events API ───────────────────────────────
echo ""
echo "[ 3. Events API ]"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/events")
check "GET /api/events" "200" "$STATUS"

# ── 4. ICS Feed — Fortnite ───────────────────────────────
echo ""
echo "[ 4. ICS Feed — Fortnite ]"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/feed/fortnite")
check "GET /api/feed/fortnite" "200" "$STATUS"

# ── 5. ICS Feed — All games ───────────────────────────────
echo ""
echo "[ 5. ICS Feed — All ]"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/feed/all")
check "GET /api/feed/all" "200" "$STATUS"

# ── 6. Invalid feed slug ───────────────────────────────
echo ""
echo "[ 6. Invalid ICS feed ]"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/feed/invalid-game-xyz")
check "GET /api/feed/invalid-game-xyz" "404" "$STATUS"

# ── 7. New Releases API ───────────────────────────────
echo ""
echo "[ 7. New Releases API ]"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/new-releases")
check "GET /api/new-releases" "200" "$STATUS"

# ── 8. Admin verify — valid secret ───────────────────────────────
echo ""
echo "[ 8. Admin verify API ]"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/admin/verify?secret=$ADMIN_SECRET")
check "GET /api/admin/verify (valid)" "200" "$STATUS"

# ── 9. Admin verify — invalid secret ───────────────────────────────
echo ""
echo "[ 9. Admin verify — unauthorized ]"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/admin/verify?secret=wrong")
check "GET /api/admin/verify (invalid)" "401" "$STATUS"

# ── 10. Admin crawl API ───────────────────────────────
echo ""
echo "[ 10. Admin crawl API ]"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/admin/crawl/fortnite" -H "x-admin-secret: $ADMIN_SECRET")
check "POST /api/admin/crawl/fortnite" "200" "$STATUS"

# ── 11. Admin crawl — unauthorized ───────────────────────────────
echo ""
echo "[ 11. Admin crawl — unauthorized ]"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/admin/crawl/fortnite")
check "POST /api/admin/crawl/fortnite (no secret)" "401" "$STATUS"

# ── 12. Sitemap ───────────────────────────────
echo ""
echo "[ 12. Sitemap ]"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/sitemap.xml")
check "GET /sitemap.xml" "200" "$STATUS"

# ── 13. Robots.txt ───────────────────────────────
echo ""
echo "[ 13. Robots.txt ]"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/robots.txt")
check "GET /robots.txt" "200" "$STATUS"

# ── 14. Admin Console HTML ───────────────────────────────
echo ""
echo "[ 14. Admin Console HTML ]"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/admin/console.html")
check "GET /admin/console.html" "200" "$STATUS"

# ── 15. New title redirect ───────────────────────────────
echo ""
echo "[ 15. /newtitle redirect ]"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -L "$BASE/newtitle")
check "GET /newtitle → /new-releases" "200" "$STATUS"

echo ""
echo "================================"
echo "Results: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
