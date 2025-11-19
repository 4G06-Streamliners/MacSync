#!/bin/bash
set -e

# Team-Agnostic Mobile Package Publisher
# Publishes @team{x}/mobile-components to local Verdaccio registry
#
# Usage: ./scripts/publish-mobile.sh <team>
#   Where <team> is one of: teama, teamb, teamc, teamd

REGISTRY="http://localhost:4873"

# Validate team parameter
if [ -z "$1" ]; then
  echo "❌ Error: Team parameter required"
  echo ""
  echo "Usage: $0 <team>"
  echo "  Where <team> is one of: teama, teamb, teamc, teamd"
  echo ""
  echo "Example: $0 teamd"
  exit 1
fi

TEAM_LOWER="$1"

# Validate team is one of the allowed values
case "$TEAM_LOWER" in
  teama|teamb|teamc|teamd)
    ;;
  *)
    echo "❌ Error: Invalid team '${TEAM_LOWER}'"
    echo "   Team must be one of: teama, teamb, teamc, teamd"
    exit 1
    ;;
esac

# Handle team name case conversion (teamD has uppercase D)
if [ "$TEAM_LOWER" = "teamd" ]; then
  TEAM_DIR="teamD"
else
  TEAM_DIR="$TEAM_LOWER"
fi

PACKAGE_NAME="@${TEAM_LOWER}/mobile-components"
PACKAGE_PATH="teams/${TEAM_DIR}/src/mobile-components"

echo "📦 Publishing ${PACKAGE_NAME} to Verdaccio"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if package directory exists
if [ ! -d "$PACKAGE_PATH" ]; then
  echo "❌ Error: Package directory not found: ${PACKAGE_PATH}"
  echo ""
  echo "   This team may not have mobile-components implemented yet."
  echo "   Available teams with mobile-components:"
  echo "   - teamd: teams/teamD/src/mobile-components/"
  echo ""
  exit 1
fi

# Check if package.json exists
if [ ! -f "${PACKAGE_PATH}/package.json" ]; then
  echo "❌ Error: package.json not found in ${PACKAGE_PATH}"
  exit 1
fi

# Check if Verdaccio is running
echo "🔍 Checking Verdaccio status..."
if ! curl -s "${REGISTRY}" > /dev/null 2>&1; then
  echo "❌ Error: Verdaccio is not running at ${REGISTRY}"
  echo "   Start it with: docker-compose up -d verdaccio"
  exit 1
fi
echo "✅ Verdaccio is running"

# Check authentication
echo ""
echo "🔐 Checking authentication..."
if ! npm whoami --registry "${REGISTRY}" &>/dev/null; then
  echo "⚠️  Not authenticated with Verdaccio"
  echo "   Please run: npm adduser --registry ${REGISTRY}"
  echo "   Credentials: test/test"
  exit 1
fi

USER=$(npm whoami --registry "${REGISTRY}")
echo "✅ Authenticated as: ${USER}"

# Build the package
echo ""
echo "🔨 Building ${PACKAGE_NAME}..."
pnpm --filter "${PACKAGE_NAME}" build

if [ $? -ne 0 ]; then
  echo "❌ Build failed"
  exit 1
fi
echo "✅ Build successful"

# Publish to Verdaccio
echo ""
echo "📤 Publishing to ${REGISTRY}..."
cd "${PACKAGE_PATH}"

# Get current version
VERSION=$(node -p "require('./package.json').version")
echo "   Version: ${VERSION}"

pnpm publish --registry "${REGISTRY}" --no-git-checks

if [ $? -ne 0 ]; then
  echo ""
  echo "❌ Publish failed"
  echo "   If the version already exists, bump the version first:"
  echo "   cd ${PACKAGE_PATH} && npm version patch"
  exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Successfully published ${PACKAGE_NAME}@${VERSION}"
echo ""
echo "📋 Next steps:"
echo "   1. Install in mobile app:"
echo "      cd apps/mobile"
echo "      pnpm add ${PACKAGE_NAME}@${VERSION} --registry ${REGISTRY}"
echo ""
echo "   2. Or update existing installation:"
echo "      pnpm --filter @large-event/mobile update ${PACKAGE_NAME}"
echo ""
echo "   3. View in Verdaccio UI:"
echo "      open ${REGISTRY}/#/detail/${PACKAGE_NAME}"
echo ""
