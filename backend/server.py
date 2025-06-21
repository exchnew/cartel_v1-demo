from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime
import asyncio
import sys

# Add the backend directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from kucoin_service import blockchain_monitor
from crypto_rates_service import kucoin_rates_service
from admin_api import create_admin_router
from partner_api import create_partner_api_router

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI(title="CARTEL - Cryptocurrency Exchange API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Create admin router
admin_router = create_admin_router(db)

# Create partner API router  
partner_api_router = create_partner_api_router(db)

# Models
class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class StatusCheckCreate(BaseModel):
    client_name: str

class Currency(BaseModel):
    currency: str
    name: str
    networks: List[dict]

class ExchangeRate(BaseModel):
    from_currency: str
    to_currency: str
    rate: float
    rate_type: str  # 'float' or 'fixed'

class ExchangeCreate(BaseModel):
    from_currency: str
    to_currency: str
    from_amount: float
    to_amount: float
    receiving_address: str
    refund_address: Optional[str] = None
    email: Optional[str] = None
    rate_type: str = "float"

class Exchange(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    from_currency: str
    to_currency: str
    from_amount: float
    to_amount: float
    receiving_address: str
    refund_address: Optional[str] = None
    email: Optional[str] = None
    rate_type: str
    status: str = "waiting"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    deposit_address: Optional[str] = None

# Supported currencies
SUPPORTED_CURRENCIES = [
    {
        "currency": "BTC",
        "name": "Bitcoin",
        "networks": [{"chain": "BTC", "name": "Bitcoin Network"}]
    },
    {
        "currency": "ETH", 
        "name": "Ethereum",
        "networks": [{"chain": "ETH", "name": "Ethereum Network"}]
    },
    {
        "currency": "XMR",
        "name": "Monero", 
        "networks": [{"chain": "XMR", "name": "Monero Network"}]
    },
    {
        "currency": "LTC",
        "name": "Litecoin",
        "networks": [{"chain": "LTC", "name": "Litecoin Network"}]
    },
    {
        "currency": "XRP",
        "name": "Ripple",
        "networks": [{"chain": "XRP", "name": "Ripple Network"}]
    },
    {
        "currency": "DOGE",
        "name": "Dogecoin",
        "networks": [{"chain": "DOGE", "name": "Dogecoin Network"}]
    },
    {
        "currency": "USDT-ERC20",
        "name": "Tether USD (ERC20)",
        "networks": [{"chain": "ETH", "name": "Ethereum Network"}]
    },
    {
        "currency": "USDC-ERC20",
        "name": "USD Coin (ERC20)",
        "networks": [{"chain": "ETH", "name": "Ethereum Network"}]
    },
    {
        "currency": "USDT-TRX",
        "name": "Tether USD (TRX)",
        "networks": [{"chain": "TRX", "name": "Tron Network"}]
    },
    {
        "currency": "TRX",
        "name": "Tron",
        "networks": [{"chain": "TRX", "name": "Tron Network"}]
    }
]

# Demo exchange rates
DEMO_RATES = {
    'BTC_ETH': 16.3,
    'BTC_XMR': 83.1,
    'BTC_LTC': 201.5,
    'BTC_XRP': 56789.2,
    'BTC_DOGE': 234567.8,
    'ETH_BTC': 0.061,
    'ETH_XMR': 5.1,
    'ETH_LTC': 12.3,
    'ETH_XRP': 3467.1,
    'ETH_DOGE': 14323.4,
    'XMR_BTC': 0.012,
    'XMR_ETH': 0.196,
    'XMR_LTC': 2.41,
    'XMR_XRP': 678.9,
    'XMR_DOGE': 2801.3,
    'LTC_BTC': 0.005,
    'LTC_ETH': 0.081,
    'LTC_XMR': 0.414,
    'LTC_XRP': 283.7,
    'LTC_DOGE': 1167.2,
    'XRP_BTC': 0.0000176,
    'XRP_ETH': 0.000288,
    'XRP_XMR': 0.00147,
    'XRP_LTC': 0.00352,
    'XRP_DOGE': 4.12,
    'DOGE_BTC': 0.00000426,
    'DOGE_ETH': 0.0000698,
    'DOGE_XMR': 0.000357,
    'DOGE_LTC': 0.000857,
    'DOGE_XRP': 0.243
}

def get_required_confirmations(currency: str) -> int:
    """Get required confirmations for each currency"""
    confirmations = {
        'BTC': 2,
        'ETH': 15,
        'XMR': 12,
        'LTC': 6,
        'XRP': 500,
        'DOGE': 500,
        'USDT-ERC20': 15,  # Same as ETH network
        'USDC-ERC20': 15,  # Same as ETH network
        'USDT-TRX': 19,    # Tron network confirmations
        'TRX': 19          # Tron network confirmations
    }
    return confirmations.get(currency.upper(), 2)

def generate_deposit_address(currency: str) -> str:
    """Generate real deposit addresses for CARTEL exchange"""
    addresses = {
        'BTC': 'bc1qaw6r7sgnxeapt235khxajkrf69dllh0ghvlayf',
        'ETH': '0xf9248Af718cd86B204029c7678822C1936990e2F',
        'XMR': '4B7eBm8oFhXdb9HWCJ9fKVYdXmMAkYLqN57Ur75YMtc5P4r37uwsKt3HmWpGcV4Gy5F2Xqqi3p89sgB6cWdcNnDbMEsjSmw',
        'LTC': 'ltc1q2dgjy8mfutwky6x9x8tuljfewqxqqdqjr7fawh',
        'XRP': 'r9rAGF9SAAuXLN2GUyuftNDVkPgcQB4Neh',
        'DOGE': 'DGkA1EJXsH7M4YmKCXNxxpS1WVVGrrEEyf',
        'USDT-ERC20': '0xf9248Af718cd86B204029c7678822C1936990e2F',  # Same as ETH address for ERC20 tokens
        'USDC-ERC20': '0xf9248Af718cd86B204029c7678822C1936990e2F',  # Same as ETH address for ERC20 tokens
        'USDT-TRX': 'TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE',
        'TRX': 'TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE'
    }
    return addresses.get(currency, f"cartel-{currency.lower()}-address")

# API Routes
@api_router.get("/")
async def root():
    return {"message": "CARTEL Exchange API v1.0"}

@api_router.get("/currencies")
async def get_currencies():
    """Get list of supported currencies"""
    return {
        "code": "200000",
        "message": "Success", 
        "data": SUPPORTED_CURRENCIES
    }

@api_router.get("/price")
async def get_exchange_rate(from_currency: str, to_currency: str, rate_type: str = "float"):
    """Get exchange rate between two currencies using real-time data"""
    try:
        # Validate currencies
        from_curr = from_currency.upper()
        to_curr = to_currency.upper()
        
        if from_curr == to_curr:
            raise HTTPException(status_code=400, detail="From and to currencies cannot be the same")
        
        # Get real-time rate from KuCoin ONLY
        rate = await kucoin_rates_service.get_price(from_curr, to_curr)
        
        if rate is None:
            # NO FALLBACK - show error if KuCoin API fails
            raise HTTPException(
                status_code=503, 
                detail=f"Exchange rate service temporarily unavailable. Unable to get rate for {from_curr}/{to_curr} from KuCoin API"
            )
        
        source = "kucoin_live"
        
        # Apply fees based on rate type
        if rate_type == "fixed":
            # Fixed rate: 2% fee
            final_rate = rate * 0.98
        else:
            # Float rate: 1% fee  
            final_rate = rate * 0.99
        
        return {
            "code": "200000",
            "message": "Success",
            "data": {
                "rate": round(final_rate, 8),
                "base_rate": round(rate, 8),
                "rate_type": rate_type,
                "from_currency": from_curr,
                "to_currency": to_curr,
                "source": source
            }
        }
        
    except Exception as e:
        logging.error(f"Error getting exchange rate: {e}")
        raise HTTPException(status_code=500, detail="Error getting exchange rate")

@api_router.post("/exchange", response_model=Exchange)
async def create_exchange(exchange_data: ExchangeCreate):
    """Create a new exchange"""
    try:
        # Generate deposit address
        from_currency = exchange_data.from_currency.upper()
        
        # Use real deposit addresses for all currencies
        deposit_address = generate_deposit_address(from_currency)
        
        # Create exchange object
        exchange = Exchange(
            from_currency=from_currency,
            to_currency=exchange_data.to_currency.upper(),
            from_amount=exchange_data.from_amount,
            to_amount=exchange_data.to_amount,
            receiving_address=exchange_data.receiving_address,
            refund_address=exchange_data.refund_address,
            email=exchange_data.email,
            rate_type=exchange_data.rate_type,
            deposit_address=deposit_address,
            status="waiting"
        )
        
        # Save to database
        await db.exchanges.insert_one(exchange.dict())
        
        return exchange
        
    except Exception as e:
        logging.error(f"Error creating exchange: {e}")
        raise HTTPException(status_code=500, detail="Error creating exchange")

@api_router.get("/exchange/{exchange_id}")
async def get_exchange(exchange_id: str):
    """Get exchange by ID"""
    try:
        exchange = await db.exchanges.find_one({"id": exchange_id})
        if not exchange:
            raise HTTPException(status_code=404, detail="Exchange not found")
        
        # Remove MongoDB ObjectId from response to avoid JSON serialization issues
        if "_id" in exchange:
            del exchange["_id"]
            
        return exchange
    except Exception as e:
        logging.error(f"Error getting exchange: {e}")
        raise HTTPException(status_code=500, detail="Error getting exchange")

# Legacy status check endpoints (for backward compatibility)
@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    _ = await db.status_checks.insert_one(status_obj.dict())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find().to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]


# Include API routes
app.include_router(api_router)

# Include Admin routes
app.include_router(admin_router)

@app.get("/")
async def root():
    return {"message": "CARTEL Exchange API", "version": "1.0.0", "status": "operational"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)