#!/bin/bash

# Color definitions for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print header
echo -e "${BLUE}=================================${NC}"
echo -e "${BLUE}    Tyler's SEO Tool Launcher    ${NC}"
echo -e "${BLUE}=================================${NC}"

# Store the script's directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Create logs directory if it doesn't exist
LOGS_DIR="$SCRIPT_DIR/logs"
if [ ! -d "$LOGS_DIR" ]; then
    echo -e "${YELLOW}Creating logs directory...${NC}"
    mkdir -p "$LOGS_DIR"
fi

# Define log file paths
BACKEND_LOG="$LOGS_DIR/backend.log"
FRONTEND_LOG="$LOGS_DIR/frontend.log"

# Function to add timestamps to logs
log_with_timestamp() {
    local log_file=$1
    local message=$2
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $message" >> "$log_file"
}

# Clear/initialize log files
echo -e "${YELLOW}Initializing log files...${NC}"
echo "=== CSV Processor Tool Backend Log ===" > "$BACKEND_LOG"
echo "=== Started at: $(date) ===" >> "$BACKEND_LOG"
echo "" >> "$BACKEND_LOG"

echo "=== CSV Processor Tool Frontend Log ===" > "$FRONTEND_LOG"
echo "=== Started at: $(date) ===" >> "$FRONTEND_LOG"
echo "" >> "$FRONTEND_LOG"

echo -e "${GREEN}Logs will be available at:${NC}"
echo -e "  Backend: ${BLUE}$BACKEND_LOG${NC}"
echo -e "  Frontend: ${BLUE}$FRONTEND_LOG${NC}"

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check if Python is installed
if ! command_exists python3; then
    echo -e "${RED}Error: Python 3 is not installed.${NC}"
    echo -e "${YELLOW}Please install Python 3 using Homebrew:${NC}"
    echo "brew install python"
    exit 1
fi

# Check if Node.js is installed
if ! command_exists node; then
    echo -e "${RED}Error: Node.js is not installed.${NC}"
    echo -e "${YELLOW}Please install Node.js using Homebrew:${NC}"
    echo "brew install node"
    exit 1
fi

# Check if npm is installed
if ! command_exists npm; then
    echo -e "${RED}Error: npm is not installed.${NC}"
    echo -e "${YELLOW}Please install npm:${NC}"
    echo "brew install npm"
    exit 1
fi

# Set frontend directory directly to frontend
FRONTEND_DIR="$SCRIPT_DIR/frontend"

# Log the frontend directory
log_with_timestamp "$FRONTEND_LOG" "Using frontend directory: $FRONTEND_DIR"
echo -e "${GREEN}Using frontend directory: ${BLUE}$FRONTEND_DIR${NC}"

# Check if the frontend directory exists
if [ ! -d "$FRONTEND_DIR" ]; then
    echo -e "${RED}Error: The frontend directory '$FRONTEND_DIR' does not exist.${NC}"
    exit 1
fi

