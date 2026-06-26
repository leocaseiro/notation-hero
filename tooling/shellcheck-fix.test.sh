#!/usr/bin/env bash
# Test tooling/shellcheck-fix.sh: in-scope fix applied; non-targets + clean files skipped.
set -euo pipefail

# Resolve the script-under-test relative to THIS file, BEFORE we cd into the tmp dir —
# don't rely on $OLDPWD/CWD (the test must pass regardless of where it's invoked from).
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
fixer="$here/shellcheck-fix.sh"

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

# Case 1: a shellcheck-fixable issue (SC2164: cd without || exit) is applied in-scope.
cat > sample.sh <<'SH'
#!/usr/bin/env bash
cd /tmp
echo "done"
SH
git add sample.sh
git commit -qm "seed"

bash "$fixer" sample.sh

if grep -q '|| exit' sample.sh; then
  echo "PASS: shellcheck-fix applied the in-scope patch"
else
  echo "FAIL: expected 'cd /tmp || exit' in sample.sh"
  cat sample.sh
  exit 1
fi

# Case 2: a non-.sh argument and a missing .sh file are skipped cleanly (exit 0, no change).
echo "not shell" > note.txt
bash "$fixer" note.txt missing.sh
if [ "$(cat note.txt)" = "not shell" ]; then
  echo "PASS: non-.sh arg and missing file skipped without error"
else
  echo "FAIL: non-.sh file was touched"
  exit 1
fi

# Case 3: an already-clean .sh file is a no-op (exit 0, content unchanged).
cat > clean.sh <<'SH'
#!/usr/bin/env bash
echo "clean"
SH
before="$(cat clean.sh)"
bash "$fixer" clean.sh
if [ "$before" = "$(cat clean.sh)" ]; then
  echo "PASS: clean file left unchanged"
else
  echo "FAIL: clean file was modified"
  exit 1
fi
