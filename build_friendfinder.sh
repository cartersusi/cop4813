#!/usr/bin/env bash

DBNAME="friend_finder"

platform=$(uname -ms)

# Reset
Color_Off=''

# Regular Colors
Red=''
Green=''
Dim='' # White

# Bold
Bold_White=''
Bold_Green=''

if [[ -t 1 ]]; then
    # Reset
    Color_Off='\033[0m' # Text Reset

    # Regular Colors
    Red='\033[0;31m'   # Red
    Green='\033[0;32m' # Green
    Dim='\033[0;2m'    # White

    # Bold
    Bold_Green='\033[1;32m' # Bold Green
    Bold_White='\033[1m'    # Bold White
fi

error() {
    echo -e "${Red}error${Color_Off}:" "$@" >&2
    exit 1
}

warning() {
    echo -e "${Red}warning${Color_Off}:" "$@" >&2
}

info() {
    echo -e "${Dim}$@ ${Color_Off}"
}

info_bold() {
    echo -e "${Bold_White}$@ ${Color_Off}"
}

success() {
    echo -e "${Green}$@ ${Color_Off}"
}

install_homebrew() {
    if [[ "$platform" == "Darwin arm64" ]]; then
        if ! command -v brew &> /dev/null; then
            info "Installing Homebrew..."
            /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
            if [[ $? -ne 0 ]]; then
                error "Failed to install Homebrew. Please check your internet connection or try again later."
            else
                success "Homebrew installed successfully."
                info "Please add Homebrew to your PATH by adding the following line to your shell configuration file (e.g., ~/.bashrc, ~/.zshrc):"

                if [[ "$SHELL" == */zsh ]]; then
                    shell_config_file=~/.zshrc
                elif [[ "$SHELL" == */bash ]]; then
                    shell_config_file=~/.bash_profile
                else
                    warning "Unknown shell: $SHELL. Please add Homebrew to your PATH manually."
                    info "Add the following line to your shell configuration file:"
                    info_bold "export PATH=\"/opt/homebrew/bin:\$PATH\""
                    return
                fi
                
                echo -e "\nexport PATH=\"/opt/homebrew/bin:\$PATH\"" >> "$shell_config_file"
            fi
        else
            success "Homebrew is already installed."
        fi
    else
        warning "This script is designed for macOS ARM64 architecture only. Homebrew installation skipped."
        warning "Using linux package managers for dependencies."
    fi
}

install_deps() {
    if ! command -v npm &> /dev/null || ! command -v node &> /dev/null || ! command -v docker &> /dev/null; then
        info "Installing Node.js, npm, and docker..."
        if [[ "$platform" == "Darwin arm64" ]]; then
            brew install node docker
        elif [[ "$platform" == "Linux" ]]; then
            if command -v apt-get &> /dev/null; then
                sudo apt-get update
                sudo apt-get install -y nodejs npm docker
            elif command -v yum &> /dev/null; then
                sudo yum update -y
                sudo yum install -y nodejs npm docker
            elif command -v dnf &> /dev/null; then
                sudo dnf update -y
                sudo dnf install -y nodejs npm docker
            elif command -v pacman &> /dev/null; then
                sudo pacman -Syu nodejs npm docker
            elif command -v zypper &> /dev/null; then
                sudo zypper refresh
                sudo zypper install -y nodejs npm docker
            elif command -v apk &> /dev/null; then
                sudo apk update
                sudo apk add nodejs npm docker
            else
                error "Unsupported package manager. Please install Node.js and npm manually."
            fi
        else
            error "Unsupported platform: $platform. Please install Node.js and npm manually."
        fi
        if [[ $? -ne 0 ]]; then
            error "Failed to install Node.js, npm, and docker. Please check your internet connection or try again later."
        else
            success "Node.js, npm, and docker installed successfully."
        fi
    else
        success "Node.js, npm, and docker is already installed."
    fi
}

build_frontend() {
    if [[ -d "frontend" ]]; then
        info "Building frontend..."
        cd frontend || error "Failed to change directory to frontend."
        npm install
        if [[ $? -ne 0 ]]; then
            error "Failed to install frontend dependencies. Please check your internet connection or try again later."
        fi
        npm run build
        if [[ $? -ne 0 ]]; then
            error "Failed to build frontend. Please check the output for errors."
        fi
        success "Frontend built successfully."
        cd ..
    else
        error "Frontend directory not found."
    fi
}

# docker build --platform linux/arm64 -t friend-finder-service .
build_docker_image() {
    info "Building Docker image for Friend Finder service..."
    # Check architecture
    if [[ "$platform" = "Darwin arm64" ]]; then
        docker build --platform linux/arm64 -t friend-finder-service .
    else
        docker build --platform linux/amd64 -t friend-finder-service .
    fi
    if [[ $? -ne 0 ]]; then
        error "Failed to build Docker image. Please check the output for errors."
    else
        success "Docker image built successfully."
    fi
}

main() {
    info_bold "Setting up Friend Finder..."

    if [[ "$platform" != "Darwin arm64" ]]; then
        error "This script is designed for macOS ARM64 architecture only."
    fi

    install_homebrew
    install_deps
    build_frontend
    build_docker_image

    success "Setup complete. You can now run the Friend Finder service with the cmd:"
    info_bold "     docker run -p 8000:8000 -p 9090:9090 -p 5432:5432 friend-finder-service"
}

main "$@"