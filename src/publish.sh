#!/bin/bash
set -e

# Team-Agnostic Package Publisher
# Publishes @team{x} packages to local Verdaccio registry
#
# Usage: ./src/publish.sh <team> [package|all] [--unpublish]
#   Where <team> is one of: teama, teamb, teamc, teamd
#   Where [package] is one of: api-types, database, web-components, mobile-components, or "all"
#   Where --unpublish is an optional flag to force republish (unpublish then republish)
#
# Examples:
#   ./src/publish.sh teamd mobile-components    # Publish only mobile-components
#   ./src/publish.sh teamd all                  # Publish all packages
#   ./src/publish.sh teamd                      # Publish all packages (default)
#   ./src/publish.sh teamd mobile-components --unpublish    # Force republish mobile-components
#   ./src/publish.sh teamd all --unpublish                  # Force republish all packages

REGISTRY="http://localhost:4873"

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
UNPUBLISH_MODE=false
TEAM_LOWER=""
PACKAGE_ARG="all"

for arg in "$@"; do
  case "$arg" in
    --unpublish)
      UNPUBLISH_MODE=true
      ;;
    *)
      if [ -z "$TEAM_LOWER" ]; then
        TEAM_LOWER="$arg"
      elif [ "$PACKAGE_ARG" = "all" ]; then
        PACKAGE_ARG="$arg"
      fi
      ;;
  esac
done

# Validate team parameter
if [ -z "$TEAM_LOWER" ]; then
  echo -e "${RED}❌ Error: Team parameter required${NC}"
  echo ""
  echo "Usage: $0 <team> [package|all] [--unpublish]"
  echo "  Where <team> is one of: teama, teamb, teamc, teamd"
  echo "  Where [package] is one of: api-types, database, web-components, mobile-components, or 'all'"
  echo "  Where --unpublish is an optional flag to force republish (unpublish then republish)"
  echo ""
  echo "Examples:"
  echo "  $0 teamd mobile-components    # Publish only mobile-components"
  echo "  $0 teamd all                  # Publish all packages"
  echo "  $0 teamd                      # Publish all packages (default)"
  echo "  $0 teamd mobile-components --unpublish    # Force republish mobile-components"
  echo "  $0 teamd all --unpublish                  # Force republish all packages"
  exit 1
fi

# Validate team is one of the allowed values
case "$TEAM_LOWER" in
  teama|teamb|teamc|teamd)
    ;;
  *)
    echo -e "${RED}❌ Error: Invalid team '${TEAM_LOWER}'${NC}"
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

# Define available packages
AVAILABLE_PACKAGES=("api-types" "database" "web-components" "mobile-components")

# Determine which packages to publish
if [ "$PACKAGE_ARG" = "all" ]; then
  PACKAGES_TO_PUBLISH=("${AVAILABLE_PACKAGES[@]}")
else
  # Validate package name
  if [[ ! " ${AVAILABLE_PACKAGES[@]} " =~ " ${PACKAGE_ARG} " ]]; then
    echo -e "${RED}❌ Error: Invalid package '${PACKAGE_ARG}'${NC}"
    echo "   Package must be one of: ${AVAILABLE_PACKAGES[*]}, or 'all'"
    exit 1
  fi
  PACKAGES_TO_PUBLISH=("$PACKAGE_ARG")
fi

# Check if Verdaccio is running
echo -e "${BLUE}🔍 Checking Verdaccio status...${NC}"
if ! curl -s "${REGISTRY}" > /dev/null 2>&1; then
  echo -e "${RED}❌ Error: Verdaccio is not running at ${REGISTRY}${NC}"
  echo "   Start it with: docker-compose up -d verdaccio"
  exit 1
fi
echo -e "${GREEN}✅ Verdaccio is running${NC}"

