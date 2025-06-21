# Use Ubuntu 22.04 as base image
FROM ubuntu:22.04

# Prevent interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Set environment variables
ENV GO_VERSION=1.24.3
ENV GOROOT=/usr/local/go
ENV GOPATH=/go
ENV PATH=$GOROOT/bin:$GOPATH/bin:$PATH
ENV PGUSER=postgres
ENV PGPASSWORD=postgres
ENV PGDATABASE=friend_finder

# Detect architecture and set Go download URL
RUN ARCH=$(dpkg --print-architecture) && \
    if [ "$ARCH" = "amd64" ]; then GO_ARCH="amd64"; \
    elif [ "$ARCH" = "arm64" ]; then GO_ARCH="arm64"; \
    else echo "Unsupported architecture: $ARCH" && exit 1; fi && \
    echo "Detected architecture: $ARCH, downloading Go for: $GO_ARCH"

# Update package list and install dependencies
RUN apt-get update && apt-get install -y \
    wget \
    curl \
    git \
    build-essential \
    python3 \
    python3-pip \
    python3-venv \
    python3-dev \
    postgresql \
    postgresql-contrib \
    postgresql-client \
    postgresql-server-dev-14 \
    libpq-dev \
    sudo \
    supervisor \
    && rm -rf /var/lib/apt/lists/*

# Install Go with correct architecture
RUN ARCH=$(dpkg --print-architecture) && \
    if [ "$ARCH" = "amd64" ]; then GO_ARCH="amd64"; \
    elif [ "$ARCH" = "arm64" ]; then GO_ARCH="arm64"; \
    else echo "Unsupported architecture: $ARCH" && exit 1; fi && \
    wget https://golang.org/dl/go${GO_VERSION}.linux-${GO_ARCH}.tar.gz && \
    tar -C /usr/local -xzf go${GO_VERSION}.linux-${GO_ARCH}.tar.gz && \
    rm go${GO_VERSION}.linux-${GO_ARCH}.tar.gz

# Create go workspace
RUN mkdir -p $GOPATH/src $GOPATH/bin

# Create app directory
WORKDIR /app

# Copy application files
COPY . .

# Install Python requirements globally
RUN pip3 install -r requirements.txt

# Install Go dependencies
RUN go mod init service-manager || true
RUN go get github.com/lib/pq gopkg.in/yaml.v3

# Create PostgreSQL data directory and set permissions
RUN mkdir -p /var/lib/postgresql/data && \
    chown -R postgres:postgres /var/lib/postgresql/data && \
    chmod 700 /var/lib/postgresql/data

# Create supervisor configuration directory
RUN mkdir -p /etc/supervisor/conf.d

# Create supervisor configuration for PostgreSQL
RUN echo '[program:postgresql]' > /etc/supervisor/conf.d/postgresql.conf && \
    echo 'user=postgres' >> /etc/supervisor/conf.d/postgresql.conf && \
    echo 'command=/usr/lib/postgresql/14/bin/postgres -D /var/lib/postgresql/data' >> /etc/supervisor/conf.d/postgresql.conf && \
    echo 'autostart=true' >> /etc/supervisor/conf.d/postgresql.conf && \
    echo 'autorestart=true' >> /etc/supervisor/conf.d/postgresql.conf && \
    echo 'stderr_logfile=/var/log/postgresql.err' >> /etc/supervisor/conf.d/postgresql.conf && \
    echo 'stdout_logfile=/var/log/postgresql.log' >> /etc/supervisor/conf.d/postgresql.conf

# Create initialization script
RUN echo '#!/bin/bash' > /app/init.sh && \
    echo 'set -e' >> /app/init.sh && \
    echo '' >> /app/init.sh && \
    echo '# Function to wait for PostgreSQL to be ready' >> /app/init.sh && \
    echo 'wait_for_postgres() {' >> /app/init.sh && \
    echo '    echo "Waiting for PostgreSQL to start..."' >> /app/init.sh && \
    echo '    for i in {1..30}; do' >> /app/init.sh && \
    echo '        if sudo -u postgres pg_isready > /dev/null 2>&1; then' >> /app/init.sh && \
    echo '            echo "PostgreSQL is ready!"' >> /app/init.sh && \
    echo '            return 0' >> /app/init.sh && \
    echo '        fi' >> /app/init.sh && \
    echo '        echo "Waiting for PostgreSQL... ($i/30)"' >> /app/init.sh && \
    echo '        sleep 2' >> /app/init.sh && \
    echo '    done' >> /app/init.sh && \
    echo '    echo "PostgreSQL failed to start within 60 seconds"' >> /app/init.sh && \
    echo '    exit 1' >> /app/init.sh && \
    echo '}' >> /app/init.sh && \
    echo '' >> /app/init.sh && \
    echo '# Initialize PostgreSQL data directory if it does not exist' >> /app/init.sh && \
    echo 'if [ ! -s "/var/lib/postgresql/data/PG_VERSION" ]; then' >> /app/init.sh && \
    echo '    echo "Initializing PostgreSQL database..."' >> /app/init.sh && \
    echo '    sudo -u postgres /usr/lib/postgresql/14/bin/initdb -D /var/lib/postgresql/data' >> /app/init.sh && \
    echo 'fi' >> /app/init.sh && \
    echo '' >> /app/init.sh && \
    echo '# Start supervisor (which will start PostgreSQL)' >> /app/init.sh && \
    echo 'echo "Starting PostgreSQL..."' >> /app/init.sh && \
    echo '/usr/bin/supervisord -c /etc/supervisor/supervisord.conf &' >> /app/init.sh && \
    echo '' >> /app/init.sh && \
    echo '# Wait for PostgreSQL to be ready' >> /app/init.sh && \
    echo 'wait_for_postgres' >> /app/init.sh && \
    echo '' >> /app/init.sh && \
    echo '# Create database user and database' >> /app/init.sh && \
    echo 'echo "Setting up database..."' >> /app/init.sh && \
    echo 'sudo -u postgres createuser --createdb --no-password root || true' >> /app/init.sh && \
    echo 'sudo -u postgres createdb -O root friend_finder || echo "Database may already exist"' >> /app/init.sh && \
    echo '' >> /app/init.sh && \
    echo '# Run database initialization' >> /app/init.sh && \
    echo 'echo "Running database initialization..."' >> /app/init.sh && \
    echo 'python3 server/db/init_db.py --database friend_finder --user root --host localhost' >> /app/init.sh && \
    echo '' >> /app/init.sh && \
    echo '# Build and run the Go service manager' >> /app/init.sh && \
    echo 'echo "Building Go service manager..."' >> /app/init.sh && \
    echo 'export CGO_ENABLED=1' >> /app/init.sh && \
    echo 'export GOOS=linux' >> /app/init.sh && \
    echo 'go build -o service-manager service-manager.go' >> /app/init.sh && \
    echo '' >> /app/init.sh && \
    echo 'echo "Starting Go service manager..."' >> /app/init.sh && \
    echo './service-manager' >> /app/init.sh

# Make the script executable
RUN chmod +x /app/init.sh

# Install Flask and psycopg2-binary if not already in requirements
RUN pip3 install uvicorn fastapi pandas numpy psycopg2

# Expose ports
EXPOSE 8000 9090 5432

# Set the entrypoint
ENTRYPOINT ["/app/init.sh"]

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:9090/health || exit 1