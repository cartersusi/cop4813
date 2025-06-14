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

install_postgresql() {
    if ! command -v psql &> /dev/null; then
        info "Installing PostgreSQL..."
        brew install postgresql
        if [[ $? -ne 0 ]]; then
            error "Failed to install PostgreSQL. Please check your internet connection or try again later."
        else
            success "PostgreSQL installed successfully."
            info "To start PostgreSQL, run: brew services start postgresql"
        fi
    else
        success "PostgreSQL is already installed."
    fi
}

create_db() {
    if ! psql -lqt | cut -d \| -f 1 | grep -qw "$DBNAME"; then
        info "Creating database '$DBNAME'..."
        createdb "$DBNAME"
        if [[ $? -ne 0 ]]; then
            error "Failed to create database '$DBNAME'. Please check your PostgreSQL installation."
        else
            success "Database '$DBNAME' created successfully."
        fi
    else
        success "Database '$DBNAME' already exists."
    fi
}

init_db() {
    info "Initializing database schema..."
    source server/venv/bin/activate
    python server/db/db.py
}

main() {
    info_bold "Setting up Friend Finder..."

    if [[ "$platform" != "Darwin arm64" ]]; then
        error "Unsupported platform: $platform. This script is designed for macOS."
    fi

    install_homebrew
    install_postgresql
    create_db
    init_db

    success "Friend Finder setup completed successfully!"
}

main "$@"
