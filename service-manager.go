package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/exec"
	"os/signal"
	"sync"
	"syscall"
	"time"

	_ "github.com/lib/pq"
	"gopkg.in/yaml.v3"
)

// Config holds all configuration values
type Config struct {
	Server struct {
		Port         string        `yaml:"port"`
		PythonPath   string        `yaml:"python_path"`
		ScriptPath   string        `yaml:"script_path"`
		ReadTimeout  time.Duration `yaml:"read_timeout"`
		WriteTimeout time.Duration `yaml:"write_timeout"`
		IdleTimeout  time.Duration `yaml:"idle_timeout"`
	} `yaml:"server"`
	Database struct {
		Host          string        `yaml:"host"`
		Port          int           `yaml:"port"`
		User          string        `yaml:"user"`
		Password      string        `yaml:"password"`
		DBName        string        `yaml:"db_name"`
		SSLMode       string        `yaml:"ssl_mode"`
		CheckInterval time.Duration `yaml:"check_interval"`
		MaxRetries    int           `yaml:"max_retries"`
	} `yaml:"database"`
	Logging struct {
		Level string `yaml:"level"`
	} `yaml:"logging"`
}

// ServiceManager manages the lifecycle of services
type ServiceManager struct {
	config    *Config
	pythonCmd *exec.Cmd
	db        *sql.DB
	logger    *log.Logger
	shutdown  chan os.Signal
	wg        sync.WaitGroup
	ctx       context.Context
	cancel    context.CancelFunc
}

func main() {
	// Check if config file exists, create example if not
	configPath := "conf/friend-finder.yml"
	if _, err := os.Stat(configPath); os.IsNotExist(err) {
		log.Fatalf("Config file not found: %s. Please create a config.yml file with the required settings.", configPath)
	}

	// Create and start service manager
	sm, err := NewServiceManager(configPath)
	if err != nil {
		log.Fatalf("Failed to create service manager: %v", err)
	}

	if err := sm.Start(); err != nil {
		log.Fatalf("Failed to start service manager: %v", err)
	}

	// Wait for all services to shutdown
	sm.Wait()
}

// NewServiceManager creates a new service manager
func NewServiceManager(configPath string) (*ServiceManager, error) {
	config, err := loadConfig(configPath)
	if err != nil {
		return nil, fmt.Errorf("failed to load config: %w", err)
	}

	ctx, cancel := context.WithCancel(context.Background())

	sm := &ServiceManager{
		config:   config,
		logger:   log.New(os.Stdout, "[SERVICE-MANAGER] ", log.LstdFlags|log.Lshortfile),
		shutdown: make(chan os.Signal, 1),
		ctx:      ctx,
		cancel:   cancel,
	}

	// Setup signal handling for graceful shutdown
	signal.Notify(sm.shutdown, syscall.SIGINT, syscall.SIGTERM)

	return sm, nil
}

// loadConfig loads configuration from YAML file
func loadConfig(path string) (*Config, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("failed to read config file: %w", err)
	}

	var config Config
	if err := yaml.Unmarshal(data, &config); err != nil {
		return nil, fmt.Errorf("failed to unmarshal config: %w", err)
	}

	// Set defaults if not specified
	if config.Server.Port == "" {
		config.Server.Port = "8080"
	}
	if config.Server.PythonPath == "" {
		config.Server.PythonPath = "python3"
	}
	if config.Server.ScriptPath == "" {
		config.Server.ScriptPath = "server.py"
	}
	if config.Server.ReadTimeout == 0 {
		config.Server.ReadTimeout = 30 * time.Second
	}
	if config.Server.WriteTimeout == 0 {
		config.Server.WriteTimeout = 30 * time.Second
	}
	if config.Server.IdleTimeout == 0 {
		config.Server.IdleTimeout = 60 * time.Second
	}
	if config.Database.CheckInterval == 0 {
		config.Database.CheckInterval = 30 * time.Second
	}
	if config.Database.MaxRetries == 0 {
		config.Database.MaxRetries = 3
	}
	if config.Database.SSLMode == "" {
		config.Database.SSLMode = "disable"
	}

	return &config, nil
}

// Start starts all services
func (sm *ServiceManager) Start() error {
	sm.logger.Println("Starting Service Manager...")

	// Initialize database connection
	if err := sm.initDatabase(); err != nil {
		return fmt.Errorf("failed to initialize database: %w", err)
	}

	// Start database monitor
	sm.wg.Add(1)
	go sm.runDatabaseMonitor()

	// Start health check server (separate from Python server)
	sm.wg.Add(1)
	go sm.runHealthCheckServer()

	// Start web server
	sm.wg.Add(1)
	go sm.runWebServer()

	// Wait for shutdown signal
	go sm.waitForShutdown()

	sm.logger.Println("Service Manager started successfully")
	return nil
}

