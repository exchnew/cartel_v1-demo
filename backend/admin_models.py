from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid

# Admin Authentication Models
class AdminUser(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    email: str
    password_hash: str
    role: str = "admin"  # admin, manager, viewer
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_login: Optional[datetime] = None
    is_active: bool = True

class AdminLogin(BaseModel):
    username: str
    password: str

# Partner Models
class Partner(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: str
    company: Optional[str] = None
    api_key: str = Field(default_factory=lambda: str(uuid.uuid4()))
    api_secret: str = Field(default_factory=lambda: str(uuid.uuid4()))
    referral_code: str = Field(default_factory=lambda: str(uuid.uuid4())[:8].upper())
    referral_url: Optional[str] = None
    commission_rate: float = 30.0  # percentage
    status: str = "active"  # active, inactive, suspended
    created_at: datetime = Field(default_factory=datetime.utcnow)
    total_volume: float = 0.0
    total_commission: float = 0.0
    payout_address: Optional[str] = None
    payout_currency: Optional[str] = None
    min_payout: float = 50.0

class PartnerCreate(BaseModel):
    name: str
    email: str
    company: Optional[str] = None
    commission_rate: float = 30.0
    payout_address: Optional[str] = None
    payout_currency: Optional[str] = None
    min_payout: float = 50.0

class PartnerUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    company: Optional[str] = None
    commission_rate: Optional[float] = None
    status: Optional[str] = None
    payout_address: Optional[str] = None
    payout_currency: Optional[str] = None
    min_payout: Optional[float] = None

# Enhanced Exchange Model for Admin
class ExchangeAdmin(BaseModel):
    id: str
    from_currency: str
    to_currency: str
    from_amount: float
    to_amount: float
    receiving_address: str
    refund_address: Optional[str] = None
    email: Optional[str] = None
    rate_type: str
    status: str
    created_at: datetime
    deposit_address: Optional[str] = None
    deposit_hash: Optional[str] = None
    withdrawal_hash: Optional[str] = None
    partner_id: Optional[str] = None
    partner_commission: float = 0.0
    company_commission: float = 0.0
    actual_received_amount: Optional[float] = None
    actual_sent_amount: Optional[float] = None
    confirmations: int = 0
    node_address: Optional[str] = None
    memo: Optional[str] = None
    notes: Optional[str] = None

class ExchangeUpdate(BaseModel):
    from_amount: Optional[float] = None
    to_amount: Optional[float] = None
    receiving_address: Optional[str] = None
    refund_address: Optional[str] = None
    status: Optional[str] = None
    deposit_hash: Optional[str] = None
    withdrawal_hash: Optional[str] = None
    partner_commission: Optional[float] = None
    company_commission: Optional[float] = None
    actual_received_amount: Optional[float] = None
    actual_sent_amount: Optional[float] = None
    node_address: Optional[str] = None
    memo: Optional[str] = None
    notes: Optional[str] = None

# Currency/Token Management
class CurrencyToken(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    currency: str
    name: str
    symbol: str
    network: str
    chain: str
    contract_address: Optional[str] = None
    decimals: int = 18
    is_active: bool = True
    is_visible: bool = True
    icon_url: Optional[str] = None
    min_amount: float = 0.001
    max_amount: float = 1000000.0
    processing_fee: float = 0.0
    order_index: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)

class CurrencyTokenUpdate(BaseModel):
    name: Optional[str] = None
    is_active: Optional[bool] = None
    is_visible: Optional[bool] = None
    icon_url: Optional[str] = None
    min_amount: Optional[float] = None
    max_amount: Optional[float] = None
    processing_fee: Optional[float] = None
    order_index: Optional[int] = None

# Settings Models
class ExchangeSettings(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    # Rate manipulation settings
    rate_markup_percentage: float = 0.0  # % markup on displayed rates
    partner_rate_difference: float = 0.0  # % difference for partner API rates
    
    # Minimum deposit amounts per currency
    min_deposits: Dict[str, float] = {
        "BTC": 0.001,
        "ETH": 0.01,
        "XMR": 0.1,
        "LTC": 0.1,
        "XRP": 10.0,
        "DOGE": 100.0,
        "USDT-ERC20": 10.0,
        "USDC-ERC20": 10.0,
        "USDT-TRX": 10.0,
        "TRX": 100.0
    }
    
    # Commission settings
    default_floating_fee: float = 1.0  # %
    default_fixed_fee: float = 2.0  # %
    
    # Partner settings
    default_partner_commission: float = 30.0  # %
    
    # System settings
    auto_processing: bool = False
    email_notifications: bool = True
    telegram_notifications: bool = False
    
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    updated_by: Optional[str] = None

class SettingsUpdate(BaseModel):
    rate_markup_percentage: Optional[float] = None
    partner_rate_difference: Optional[float] = None
    min_deposits: Optional[Dict[str, float]] = None
    default_floating_fee: Optional[float] = None
    default_fixed_fee: Optional[float] = None
    default_partner_commission: Optional[float] = None
    auto_processing: Optional[bool] = None
    email_notifications: Optional[bool] = None
    telegram_notifications: Optional[bool] = None

# Statistics Models
class ExchangeStats(BaseModel):
    total_exchanges: int
    total_volume_usd: float
    total_commission: float
    total_partner_commission: float
    active_partners: int
    today_exchanges: int
    today_volume_usd: float
    monthly_exchanges: int
    monthly_volume_usd: float
    top_currencies: List[Dict[str, Any]]
    recent_exchanges: List[Dict[str, Any]]

# API Response Models
class APIResponse(BaseModel):
    success: bool
    message: str
    data: Optional[Any] = None
    errors: Optional[List[str]] = None

class PaginatedResponse(BaseModel):
    success: bool
    data: List[Any]
    total: int
    page: int
    page_size: int
    total_pages: int