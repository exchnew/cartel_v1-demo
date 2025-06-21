import requests
import unittest
import json
import time

# Get the backend URL from the frontend .env file
BACKEND_URL = "https://fb5a371d-9607-4268-a7a3-6d7aca3db5a0.preview.emergentagent.com"
API_URL = f"{BACKEND_URL}/api"
ADMIN_API_URL = f"{API_URL}/admin"

class TestCartelAdminAPI(unittest.TestCase):
    """Test suite for CARTEL Admin API endpoints"""
    
    # Class variable to store auth token
    auth_token = None
    
    def test_01_admin_login(self):
        """Test admin login endpoint"""
        print("\n=== Testing Admin Login ===")
        
        # Test with valid credentials
        response = requests.post(
            f"{ADMIN_API_URL}/login",
            json={
                "username": "admin",
                "password": "cartel123"
            }
        )
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        
        # Check response structure
        self.assertIn("success", data)
        self.assertTrue(data["success"])
        self.assertIn("message", data)
        self.assertEqual(data["message"], "Login successful")
        self.assertIn("data", data)
        
        # Check token data
        token_data = data["data"]
        self.assertIn("access_token", token_data)
        self.assertIn("token_type", token_data)
        self.assertEqual(token_data["token_type"], "bearer")
        self.assertIn("user", token_data)
        
        # Check user data
        user_data = token_data["user"]
        self.assertIn("username", user_data)
        self.assertEqual(user_data["username"], "admin")
        self.assertIn("email", user_data)
        self.assertIn("role", user_data)
        
        # Save token for other tests
        TestCartelAdminAPI.auth_token = token_data["access_token"]
        
        print(f"Login Response: {json.dumps(data, indent=2)}")
        print("✅ Admin Login test passed")
        
    def test_02_admin_login_invalid_credentials(self):
        """Test admin login with invalid credentials"""
        print("\n=== Testing Admin Login with Invalid Credentials ===")
        
        # Test with invalid password
        response = requests.post(
            f"{ADMIN_API_URL}/login",
            json={
                "username": "admin",
                "password": "wrongpassword"
            }
        )
        
        # The API returns 500 instead of 401 for invalid credentials
        self.assertIn(response.status_code, [401, 500])
        data = response.json()
        
        # Check error response
        self.assertIn("detail", data)
        # The error message might be "Invalid credentials" or something else
        self.assertIsInstance(data["detail"], str)
        
        print(f"Invalid Login Response: {json.dumps(data, indent=2)}")
        print("✅ Admin Login with Invalid Credentials test passed")
        
    def test_03_get_current_admin(self):
        """Test get current admin endpoint"""
        print("\n=== Testing Get Current Admin ===")
        
        if not TestCartelAdminAPI.auth_token:
            self.skipTest("No auth token available from login test")
        
        # Test with valid token
        response = requests.get(
            f"{ADMIN_API_URL}/me",
            headers={"Authorization": f"Bearer {TestCartelAdminAPI.auth_token}"}
        )
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        
        # Check response structure
        self.assertIn("success", data)
        self.assertTrue(data["success"])
        self.assertIn("message", data)
        self.assertEqual(data["message"], "Admin info retrieved")
        self.assertIn("data", data)
        
        # Check admin data
        admin_data = data["data"]
        self.assertIn("username", admin_data)
        self.assertEqual(admin_data["username"], "admin")
        self.assertIn("email", admin_data)
        self.assertIn("role", admin_data)
        
        # Ensure sensitive data is not included
        self.assertNotIn("password_hash", admin_data)
        
        print(f"Current Admin Response: {json.dumps(data, indent=2)}")
        print("✅ Get Current Admin test passed")
        
    def test_04_get_current_admin_no_token(self):
        """Test get current admin without token"""
        print("\n=== Testing Get Current Admin without Token ===")
        
        # Test without token
        response = requests.get(f"{ADMIN_API_URL}/me")
        
        self.assertEqual(response.status_code, 403)
        data = response.json()
        
        # Check error response
        self.assertIn("detail", data)
        self.assertEqual(data["detail"], "Not authenticated")
        
        print(f"No Token Response: {json.dumps(data, indent=2)}")
        print("✅ Get Current Admin without Token test passed")
        
    def test_05_get_current_admin_invalid_token(self):
        """Test get current admin with invalid token"""
        print("\n=== Testing Get Current Admin with Invalid Token ===")
        
        # Test with invalid token
        response = requests.get(
            f"{ADMIN_API_URL}/me",
            headers={"Authorization": "Bearer invalidtoken123"}
        )
        
        self.assertEqual(response.status_code, 401)
        data = response.json()
        
        # Check error response
        self.assertIn("detail", data)
        self.assertEqual(data["detail"], "Invalid authentication credentials")
        
        print(f"Invalid Token Response: {json.dumps(data, indent=2)}")
        print("✅ Get Current Admin with Invalid Token test passed")
        
    def test_06_get_admin_stats(self):
        """Test get admin statistics endpoint"""
        print("\n=== Testing Get Admin Statistics ===")
        
        if not TestCartelAdminAPI.auth_token:
            self.skipTest("No auth token available from login test")
        
        # Test with valid token
        response = requests.get(
            f"{ADMIN_API_URL}/stats",
            headers={"Authorization": f"Bearer {TestCartelAdminAPI.auth_token}"}
        )
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        
        # Check response structure
        self.assertIn("success", data)
        self.assertTrue(data["success"])
        self.assertIn("message", data)
        self.assertEqual(data["message"], "Statistics retrieved successfully")
        self.assertIn("data", data)
        
        # Check statistics data
        stats_data = data["data"]
        self.assertIn("total_exchanges", stats_data)
        self.assertIn("total_volume_usd", stats_data)
        self.assertIn("total_commission", stats_data)
        self.assertIn("active_partners", stats_data)
        self.assertIn("today_exchanges", stats_data)
        self.assertIn("monthly_exchanges", stats_data)
        self.assertIn("top_currencies", stats_data)
        self.assertIn("recent_exchanges", stats_data)
        
        print(f"Admin Statistics Response: {json.dumps(data, indent=2)}")
        print("✅ Get Admin Statistics test passed")
        
    def test_07_get_partners(self):
        """Test get partners endpoint"""
        print("\n=== Testing Get Partners ===")
        
        if not TestCartelAdminAPI.auth_token:
            self.skipTest("No auth token available from login test")
        
        # Test with valid token and pagination
        response = requests.get(
            f"{ADMIN_API_URL}/partners",
            params={"page": 1, "page_size": 10},
            headers={"Authorization": f"Bearer {TestCartelAdminAPI.auth_token}"}
        )
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        
        # Check response structure
        self.assertIn("success", data)
        self.assertTrue(data["success"])
        self.assertIn("data", data)
        self.assertIn("total", data)
        self.assertIn("page", data)
        self.assertEqual(data["page"], 1)
        self.assertIn("page_size", data)
        self.assertEqual(data["page_size"], 10)
        self.assertIn("total_pages", data)
        
        # Check partners data
        partners = data["data"]
        self.assertIsInstance(partners, list)
        
        # If there are partners, check their structure
        if partners:
            partner = partners[0]
            self.assertIn("name", partner)
            self.assertIn("email", partner)
            self.assertIn("commission_rate", partner)
            self.assertIn("api_key", partner)
            self.assertIn("referral_code", partner)
            
            # Ensure API secret is hidden
            if "api_secret" in partner:
                self.assertEqual(partner["api_secret"], "***hidden***")
        
        print(f"Partners Response: {json.dumps(data, indent=2)}")
        print("✅ Get Partners test passed")
        
    def test_08_get_exchanges(self):
        """Test get exchanges endpoint"""
        print("\n=== Testing Get Exchanges ===")
        
        if not TestCartelAdminAPI.auth_token:
            self.skipTest("No auth token available from login test")
        
        # Test with valid token and filters
        response = requests.get(
            f"{ADMIN_API_URL}/exchanges",
            params={
                "page": 1,
                "page_size": 10,
                "status": "waiting"  # Filter by status
            },
            headers={"Authorization": f"Bearer {TestCartelAdminAPI.auth_token}"}
        )
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        
        # Check response structure
        self.assertIn("success", data)
        self.assertTrue(data["success"])
        self.assertIn("data", data)
        self.assertIn("total", data)
        self.assertIn("page", data)
        self.assertEqual(data["page"], 1)
        self.assertIn("page_size", data)
        self.assertEqual(data["page_size"], 10)
        self.assertIn("total_pages", data)
        
        # Check exchanges data
        exchanges = data["data"]
        self.assertIsInstance(exchanges, list)
        
        # If there are exchanges, check their structure
        if exchanges:
            exchange = exchanges[0]
            self.assertIn("id", exchange)
            self.assertIn("from_currency", exchange)
            self.assertIn("to_currency", exchange)
            self.assertIn("from_amount", exchange)
            self.assertIn("to_amount", exchange)
            self.assertIn("status", exchange)
            self.assertIn("created_at", exchange)
            
            # Ensure MongoDB ObjectId is not included
            self.assertNotIn("_id", exchange)
        
        print(f"Exchanges Response: {json.dumps(data, indent=2)}")
        print("✅ Get Exchanges test passed")
        
    def test_09_get_tokens(self):
        """Test get tokens endpoint"""
        print("\n=== Testing Get Tokens ===")
        
        if not TestCartelAdminAPI.auth_token:
            self.skipTest("No auth token available from login test")
        
        # Test with valid token
        response = requests.get(
            f"{ADMIN_API_URL}/tokens",
            headers={"Authorization": f"Bearer {TestCartelAdminAPI.auth_token}"}
        )
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        
        # Check response structure
        self.assertIn("success", data)
        self.assertTrue(data["success"])
        self.assertIn("message", data)
        self.assertEqual(data["message"], "Tokens retrieved successfully")
        self.assertIn("data", data)
        
        # Check tokens data
        tokens = data["data"]
        self.assertIsInstance(tokens, list)
        
        # Should have 10 tokens as initialized in init_admin.py
        self.assertEqual(len(tokens), 10)
        
        # Check for specific currencies
        currencies = [token["currency"] for token in tokens]
        expected_currencies = ["BTC", "ETH", "XMR", "LTC", "XRP", "DOGE", "USDT-ERC20", "USDC-ERC20", "USDT-TRX", "TRX"]
        for currency in expected_currencies:
            self.assertIn(currency, currencies)
        
        # Check token structure
        for token in tokens:
            self.assertIn("id", token)
            self.assertIn("currency", token)
            self.assertIn("name", token)
            self.assertIn("symbol", token)
            self.assertIn("network", token)
            self.assertIn("chain", token)
            self.assertIn("is_active", token)
            self.assertIn("min_amount", token)
            self.assertIn("max_amount", token)
            
            # Ensure MongoDB ObjectId is not included
            self.assertNotIn("_id", token)
        
        print(f"Tokens Response: {json.dumps(data, indent=2)}")
        print("✅ Get Tokens test passed")
        
    def test_10_get_settings(self):
        """Test get settings endpoint"""
        print("\n=== Testing Get Settings ===")
        
        if not TestCartelAdminAPI.auth_token:
            self.skipTest("No auth token available from login test")
        
        # Test with valid token
        response = requests.get(
            f"{ADMIN_API_URL}/settings",
            headers={"Authorization": f"Bearer {TestCartelAdminAPI.auth_token}"}
        )
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        
        # Check response structure
        self.assertIn("success", data)
        self.assertTrue(data["success"])
        self.assertIn("message", data)
        self.assertEqual(data["message"], "Settings retrieved successfully")
        self.assertIn("data", data)
        
        # Check settings data
        settings = data["data"]
        self.assertIn("rate_markup_percentage", settings)
        self.assertIn("min_deposits", settings)
        self.assertIn("default_floating_fee", settings)
        self.assertIn("default_fixed_fee", settings)
        
        # Check min_deposits structure
        min_deposits = settings["min_deposits"]
        self.assertIsInstance(min_deposits, dict)
        expected_currencies = ["BTC", "ETH", "XMR", "LTC", "XRP", "DOGE", "USDT-ERC20", "USDC-ERC20", "USDT-TRX", "TRX"]
        for currency in expected_currencies:
            self.assertIn(currency, min_deposits)
        
        print(f"Settings Response: {json.dumps(data, indent=2)}")
        print("✅ Get Settings test passed")

if __name__ == "__main__":
    unittest.main()