# Function to start the backend server
start_backend() {
    echo -e "${GREEN}Starting backend server...${NC}"
    log_with_timestamp "$BACKEND_LOG" "Starting backend server initialization"
    
    cd "$SCRIPT_DIR/backend" || { 
        echo -e "${RED}Backend directory not found${NC}"
        log_with_timestamp "$BACKEND_LOG" "ERROR: Backend directory not found"
        return 1
    }
    
    # Check if app/main.py exists
    if [ ! -f "app/main.py" ]; then
        echo -e "${RED}Error: app/main.py not found in backend directory${NC}"
        log_with_timestamp "$BACKEND_LOG" "ERROR: app/main.py not found in backend directory"
        return 1
    fi
    
    # Create virtual environment if it doesn't exist
    if [ ! -d "venv" ]; then
        echo -e "${YELLOW}Creating Python virtual environment...${NC}"
        log_with_timestamp "$BACKEND_LOG" "Creating Python virtual environment"
        python3 -m venv venv 2>> "$BACKEND_LOG"
        if [ $? -ne 0 ]; then
            log_with_timestamp "$BACKEND_LOG" "ERROR: Failed to create virtual environment"
            echo -e "${RED}Failed to create virtual environment${NC}"
            return 1
        fi
    fi
    
    # Activate virtual environment
    echo -e "${YELLOW}Activating virtual environment...${NC}"
    log_with_timestamp "$BACKEND_LOG" "Activating virtual environment"
    source venv/bin/activate
    
    # Install dependencies if needed
    if [ ! -d "venv/lib/python3."*/site-packages/fastapi ]; then
        echo -e "${YELLOW}Installing backend dependencies...${NC}"
        log_with_timestamp "$BACKEND_LOG" "Installing backend dependencies"
        pip install -r requirements.txt >> "$BACKEND_LOG" 2>&1
        if [ $? -ne 0 ]; then
            log_with_timestamp "$BACKEND_LOG" "ERROR: Failed to install dependencies"
            echo -e "${RED}Failed to install backend dependencies${NC}"
            return 1
        fi
        log_with_timestamp "$BACKEND_LOG" "Backend dependencies installed successfully"
    fi
    
    # Start the FastAPI server using module startup
    echo -e "${GREEN}Starting FastAPI server using module startup...${NC}"
    log_with_timestamp "$BACKEND_LOG" "Starting FastAPI server using python -m app.main"
    
    # Run Python as module and output redirected to log file
    python -m app.main >> "$BACKEND_LOG" 2>&1 &
    BACKEND_PID=$!
    
    # Check if process is running
    if ps -p $BACKEND_PID > /dev/null; then
        echo -e "${GREEN}Backend server started with PID: $BACKEND_PID${NC}"
        log_with_timestamp "$BACKEND_LOG" "Backend server started successfully with PID: $BACKEND_PID"
        # Give the server a moment to start and check if it's still running
        sleep 2
        if ! ps -p $BACKEND_PID > /dev/null; then
            echo -e "${RED}Backend server failed to start. Check logs for details.${NC}"
            log_with_timestamp "$BACKEND_LOG" "ERROR: Backend server failed to start"
            return 1
        fi
    else
        echo -e "${RED}Failed to start backend server${NC}"
        log_with_timestamp "$BACKEND_LOG" "ERROR: Failed to start backend server"
        return 1
    fi
    
    return 0
}

# Function to start the frontend server
start_frontend() {
    echo -e "${GREEN}Starting frontend server...${NC}"
    log_with_timestamp "$FRONTEND_LOG" "Starting frontend server initialization"
    
    cd "$FRONTEND_DIR" || { 
        echo -e "${RED}Frontend directory not found: $FRONTEND_DIR${NC}"
        log_with_timestamp "$FRONTEND_LOG" "ERROR: Frontend directory not found: $FRONTEND_DIR"
        return 1
    }
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}Installing frontend dependencies...${NC}"
        log_with_timestamp "$FRONTEND_LOG" "Installing frontend dependencies"
        npm install >> "$FRONTEND_LOG" 2>&1
        if [ $? -ne 0 ]; then
            log_with_timestamp "$FRONTEND_LOG" "ERROR: Failed to install dependencies"
            echo -e "${RED}Failed to install frontend dependencies${NC}"
            return 1
        fi
        log_with_timestamp "$FRONTEND_LOG" "Frontend dependencies installed successfully"
    fi
    
    # Start the Next.js development server
    echo -e "${GREEN}Starting Next.js server...${NC}"
    log_with_timestamp "$FRONTEND_LOG" "Starting Next.js server"
    
    # Run npm with output redirected to log file
    npm run dev >> "$FRONTEND_LOG" 2>&1 &
    FRONTEND_PID=$!
    
    # Check if process is running
    if ps -p $FRONTEND_PID > /dev/null; then
        echo -e "${GREEN}Frontend server started with PID: $FRONTEND_PID${NC}"
        log_with_timestamp "$FRONTEND_LOG" "Frontend server started successfully with PID: $FRONTEND_PID"
        
        # Give the server a moment to start and check if it's still running
        sleep 3
        if ! ps -p $FRONTEND_PID > /dev/null; then
            echo -e "${RED}Frontend server failed to start. Check logs for details.${NC}"
            log_with_timestamp "$FRONTEND_LOG" "ERROR: Frontend server failed to start"
            return 1
        fi
    else
        echo -e "${RED}Failed to start frontend server${NC}"
        log_with_timestamp "$FRONTEND_LOG" "ERROR: Failed to start frontend server"
        return 1
    fi
    
    return 0
}