// initDatabase initializes the database connection
func (sm *ServiceManager) initDatabase() error {
	var dsn string

	// Handle empty user/password (use system defaults)
	if sm.config.Database.User == "" {
		// Use current system user with minimal connection string
		dsn = fmt.Sprintf("host=%s port=%d dbname=%s sslmode=%s",
			sm.config.Database.Host,
			sm.config.Database.Port,
			sm.config.Database.DBName,
			sm.config.Database.SSLMode,
		)
	} else {
		// Use specified user and password
		dsn = fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
			sm.config.Database.Host,
			sm.config.Database.Port,
			sm.config.Database.User,
			sm.config.Database.Password,
			sm.config.Database.DBName,
			sm.config.Database.SSLMode,
		)
	}

	sm.logger.Printf("Attempting to connect to database: %s", sm.config.Database.DBName)

	db, err := sql.Open("postgres", dsn)
	if err != nil {
		return fmt.Errorf("failed to open database: %w", err)
	}

	// Test connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := db.PingContext(ctx); err != nil {
		db.Close()
		return fmt.Errorf("failed to ping database: %w", err)
	}

	sm.db = db
	sm.logger.Println("Database connection established")
	return nil
}

// runWebServer starts and manages the Python web server
func (sm *ServiceManager) runWebServer() {
	defer sm.wg.Done()
	defer sm.recoverFromPanic("python web server")

	sm.logger.Printf("Starting Python server: %s %s on port %s",
		sm.config.Server.PythonPath, sm.config.Server.ScriptPath, sm.config.Server.Port)

	// Check if the Python script exists
	if _, err := os.Stat(sm.config.Server.ScriptPath); os.IsNotExist(err) {
		sm.logger.Printf("Python script not found: %s", sm.config.Server.ScriptPath)
		sm.cancel()
		return
	}

	// Create context for the Python process
	ctx, cancel := context.WithCancel(sm.ctx)
	defer cancel()

	// Prepare the Python command
	sm.pythonCmd = exec.CommandContext(ctx, sm.config.Server.PythonPath, sm.config.Server.ScriptPath)

	// Set environment variables for the Python process
	sm.pythonCmd.Env = append(os.Environ(),
		fmt.Sprintf("PORT=%s", sm.config.Server.Port),
		fmt.Sprintf("DB_HOST=%s", sm.config.Database.Host),
		fmt.Sprintf("DB_PORT=%d", sm.config.Database.Port),
		fmt.Sprintf("DB_USER=%s", sm.config.Database.User),
		fmt.Sprintf("DB_PASSWORD=%s", sm.config.Database.Password),
		fmt.Sprintf("DB_NAME=%s", sm.config.Database.DBName),
	)

	// Redirect Python process output to our logger
	sm.pythonCmd.Stdout = &logWriter{logger: sm.logger, prefix: "[PYTHON-STDOUT]"}
	sm.pythonCmd.Stderr = &logWriter{logger: sm.logger, prefix: "[PYTHON-STDERR]"}

	// Start the Python process
	if err := sm.pythonCmd.Start(); err != nil {
		sm.logger.Printf("Failed to start Python server: %v", err)
		sm.cancel()
		return
	}

	sm.logger.Printf("Python server started with PID: %d", sm.pythonCmd.Process.Pid)

	// Wait for the process to finish or context cancellation
	processErr := make(chan error, 1)
	go func() {
		processErr <- sm.pythonCmd.Wait()
	}()

	select {
	case err := <-processErr:
		if err != nil {
			sm.logger.Printf("Python server exited with error: %v", err)
			// Check exit code and decide whether to restart or shutdown
			if exitError, ok := err.(*exec.ExitError); ok {
				exitCode := exitError.ExitCode()
				sm.logger.Printf("Python server exit code: %d", exitCode)

				switch exitCode {
				case 0:
					sm.logger.Println("Python server shut down gracefully")
				case 1:
					sm.logger.Println("Python server crashed, triggering service shutdown")
					sm.cancel()
				case 2:
					sm.logger.Println("Python server configuration error, triggering service shutdown")
					sm.cancel()
				default:
					sm.logger.Printf("Python server unexpected exit code: %d, triggering service shutdown", exitCode)
					sm.cancel()
				}
			}
		} else {
			sm.logger.Println("Python server shut down gracefully")
		}
	case <-sm.ctx.Done():
		sm.logger.Println("Shutting down Python server...")

		// Send SIGTERM to Python process
		if sm.pythonCmd.Process != nil {
			if err := sm.pythonCmd.Process.Signal(syscall.SIGTERM); err != nil {
				sm.logger.Printf("Failed to send SIGTERM to Python process: %v", err)
			}
		}

		// Wait for graceful shutdown with timeout
		shutdownTimer := time.NewTimer(30 * time.Second)
		defer shutdownTimer.Stop()

		select {
		case <-processErr:
			sm.logger.Println("Python server shut down gracefully")
		case <-shutdownTimer.C:
			sm.logger.Println("Python server shutdown timeout, forcing kill...")
			if sm.pythonCmd.Process != nil {
				sm.pythonCmd.Process.Kill()
			}
		}
	}
}

// logWriter implements io.Writer to redirect Python process output to our logger
type logWriter struct {
	logger *log.Logger
	prefix string
}

