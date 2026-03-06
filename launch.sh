#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_step() {
    echo -e "${BLUE}▶${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}!${NC} $1"
}

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       Ollama Manager Launcher          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Check for Ollama
print_step "Checking for Ollama..."
if ! command -v ollama &> /dev/null; then
    print_error "Ollama is not installed or not in PATH"
    echo ""
    echo "Please install Ollama from:"
    echo "  • https://ollama.ai"
    echo "  • Or: brew install ollama"
    echo ""
    exit 1
fi
OLLAMA_VERSION=$(ollama --version 2>&1 | grep -o "version [^ ]*" || echo "unknown")
print_success "Ollama found ($OLLAMA_VERSION)"
echo ""

# Check for Node.js
print_step "Checking for Node.js..."
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed or not in PATH"
    echo ""
    echo "Please install Node.js from:"
    echo "  • https://nodejs.org"
    echo "  • Or: brew install node"
    echo ""
    exit 1
fi
NODE_VERSION=$(node --version)
print_success "Node.js found ($NODE_VERSION)"
echo ""

# Check for Python and determine which to use
print_step "Checking for Python environment..."
PYTHON_CMD=""

# Try venv first (primary setup)
if [ -d ".venv-1" ]; then
    PYTHON_CMD="./.venv-1/bin/python"
    print_success "Found Python venv at .venv-1"
elif [ -d ".venv" ]; then
    PYTHON_CMD="./.venv/bin/python"
    print_success "Found Python venv at .venv"
elif [ -d "venv" ]; then
    PYTHON_CMD="./venv/bin/python"
    print_success "Found Python venv at venv"
else
    # Fallback to system Python
    if command -v python3 &> /dev/null; then
        PYTHON_CMD="python3"
        print_warning "No venv found, using system python3 (fallback)"
    elif command -v python &> /dev/null; then
        PYTHON_CMD="python"
        print_warning "No venv found, using system python (fallback)"
    else
        print_error "Python is not installed or not in PATH"
        echo ""
        echo "Please install Python 3.8+ from:"
        echo "  • https://www.python.org"
        echo "  • Or: brew install python3"
        echo ""
        exit 1
    fi
fi

# Verify Python version
PYTHON_VERSION=$($PYTHON_CMD --version 2>&1)
print_success "Using Python: $PYTHON_VERSION"
echo ""

# Check for npm dependencies
print_step "Checking for npm dependencies..."
if [ ! -d "node_modules" ]; then
    print_warning "node_modules not found, installing dependencies..."
    npm install --silent
    print_success "npm dependencies installed"
else
    print_success "npm dependencies found"
fi
echo ""

# Install Python dependencies if needed
print_step "Checking Python dependencies..."
if ! $PYTHON_CMD -c "import fastapi, uvicorn" 2>/dev/null; then
    print_warning "Installing Python dependencies from requirements.txt..."
    $PYTHON_CMD -m pip install -r requirements.txt --quiet
    print_success "Python dependencies installed"
else
    print_success "Python dependencies found"
fi
echo ""

# Function to cleanup on exit
cleanup() {
    print_warning "Shutting down services..."
    # Kill background processes
    jobs -p | xargs -r kill 2>/dev/null || true
    print_success "Cleanup complete"
}

trap cleanup EXIT INT TERM

# Start backend
print_step "Starting FastAPI backend on http://localhost:8000..."
$PYTHON_CMD backend.py &
BACKEND_PID=$!

# Wait for backend to be ready
BACKEND_READY=false
for i in {1..30}; do
    if curl -s http://localhost:8000/api/health &> /dev/null; then
        BACKEND_READY=true
        break
    fi
    sleep 0.5
done

if [ "$BACKEND_READY" = true ]; then
    print_success "Backend is running (PID: $BACKEND_PID)"
else
    print_error "Backend failed to start within 15 seconds"
    echo ""
    echo "Troubleshooting:"
    echo "  • Check if port 8000 is already in use"
    echo "  • Check backend.py for syntax errors"
    echo "  • Run: python backend.py (for detailed error output)"
    echo ""
    exit 1
fi
echo ""

# Start frontend
print_step "Starting Vite dev server on http://localhost:5173..."
npm run dev &
FRONTEND_PID=$!

# Wait a moment for frontend to start
sleep 3

# Check if processes are still running
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    print_error "Backend process died unexpectedly"
    exit 1
fi

if ! kill -0 $FRONTEND_PID 2>/dev/null; then
    print_error "Frontend process died unexpectedly"
    exit 1
fi

echo ""
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║    Ollama Manager is Ready!            ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "🌐 Open your browser to:"
echo -e "   ${BLUE}http://localhost:5173${NC}"
echo ""
echo -e "Backend API:  ${BLUE}http://localhost:8000${NC}"
echo -e "Backend PID:  $BACKEND_PID"
echo -e "Frontend PID: $FRONTEND_PID"
echo ""
echo -e "Press ${YELLOW}Ctrl+C${NC} to stop all services"
echo ""

# Wait for all processes
wait
