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
}

install_npm() {
    if ! command -v npm &> /dev/null; then
        info "Installing Node.js and npm..."
        brew install node
        if [[ $? -ne 0 ]]; then
            error "Failed to install Node.js and npm. Please check your internet connection or try again later."
        else
            success "Node.js and npm installed successfully."
        fi
    else
        success "npm is already installed."
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
    docker build --platform linux/arm64 -t friend-finder-service .
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
    install_npm
    build_frontend
    build_docker_image

    success "Setup complete. You can now run the Friend Finder service with the cmd:"
    info_bold "     docker run -p 8000:8000 -p 9090:9090 -p 5432:5432 friend-finder-service"
}

main "$@"