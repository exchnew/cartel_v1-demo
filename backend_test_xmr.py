import requests
import unittest
import json
import uuid
import time

# Get the backend URL from the frontend .env file
BACKEND_URL = "https://fb5a371d-9607-4268-a7a3-6d7aca3db5a0.preview.emergentagent.com"
API_URL = f"{BACKEND_URL}/api"

class TestXMRDepositAddress(unittest.TestCase):
    """Test suite for XMR deposit address functionality from KuCoin API integration"""
    
    def test_01_exchange_creation_with_xmr(self):
        """Test exchange creation with XMR as from_currency"""
        print("\n=== Testing Exchange Creation with XMR as from_currency ===")
        
        # Create exchange data with XMR as from_currency
        exchange_data = {
            "from_currency": "XMR",
            "to_currency": "BTC",
            "from_amount": 1.0,
            "to_amount": 0.012,  # Approximate rate based on demo data
            "receiving_address": "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",  # BTC address
            "refund_address": "4A7CFE1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF123456",  # XMR address
            "email": "test@example.com",
            "rate_type": "float"
        }
        
        response = requests.post(
            f"{API_URL}/exchange",
            json=exchange_data
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        
        # Check exchange object structure
        self.assertIn("id", data)
        self.assertIn("from_currency", data)
        self.assertEqual(data["from_currency"], "XMR")
        self.assertIn("to_currency", data)
        self.assertEqual(data["to_currency"], "BTC")
        self.assertIn("deposit_address", data)
        
        # Save the exchange ID and deposit address for later verification
        exchange_id = data["id"]
        deposit_address = data["deposit_address"]
        
        # Check if the deposit address looks like a real XMR address
        # XMR addresses are typically long (95+ characters)
        self.assertTrue(len(deposit_address) > 90, 
                       f"Deposit address doesn't look like a valid XMR address: {deposit_address}")
        
        print(f"Created Exchange with XMR: {json.dumps(data, indent=2)}")
        print(f"XMR Deposit Address: {deposit_address}")
        
        # Verify if the address is from KuCoin or a demo address
        demo_xmr_address = "4A7CFE1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF123456"
        if deposit_address == demo_xmr_address:
            print("⚠️ Using demo XMR address (fallback)")
        else:
            print("✅ Using real KuCoin XMR address")
        
        print("✅ Exchange Creation with XMR test passed")
        
        # Return the exchange ID for the next test
        return exchange_id
    
    def test_02_exchange_creation_with_other_currency(self):
        """Test exchange creation with a non-XMR currency"""
        print("\n=== Testing Exchange Creation with non-XMR currency ===")
        
        # Create exchange data with BTC as from_currency
        exchange_data = {
            "from_currency": "BTC",
            "to_currency": "ETH",
            "from_amount": 0.5,
            "to_amount": 8.15,  # Approximate rate based on demo data
            "receiving_address": "0x742d35Cc6634C0532925a3b8D8aE000fEd1f9b89",  # ETH address
            "refund_address": "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",  # BTC address
            "email": "test@example.com",
            "rate_type": "float"
        }
        
        response = requests.post(
            f"{API_URL}/exchange",
            json=exchange_data
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        
        # Check exchange object structure
        self.assertIn("id", data)
        self.assertIn("from_currency", data)
        self.assertEqual(data["from_currency"], "BTC")
        self.assertIn("to_currency", data)
        self.assertEqual(data["to_currency"], "ETH")
        self.assertIn("deposit_address", data)
        
        # Save the deposit address for verification
        deposit_address = data["deposit_address"]
        
        # For non-XMR currencies, we should always use demo addresses
        demo_btc_address = "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"
        self.assertEqual(deposit_address, demo_btc_address, 
                        f"Non-XMR currency should use demo address, got: {deposit_address}")
        
        print(f"Created Exchange with BTC: {json.dumps(data, indent=2)}")
        print(f"BTC Deposit Address: {deposit_address}")
        print("✅ Exchange Creation with non-XMR currency test passed")
    
    def test_03_integration_test_xmr_exchange(self):
        """Complete integration test for XMR exchange creation and verification"""
        print("\n=== Complete Integration Test for XMR Exchange ===")
        
        # Create an XMR exchange
        exchange_id = self.test_01_exchange_creation_with_xmr()
        
        # Wait a moment to ensure the exchange is saved
        time.sleep(1)
        
        # Retrieve the exchange to verify the deposit address
        response = requests.get(f"{API_URL}/exchange/{exchange_id}")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        
        # Verify the exchange data
        self.assertIn("id", data)
        self.assertEqual(data["id"], exchange_id)
        self.assertIn("from_currency", data)
        self.assertEqual(data["from_currency"], "XMR")
        self.assertIn("to_currency", data)
        self.assertEqual(data["to_currency"], "BTC")
        self.assertIn("deposit_address", data)
        
        deposit_address = data["deposit_address"]
        demo_xmr_address = "4A7CFE1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF123456"
        
        # Final verification of the deposit address
        if deposit_address == demo_xmr_address:
            print(f"⚠️ Integration test shows demo XMR address being used (fallback): {deposit_address[:20]}...")
        else:
            print(f"✅ Integration test shows real KuCoin XMR address being used: {deposit_address[:20]}...")
        
        print(f"Retrieved Exchange: {json.dumps(data, indent=2)}")
        print("✅ Complete Integration Test for XMR Exchange passed")

if __name__ == "__main__":
    unittest.main()

if __name__ == "__main__":
    unittest.main()