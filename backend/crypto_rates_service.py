import asyncio
import os
import logging
from typing import Dict, Optional
from datetime import datetime, timedelta
from kucoin.client import Client
import time

logger = logging.getLogger(__name__)

class KuCoinRatesService:
    """Real cryptocurrency exchange rates service using KuCoin API"""
    
    def __init__(self):
        self.client = None
        self.cache = {}
        self.cache_duration = 30  # 30 seconds cache
        self.last_update = {}
        
        # Currency mapping - KuCoin uses different symbols
        self.currency_mapping = {
            'BTC': 'BTC-USDT',
            'ETH': 'ETH-USDT', 
            'XMR': 'XMR-USDT',
            'LTC': 'LTC-USDT',
            'XRP': 'XRP-USDT',
            'DOGE': 'DOGE-USDT',
            'USDT-ERC20': 'USDT-USD',  # USDT to USD direct rate
            'USDC-ERC20': 'USDC-USDT',
            'USDT-TRX': 'USDT-USD',   # USDT to USD direct rate
            'TRX': 'TRX-USDT'
        }
        
        self._initialize_client()
    
    def _initialize_client(self):
        """Initialize KuCoin client with credentials"""
        try:
            # Explicit load of environment variables
            from dotenv import load_dotenv
            load_dotenv()
            
            api_key = os.getenv('KUCOIN_API_KEY')
            api_secret = os.getenv('KUCOIN_API_SECRET')
            api_passphrase = os.getenv('KUCOIN_API_PASSPHRASE')
            
            logger.info(f"KuCoin credentials check - API Key: {'Found' if api_key else 'Not found'}")
            logger.info(f"KuCoin credentials check - API Secret: {'Found' if api_secret else 'Not found'}")
            logger.info(f"KuCoin credentials check - API Passphrase: {'Found' if api_passphrase else 'Not found'}")
            
            if not all([api_key, api_secret, api_passphrase]):
                logger.error("KuCoin credentials not found in environment variables")
                return
                
            self.client = Client(api_key, api_secret, api_passphrase, sandbox=False)
            logger.info("KuCoin client initialized successfully for rates")
            
        except Exception as e:
            logger.error(f"Failed to initialize KuCoin client: {e}")
            import traceback
            logger.error(f"Full traceback: {traceback.format_exc()}")
    
    async def get_price(self, from_currency: str, to_currency: str) -> Optional[float]:
        """Get price for currency pair from KuCoin"""
        try:
            if not self.client:
                logger.warning("KuCoin client not initialized")
                return None
            
            from_curr = from_currency.upper()
            to_curr = to_currency.upper()
            
            # Special handling for USDT pairs
            if from_curr in ['USDT-ERC20', 'USDT-TRX'] and to_curr in ['USDT-ERC20', 'USDT-TRX']:
                return 1.0  # USDT to USDT is always 1:1
            
            if from_curr in ['USDT-ERC20', 'USDT-TRX']:
                # Converting FROM USDT to something else
                to_symbol = self.currency_mapping.get(to_curr)
                if to_symbol:
                    to_price = await self._get_ticker_price(to_symbol)
                    if to_price:
                        rate = 1.0 / to_price  # Inverse rate
                        logger.info(f"Got real rate from KuCoin: {from_curr} to {to_curr} = {rate}")
                        return rate
                return None
            
            if to_curr in ['USDT-ERC20', 'USDT-TRX']:
                # Converting TO USDT from something else
                from_symbol = self.currency_mapping.get(from_curr)
                if from_symbol:
                    from_price = await self._get_ticker_price(from_symbol)
                    if from_price:
                        rate = from_price  # Direct rate (since it's already vs USDT)
                        logger.info(f"Got real rate from KuCoin: {from_curr} to {to_curr} = {rate}")
                        return rate
                return None
                
            # Normal crypto to crypto conversion
            from_symbol = self.currency_mapping.get(from_curr)
            to_symbol = self.currency_mapping.get(to_curr)
            
            if not from_symbol or not to_symbol:
                logger.warning(f"Currency mapping not found for {from_curr} or {to_curr}")
                return None
            
            # Check cache first
            cache_key = f"{from_symbol}_{to_symbol}"
            current_time = time.time()
            
            if (cache_key in self.cache and 
                current_time - self.last_update.get(cache_key, 0) < self.cache_duration):
                return self.cache[cache_key]
            
            # Get prices from KuCoin
            from_price = await self._get_ticker_price(from_symbol)
            to_price = await self._get_ticker_price(to_symbol)
            
            if from_price and to_price:
                # Calculate exchange rate
                rate = from_price / to_price
                
                # Cache the result
                self.cache[cache_key] = rate
                self.last_update[cache_key] = current_time
                
                logger.info(f"Got real rate from KuCoin: {from_curr} to {to_curr} = {rate}")
                return rate
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting price from KuCoin: {e}")
            return None
    
    async def _get_ticker_price(self, symbol: str) -> Optional[float]:
        """Get ticker price for a symbol"""
        try:
            # Check individual cache for this symbol
            cache_key = f"price_{symbol}"
            current_time = time.time()
            
            if (cache_key in self.cache and 
                current_time - self.last_update.get(cache_key, 0) < self.cache_duration):
                return self.cache[cache_key]
            
            # Use sync client in async context with proper handling
            ticker = await asyncio.get_event_loop().run_in_executor(
                None, self.client.get_ticker, symbol
            )
            
            if ticker and 'price' in ticker:
                price = float(ticker['price'])
                
                # Cache the individual price
                self.cache[cache_key] = price
                self.last_update[cache_key] = current_time
                
                return price
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting ticker for {symbol}: {e}")
            return None
    
    async def get_all_rates(self) -> Optional[Dict]:
        """Get all supported currency rates from KuCoin"""
        try:
            cache_key = "all_kucoin_rates"
            current_time = time.time()
            
            # Check cache first
            if (cache_key in self.cache and 
                current_time - self.last_update.get(cache_key, 0) < self.cache_duration):
                return self.cache[cache_key]
            
            if not self.client:
                logger.warning("KuCoin client not initialized")
                return None
            
            # Get all ticker prices
            all_tickers = await asyncio.get_event_loop().run_in_executor(
                None, self.client.get_all_tickers
            )
            
            if not all_tickers or 'ticker' not in all_tickers:
                logger.error("No ticker data received from KuCoin")
                return None
            
            # Extract prices for our supported currencies
            usd_prices = {}
            rates = {}
            
            for ticker in all_tickers['ticker']:
                symbol = ticker.get('symbol')
                if symbol in self.currency_mapping.values():
                    # Find the currency code
                    currency = next((k for k, v in self.currency_mapping.items() if v == symbol), None)
                    if currency:
                        price = float(ticker.get('last', 0))
                        if price > 0:
                            usd_prices[currency] = price
                            rates[currency] = {'USD': price}
            
            # Calculate cross rates (crypto to crypto)
            for base_currency, base_price in usd_prices.items():
                for quote_currency, quote_price in usd_prices.items():
                    if base_currency != quote_currency:
                        cross_rate = base_price / quote_price
                        rates[base_currency][quote_currency] = cross_rate
            
            result = {
                "rates": rates,
                "timestamp": datetime.utcnow().isoformat(),
                "source": "kucoin_live"
            }
            
            # Cache the result
            self.cache[cache_key] = result
            self.last_update[cache_key] = current_time
            
            logger.info(f"Successfully fetched all rates from KuCoin for {len(rates)} currencies")
            return result
            
        except Exception as e:
            logger.error(f"Error getting all rates from KuCoin: {e}")
            return None
    
    async def test_connection(self) -> bool:
        """Test connection to KuCoin API"""
        try:
            if not self.client:
                return False
                
            # Try to get server time
            server_time = await asyncio.get_event_loop().run_in_executor(
                None, self.client.get_server_timestamp
            )
            
            if server_time:
                logger.info("KuCoin API connection test successful")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"KuCoin API connection test failed: {e}")
            return False

# Global instance
kucoin_rates_service = KuCoinRatesService()