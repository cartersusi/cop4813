import argparse
import uuid
from db import DatabaseManager

def create_admin_user(db: DatabaseManager):
    """Create the default admin user"""
    try:
        print("\n=== Creating Admin User ===")
        
        # Check if admin user already exists
        cursor = db.execute_query("""
            SELECT id FROM users WHERE username = %s OR email = %s
        """, ("admin", "admin@friendfinder.com"))
        
        existing_user = cursor.fetchone()
        
        if existing_user:
            print("Admin user already exists, skipping creation...")
            return existing_user['id']
        
        # Create admin user
        admin_id = db.create_user(
            username="admin",
            email="admin@friendfinder.com", 
            password="password",
            first_name="System",
            last_name="Administrator"
        )
        
        if admin_id:
            print(f"✅ Admin user created with ID: {admin_id}")
            
            # Assign admin role
            try:
                db.assign_role_to_user(admin_id, "admin", admin_id)
                print("✅ Admin role assigned successfully")
            except Exception as e:
                print(f"⚠️  Warning: Could not assign admin role: {e}")
            
            # Also assign moderator role for additional permissions
            try:
                db.assign_role_to_user(admin_id, "moderator", admin_id)
                print("✅ Moderator role assigned successfully")
            except Exception as e:
                print(f"⚠️  Warning: Could not assign moderator role: {e}")
            
            return admin_id
        else:
            print("❌ Failed to create admin user")
            return None
            
    except Exception as e:
        print(f"❌ Error creating admin user: {e}")
        return None

def verify_admin_setup(db: DatabaseManager, admin_id: int):
    """Verify that the admin user is properly set up"""
    try:
        print("\n=== Verifying Admin Setup ===")
        
        # Check user exists and is active
        cursor = db.execute_query("""
            SELECT username, email, is_active, created_at 
            FROM users 
            WHERE id = %s
        """, (admin_id,))
        
        user_data = cursor.fetchone()
        if user_data:
            print(f"✅ Admin user verified:")
            print(f"   Username: {user_data['username']}")
            print(f"   Email: {user_data['email']}")
            print(f"   Active: {user_data['is_active']}")
            print(f"   Created: {user_data['created_at']}")
        
        # Check roles assigned
        cursor = db.execute_query("""
            SELECT r.name, r.description 
            FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = %s
        """, (admin_id,))
        
        roles = cursor.fetchall()
        if roles:
            print(f"✅ Roles assigned:")
            for role in roles:
                print(f"   - {role['name']}: {role['description']}")
        else:
            print("⚠️  Warning: No roles assigned to admin user")
        
        # Test authentication
        auth_result = db.authenticate_user("admin", "password")
        if auth_result:
            print("✅ Admin authentication test successful")
        else:
            print("❌ Admin authentication test failed")
            
    except Exception as e:
        print(f"❌ Error verifying admin setup: {e}")

