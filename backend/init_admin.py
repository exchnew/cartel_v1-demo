#!/usr/bin/env python3
"""
Initialize admin user and default data for CARTEL Admin Panel
"""

import asyncio
import os
import sys
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import bcrypt
from datetime import datetime
import uuid

# Add the backend directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from admin_models import AdminUser, ExchangeSettings, CurrencyToken

# Load environment variables
load_dotenv()

async def init_admin_data():
    """Initialize admin data"""
    
    # MongoDB connection
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    print("🚀 Initializing CARTEL Admin Panel...")
    
    # 1. Create default admin user
    admin_exists = await db.admin_users.find_one({"username": "admin"})
    if not admin_exists:
        password_hash = bcrypt.hashpw("cartel123".encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        admin_user = AdminUser(
            username="admin",
            email="admin@cartelex.ch",
            password_hash=password_hash,
            role="admin"
        )
        
        await db.admin_users.insert_one(admin_user.dict())
        print("✅ Default admin user created:")
        print("   Username: admin")
        print("   Password: cartel123")
        print("   Email: admin@cartelex.ch")
    else:
        print("ℹ️  Admin user already exists")
    
    # 2. Create default exchange settings
    settings_exists = await db.exchange_settings.find_one({})
    if not settings_exists:
        default_settings = ExchangeSettings()
        await db.exchange_settings.insert_one(default_settings.dict())
        print("✅ Default exchange settings created")
    else:
        print("ℹ️  Exchange settings already exist")
    
    # 3. Initialize currency tokens from existing SUPPORTED_CURRENCIES
    tokens_count = await db.currency_tokens.count_documents({})
    if tokens_count == 0:
        supported_currencies = [
            {
                "currency": "BTC",
                "name": "Bitcoin",
                "symbol": "BTC",
                "network": "Bitcoin Network",
                "chain": "BTC",
                "decimals": 8,
                "min_amount": 0.001,
                "max_amount": 10.0,
                "order_index": 1
            },
            {
                "currency": "ETH", 
                "name": "Ethereum",
                "symbol": "ETH",
                "network": "Ethereum Network",
                "chain": "ETH",
                "decimals": 18,
                "min_amount": 0.01,
                "max_amount": 100.0,
                "order_index": 2
            },
            {
                "currency": "XMR",
                "name": "Monero",
                "symbol": "XMR", 
                "network": "Monero Network",
                "chain": "XMR",
                "decimals": 12,
                "min_amount": 0.1,
                "max_amount": 50.0,
                "order_index": 3
            },
            {
                "currency": "LTC",
                "name": "Litecoin",
                "symbol": "LTC",
                "network": "Litecoin Network",
                "chain": "LTC",
                "decimals": 8,
                "min_amount": 0.1,
                "max_amount": 100.0,
                "order_index": 4
            },
            {
                "currency": "XRP",
                "name": "Ripple",
                "symbol": "XRP",
                "network": "Ripple Network", 
                "chain": "XRP",
                "decimals": 6,
                "min_amount": 10.0,
                "max_amount": 10000.0,
                "order_index": 5
            },
            {
                "currency": "DOGE",
                "name": "Dogecoin",
                "symbol": "DOGE",
                "network": "Dogecoin Network",
                "chain": "DOGE", 
                "decimals": 8,
                "min_amount": 100.0,
                "max_amount": 100000.0,
                "order_index": 6
            },
            {
                "currency": "USDT-ERC20",
                "name": "Tether USD (ERC20)",
                "symbol": "USDT",
                "network": "Ethereum Network",
                "chain": "ETH",
                "contract_address": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
                "decimals": 6,
                "min_amount": 10.0,
                "max_amount": 50000.0,
                "order_index": 7
            },
            {
                "currency": "USDC-ERC20",
                "name": "USD Coin (ERC20)",
                "symbol": "USDC",
                "network": "Ethereum Network",
                "chain": "ETH",
                "contract_address": "0xA0b86a33E6411a3ce648D8B8a7b5a2cF5b7B2b2b",
                "decimals": 6,
                "min_amount": 10.0,
                "max_amount": 50000.0,
                "order_index": 8
            },
            {
                "currency": "USDT-TRX",
                "name": "Tether USD (TRX)",
                "symbol": "USDT",
                "network": "Tron Network",
                "chain": "TRX",
                "contract_address": "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
                "decimals": 6,
                "min_amount": 10.0,
                "max_amount": 50000.0,
                "order_index": 9
            },
            {
                "currency": "TRX",
                "name": "Tron",
                "symbol": "TRX",
                "network": "Tron Network",
                "chain": "TRX",
                "decimals": 6,
                "min_amount": 100.0,
                "max_amount": 100000.0,
                "order_index": 10
            }
        ]
        
        for currency_data in supported_currencies:
            token = CurrencyToken(**currency_data)
            await db.currency_tokens.insert_one(token.dict())
        
        print(f"✅ Initialized {len(supported_currencies)} currency tokens")
    else:
        print("ℹ️  Currency tokens already exist")
    
    # Close database connection
    client.close()
    
    print("\n🎉 CARTEL Admin Panel initialization completed!")
    print("\n📝 Login credentials:")
    print("   URL: https://your-domain.com/admin")
    print("   Username: admin")
    print("   Password: cartel123")
    print("\n⚠️  Please change the default password after first login!")

if __name__ == "__main__":
    asyncio.run(init_admin_data())