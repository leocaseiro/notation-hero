#!/usr/bin/env bash
# Test tooling/shellcheck-fix.sh: a fixable issue is applied in-scope.
set -euo pipefail

if ! command -v shellcheck >/dev/null 2>&1; then
  echo "SKIP: shellcheck not installed"
  exit 0
fi

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
cd "$tmp"
git init -q
git config user.email "test@test.com"
git config user.name "Test"

# A shellcheck-fixable issue: SC2164 (cd without || exit) has a safe diff suggestion.
cat > sample.sh <<'SH'
#!/usr/bin/env bash
cd /tmp
echo "done"
SH
git add sample.sh
git commit -qm "seed"

bash "$OLDPWD/tooling/shellcheck-fix.sh" sample.sh

if grep -q '|| exit' sample.sh; then
  echo "PASS: shellcheck-fix applied the in-scope patch"
else
  echo "FAIL: expected 'cd /tmp || exit' in sample.sh"
  cat sample.sh
  exit 1
fi
