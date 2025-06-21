from fastapi import APIRouter, HTTPException, Depends, Header
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional
import logging
from crypto_rates_service import kucoin_rates_service

logger = logging.getLogger(__name__)

def create_partner_api_router(db: AsyncIOMotorDatabase) -> APIRouter:
    router = APIRouter(prefix="/api/partner", tags=["Partner API"])
    
    async def verify_partner_api_key(x_api_key: Optional[str] = Header(None)):
        """Verify partner API key"""
        if not x_api_key:
            raise HTTPException(status_code=401, detail="API key required in X-API-Key header")
        
        partner = await db.partners.find_one({
            "api_key": x_api_key, 
            "status": "active"
        })
        
        if not partner:
            raise HTTPException(status_code=401, detail="Invalid or inactive API key")
        
        return partner
    
    @router.get("/rates")
    async def get_partner_rates(
        from_currency: str,
        to_currency: str,
        rate_type: str = "float",
        partner: dict = Depends(verify_partner_api_key)
    ):
        """Get exchange rates for partners with their commission applied"""
        try:
            # Get base rate from KuCoin
            from_curr = from_currency.upper()
            to_curr = to_currency.upper()
            
            if from_curr == to_curr:
                raise HTTPException(status_code=400, detail="From and to currencies cannot be the same")
            
            # Get real-time rate from KuCoin
            base_rate = await kucoin_rates_service.get_price(from_curr, to_curr)
            
            if base_rate is None:
                raise HTTPException(
                    status_code=503, 
                    detail=f"Exchange rate service temporarily unavailable. Unable to get rate for {from_curr}/{to_curr} from KuCoin API"
                )
            
            # Get settings for rate manipulation
            settings = await db.exchange_settings.find_one({})
            partner_rate_difference = settings.get('partner_rate_difference', 0.0) if settings else 0.0
            
            # Apply partner rate difference (if configured in settings)
            partner_base_rate = base_rate * (1 + partner_rate_difference / 100)
            
            # Apply standard fees based on rate type
            if rate_type == "fixed":
                # Fixed rate: 2% fee
                final_rate = partner_base_rate * 0.98
                fee_percentage = 2.0
            else:
                # Float rate: 1% fee
                final_rate = partner_base_rate * 0.99
                fee_percentage = 1.0
            
            # Calculate partner commission (partner gets commission from our fee)
            partner_commission_rate = partner.get('commission_rate', 30.0)
            partner_commission = (partner_base_rate - final_rate) * (partner_commission_rate / 100)
            
            return {
                "success": True,
                "data": {
                    "from_currency": from_curr,
                    "to_currency": to_curr,
                    "rate": round(final_rate, 8),
                    "base_rate": round(base_rate, 8),
                    "partner_rate": round(partner_base_rate, 8),
                    "rate_type": rate_type,
                    "fee_percentage": fee_percentage,
                    "partner_commission_rate": partner_commission_rate,
                    "estimated_partner_commission": round(partner_commission, 8),
                    "source": "kucoin_live",
                    "partner_id": partner["id"]
                }
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error getting partner rates: {e}")
            raise HTTPException(status_code=500, detail="Error getting exchange rate")
    
    @router.get("/currencies")
    async def get_partner_currencies(partner: dict = Depends(verify_partner_api_key)):
        """Get list of supported currencies for partners"""
        try:
            # Get active and visible currencies from database
            currencies = await db.currency_tokens.find({
                "is_active": True,
                "is_visible": True
            }).sort("order_index", 1).to_list(None)
            
            # Remove internal fields
            for currency in currencies:
                if "_id" in currency:
                    del currency["_id"]
            
            return {
                "success": True,
                "data": currencies,
                "partner_id": partner["id"]
            }
            
        except Exception as e:
            logger.error(f"Error getting partner currencies: {e}")
            raise HTTPException(status_code=500, detail="Error getting currencies")
    
    @router.get("/status")
    async def get_partner_status(partner: dict = Depends(verify_partner_api_key)):
        """Get partner API status and account info"""
        try:
            return {
                "success": True,
                "data": {
                    "partner_id": partner["id"],
                    "name": partner["name"],
                    "status": partner["status"],
                    "commission_rate": partner["commission_rate"],
                    "total_volume": partner.get("total_volume", 0.0),
                    "total_commission": partner.get("total_commission", 0.0),
                    "api_usage": "active",
                    "rate_access": "enabled"
                }
            }
            
        except Exception as e:
            logger.error(f"Error getting partner status: {e}")
            raise HTTPException(status_code=500, detail="Error getting partner status")
    
    @router.post("/track-usage")
    async def track_api_usage(
        usage_data: dict,
        partner: dict = Depends(verify_partner_api_key)
    ):
        """Track partner API usage for statistics"""
        try:
            # Here you could log API usage, track volume, etc.
            # For now, just return success
            
            return {
                "success": True,
                "message": "Usage tracked successfully",
                "partner_id": partner["id"]
            }
            
        except Exception as e:
            logger.error(f"Error tracking partner usage: {e}")
            raise HTTPException(status_code=500, detail="Error tracking usage")
    
    return router