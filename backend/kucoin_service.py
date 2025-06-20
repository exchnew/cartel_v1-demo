import asyncio
import os
import logging
from typing import Dict, Optional
from kucoin.client import Client
from kucoin.asyncio import KucoinSocketManager
import time
import json
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logger = logging.getLogger(__name__)

class KuCoinClient:
    def __init__(self):
        self.client = None
        self.socket_manager = None
        self.price_cache = {}
        self.last_update_time = {}
        self.cache_duration = 30  # Cache for 30 seconds
        
        # Currency mapping - KuCoin uses different symbols
        self.currency_mapping = {
            'BTC': 'BTC-USDT',
            'ETH': 'ETH-USDT', 
            'XMR': 'XMR-USDT',
            'LTC': 'LTC-USDT',
            'XRP': 'XRP-USDT',
            'DOGE': 'DOGE-USDT'
        }
        
        self._initialize_client()
    
    def _initialize_client(self):
        """Initialize KuCoin client with credentials"""
        try:
            api_key = os.getenv('KUCOIN_API_KEY')
            api_secret = os.getenv('KUCOIN_API_SECRET')
            api_passphrase = os.getenv('KUCOIN_API_PASSPHRASE')
            
            if not all([api_key, api_secret, api_passphrase]):
                logger.error("KuCoin credentials not found in environment variables")
                return
                
            self.client = Client(api_key, api_secret, api_passphrase, sandbox=False)
            logger.info("KuCoin client initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize KuCoin client: {e}")
    
    async def get_price(self, from_currency: str, to_currency: str) -> Optional[float]:
        """Get price for currency pair from KuCoin"""
        try:
            if not self.client:
                logger.warning("KuCoin client not initialized, using fallback")
                return None
                
            # For crypto exchanges, we primarily deal with USDT pairs
            # Convert to KuCoin symbol format
            from_symbol = self.currency_mapping.get(from_currency.upper())
            to_symbol = self.currency_mapping.get(to_currency.upper())
            
            if not from_symbol or not to_symbol:
                logger.warning(f"Currency mapping not found for {from_currency} or {to_currency}")
                return None
            
            # Check cache first
            cache_key = f"{from_symbol}_{to_symbol}"
            current_time = time.time()
            
            if (cache_key in self.price_cache and 
                current_time - self.last_update_time.get(cache_key, 0) < self.cache_duration):
                return self.price_cache[cache_key]
            
            # Get prices from KuCoin
            from_price = await self._get_ticker_price(from_symbol)
            to_price = await self._get_ticker_price(to_symbol)
            
            if from_price and to_price:
                # Calculate exchange rate
                rate = from_price / to_price
                
                # Cache the result
                self.price_cache[cache_key] = rate
                self.last_update_time[cache_key] = current_time
                
                logger.info(f"Got rate from KuCoin: {from_currency} to {to_currency} = {rate}")
                return rate
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting price from KuCoin: {e}")
            return None
    
    async def _get_ticker_price(self, symbol: str) -> Optional[float]:
        """Get ticker price for a symbol"""
        try:
            # Use sync client in async context with proper handling
            ticker = await asyncio.get_event_loop().run_in_executor(
                None, self.client.get_ticker, symbol
            )
            
            if ticker and 'price' in ticker:
                return float(ticker['price'])
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting ticker for {symbol}: {e}")
            return None
    
    async def get_all_tickers(self) -> Dict[str, Dict]:
        """Get all supported tickers"""
        try:
            if not self.client:
                return {}
                
            tickers = {}
            for currency, symbol in self.currency_mapping.items():
                ticker_data = await asyncio.get_event_loop().run_in_executor(
                    None, self.client.get_ticker, symbol
                )
                
                if ticker_data:
                    tickers[currency] = {
                        'symbol': symbol,
                        'price': float(ticker_data.get('price', 0)),
                        'changeRate': float(ticker_data.get('changeRate', 0)),
                        'changePrice': float(ticker_data.get('changePrice', 0)),
                        'high': float(ticker_data.get('high', 0)),
                        'low': float(ticker_data.get('low', 0)),
                        'vol': float(ticker_data.get('vol', 0)),
                        'volValue': float(ticker_data.get('volValue', 0)),
                    }
            
            return tickers
            
        except Exception as e:
            logger.error(f"Error getting all tickers: {e}")
            return {}
    
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
kucoin_client = KuCoinClient()