# Cleanup function
cleanup() {
    echo -e "\n${YELLOW}Stopping servers...${NC}"
    
    if [ -n "$BACKEND_PID" ]; then
        echo -e "${YELLOW}Stopping backend server (PID: $BACKEND_PID)...${NC}"
        log_with_timestamp "$BACKEND_LOG" "Stopping backend server (PID: $BACKEND_PID)"
        kill $BACKEND_PID 2>/dev/null
        if [ $? -eq 0 ]; then
            log_with_timestamp "$BACKEND_LOG" "Backend server stopped successfully"
        else
            log_with_timestamp "$BACKEND_LOG" "Failed to stop backend server gracefully"
        fi
    fi
    
    if [ -n "$FRONTEND_PID" ]; then
        echo -e "${YELLOW}Stopping frontend server (PID: $FRONTEND_PID)...${NC}"
        log_with_timestamp "$FRONTEND_LOG" "Stopping frontend server (PID: $FRONTEND_PID)"
        kill $FRONTEND_PID 2>/dev/null
        if [ $? -eq 0 ]; then
            log_with_timestamp "$FRONTEND_LOG" "Frontend server stopped successfully"
        else
            log_with_timestamp "$FRONTEND_LOG" "Failed to stop frontend server gracefully"
        fi
    fi
    
    # Also kill any processes on the ports we're using
    BACKEND_PORT=$(grep -o "PORT=[0-9]*" "$SCRIPT_DIR/backend/.env" | cut -d= -f2)
    if [ -z "$BACKEND_PORT" ]; then
        BACKEND_PORT=8000  # Default port
    fi
    
    echo -e "${YELLOW}Ensuring port $BACKEND_PORT is free...${NC}"
    log_with_timestamp "$BACKEND_LOG" "Ensuring port $BACKEND_PORT is free"
    BACKEND_PROCESSES=$(lsof -i:$BACKEND_PORT -t 2>/dev/null)
    if [ -n "$BACKEND_PROCESSES" ]; then
        log_with_timestamp "$BACKEND_LOG" "Killing processes on port $BACKEND_PORT: $BACKEND_PROCESSES"
        echo $BACKEND_PROCESSES | xargs kill -9 2>/dev/null
    fi
    
    echo -e "${YELLOW}Ensuring port 3000 is free...${NC}"
    log_with_timestamp "$FRONTEND_LOG" "Ensuring port 3000 is free"
    FRONTEND_PROCESSES=$(lsof -i:3000 -t 2>/dev/null)
    if [ -n "$FRONTEND_PROCESSES" ]; then
        log_with_timestamp "$FRONTEND_LOG" "Killing processes on port 3000: $FRONTEND_PROCESSES"
        echo $FRONTEND_PROCESSES | xargs kill -9 2>/dev/null
    fi
    
    # Final log entries
    log_with_timestamp "$BACKEND_LOG" "=== Backend server shutdown complete ==="
    log_with_timestamp "$FRONTEND_LOG" "=== Frontend server shutdown complete ==="
    
    echo -e "${GREEN}Cleanup complete.${NC}"
    echo -e "${BLUE}Log files are available at:${NC}"
    echo -e "  Backend: ${BLUE}$BACKEND_LOG${NC}"
    echo -e "  Frontend: ${BLUE}$FRONTEND_LOG${NC}"
    exit 0
}

# Function to display log watching options
show_log_options() {
    echo -e "\n${BLUE}Log commands:${NC}"
    echo -e "  ${YELLOW}backend${NC} - View backend logs"
    echo -e "  ${YELLOW}frontend${NC} - View frontend logs"
    echo -e "  ${YELLOW}both${NC} - View both logs side by side (requires tmux)"
    echo -e "  ${YELLOW}q${NC} - Return to this menu"
    echo -e "  ${YELLOW}exit${NC} - Exit the application"
    echo -e "\nType a command and press Enter:"
}

