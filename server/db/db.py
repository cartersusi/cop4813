import psycopg2
from psycopg2.extras import RealDictCursor
import hashlib
import secrets
import uuid
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import json


class DatabaseManager:
    """Main database manager class for user management system with authentication using PostgreSQL."""
    
    def __init__(self, host: str = "localhost", port: int = 5432, 
                 database: str = "friend_finder", user: str = None, 
                 password: str = None):
        """Initialize the database manager.
        
        Args:
            host (str): PostgreSQL host
            port (int): PostgreSQL port
            database (str): Database name
            user (str): Database user
            password (str): Database password
        """
        self.host = host
        self.port = port
        self.database = database
        self.user = user
        self.password = password
        self.connection = None
        self.connect()
        #self.create_tables()
        #self.create_default_roles_and_permissions()
    
    def connect(self) -> None:
        """Establish connection to the PostgreSQL database."""
        try:
            connection_params = {
                'host': self.host,
                'port': self.port,
                'database': self.database,
                'cursor_factory': RealDictCursor
            }
            
            if self.user:
                connection_params['user'] = self.user
            if self.password:
                connection_params['password'] = self.password
                
            self.connection = psycopg2.connect(**connection_params)
            self.connection.autocommit = False  # We'll handle transactions manually
            print(f"Connected to PostgreSQL database: {self.database}")
        except psycopg2.Error as e:
            print(f"Error connecting to database: {e}")
            raise
    
    def disconnect(self) -> None:
        """Close database connection."""
        if self.connection:
            self.connection.close()
            print("Database connection closed")
    
    def execute_query(self, query: str, params: tuple = ()) -> psycopg2.extensions.cursor:
        """Execute a SQL query with parameters.
        
        Args:
            query (str): SQL query to execute
            params (tuple): Parameters for the query
            
        Returns:
            psycopg2.extensions.cursor: Cursor object with query results
        """
        try:
            cursor = self.connection.cursor()
            cursor.execute(query, params)
            self.connection.commit()
            return cursor
        except psycopg2.Error as e:
            print(f"Error executing query: {e}")
            self.connection.rollback()
            raise
    
    def create_tables(self) -> None:
        """Create all database tables."""
        
        # Users table
        self.execute_query("""
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                email_verified BOOLEAN DEFAULT FALSE,
                password_hash VARCHAR(255) NOT NULL,
                salt VARCHAR(255),
                first_name VARCHAR(100),
                last_name VARCHAR(100),
                avatar_url VARCHAR(500),
                bio TEXT,
                is_active BOOLEAN DEFAULT TRUE,
                is_deleted BOOLEAN DEFAULT FALSE,
                current_results INTEGER,
                last_login_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Create indexes for users
        self.execute_query("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email)")
        self.execute_query("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username)")
        self.execute_query("CREATE INDEX IF NOT EXISTS idx_users_active_deleted ON users(is_active, is_deleted)")
        
        # User sessions table
        self.execute_query("""
            CREATE TABLE IF NOT EXISTS user_sessions (
                id VARCHAR(255) PRIMARY KEY,
                user_id INTEGER NOT NULL,
                device_info VARCHAR(500),
                ip_address INET,
                is_active BOOLEAN DEFAULT TRUE,
                expires_at TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """)
        
        self.execute_query("CREATE INDEX IF NOT EXISTS idx_sessions_user_active ON user_sessions(user_id, is_active)")
        self.execute_query("CREATE INDEX IF NOT EXISTS idx_sessions_expires ON user_sessions(expires_at)")
        
        # Password reset tokens
        self.execute_query("""
            CREATE TABLE IF NOT EXISTS password_reset_tokens (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                token VARCHAR(255) UNIQUE NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                used_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """)
        
        self.execute_query("CREATE UNIQUE INDEX IF NOT EXISTS idx_reset_token ON password_reset_tokens(token)")
        self.execute_query("CREATE INDEX IF NOT EXISTS idx_reset_user_expires ON password_reset_tokens(user_id, expires_at)")
        
        # Email verification tokens
        self.execute_query("""
            CREATE TABLE IF NOT EXISTS email_verification_tokens (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                token VARCHAR(255) UNIQUE NOT NULL,
                email VARCHAR(255) NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                verified_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """)
        
        self.execute_query("CREATE UNIQUE INDEX IF NOT EXISTS idx_email_verify_token ON email_verification_tokens(token)")
        self.execute_query("CREATE INDEX IF NOT EXISTS idx_email_verify_user_expires ON email_verification_tokens(user_id, expires_at)")
        
        # Roles table
        self.execute_query("""
            CREATE TABLE IF NOT EXISTS roles (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) UNIQUE NOT NULL,
                description TEXT,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Permissions table
        self.execute_query("""
            CREATE TABLE IF NOT EXISTS permissions (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) UNIQUE NOT NULL,
                description TEXT,
                resource VARCHAR(100),
                action VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Role permissions junction table
        self.execute_query("""
            CREATE TABLE IF NOT EXISTS role_permissions (
                role_id INTEGER,
                permission_id INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (role_id, permission_id),
                FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
                FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
            )
        """)
        
        # User roles junction table
        self.execute_query("""
            CREATE TABLE IF NOT EXISTS user_roles (
                user_id INTEGER,
                role_id INTEGER,
                assigned_by INTEGER,
                assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP,
                PRIMARY KEY (user_id, role_id),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
                FOREIGN KEY (assigned_by) REFERENCES users(id)
            )
        """)
        
        # Security audit log
        self.execute_query("""
            CREATE TABLE IF NOT EXISTS user_security_logs (
                id SERIAL PRIMARY KEY,
                user_id INTEGER,
                event_type VARCHAR(100) NOT NULL,
                ip_address INET,
                user_agent VARCHAR(500),
                success BOOLEAN DEFAULT TRUE,
                failure_reason VARCHAR(255),
                metadata JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
            )
        """)
        
        self.execute_query("CREATE INDEX IF NOT EXISTS idx_security_logs_user_date ON user_security_logs(user_id, created_at)")
        self.execute_query("CREATE INDEX IF NOT EXISTS idx_security_logs_event_date ON user_security_logs(event_type, created_at)")
        self.execute_query("CREATE INDEX IF NOT EXISTS idx_security_logs_metadata ON user_security_logs USING GIN(metadata)")
        
        # Friends table
        self.execute_query("""
            CREATE TABLE IF NOT EXISTS friends (
                user_id INTEGER NOT NULL,
                friend_user_id INTEGER NOT NULL,
                status VARCHAR(20) DEFAULT 'pending',
                requested_by INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (user_id, friend_user_id),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (friend_user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE CASCADE
            )
        """)
        
        self.execute_query("CREATE INDEX IF NOT EXISTS idx_friends_status ON friends(friend_user_id, status)")
        
        # Results table
        self.execute_query("""
            CREATE TABLE IF NOT EXISTS results (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                extraversion REAL,
                agreeableness REAL,
                conscientiousness REAL,
                emotional_stability REAL,
                intellect_imagination REAL,
                test_version VARCHAR(50),
                is_current BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """)
        
        self.execute_query("CREATE INDEX IF NOT EXISTS idx_results_user_current ON results(user_id, is_current)")
        self.execute_query("CREATE INDEX IF NOT EXISTS idx_results_user_date ON results(user_id, created_at)")
        
        # Posts table
        self.execute_query("""
            CREATE TABLE IF NOT EXISTS posts (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                body TEXT,
                user_id INTEGER NOT NULL,
                status VARCHAR(20) DEFAULT 'draft',
                visibility VARCHAR(20) DEFAULT 'public',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_flagged BOOLEAN DEFAULT FALSE,
                flag_reason TEXT,
                flagged_by INTEGER REFERENCES users(id),
                flagged_at TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """)
        
        self.execute_query("CREATE INDEX IF NOT EXISTS idx_posts_user_status ON posts(user_id, status)")
        self.execute_query("CREATE INDEX IF NOT EXISTS idx_posts_status_visibility_date ON posts(status, visibility, created_at)")
        
        try:
            self.execute_query("""
                ALTER TABLE users 
                ADD CONSTRAINT fk_users_current_results 
                FOREIGN KEY (current_results) REFERENCES results(id)
            """)
        except psycopg2.errors.DuplicateObject:
            # Constraint already exists, ignore the error
            pass
        
        try:
            self.execute_query("""
                CREATE INDEX IF NOT EXISTS idx_posts_flagged 
                ON posts(is_flagged) WHERE is_flagged = TRUE
            """)
        except psycopg2.errors.DuplicateObject:
            # Index already exists, ignore the error
            pass
        
        print("All tables created successfully")
    
    def create_default_roles_and_permissions(self) -> None:
        """Create default roles and permissions."""
        # Default roles
        default_roles = [
            ('admin', 'Full system administrator'),
            ('moderator', 'Content moderation privileges'),
            ('user', 'Standard user privileges'),
            ('premium_user', 'Premium user with extended features')
        ]
        
        for role_name, description in default_roles:
            try:
                self.execute_query(
                    "INSERT INTO roles (name, description) VALUES (%s, %s) ON CONFLICT (name) DO NOTHING",
                    (role_name, description)
                )
            except psycopg2.Error:
                pass  # Role already exists
        
        # Default permissions
        default_permissions = [
            ('create_posts', 'Create new posts', 'posts', 'create'),
            ('edit_posts', 'Edit posts', 'posts', 'update'),
            ('delete_posts', 'Delete posts', 'posts', 'delete'),
            ('view_posts', 'View posts', 'posts', 'read'),
            ('manage_users', 'Manage user accounts', 'users', 'manage'),
            ('view_profiles', 'View user profiles', 'users', 'read'),
            ('take_personality_test', 'Take personality assessments', 'results', 'create'),
            ('view_results', 'View personality results', 'results', 'read')
        ]
        
        for perm_name, description, resource, action in default_permissions:
            try:
                self.execute_query(
                    "INSERT INTO permissions (name, description, resource, action) VALUES (%s, %s, %s, %s) ON CONFLICT (name) DO NOTHING",
                    (perm_name, description, resource, action)
                )
            except psycopg2.Error:
                pass  # Permission already exists
        
        print("Default roles and permissions created")
    
    def hash_password(self, password: str, salt: str = None) -> tuple:
        """Hash a password with salt.
        
        Args:
            password (str): Plain text password
            salt (str): Optional salt, generates new one if not provided
            
        Returns:
            tuple: (hashed_password, salt)
        """
        if salt is None:
            salt = secrets.token_hex(32)
        
        # Use PBKDF2 for password hashing
        password_hash = hashlib.pbkdf2_hmac('sha256', 
                                          password.encode('utf-8'), 
                                          salt.encode('utf-8'), 
                                          100000)  # 100,000 iterations
        
        return password_hash.hex(), salt
    
    def verify_password(self, password: str, stored_hash: str, salt: str) -> bool:
        """Verify a password against stored hash.
        
        Args:
            password (str): Plain text password to verify
            stored_hash (str): Stored password hash
            salt (str): Salt used for hashing
            
        Returns:
            bool: True if password matches
        """
        password_hash, _ = self.hash_password(password, salt)
        return password_hash == stored_hash
    
    def create_user(self, username: str, email: str, password: str, 
                   first_name: str = None, last_name: str = None) -> Optional[int]:
        """Create a new user.
        
        Args:
            username (str): Unique username
            email (str): User email address
            password (str): Plain text password
            first_name (str): Optional first name
            last_name (str): Optional last name
            
        Returns:
            Optional[int]: User ID if successful, None otherwise
        """
        try:
            password_hash, salt = self.hash_password(password)
            
            cursor = self.execute_query("""
                INSERT INTO users (username, email, password_hash, salt, first_name, last_name)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (username, email, password_hash, salt, first_name, last_name))
            
            user_id = cursor.fetchone()['id']
            
            # Assign default user role
            self.assign_role_to_user(user_id, 'user', user_id)
            
            # Log user creation
            self.log_security_event(user_id, 'user_created', success=True)
            
            print(f"User created successfully with ID: {user_id}")
            return user_id
            
        except psycopg2.IntegrityError as e:
            print(f"Error creating user: {e}")
            return None
    
    def assign_role_to_user(self, user_id: int, role_name: str, assigned_by: int) -> bool:
        """Assign a role to a user.
        
        Args:
            user_id (int): User ID
            role_name (str): Name of the role to assign
            assigned_by (int): ID of user assigning the role
            
        Returns:
            bool: True if successful
        """
        try:
            # Get role ID
            cursor = self.execute_query("SELECT id FROM roles WHERE name = %s", (role_name,))
            role_row = cursor.fetchone()
            
            if not role_row:
                print(f"Role '{role_name}' not found")
                return False
            
            role_id = role_row['id']
            
            self.execute_query("""
                INSERT INTO user_roles (user_id, role_id, assigned_by)
                VALUES (%s, %s, %s)
                ON CONFLICT (user_id, role_id) DO UPDATE SET
                assigned_by = EXCLUDED.assigned_by,
                assigned_at = CURRENT_TIMESTAMP
            """, (user_id, role_id, assigned_by))
            
            return True
            
        except psycopg2.Error as e:
            print(f"Error assigning role: {e}")
            return False
    
    def create_session(self, user_id: int, device_info: str = None, 
                      ip_address: str = None, duration_hours: int = 24) -> str:
        """Create a new user session.
        
        Args:
            user_id (int): User ID
            device_info (str): Device/browser information
            ip_address (str): User's IP address
            duration_hours (int): Session duration in hours
            
        Returns:
            str: Session token
        """
        session_id = str(uuid.uuid4())
        expires_at = datetime.now() + timedelta(hours=duration_hours)
        
        self.execute_query("""
            INSERT INTO user_sessions (id, user_id, device_info, ip_address, expires_at)
            VALUES (%s, %s, %s, %s, %s)
        """, (session_id, user_id, device_info, ip_address, expires_at))
        
        # Update last login
        self.execute_query(
            "UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = %s",
            (user_id,)
        )
        
        # Log login
        self.log_security_event(user_id, 'login', ip_address=ip_address, success=True)
        
        return session_id

    def verify_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Verify a user session.
        
        Args:
            session_id (str): Session token
            
        Returns:
            Optional[Dict]: Session data if valid, None otherwise
        """
        cursor = self.execute_query("""
            SELECT * FROM user_sessions 
            WHERE id = %s AND is_active = TRUE AND expires_at > CURRENT_TIMESTAMP
        """, (session_id,))
        
        session = cursor.fetchone()
        
        if session:
            # Update last accessed time
            self.execute_query("""
                UPDATE user_sessions 
                SET last_accessed_at = CURRENT_TIMESTAMP 
                WHERE id = %s
            """, (session_id,))
            return dict(session)
        
        return None
    
    def log_security_event(self, user_id: int, event_type: str, 
                          ip_address: str = None, user_agent: str = None,
                          success: bool = True, failure_reason: str = None,
                          metadata: Dict[str, Any] = None) -> None:
        """Log a security event.
        
        Args:
            user_id (int): User ID
            event_type (str): Type of event (login, logout, password_change, etc.)
            ip_address (str): IP address
            user_agent (str): User agent string
            success (bool): Whether the event was successful
            failure_reason (str): Reason for failure if applicable
            metadata (dict): Additional event data
        """
        self.execute_query("""
            INSERT INTO user_security_logs 
            (user_id, event_type, ip_address, user_agent, success, failure_reason, metadata)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (user_id, event_type, ip_address, user_agent, success, failure_reason, 
              json.dumps(metadata) if metadata else None))
    
    def get_user_by_email(self, email: str) -> Optional[psycopg2.extras.RealDictRow]:
        """Get user by email address.
        
        Args:
            email (str): Email address
            
        Returns:
            Optional[RealDictRow]: User row if found
        """
        cursor = self.execute_query(
            "SELECT * FROM users WHERE email = %s AND is_active = TRUE AND is_deleted = FALSE",
            (email,)
        )
        return cursor.fetchone()
    
    def authenticate_user(self, email: str, password: str) -> Optional[Dict[str, Any]]:
        """Authenticate a user with email and password.
        
        Args:
            email (str): User email
            password (str): Plain text password
            
        Returns:
            Optional[Dict]: User data if authentication successful
        """
        user = self.get_user_by_email(email)
        
        if not user:
            self.log_security_event(None, 'login_failed', 
                                  failure_reason='User not found')
            return None
        
        if self.verify_password(password, user['password_hash'], user['salt']):
            return dict(user)
        else:
            self.log_security_event(user['id'], 'login_failed', 
                                  failure_reason='Invalid password')
            return None
    
    def cleanup_expired_sessions(self) -> int:
        """Remove expired sessions.
        
        Returns:
            int: Number of sessions cleaned up
        """
        cursor = self.execute_query(
            "DELETE FROM user_sessions WHERE expires_at < CURRENT_TIMESTAMP"
        )
        return cursor.rowcount
    
    def get_database_stats(self) -> Dict[str, int]:
        """Get basic database statistics.
        
        Returns:
            Dict[str, int]: Statistics about table row counts
        """
        stats = {}
        tables = ['users', 'user_sessions', 'roles', 'permissions', 
                 'friends', 'results', 'posts', 'user_security_logs']
        
        for table in tables:
            cursor = self.execute_query(f"SELECT COUNT(*) as count FROM {table}")
            stats[table] = cursor.fetchone()['count']
        
        return stats