# Check authentication
echo ""
echo -e "${BLUE}🔐 Checking authentication...${NC}"
if ! npm whoami --registry "${REGISTRY}" &>/dev/null; then
  echo -e "${YELLOW}⚠️  Not authenticated with Verdaccio${NC}"
  echo "   Please run: npm adduser --registry ${REGISTRY}"
  echo "   Credentials: test/test"
  exit 1
fi

USER=$(npm whoami --registry "${REGISTRY}")
echo -e "${GREEN}✅ Authenticated as: ${USER}${NC}"

# Function to publish a single package
publish_package() {
  local package_name=$1
  local package_scope="@${TEAM_LOWER}/${package_name}"
  local package_path="src/${package_name}"

  echo ""
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}📦 Publishing ${package_scope}${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

  # Check if package directory exists
  if [ ! -d "$package_path" ]; then
    echo -e "${YELLOW}⚠️  Package directory not found: ${package_path}${NC}"
    echo "   Skipping ${package_name}..."
    return 0
  fi

  # Check if package.json exists
  if [ ! -f "${package_path}/package.json" ]; then
    echo -e "${RED}❌ Error: package.json not found in ${package_path}${NC}"
    return 1
  fi

  # Build the package
  echo ""
  echo -e "${BLUE}🔨 Building ${package_scope}...${NC}"

  # Use pnpm filter to build from root
  if ! pnpm --filter "${package_scope}" build; then
    echo -e "${RED}❌ Build failed for ${package_scope}${NC}"
    return 1
  fi

  echo -e "${GREEN}✅ Build successful${NC}"

  # Publish to Verdaccio
  echo ""
  echo -e "${BLUE}📤 Publishing to ${REGISTRY}...${NC}"
  cd "${package_path}"

  # Get current version
  VERSION=$(node -p "require('./package.json').version")
  echo -e "   ${BLUE}Version: ${VERSION}${NC}"

  if ! pnpm publish --registry "${REGISTRY}" --no-git-checks; then
    echo ""
    echo -e "${RED}❌ Publish failed for ${package_scope}${NC}"
    echo "   If the version already exists, bump the version first:"
    echo "   cd ${package_path} && npm version patch"
    cd - > /dev/null
    return 1
  fi

  cd - > /dev/null

  echo -e "${GREEN}✅ Successfully published ${package_scope}@${VERSION}${NC}"
  return 0
}

# Function to unpublish and republish a single package
unpublish_package() {
  local package_name=$1
  local package_scope="@${TEAM_LOWER}/${package_name}"
  local package_path="src/${package_name}"

  echo ""
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}🔄 Unpublishing & Republishing ${package_scope}${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

  # Check if package directory exists
  if [ ! -d "$package_path" ]; then
    echo -e "${YELLOW}⚠️  Package directory not found: ${package_path}${NC}"
    echo "   Skipping ${package_name}..."
    return 0
  fi

  # Check if package.json exists
  if [ ! -f "${package_path}/package.json" ]; then
    echo -e "${RED}❌ Error: package.json not found in ${package_path}${NC}"
    return 1
  fi

  # Get current version
  VERSION=$(node -p "require('./${package_path}/package.json').version" 2>/dev/null || echo "unknown")
  echo -e "   ${BLUE}Package: ${package_scope}${NC}"
  echo -e "   ${BLUE}Version: ${VERSION}${NC}"

  # Unpublish from Verdaccio
  echo ""
  echo -e "${BLUE}🗑️  Unpublishing from ${REGISTRY}...${NC}"

  if ! npm unpublish "${package_scope}" --registry "${REGISTRY}" --force 2>/dev/null; then
    echo -e "${YELLOW}⚠️  Package not found in registry or already unpublished${NC}"
  else
    echo -e "${GREEN}✅ Successfully unpublished ${package_scope}${NC}"
  fi

  # Wait a moment for registry to update
  sleep 1

  # Build the package
  echo ""
  echo -e "${BLUE}🔨 Building ${package_scope}...${NC}"

  # Use pnpm filter to build from root
  if ! pnpm --filter "${package_scope}" build; then
    echo -e "${RED}❌ Build failed for ${package_scope}${NC}"
    return 1
  fi

  echo -e "${GREEN}✅ Build successful${NC}"

  # Publish to Verdaccio
  echo ""
  echo -e "${BLUE}📤 Publishing to ${REGISTRY}...${NC}"
  cd "${package_path}"

  if ! pnpm publish --registry "${REGISTRY}" --no-git-checks; then
    echo ""
    echo -e "${RED}❌ Publish failed for ${package_scope}${NC}"
    cd - > /dev/null
    return 1
  fi

  cd - > /dev/null

  echo -e "${GREEN}✅ Successfully republished ${package_scope}@${VERSION}${NC}"
  return 0
}

