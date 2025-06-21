from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorDatabase
import jwt
import bcrypt
from datetime import datetime, timedelta
from typing import List, Optional
import os
import logging
from admin_models import *

logger = logging.getLogger(__name__)

# JWT settings
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "cartel_admin_secret_key_2025")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 720  # 12 hours

security = HTTPBearer()

class AdminService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
    
    def create_access_token(self, data: dict, expires_delta: Optional[timedelta] = None):
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt
    
    async def verify_token(self, credentials: HTTPAuthorizationCredentials = Depends(security)):
        try:
            payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
            username: str = payload.get("sub")
            if username is None:
                raise HTTPException(status_code=401, detail="Invalid authentication credentials")
            
            admin = await self.db.admin_users.find_one({"username": username, "is_active": True})
            if admin is None:
                raise HTTPException(status_code=401, detail="User not found")
            
            return admin
        except jwt.PyJWTError:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    
    def hash_password(self, password: str) -> str:
        return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    def verify_password(self, password: str, hashed_password: str) -> bool:
        return bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8'))

def create_admin_router(db: AsyncIOMotorDatabase) -> APIRouter:
    router = APIRouter(prefix="/admin", tags=["Admin"])
    admin_service = AdminService(db)
    
    # Authentication endpoints
    @router.post("/login", response_model=APIResponse)
    async def admin_login(credentials: AdminLogin):
        """Admin login"""
        try:
            admin = await db.admin_users.find_one({"username": credentials.username, "is_active": True})
            if not admin or not admin_service.verify_password(credentials.password, admin["password_hash"]):
                raise HTTPException(status_code=401, detail="Invalid credentials")
            
            # Update last login
            await db.admin_users.update_one(
                {"username": credentials.username},
                {"$set": {"last_login": datetime.utcnow()}}
            )
            
            access_token = admin_service.create_access_token(data={"sub": admin["username"]})
            
            return APIResponse(
                success=True,
                message="Login successful",
                data={
                    "access_token": access_token,
                    "token_type": "bearer",
                    "user": {
                        "username": admin["username"],
                        "email": admin["email"],
                        "role": admin["role"]
                    }
                }
            )
        except Exception as e:
            logger.error(f"Login error: {e}")
            raise HTTPException(status_code=500, detail="Login failed")
    
    @router.get("/me", response_model=APIResponse)
    async def get_current_admin(current_admin = Depends(admin_service.verify_token)):
        """Get current admin info"""
        if "_id" in current_admin:
            del current_admin["_id"]
        if "password_hash" in current_admin:
            del current_admin["password_hash"]
        
        return APIResponse(
            success=True,
            message="Admin info retrieved",
            data=current_admin
        )
    
    # Partners management
    @router.get("/partners", response_model=PaginatedResponse)
    async def get_partners(
        page: int = 1,
        page_size: int = 20,
        search: Optional[str] = None,
        current_admin = Depends(admin_service.verify_token)
    ):
        """Get all partners with pagination"""
        try:
            skip = (page - 1) * page_size
            
            # Build query
            query = {}
            if search:
                query["$or"] = [
                    {"name": {"$regex": search, "$options": "i"}},
                    {"email": {"$regex": search, "$options": "i"}},
                    {"company": {"$regex": search, "$options": "i"}}
                ]
            
            # Get total count
            total = await db.partners.count_documents(query)
            
            # Get partners
            partners = await db.partners.find(query).skip(skip).limit(page_size).to_list(page_size)
            
            # Remove sensitive data
            for partner in partners:
                if "_id" in partner:
                    del partner["_id"]
                if "api_secret" in partner:
                    partner["api_secret"] = "***hidden***"
            
            return PaginatedResponse(
                success=True,
                data=partners,
                total=total,
                page=page,
                page_size=page_size,
                total_pages=(total + page_size - 1) // page_size
            )
        except Exception as e:
            logger.error(f"Get partners error: {e}")
            raise HTTPException(status_code=500, detail="Failed to get partners")
    
    @router.post("/partners", response_model=APIResponse)
    async def create_partner(
        partner_data: PartnerCreate,
        current_admin = Depends(admin_service.verify_token)
    ):
        """Create new partner"""
        try:
            # Check if partner already exists
            existing = await db.partners.find_one({"email": partner_data.email})
            if existing:
                raise HTTPException(status_code=400, detail="Partner with this email already exists")
            
            partner = Partner(**partner_data.dict())
            await db.partners.insert_one(partner.dict())
            
            # Remove sensitive data from response
            partner_dict = partner.dict()
            partner_dict["api_secret"] = "***hidden***"
            
            return APIResponse(
                success=True,
                message="Partner created successfully",
                data=partner_dict
            )
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Create partner error: {e}")
            raise HTTPException(status_code=500, detail="Failed to create partner")
    
    @router.put("/partners/{partner_id}", response_model=APIResponse)
    async def update_partner(
        partner_id: str,
        partner_data: PartnerUpdate,
        current_admin = Depends(admin_service.verify_token)
    ):
        """Update partner"""
        try:
            # Build update data
            update_data = {k: v for k, v in partner_data.dict().items() if v is not None}
            if not update_data:
                raise HTTPException(status_code=400, detail="No data to update")
            
            result = await db.partners.update_one(
                {"id": partner_id},
                {"$set": update_data}
            )
            
            if result.matched_count == 0:
                raise HTTPException(status_code=404, detail="Partner not found")
            
            return APIResponse(
                success=True,
                message="Partner updated successfully"
            )
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Update partner error: {e}")
            raise HTTPException(status_code=500, detail="Failed to update partner")
    
    @router.delete("/partners/{partner_id}", response_model=APIResponse)
    async def delete_partner(
        partner_id: str,
        current_admin = Depends(admin_service.verify_token)
    ):
        """Delete partner"""
        try:
            result = await db.partners.delete_one({"id": partner_id})
            if result.deleted_count == 0:
                raise HTTPException(status_code=404, detail="Partner not found")
            
            return APIResponse(
                success=True,
                message="Partner deleted successfully"
            )
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Delete partner error: {e}")
            raise HTTPException(status_code=500, detail="Failed to delete partner")
    
    # Exchanges management
    @router.get("/exchanges", response_model=PaginatedResponse)
    async def get_exchanges(
        page: int = 1,
        page_size: int = 20,
        status: Optional[str] = None,
        partner_id: Optional[str] = None,
        from_currency: Optional[str] = None,
        to_currency: Optional[str] = None,
        current_admin = Depends(admin_service.verify_token)
    ):
        """Get all exchanges with filtering"""
        try:
            skip = (page - 1) * page_size
            
            # Build query
            query = {}
            if status:
                query["status"] = status
            if partner_id:
                query["partner_id"] = partner_id
            if from_currency:
                query["from_currency"] = from_currency
            if to_currency:
                query["to_currency"] = to_currency
            
            # Get total count
            total = await db.exchanges.count_documents(query)
            
            # Get exchanges
            exchanges = await db.exchanges.find(query).sort("created_at", -1).skip(skip).limit(page_size).to_list(page_size)
            
            # Remove MongoDB ObjectId
            for exchange in exchanges:
                if "_id" in exchange:
                    del exchange["_id"]
            
            return PaginatedResponse(
                success=True,
                data=exchanges,
                total=total,
                page=page,
                page_size=page_size,
                total_pages=(total + page_size - 1) // page_size
            )
        except Exception as e:
            logger.error(f"Get exchanges error: {e}")
            raise HTTPException(status_code=500, detail="Failed to get exchanges")
    
    @router.get("/exchanges/{exchange_id}", response_model=APIResponse)
    async def get_exchange(
        exchange_id: str,
        current_admin = Depends(admin_service.verify_token)
    ):
        """Get single exchange details"""
        try:
            exchange = await db.exchanges.find_one({"id": exchange_id})
            if not exchange:
                raise HTTPException(status_code=404, detail="Exchange not found")
            
            if "_id" in exchange:
                del exchange["_id"]
            
            return APIResponse(
                success=True,
                message="Exchange retrieved successfully",
                data=exchange
            )
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Get exchange error: {e}")
            raise HTTPException(status_code=500, detail="Failed to get exchange")
    
    @router.put("/exchanges/{exchange_id}", response_model=APIResponse)
    async def update_exchange(
        exchange_id: str,
        exchange_data: ExchangeUpdate,
        current_admin = Depends(admin_service.verify_token)
    ):
        """Update exchange"""
        try:
            # Build update data
            update_data = {k: v for k, v in exchange_data.dict().items() if v is not None}
            if not update_data:
                raise HTTPException(status_code=400, detail="No data to update")
            
            result = await db.exchanges.update_one(
                {"id": exchange_id},
                {"$set": update_data}
            )
            
            if result.matched_count == 0:
                raise HTTPException(status_code=404, detail="Exchange not found")
            
            return APIResponse(
                success=True,
                message="Exchange updated successfully"
            )
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Update exchange error: {e}")
            raise HTTPException(status_code=500, detail="Failed to update exchange")
    
    # Currency/Token management
    @router.get("/tokens", response_model=APIResponse)
    async def get_tokens(current_admin = Depends(admin_service.verify_token)):
        """Get all currency tokens"""
        try:
            tokens = await db.currency_tokens.find({}).sort("order_index", 1).to_list(None)
            
            for token in tokens:
                if "_id" in token:
                    del token["_id"]
            
            return APIResponse(
                success=True,
                message="Tokens retrieved successfully",
                data=tokens
            )
        except Exception as e:
            logger.error(f"Get tokens error: {e}")
            raise HTTPException(status_code=500, detail="Failed to get tokens")
    
    @router.put("/tokens/{token_id}", response_model=APIResponse)
    async def update_token(
        token_id: str,
        token_data: CurrencyTokenUpdate,
        current_admin = Depends(admin_service.verify_token)
    ):
        """Update currency token"""
        try:
            update_data = {k: v for k, v in token_data.dict().items() if v is not None}
            if not update_data:
                raise HTTPException(status_code=400, detail="No data to update")
            
            result = await db.currency_tokens.update_one(
                {"id": token_id},
                {"$set": update_data}
            )
            
            if result.matched_count == 0:
                raise HTTPException(status_code=404, detail="Token not found")
            
            return APIResponse(
                success=True,
                message="Token updated successfully"
            )
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Update token error: {e}")
            raise HTTPException(status_code=500, detail="Failed to update token")
    
    # Settings management
    @router.get("/settings", response_model=APIResponse)
    async def get_settings(current_admin = Depends(admin_service.verify_token)):
        """Get system settings"""
        try:
            settings = await db.exchange_settings.find_one({})
            if not settings:
                # Create default settings
                default_settings = ExchangeSettings()
                await db.exchange_settings.insert_one(default_settings.dict())
                settings = default_settings.dict()
            
            if "_id" in settings:
                del settings["_id"]
            
            return APIResponse(
                success=True,
                message="Settings retrieved successfully",
                data=settings
            )
        except Exception as e:
            logger.error(f"Get settings error: {e}")
            raise HTTPException(status_code=500, detail="Failed to get settings")
    
    @router.put("/settings", response_model=APIResponse)
    async def update_settings(
        settings_data: SettingsUpdate,
        current_admin = Depends(admin_service.verify_token)
    ):
        """Update system settings"""
        try:
            update_data = {k: v for k, v in settings_data.dict().items() if v is not None}
            if not update_data:
                raise HTTPException(status_code=400, detail="No data to update")
            
            update_data["updated_at"] = datetime.utcnow()
            update_data["updated_by"] = current_admin["username"]
            
            await db.exchange_settings.update_one(
                {},
                {"$set": update_data},
                upsert=True
            )
            
            return APIResponse(
                success=True,
                message="Settings updated successfully"
            )
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Update settings error: {e}")
            raise HTTPException(status_code=500, detail="Failed to update settings")
    
    # Statistics
    @router.get("/stats", response_model=APIResponse)
    async def get_statistics(current_admin = Depends(admin_service.verify_token)):
        """Get exchange statistics"""
        try:
            # Total exchanges
            total_exchanges = await db.exchanges.count_documents({})
            
            # Active partners
            active_partners = await db.partners.count_documents({"status": "active"})
            
            # Today's stats
            today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
            today_exchanges = await db.exchanges.count_documents({"created_at": {"$gte": today_start}})
            
            # Monthly stats
            month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            monthly_exchanges = await db.exchanges.count_documents({"created_at": {"$gte": month_start}})
            
            # Recent exchanges
            recent_exchanges = await db.exchanges.find({}).sort("created_at", -1).limit(10).to_list(10)
            for exchange in recent_exchanges:
                if "_id" in exchange:
                    del exchange["_id"]
            
            # Top currencies (aggregation)
            top_currencies_pipeline = [
                {"$group": {
                    "_id": "$from_currency",
                    "count": {"$sum": 1},
                    "total_amount": {"$sum": "$from_amount"}
                }},
                {"$sort": {"count": -1}},
                {"$limit": 5}
            ]
            top_currencies = await db.exchanges.aggregate(top_currencies_pipeline).to_list(5)
            
            stats = ExchangeStats(
                total_exchanges=total_exchanges,
                total_volume_usd=0.0,  # Will need to calculate based on rates
                total_commission=0.0,
                total_partner_commission=0.0,
                active_partners=active_partners,
                today_exchanges=today_exchanges,
                today_volume_usd=0.0,
                monthly_exchanges=monthly_exchanges,
                monthly_volume_usd=0.0,
                top_currencies=top_currencies,
                recent_exchanges=recent_exchanges
            )
            
            return APIResponse(
                success=True,
                message="Statistics retrieved successfully",
                data=stats.dict()
            )
        except Exception as e:
            logger.error(f"Get statistics error: {e}")
            raise HTTPException(status_code=500, detail="Failed to get statistics")
    
    return router