func (lw *logWriter) Write(p []byte) (n int, err error) {
	lw.logger.Printf("%s %s", lw.prefix, string(p))
	return len(p), nil
}

// runHealthCheckServer runs a simple health check server on a different port
func (sm *ServiceManager) runHealthCheckServer() {
	defer sm.wg.Done()
	defer sm.recoverFromPanic("health check server")

	healthPort := "9090" // Use a different port for health checks
	sm.logger.Printf("Starting health check server on port %s", healthPort)

	mux := http.NewServeMux()
	mux.HandleFunc("/health", sm.healthHandler)
	mux.HandleFunc("/", sm.defaultHandler)

	server := &http.Server{
		Addr:    ":" + healthPort,
		Handler: mux,
	}

	// Start server in a goroutine
	serverErr := make(chan error, 1)
	go func() {
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			serverErr <- err
		}
	}()

	// Wait for shutdown signal or server error
	select {
	case err := <-serverErr:
		sm.logger.Printf("Health check server error: %v", err)
	case <-sm.ctx.Done():
		sm.logger.Println("Shutting down health check server...")

		shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		if err := server.Shutdown(shutdownCtx); err != nil {
			sm.logger.Printf("Health check server shutdown error: %v", err)
		} else {
			sm.logger.Println("Health check server shut down gracefully")
		}
	}
}

// runDatabaseMonitor monitors database health
func (sm *ServiceManager) runDatabaseMonitor() {
	defer sm.wg.Done()
	defer sm.recoverFromPanic("database monitor")

	sm.logger.Println("Starting database monitor")

	ticker := time.NewTicker(sm.config.Database.CheckInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			sm.checkDatabaseHealth()
		case <-sm.ctx.Done():
			sm.logger.Println("Database monitor shutting down...")
			if sm.db != nil {
				sm.db.Close()
				sm.logger.Println("Database connection closed")
			}
			return
		}
	}
}

// checkDatabaseHealth checks if database is healthy
func (sm *ServiceManager) checkDatabaseHealth() {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := sm.db.PingContext(ctx); err != nil {
		sm.logger.Printf("Database health check failed: %v", err)

		// Attempt to reconnect
		if err := sm.reconnectDatabase(); err != nil {
			sm.logger.Printf("Failed to reconnect to database: %v", err)
		}
	}
}

// reconnectDatabase attempts to reconnect to the database
func (sm *ServiceManager) reconnectDatabase() error {
	sm.logger.Println("Attempting to reconnect to database...")

	for i := 0; i < sm.config.Database.MaxRetries; i++ {
		if err := sm.initDatabase(); err != nil {
			sm.logger.Printf("Reconnection attempt %d failed: %v", i+1, err)
			time.Sleep(time.Duration(i+1) * time.Second)
			continue
		}

		sm.logger.Println("Database reconnection successful")
		return nil
	}

	return fmt.Errorf("failed to reconnect after %d attempts", sm.config.Database.MaxRetries)
}

// waitForShutdown waits for shutdown signals
func (sm *ServiceManager) waitForShutdown() {
	<-sm.shutdown
	sm.logger.Println("Shutdown signal received, initiating graceful shutdown...")
	sm.cancel()
}

// recoverFromPanic recovers from panics and logs them
func (sm *ServiceManager) recoverFromPanic(serviceName string) {
	if r := recover(); r != nil {
		sm.logger.Printf("PANIC in %s: %v", serviceName, r)
		// Optionally restart the service or trigger shutdown
		sm.cancel()
	}
}

// healthHandler provides a simple health check by making HTTP request to Python server
func (sm *ServiceManager) healthHandler(w http.ResponseWriter, r *http.Request) {
	// Check database health
	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
	defer cancel()

	dbHealthy := true
	if err := sm.db.PingContext(ctx); err != nil {
		dbHealthy = false
	}

	// Check if Python server is running
	pythonHealthy := sm.pythonCmd != nil && sm.pythonCmd.Process != nil

	// Optionally, make HTTP request to Python server's health endpoint
	if pythonHealthy {
		client := &http.Client{Timeout: 2 * time.Second}
		resp, err := client.Get(fmt.Sprintf("http://localhost:%s/health", sm.config.Server.Port))
		if err != nil || resp.StatusCode != http.StatusOK {
			pythonHealthy = false
		}
		if resp != nil {
			resp.Body.Close()
		}
	}

	status := "healthy"
	statusCode := http.StatusOK

	if !dbHealthy || !pythonHealthy {
		status = "unhealthy"
		statusCode = http.StatusServiceUnavailable
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	fmt.Fprintf(w, `{"status": "%s", "database": %t, "python_server": %t}`, status, dbHealthy, pythonHealthy)
}

func (sm *ServiceManager) defaultHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	fmt.Fprintf(w, `{"message": "Service Manager is running", "timestamp": "%s"}`, time.Now().Format(time.RFC3339))
}

// Wait waits for all services to shutdown
func (sm *ServiceManager) Wait() {
	sm.wg.Wait()
	sm.logger.Println("All services have shut down")
}
