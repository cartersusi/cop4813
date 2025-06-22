import argparse

from db import DatabaseManager


if __name__ == "__main__":
    """Main function to demonstrate the database system."""
    
    parser = argparse.ArgumentParser(description="Initialize the Friend Finder Database System")
    parser.add_argument('--host', type=str, default='localhost',
                        help='PostgreSQL host (default: localhost)')
    parser.add_argument('--port', type=int, default=5432,
                        help='PostgreSQL port (default: 5432)')
    parser.add_argument('--database', type=str, default='friend_finder',
                        help='Database name (default: friend_finder)')
    parser.add_argument('--user', type=str, default=None,
                        help='Database user (default: current user)')
    parser.add_argument('--password', type=str, default=None,
                        help='Database password (default: none)')
    
    args = parser.parse_args()
    
    # Initialize database
    db = DatabaseManager(
        host=args.host,
        port=args.port,
        database=args.database,
        user=args.user,
        password=args.password
    )

    try:
        print("\n=== Initializing PostgreSQL Database Tables ===")
        db.create_tables()
        db.create_default_roles_and_permissions()
    except Exception as e:
        print(f"Error initializing database: {e}")
        exit(1)
    
    
    try:
        print("\n=== PostgreSQL Database System Initialized ===")
        
        # Create some sample users
        print("\n=== Creating Sample Users ===")
        user1_id = db.create_user("johndoe", "john@example.com", "password123", 
                                 "John", "Doe")
        user2_id = db.create_user("janedoe", "jane@example.com", "securepass456", 
                                 "Jane", "Doe")
        
        if user1_id and user2_id:
            # Create sessions
            print("\n=== Creating Sessions ===")
            session1 = db.create_session(user1_id, "Chrome/Windows", "192.168.1.100")
            session2 = db.create_session(user2_id, "Safari/macOS", "192.168.1.101")
            print(f"Session created for user {user1_id}: {session1}")
            print(f"Session created for user {user2_id}: {session2}")
            
            # Test authentication
            print("\n=== Testing Authentication ===")
            auth_result = db.authenticate_user("john@example.com", "password123")
            if auth_result:
                print(f"Authentication successful for user: {auth_result['username']}")
            
            # Assign admin role to first user
            print("\n=== Assigning Roles ===")
            db.assign_role_to_user(user1_id, "admin", user1_id)
            print(f"Admin role assigned to user {user1_id}")
        
        # Show database statistics
        print("\n=== Database Statistics ===")
        stats = db.get_database_stats()
        for table, count in stats.items():
            print(f"{table}: {count} records")
        
        # Cleanup expired sessions
        print("\n=== Cleaning Up ===")
        cleaned = db.cleanup_expired_sessions()
        print(f"Cleaned up {cleaned} expired sessions")
        
    except Exception as e:
        print(f"Error in main: {e}")
    
    finally:
        # Close database connection
        db.disconnect()