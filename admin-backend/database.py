# from supabase import create_client, Client
# from config import settings

# supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)

from config import settings
import os

# Try to import supabase, fall back to mock
try:
    from supabase import create_client, Client
    # Only use real Supabase if we have valid URLs (not mock)
    if settings.SUPABASE_URL and settings.SUPABASE_URL != "https://mock.supabase.co":
        supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
        print("✅ Connected to real Supabase")
    else:
        raise Exception("Using mock Supabase")
except Exception as e:
    print(f"⚠️ Using mock Supabase: {e}")
    
    # Mock Supabase client for local testing
    class MockSupabaseClient:
        def __init__(self):
            print("🔧 Using MOCK Supabase client for local testing")
        
        def table(self, table_name):
            return MockTable(table_name)
        
        def from_(self, table_name):
            return MockTable(table_name)
        
        def auth(self):
            return MockAuth()
    
    class MockTable:
        def __init__(self, table_name):
            self.table_name = table_name
        
        def select(self, *args):
            return self
        
        def insert(self, data):
            print(f"📝 MOCK: Insert into {self.table_name}")
            return self
        
        def update(self, data):
            print(f"📝 MOCK: Update {self.table_name}")
            return self
        
        def delete(self):
            print(f"📝 MOCK: Delete from {self.table_name}")
            return self
        
        def eq(self, column, value):
            return self
        
        def execute(self):
            return MockResponse()
    
    class MockAuth:
        def sign_in_with_password(self, credentials):
            return MockSession()
        
        def sign_up(self, credentials):
            return MockSession()
    
    class MockSession:
        def __init__(self):
            self.user = MockUser()
            self.session = MockUserSession()
    
    class MockUser:
        def __init__(self):
            self.id = "mock_user_123"
            self.email = "test@example.com"
    
    class MockUserSession:
        def __init__(self):
            self.access_token = "mock_token_123"
    
    class MockResponse:
        def __init__(self):
            self.data = []
            self.error = None
    
    supabase = MockSupabaseClient()
    create_client = lambda url, key: supabase
    Client = MockSupabaseClient
    print("✅ Mock database initialized for local testing")
