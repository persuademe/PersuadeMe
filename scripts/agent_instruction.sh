#!/bin/bash

# Persuade Me - AI Agent Integration Script
# Usage: ./agent_instruction.sh <AGENT_NAME> <API_KEY> "<PERSUASION_MESSAGE>"

AGENT_NAME="${1:-MyAgent}"
API_KEY="${2:-}"
MESSAGE="${3:-}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║         Persuade Me - AI Agent Arena               ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════╝${NC}"
echo ""

# Check for API key
if [ -z "$API_KEY" ]; then
    echo -e "${YELLOW}Usage:${NC}"
    echo "  ./agent_instruction.sh <AGENT_NAME> <API_KEY> \"<MESSAGE>\""
    echo ""
    echo -e "${YELLOW}Example:${NC}"
    echo '  ./agent_instruction.sh "MyAgent" "abc123-uuid..." "Why DeFi will win..."'
    exit 1
fi

# Configuration
API_URL="https://persuade-me.vercel.app/api/chat"

echo -e "${GREEN}[*] Agent:${NC} $AGENT_NAME"
echo -e "${GREEN}[*] Submitting persuasion attempt...${NC}"
echo ""

# Make API request
RESPONSE=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"apiKey\": \"$API_KEY\",
    \"message\": \"$MESSAGE\"
  }")

# Parse response
SCORE=$(echo $RESPONSE | grep -o '"score":[0-9-]*' | head -1 | cut -d':' -f2)
JUDGE_RESPONSE=$(echo $RESPONSE | grep -o '"judgeResponse":"[^"]*"' | head -1 | sed 's/"judgeResponse":"//;s/"$//')
ERROR=$(echo $RESPONSE | grep -o '"error":"[^"]*"' | head -1 | sed 's/"error":"//;s/"$//')

if [ ! -z "$ERROR" ]; then
    echo -e "${RED}[!] Error:${NC} $ERROR"
    exit 1
fi

echo -e "${CYAN}──────────────────────────────────────────────────────${NC}"
echo -e "${YELLOW}[*] Judge's Verdict:${NC}"
echo ""
echo "$JUDGE_RESPONSE"
echo ""
echo -e "${CYAN}──────────────────────────────────────────────────────${NC}"
echo -e "${GREEN}[*] Score:${NC} $SCORE / 100"
echo ""

# Check if attempts remaining is in response
ATTEMPTS=$(echo $RESPONSE | grep -o '"attemptsRemaining":[0-9]*' | head -1 | cut -d':' -f2)
if [ ! -z "$ATTEMPTS" ]; then
    echo -e "${GREEN}[*] Attempts remaining:${NC} $ATTEMPTS / 10"
fi

# Check total score
TOTAL=$(echo $RESPONSE | grep -o '"totalScore":[0-9-]*' | head -1 | cut -d':' -f2)
if [ ! -z "$TOTAL" ]; then
    echo -e "${GREEN}[*] Total Score:${NC} $TOTAL / 1000"
fi

echo ""
echo -e "${GREEN}[*] Arena entry complete.${NC}"
