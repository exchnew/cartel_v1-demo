from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.middleware.cors import CORSMiddleware
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

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI(title="CARTEL - Cryptocurrency Exchange API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

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

def generate_demo_address(currency: str) -> str:
    """Generate demo addresses for testing"""
    addresses = {
        'BTC': '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
        'ETH': '0x742d35Cc6634C0532925a3b8D8aE000fEd1f9b89',
        'XMR': '4A7CFE1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF123456',
        'LTC': 'LQTpS7rKDJp8QVGN5GqZ8j9VzXv2XkZ8R7',
        'XRP': 'rN7n7otQDd6FczFgLdSqtcsAUxDkw6fzRH',
        'DOGE': 'DH5yaieqoZN36fDVciNyRueRGvGLR3mr7L'
    }
    return addresses.get(currency, f"demo-{currency.lower()}-address")

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
    """Get exchange rate between two currencies"""
    try:
        # Validate currencies
        from_curr = from_currency.upper()
        to_curr = to_currency.upper()
        
        if from_curr == to_curr:
            raise HTTPException(status_code=400, detail="From and to currencies cannot be the same")
        
        # Get base rate
        rate_key = f"{from_curr}_{to_curr}"
        base_rate = DEMO_RATES.get(rate_key)
        
        if base_rate is None:
            # Try reverse rate
            reverse_key = f"{to_curr}_{from_curr}"
            reverse_rate = DEMO_RATES.get(reverse_key)
            if reverse_rate:
                base_rate = 1 / reverse_rate
            else:
                # Generate random rate if not found
                base_rate = round(float(hash(rate_key) % 10000) / 100, 8)
        
        # Apply fees based on rate type
        if rate_type == "fixed":
            # Fixed rate: 2% fee
            final_rate = base_rate * 0.98
        else:
            # Float rate: 1% fee  
            final_rate = base_rate * 0.99
            
        return {
            "code": "200000",
            "message": "Success",
            "data": {
                "rate": round(final_rate, 8),
                "base_rate": round(base_rate, 8),
                "rate_type": rate_type,
                "from_currency": from_curr,
                "to_currency": to_curr
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
        deposit_address = generate_demo_address(exchange_data.from_currency)
        
        # Create exchange object
        exchange = Exchange(
            from_currency=exchange_data.from_currency.upper(),
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

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