# Function to watch logs interactively
watch_logs() {
    local choice=""
    
    while true; do
        show_log_options
        read -r choice
        
        case "$choice" in
            backend)
                echo -e "${BLUE}Viewing backend logs (press Ctrl+C to return to menu)...${NC}"
                tail -f "$BACKEND_LOG" || true
                ;;
            frontend)
                echo -e "${BLUE}Viewing frontend logs (press Ctrl+C to return to menu)...${NC}"
                tail -f "$FRONTEND_LOG" || true
                ;;
            both)
                if command_exists tmux; then
                    echo -e "${BLUE}Viewing both logs (press Ctrl+B then d to detach)...${NC}"
                    tmux new-session -d "tail -f $BACKEND_LOG"
                    tmux split-window -h "tail -f $FRONTEND_LOG"
                    tmux -2 attach-session -d
                else
                    echo -e "${YELLOW}tmux is not installed. Please install it with 'brew install tmux' to use this feature.${NC}"
                fi
                ;;
            q)
                break
                ;;
            exit)
                echo -e "${YELLOW}Exiting application...${NC}"
                cleanup
                ;;
            *)
                echo -e "${RED}Invalid command: $choice${NC}"
                ;;
        esac
    done
}

# Monitor function to check if services are still running
monitor_services() {
    while true; do
        sleep 5
        # Check if backend is still running
        if [ -n "$BACKEND_PID" ] && ! ps -p $BACKEND_PID > /dev/null; then
            echo -e "${RED}Backend server (PID: $BACKEND_PID) stopped unexpectedly.${NC}"
            log_with_timestamp "$BACKEND_LOG" "ERROR: Backend server stopped unexpectedly"
            echo -e "${YELLOW}Check backend.log for details.${NC}"
            BACKEND_PID=""
        fi
        
        # Check if frontend is still running
        if [ -n "$FRONTEND_PID" ] && ! ps -p $FRONTEND_PID > /dev/null; then
            echo -e "${RED}Frontend server (PID: $FRONTEND_PID) stopped unexpectedly.${NC}"
            log_with_timestamp "$FRONTEND_LOG" "ERROR: Frontend server stopped unexpectedly"
            echo -e "${YELLOW}Check frontend.log for details.${NC}"
            FRONTEND_PID=""
        fi
        
        # If both services are down, exit
        if [ -z "$BACKEND_PID" ] && [ -z "$FRONTEND_PID" ]; then
            echo -e "${RED}Both servers are down. Exiting...${NC}"
            cleanup
        fi
    done
}

# Set up cleanup on script exit (Ctrl+C or terminal close)
trap cleanup EXIT INT TERM

# Start backend and frontend servers
start_backend
backend_status=$?

if [ $backend_status -eq 0 ]; then
    start_frontend
    frontend_status=$?
    
    if [ $frontend_status -eq 0 ]; then
        echo -e "\n${GREEN}Both servers started successfully!${NC}"
        echo -e "${BLUE}Backend URL:${NC} http://localhost:8000/api"
        echo -e "${BLUE}Frontend URL:${NC} http://localhost:3000"
        
        # Start monitoring in background
        monitor_services &
        MONITOR_PID=$!
        
        # Interactive log watching
        echo -e "\n${YELLOW}Services are running in the background.${NC}"
        echo -e "${GREEN}Log files are being updated at:${NC}"
        echo -e "  Backend: ${BLUE}$BACKEND_LOG${NC}"
        echo -e "  Frontend: ${BLUE}$FRONTEND_LOG${NC}"
        
        watch_logs
        
        # If we get here, the user has chosen to exit
        cleanup
    else
        echo -e "${RED}Failed to start frontend server.${NC}"
        exit 1
    fi
else
    echo -e "${RED}Failed to start backend server.${NC}"
    exit 1
fi