#!/bin/bash
# Test script to verify the ESLint rule works correctly across all example apps

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASSED=0
FAILED=0

echo "🧪 Testing ESLint rule across example apps..."
echo ""

# Function to test a file
test_file() {
  local app=$1
  local file=$2
  local should_error=$3
  local description=$4

  echo -n "Testing ${app}/${file}... "

  # Run ESLint and capture output
  cd "apps/${app}"

  # Run ESLint with JSON format to parse results
  # Use pnpm exec to avoid pnpm's extra output, and redirect stderr separately
  if pnpm exec eslint . --format json > /tmp/eslint-output.json 2>/dev/null; then
    ESLINT_EXIT=0
  else
    ESLINT_EXIT=$?
  fi

  cd ../..

  # Check if file has errors from our rule
  if [ -f /tmp/eslint-output.json ] && [ -s /tmp/eslint-output.json ]; then
    # Check if the file appears in the output with no-server-imports errors
    HAS_ERROR=$(cat /tmp/eslint-output.json | jq -r ".[] | select(.filePath | endswith(\"${file}\")) | .messages[] | select(.ruleId == \"no-server-imports/no-server-imports\" and .severity == 2) | .ruleId" 2>/dev/null | head -1)
  else
    HAS_ERROR=""
  fi
  
  # Determine if test passed
  if [ "$should_error" = "true" ]; then
    if [ -n "$HAS_ERROR" ]; then
      echo -e "${GREEN}✅ PASS${NC}"
      PASSED=$((PASSED + 1))
    else
      echo -e "${RED}❌ FAIL${NC}"
      echo "  Expected errors but found none"
      FAILED=$((FAILED + 1))
    fi
  else
    if [ -z "$HAS_ERROR" ]; then
      echo -e "${GREEN}✅ PASS${NC}"
      PASSED=$((PASSED + 1))
    else
      echo -e "${RED}❌ FAIL${NC}"
      echo "  Expected no errors but found: ${HAS_ERROR}"
      FAILED=$((FAILED + 1))
    fi
  fi
}

# Test cases
echo "Testing Next.js app..."
test_file "nextjs-example" "src/app/bad-example.tsx" "true" "Bad example should error"
test_file "nextjs-example" "src/app/good-example.tsx" "false" "Good example should not error"
test_file "nextjs-example" "src/app/api/route.ts" "false" "Server route should not error"

echo ""
echo "Testing Astro app..."
test_file "astro-example" "src/pages/bad-example.astro" "true" "Bad example should error"
test_file "astro-example" "src/pages/good-example.astro" "false" "Good example should not error"
test_file "astro-example" "src/pages/api/test.server.ts" "false" "Server file should not error"

echo ""
echo "Testing SvelteKit app..."
test_file "sveltekit-example" "src/routes/bad-example/+page.svelte" "true" "Bad example should error"
test_file "sveltekit-example" "src/routes/bad-page/+page.ts" "true" "Bad page should error"
test_file "sveltekit-example" "src/routes/good-example/+page.svelte" "false" "Good example should not error"
test_file "sveltekit-example" "src/routes/api/test/+server.ts" "false" "Server route should not error"

echo ""
echo "============================================================"
echo "Summary:"
echo "============================================================"
echo -e "${GREEN}✅ Passed: ${PASSED}${NC}"
echo -e "${RED}❌ Failed: ${FAILED}${NC}"

if [ $FAILED -gt 0 ]; then
  exit 1
fi

exit 0








