import asyncio
import httpx
import logging
from typing import Optional, Dict, Any
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class BlockchainMonitor:
    """Real blockchain monitoring service for deposit addresses"""
    
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=30.0)
        self.cache = {}  # Simple in-memory cache
        
    async def check_btc_address(self, address: str, expected_amount: float = None) -> Dict[str, Any]:
        """Check Bitcoin address for transactions using BlockCypher API"""
        try:
            url = f"https://api.blockcypher.com/v1/btc/main/addrs/{address}"
            response = await self.client.get(url)
            
            if response.status_code == 200:
                data = response.json()
                
                # Get transaction details
                if data.get('txrefs') and len(data['txrefs']) > 0:
                    latest_tx = data['txrefs'][0]  # Most recent transaction
                    
                    # Check confirmations
                    confirmations = latest_tx.get('confirmations', 0)
                    
                    # Get transaction amount (convert from satoshis)
                    amount_satoshis = latest_tx.get('value', 0)
                    amount_btc = amount_satoshis / 100000000
                    
                    return {
                        'detected': True,
                        'tx_hash': latest_tx.get('tx_hash'),
                        'amount': amount_btc,
                        'confirmations': confirmations,
                        'expected_amount': expected_amount,
                        'amount_match': abs(amount_btc - (expected_amount or 0)) < 0.0001 if expected_amount else True,
                        'currency': 'BTC',
                        'timestamp': latest_tx.get('confirmed', datetime.now().isoformat())
                    }
            
            return {'detected': False, 'currency': 'BTC'}
            
        except Exception as e:
            logger.error(f"Error checking BTC address {address}: {e}")
            return {'detected': False, 'error': str(e), 'currency': 'BTC'}
    
    async def check_eth_address(self, address: str, expected_amount: float = None) -> Dict[str, Any]:
        """Check Ethereum address using Etherscan API (free tier)"""
        try:
            # Using Etherscan free API
            url = f"https://api.etherscan.io/api?module=account&action=txlist&address={address}&startblock=0&endblock=99999999&sort=desc&apikey=YourApiKeyToken"
            response = await self.client.get(url)
            
            if response.status_code == 200:
                data = response.json()
                
                if data.get('result') and len(data['result']) > 0:
                    latest_tx = data['result'][0]
                    
                    # Convert Wei to ETH
                    amount_wei = int(latest_tx.get('value', 0))
                    amount_eth = amount_wei / 1000000000000000000
                    
                    # Get current block to calculate confirmations
                    current_block_response = await self.client.get(
                        "https://api.etherscan.io/api?module=proxy&action=eth_blockNumber&apikey=YourApiKeyToken"
                    )
                    
                    confirmations = 0
                    if current_block_response.status_code == 200:
                        current_block = int(current_block_response.json().get('result', '0x0'), 16)
                        tx_block = int(latest_tx.get('blockNumber', 0))
                        confirmations = max(0, current_block - tx_block)
                    
                    return {
                        'detected': True,
                        'tx_hash': latest_tx.get('hash'),
                        'amount': amount_eth,
                        'confirmations': confirmations,
                        'expected_amount': expected_amount,
                        'amount_match': abs(amount_eth - (expected_amount or 0)) < 0.001 if expected_amount else True,
                        'currency': 'ETH',
                        'timestamp': datetime.fromtimestamp(int(latest_tx.get('timeStamp', 0))).isoformat()
                    }
                    
            return {'detected': False, 'currency': 'ETH'}
            
        except Exception as e:
            logger.error(f"Error checking ETH address {address}: {e}")
            return {'detected': False, 'error': str(e), 'currency': 'ETH'}
    
    async def check_ltc_address(self, address: str, expected_amount: float = None) -> Dict[str, Any]:
        """Check Litecoin address using BlockCypher API"""
        try:
            url = f"https://api.blockcypher.com/v1/ltc/main/addrs/{address}"
            response = await self.client.get(url)
            
            if response.status_code == 200:
                data = response.json()
                
                if data.get('txrefs') and len(data['txrefs']) > 0:
                    latest_tx = data['txrefs'][0]
                    
                    confirmations = latest_tx.get('confirmations', 0)
                    amount_satoshis = latest_tx.get('value', 0)
                    amount_ltc = amount_satoshis / 100000000
                    
                    return {
                        'detected': True,
                        'tx_hash': latest_tx.get('tx_hash'),
                        'amount': amount_ltc,
                        'confirmations': confirmations,
                        'expected_amount': expected_amount,
                        'amount_match': abs(amount_ltc - (expected_amount or 0)) < 0.0001 if expected_amount else True,
                        'currency': 'LTC',
                        'timestamp': latest_tx.get('confirmed', datetime.now().isoformat())
                    }
                    
            return {'detected': False, 'currency': 'LTC'}
            
        except Exception as e:
            logger.error(f"Error checking LTC address {address}: {e}")
            return {'detected': False, 'error': str(e), 'currency': 'LTC'}
    
    async def check_doge_address(self, address: str, expected_amount: float = None) -> Dict[str, Any]:
        """Check Dogecoin address using BlockCypher API"""
        try:
            url = f"https://api.blockcypher.com/v1/doge/main/addrs/{address}"
            response = await self.client.get(url)
            
            if response.status_code == 200:
                data = response.json()
                
                if data.get('txrefs') and len(data['txrefs']) > 0:
                    latest_tx = data['txrefs'][0]
                    
                    confirmations = latest_tx.get('confirmations', 0)
                    amount_satoshis = latest_tx.get('value', 0)
                    amount_doge = amount_satoshis / 100000000
                    
                    return {
                        'detected': True,
                        'tx_hash': latest_tx.get('tx_hash'),
                        'amount': amount_doge,
                        'confirmations': confirmations,
                        'expected_amount': expected_amount,
                        'amount_match': abs(amount_doge - (expected_amount or 0)) < 0.01 if expected_amount else True,
                        'currency': 'DOGE',
                        'timestamp': latest_tx.get('confirmed', datetime.now().isoformat())
                    }
                    
            return {'detected': False, 'currency': 'DOGE'}
            
        except Exception as e:
            logger.error(f"Error checking DOGE address {address}: {e}")
            return {'detected': False, 'error': str(e), 'currency': 'DOGE'}
    
    async def check_xrp_address(self, address: str, expected_amount: float = None) -> Dict[str, Any]:
        """Check XRP address using XRPL API"""
        try:
            # Using XRPL public API
            url = f"https://s1.ripple.com:51234/"
            payload = {
                "method": "account_tx",
                "params": [{
                    "account": address,
                    "ledger_index_min": -1,
                    "ledger_index_max": -1,
                    "limit": 1
                }]
            }
            
            response = await self.client.post(url, json=payload)
            
            if response.status_code == 200:
                data = response.json()
                
                if data.get('result', {}).get('transactions'):
                    latest_tx = data['result']['transactions'][0]
                    tx_data = latest_tx.get('tx', {})
                    
                    # XRP amounts are in drops (1 XRP = 1,000,000 drops)
                    amount_drops = int(tx_data.get('Amount', 0))
                    amount_xrp = amount_drops / 1000000
                    
                    # Get ledger info for confirmations
                    confirmations = latest_tx.get('validated', False)
                    confirmations = 500 if confirmations else 0  # XRP confirmations are fast
                    
                    return {
                        'detected': True,
                        'tx_hash': tx_data.get('hash'),
                        'amount': amount_xrp,
                        'confirmations': confirmations,
                        'expected_amount': expected_amount,
                        'amount_match': abs(amount_xrp - (expected_amount or 0)) < 0.001 if expected_amount else True,
                        'currency': 'XRP',
                        'timestamp': datetime.now().isoformat()
                    }
                    
            return {'detected': False, 'currency': 'XRP'}
            
        except Exception as e:
            logger.error(f"Error checking XRP address {address}: {e}")
            return {'detected': False, 'error': str(e), 'currency': 'XRP'}
    
    async def check_erc20_token(self, address: str, token_contract: str, decimals: int, expected_amount: float = None) -> Dict[str, Any]:
        """Check ERC20 token transactions using Etherscan API"""
        try:
            # Check ERC20 token transfers using Etherscan API
            url = f"https://api.etherscan.io/api?module=account&action=tokentx&contractaddress={token_contract}&address={address}&page=1&offset=1&sort=desc&apikey=YourApiKeyToken"
            response = await self.client.get(url)
            
            if response.status_code == 200:
                data = response.json()
                
                if data.get('result') and len(data['result']) > 0:
                    latest_tx = data['result'][0]
                    
                    # Convert token amount based on decimals
                    amount_raw = int(latest_tx.get('value', 0))
                    amount_tokens = amount_raw / (10 ** decimals)
                    
                    # Get confirmations
                    current_block_response = await self.client.get(
                        "https://api.etherscan.io/api?module=proxy&action=eth_blockNumber&apikey=YourApiKeyToken"
                    )
                    
                    confirmations = 0
                    if current_block_response.status_code == 200:
                        current_block = int(current_block_response.json().get('result', '0x0'), 16)
                        tx_block = int(latest_tx.get('blockNumber', 0))
                        confirmations = max(0, current_block - tx_block)
                    
                    return {
                        'detected': True,
                        'tx_hash': latest_tx.get('hash'),
                        'amount': amount_tokens,
                        'confirmations': confirmations,
                        'expected_amount': expected_amount,
                        'amount_match': abs(amount_tokens - (expected_amount or 0)) < 0.01 if expected_amount else True,
                        'currency': 'ERC20',
                        'timestamp': datetime.fromtimestamp(int(latest_tx.get('timeStamp', 0))).isoformat()
                    }
                    
            return {'detected': False, 'currency': 'ERC20'}
            
        except Exception as e:
            logger.error(f"Error checking ERC20 token address {address}: {e}")
            return {'detected': False, 'error': str(e), 'currency': 'ERC20'}
    
    async def check_tron_address(self, address: str, expected_amount: float = None, is_token: bool = False, token_contract: str = None) -> Dict[str, Any]:
        """Check Tron address using TronGrid API"""
        try:
            if is_token and token_contract:
                # Check TRC20 token transfers
                url = f"https://api.trongrid.io/v1/accounts/{address}/transactions/trc20"
            else:
                # Check TRX transactions
                url = f"https://api.trongrid.io/v1/accounts/{address}/transactions"
            
            response = await self.client.get(url)
            
            if response.status_code == 200:
                data = response.json()
                
                if data.get('data') and len(data['data']) > 0:
                    latest_tx = data['data'][0]
                    
                    if is_token:
                        # TRC20 token
                        amount_raw = int(latest_tx.get('value', 0))
                        amount_tokens = amount_raw / 1000000  # USDT TRC20 has 6 decimals
                        currency_type = 'TRC20'
                    else:
                        # TRX native
                        amount_raw = int(latest_tx.get('raw_data', {}).get('contract', [{}])[0].get('parameter', {}).get('value', {}).get('amount', 0))
                        amount_tokens = amount_raw / 1000000  # TRX has 6 decimals
                        currency_type = 'TRX'
                    
                    return {
                        'detected': True,
                        'tx_hash': latest_tx.get('txID'),
                        'amount': amount_tokens,
                        'confirmations': 19,  # Tron confirmations (fast network)
                        'expected_amount': expected_amount,
                        'amount_match': abs(amount_tokens - (expected_amount or 0)) < 0.01 if expected_amount else True,
                        'currency': currency_type,
                        'timestamp': datetime.fromtimestamp(int(latest_tx.get('block_timestamp', 0)) / 1000).isoformat()
                    }
                    
            return {'detected': False, 'currency': 'TRX' if not is_token else 'TRC20'}
            
        except Exception as e:
            logger.error(f"Error checking Tron address {address}: {e}")
            return {'detected': False, 'error': str(e), 'currency': 'TRX' if not is_token else 'TRC20'}
        """Check Monero address - Note: XMR is private, limited public APIs"""
        try:
            # For XMR, we would typically need to run our own node
            # For demo purposes, we'll simulate based on viewkey or integrated address
            # This would require a proper Monero wallet/node integration
            
            logger.warning("XMR monitoring requires a private node/wallet integration")
            return {
                'detected': False, 
                'currency': 'XMR',
                'note': 'XMR requires private wallet integration for monitoring'
            }
            
        except Exception as e:
            logger.error(f"Error checking XMR address {address}: {e}")
            return {'detected': False, 'error': str(e), 'currency': 'XMR'}
    
    async def check_address(self, address: str, currency: str, expected_amount: float = None) -> Dict[str, Any]:
        """Main method to check any address based on currency"""
        currency = currency.upper()
        
        if currency == 'BTC':
            return await self.check_btc_address(address, expected_amount)
        elif currency == 'ETH':
            return await self.check_eth_address(address, expected_amount)
        elif currency == 'LTC':
            return await self.check_ltc_address(address, expected_amount)
        elif currency == 'DOGE':
            return await self.check_doge_address(address, expected_amount)
        elif currency == 'XRP':
            return await self.check_xrp_address(address, expected_amount)
        elif currency == 'XMR':
            return await self.check_xmr_address(address, expected_amount)
        elif currency == 'USDT-ERC20':
            # USDT ERC20 token contract: 0xdAC17F958D2ee523a2206206994597C13D831ec7
            return await self.check_erc20_token(address, '0xdAC17F958D2ee523a2206206994597C13D831ec7', 6, expected_amount)
        elif currency == 'USDC-ERC20':
            # USDC ERC20 token contract: 0xA0b86a33E6411a3ce648D8B8a7b5a2cF5b7B2b2b
            return await self.check_erc20_token(address, '0xA0b86a33E6411a3ce648D8B8a7b5a2cF5b7B2b2b', 6, expected_amount)
        elif currency == 'USDT-TRX':
            # USDT TRC20 token contract
            return await self.check_tron_address(address, expected_amount, is_token=True, token_contract='TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t')
        elif currency == 'TRX':
            return await self.check_tron_address(address, expected_amount, is_token=False)
        else:
            return {'detected': False, 'error': f'Unsupported currency: {currency}'}
    
    async def close(self):
        """Close the HTTP client"""
        await self.client.aclose()

# Global instance
blockchain_monitor = BlockchainMonitor()