# Track success/failure
SUCCESSFUL_PUBLISHES=()
FAILED_PUBLISHES=()
SKIPPED_PACKAGES=()

# Publish or unpublish packages in order
for package in "${PACKAGES_TO_PUBLISH[@]}"; do
  if [ "$UNPUBLISH_MODE" = true ]; then
    if unpublish_package "$package"; then
      # Check if it was actually unpublished or skipped
      package_path="src/${package}"
      if [ -d "$package_path" ]; then
        SUCCESSFUL_PUBLISHES+=("$package")
      else
        SKIPPED_PACKAGES+=("$package")
      fi
    else
      FAILED_PUBLISHES+=("$package")
    fi
  else
    if publish_package "$package"; then
      # Check if it was actually published or skipped
      package_path="src/${package}"
      if [ -d "$package_path" ]; then
        SUCCESSFUL_PUBLISHES+=("$package")
      else
        SKIPPED_PACKAGES+=("$package")
      fi
    else
      FAILED_PUBLISHES+=("$package")
    fi
  fi
done

# Summary
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
if [ "$UNPUBLISH_MODE" = true ]; then
  echo -e "${BLUE}📊 Force Republish Summary${NC}"
else
  echo -e "${BLUE}📊 Publishing Summary${NC}"
fi
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ ${#SUCCESSFUL_PUBLISHES[@]} -gt 0 ]; then
  if [ "$UNPUBLISH_MODE" = true ]; then
    echo -e "${GREEN}✅ Successfully republished (${#SUCCESSFUL_PUBLISHES[@]}):${NC}"
  else
    echo -e "${GREEN}✅ Successfully published (${#SUCCESSFUL_PUBLISHES[@]}):${NC}"
  fi
  for package in "${SUCCESSFUL_PUBLISHES[@]}"; do
    echo -e "   ${GREEN}• @${TEAM_LOWER}/${package}${NC}"
  done
fi

if [ ${#SKIPPED_PACKAGES[@]} -gt 0 ]; then
  echo -e "${YELLOW}⏭️  Skipped (${#SKIPPED_PACKAGES[@]}):${NC}"
  for package in "${SKIPPED_PACKAGES[@]}"; do
    echo -e "   ${YELLOW}• @${TEAM_LOWER}/${package} (not found)${NC}"
  done
fi

if [ ${#FAILED_PUBLISHES[@]} -gt 0 ]; then
  echo -e "${RED}❌ Failed (${#FAILED_PUBLISHES[@]}):${NC}"
  for package in "${FAILED_PUBLISHES[@]}"; do
    echo -e "   ${RED}• @${TEAM_LOWER}/${package}${NC}"
  done
fi

echo ""
if [ ${#SUCCESSFUL_PUBLISHES[@]} -gt 0 ] && [ "$UNPUBLISH_MODE" = false ]; then
  echo -e "${BLUE}📋 Next steps:${NC}"
  echo "   1. View packages in Verdaccio UI:"
  echo "      open ${REGISTRY}"
  echo ""
  echo "   2. Install in other packages:"
  echo "      pnpm add @${TEAM_LOWER}/<package-name> --registry ${REGISTRY}"
  echo ""
fi

# Exit with error if any packages failed
if [ ${#FAILED_PUBLISHES[@]} -gt 0 ]; then
  exit 1
fi