def create_sample_data(db: DatabaseManager):
    """Create sample data for testing"""
    try:
        print("\n=== Creating Sample Data ===")
        
        # Create sample users
        user1_id = db.create_user("johndoe", "john@example.com", "password123", "John", "Doe")
        user2_id = db.create_user("janedoe", "jane@example.com", "securepass456", "Jane", "Doe")
        user3_id = db.create_user("bobsmith", "bob@example.com", "mypassword789", "Bob", "Smith")
        
        sample_users = [user1_id, user2_id, user3_id]
        valid_users = [uid for uid in sample_users if uid is not None]
        
        print(f"✅ Created {len(valid_users)} sample users")
        
        if len(valid_users) >= 2:
            # Create sessions for sample users
            print("\n=== Creating Sample Sessions ===")
            for i, user_id in enumerate(valid_users[:2]):
                session_id = db.create_session(
                    user_id, 
                    f"Browser{i+1}/TestOS", 
                    f"192.168.1.{100+i}"
                )
                if session_id:
                    print(f"✅ Session created for user {user_id}: {session_id}")
            
            # Create sample personality results
            print("\n=== Creating Sample Personality Results ===")
            for user_id in valid_users:
                try:
                    cursor = db.execute_query("""
                        INSERT INTO results (
                            user_id, extraversion, agreeableness, conscientiousness, 
                            emotional_stability, intellect_imagination, 
                            test_version, is_current, created_at
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, TRUE, CURRENT_TIMESTAMP)
                        RETURNING id
                    """, (
                        user_id,
                        round(50 + (hash(str(user_id)) % 50), 1),  # Random-ish scores
                        round(50 + ((hash(str(user_id)) * 2) % 50), 1),
                        round(50 + ((hash(str(user_id)) * 3) % 50), 1),
                        round(50 + ((hash(str(user_id)) * 4) % 50), 1),
                        round(50 + ((hash(str(user_id)) * 5) % 50), 1),
                        "1.0"
                    ))
                    
                    result = cursor.fetchone()
                    if result:
                        print(f"✅ Personality result created for user {user_id}")
                        
                        # Update user's current_results
                        db.execute_query("""
                            UPDATE users SET current_results = %s WHERE id = %s
                        """, (result['id'], user_id))
                        
                except Exception as e:
                    print(f"⚠️  Warning: Could not create personality result for user {user_id}: {e}")
            
            # Create sample friend connections
            print("\n=== Creating Sample Friend Connections ===")
            if len(valid_users) >= 2:
                try:
                    db.execute_query("""
                        INSERT INTO friends (user_id, friend_user_id, status, requested_by, created_at, updated_at)
                        VALUES (%s, %s, 'accepted', %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    """, (valid_users[0], valid_users[1], valid_users[0]))
                    print(f"✅ Friend connection created between users {valid_users[0]} and {valid_users[1]}")
                except Exception as e:
                    print(f"⚠️  Warning: Could not create friend connection: {e}")
        
        return valid_users
        
    except Exception as e:
        print(f"❌ Error creating sample data: {e}")
        return []

if __name__ == "__main__":
    """Main function to initialize the Friend Finder Database System."""
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
    parser.add_argument('--skip-sample-data', action='store_true',
                       help='Skip creating sample data (default: false)')
    
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
        print("\n🚀 === Initializing Friend Finder Database System ===")
        print(f"Database: {args.database} on {args.host}:{args.port}")
        
        # Create tables and default roles
        print("\n=== Creating Database Tables ===")
        db.create_tables()
        print("✅ Database tables created successfully")
        
        print("\n=== Creating Default Roles and Permissions ===")
        db.create_default_roles_and_permissions()
        print("✅ Default roles and permissions created successfully")
        
        # Create admin user
        admin_id = create_admin_user(db)
        
        if admin_id:
            # Verify admin setup
            verify_admin_setup(db, admin_id)
            
            # Create sample data unless skipped
            if not args.skip_sample_data:
                sample_user_ids = create_sample_data(db)
                
                # Test authentication with sample user
                if sample_user_ids:
                    print("\n=== Testing Sample User Authentication ===")
                    auth_result = db.authenticate_user("johndoe", "password123")
                    if auth_result:
                        print(f"✅ Sample user authentication successful: {auth_result['username']}")
            
            # Show database statistics
            print("\n=== Database Statistics ===")
            try:
                stats = db.get_database_stats()
                for table, count in stats.items():
                    print(f"📊 {table}: {count} records")
            except Exception as e:
                print(f"⚠️  Could not retrieve database statistics: {e}")
            
            # Cleanup any expired sessions
            print("\n=== Cleaning Up Expired Sessions ===")
            try:
                cleaned = db.cleanup_expired_sessions()
                print(f"🧹 Cleaned up {cleaned} expired sessions")
            except Exception as e:
                print(f"⚠️  Could not clean up expired sessions: {e}")
            
            print("\n🎉 === Database Initialization Complete ===")
            print("\n📋 Admin Credentials:")
            print("   Username: admin")
            print("   Password: password")
            print("   Email: admin@friendfinder.com")
            print("\n🌐 You can now start your FastAPI server and access the admin dashboard!")
            
        else:
            print("\n❌ Database initialization failed - could not create admin user")
            exit(1)
            
    except Exception as e:
        print(f"\n❌ Error initializing database: {e}")
        exit(1)
        
    finally:
        # Close database connection
        try:
            db.disconnect()
            print("\n🔌 Database connection closed")
        except Exception as e:
            print(f"⚠️  Warning: Error closing database connection: {e}")