import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

// Transaction Monitor class (adapted from transaction-monitor.js)
class TransactionMonitor {
    constructor() {
        this.pollingIntervals = {};
        this.lastCheckedTime = {};
        this.callLimits = {
            'BTC': 10000,
            'ETH': 5000,
            'XMR': 10000,
            'LTC': 5000,
            'default': 10000
        };
    }

    startMonitoring(address, currency, exchangeId, statusCallback) {
        console.log(`Starting monitoring for ${currency} address: ${address}`);
        
        let currentStatus = localStorage.getItem(`txStatus_${exchangeId}`) || 'waiting';
        let txHash = localStorage.getItem(`txHash_${exchangeId}`) || null;
        
        if (currentStatus === 'completed') {
            if (statusCallback) statusCallback(currentStatus, txHash);
            return;
        }
        
        if (txHash && currentStatus !== 'waiting') {
            this.checkTransactionConfirmations(currency, txHash, exchangeId, statusCallback);
            return;
        }
        
        const interval = this.callLimits[currency] || this.callLimits.default;
        
        this.pollingIntervals[exchangeId] = setInterval(() => {
            this.checkForDeposit(address, currency, exchangeId, statusCallback);
        }, interval);
        
        this.checkForDeposit(address, currency, exchangeId, statusCallback);
    }
    
    stopMonitoring(exchangeId) {
        if (this.pollingIntervals[exchangeId]) {
            clearInterval(this.pollingIntervals[exchangeId]);
            delete this.pollingIntervals[exchangeId];
        }
    }
    
    async checkForDeposit(address, currency, exchangeId, statusCallback) {
        const now = Date.now();
        const lastCheck = this.lastCheckedTime[`${currency}_${address}`] || 0;
        const minInterval = this.callLimits[currency] || this.callLimits.default;
        
        if (now - lastCheck < minInterval) {
            return;
        }
        
        this.lastCheckedTime[`${currency}_${address}`] = now;
        
        try {
            let result = await this.simulateDeposit(currency, exchangeId);
            
            if (result.detected) {
                localStorage.setItem(`txHash_${exchangeId}`, result.txHash);
                localStorage.setItem(`txStatus_${exchangeId}`, 'received');
                
                this.stopMonitoring(exchangeId);
                if (statusCallback) statusCallback('received', result.txHash);
                
                this.checkTransactionConfirmations(currency, result.txHash, exchangeId, statusCallback);
            }
        } catch (error) {
            console.error(`Error checking ${currency} deposit:`, error);
        }
    }
    
    async checkTransactionConfirmations(currency, txHash, exchangeId, statusCallback) {
        const interval = this.callLimits[currency] || this.callLimits.default;
        
        this.pollingIntervals[`${exchangeId}_confirmations`] = setInterval(async () => {
            try {
                let confirmations = parseInt(localStorage.getItem(`confirmations_${exchangeId}`) || '0') + 1;
                let requiredConfirmations = this.getRequiredConfirmations(currency);
                
                localStorage.setItem(`confirmations_${exchangeId}`, confirmations);
                
                if (statusCallback) {
                    statusCallback('received', txHash, confirmations, requiredConfirmations);
                }
                
                if (confirmations >= requiredConfirmations) {
                    clearInterval(this.pollingIntervals[`${exchangeId}_confirmations`]);
                    delete this.pollingIntervals[`${exchangeId}_confirmations`];
                    
                    localStorage.setItem(`txStatus_${exchangeId}`, 'exchanging');
                    if (statusCallback) statusCallback('exchanging', txHash);
                    
                    setTimeout(() => {
                        localStorage.setItem(`txStatus_${exchangeId}`, 'completed');
                        if (statusCallback) statusCallback('completed', txHash);
                    }, Math.floor(Math.random() * 10000) + 5000);
                }
            } catch (error) {
                console.error(`Error checking confirmations:`, error);
            }
        }, interval);
    }
    
    getRequiredConfirmations(currency) {
        switch(currency) {
            case 'BTC': return 3;
            case 'ETH': return 12;
            case 'XMR': return 10;
            case 'LTC': return 6;
            default: return 3;
        }
    }
    
    async simulateDeposit(currency, exchangeId) {
        if (localStorage.getItem(`simulation_started_${exchangeId}`)) {
            const startTime = parseInt(localStorage.getItem(`simulation_started_${exchangeId}`));
            const elapsedTime = Date.now() - startTime;
            
            if (elapsedTime >= 15000) {
                const txHash = this.generateTxHash(currency);
                return { detected: true, txHash: txHash };
            }
        } else {
            localStorage.setItem(`simulation_started_${exchangeId}`, Date.now().toString());
        }
        
        return { detected: false };
    }
    
    generateTxHash(currency) {
        const characters = '0123456789abcdef';
        let hash = '';
        let length = 64;
        let prefix = '';
        
        if (currency === 'ETH') {
            prefix = '0x';
            length = 64;
        }
        
        for (let i = 0; i < length; i++) {
            hash += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        
        return prefix + hash;
    }
}

// Demo deposit addresses
const generateDepositAddress = (currency) => {
    const addresses = {
        'BTC': '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
        'ETH': '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
        'XMR': '44AFFq5kSiGBoZ4NMDwYtN18obc8AemS33DBLWs3H7otXft3XjrpDtQGv7SqSsaBYBb98uNbr2VBBEt7f2wfn3RVGQBEP3A',
        'LTC': 'LRNYxwQsHpm2A1VhawrJQti3nUMvMLPRWF',
        'XRP': 'rN7n7otQDd6FczFgLdSqtcsAUxDkw6fzRH',
        'DOGE': 'DH5yaieqoZN36fDVciNyRueRGvGLR3mr7L'
    };
    return addresses[currency] || addresses['BTC'];
};

// QR Code generation function
const generateQRCode = (text, containerId) => {
    // Simple QR code replacement using a service
    const qrContainer = document.getElementById(containerId);
    if (qrContainer) {
        qrContainer.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(text)}" alt="QR Code" style="width: 200px; height: 200px; background: white; padding: 10px; border-radius: 10px;" />`;
    }
};

const ConfirmationPage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [exchangeData, setExchangeData] = useState(null);
    const [transactionStatus, setTransactionStatus] = useState('waiting');
    const [transactionHash, setTransactionHash] = useState(null);
    const [confirmations, setConfirmations] = useState(0);
    const [requiredConfirmations, setRequiredConfirmations] = useState(3);
    const [depositAddress, setDepositAddress] = useState('');
    const [monitor, setMonitor] = useState(null);

    useEffect(() => {
        // Get exchange data from location state or localStorage
        let data = location.state?.exchangeData;
        if (!data) {
            const stored = localStorage.getItem('exchangeData');
            if (stored) {
                data = JSON.parse(stored);
            }
        }

        if (!data) {
            // Redirect to home if no exchange data
            navigate('/');
            return;
        }

        // Generate exchange ID if not present
        if (!data.exchangeId) {
            data.exchangeId = `XCH-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
        }

        // Generate deposit address
        const address = generateDepositAddress(data.fromCurrency);
        setDepositAddress(address);
        setExchangeData(data);
        setRequiredConfirmations(getRequiredConfirmationsForCurrency(data.fromCurrency));

        // Save to localStorage
        localStorage.setItem('exchangeData', JSON.stringify(data));

        // Initialize transaction monitoring
        const transactionMonitor = new TransactionMonitor();
        setMonitor(transactionMonitor);

        // Start monitoring with status callback
        transactionMonitor.startMonitoring(
            address,
            data.fromCurrency,
            data.exchangeId,
            handleStatusUpdate
        );

        // Generate QR codes after component mounts
        setTimeout(() => {
            generateQRCode(address, 'qrcode');
            generateQRCode(address, 'qrcodeMobile');
        }, 100);

        return () => {
            if (transactionMonitor) {
                transactionMonitor.stopMonitoring(data.exchangeId);
            }
        };
    }, [location, navigate]);

    const getRequiredConfirmationsForCurrency = (currency) => {
        switch(currency) {
            case 'BTC': return 3;
            case 'ETH': return 12;
            case 'XMR': return 10;
            case 'LTC': return 6;
            default: return 3;
        }
    };

    const handleStatusUpdate = (status, txHash, confirmationsCount, requiredCount) => {
        setTransactionStatus(status);
        if (txHash) setTransactionHash(txHash);
        if (confirmationsCount !== undefined) setConfirmations(confirmationsCount);
        if (requiredCount !== undefined) setRequiredConfirmations(requiredCount);
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text).then(() => {
            // You could add a toast notification here
            console.log('Copied to clipboard');
        });
    };

    const getStatusText = () => {
        switch(transactionStatus) {
            case 'waiting':
                return 'Waiting for payment';
            case 'received':
                if (confirmations && requiredConfirmations) {
                    return `Payment received (${confirmations}/${requiredConfirmations} confirmations)`;
                }
                return 'Payment received, awaiting confirmations';
            case 'exchanging':
                return 'Exchanging currencies';
            case 'completed':
                return 'Completed';
            default:
                return 'Unknown status';
        }
    };

    const getStatusClass = () => {
        switch(transactionStatus) {
            case 'waiting': return 'status-waiting';
            case 'received': return 'status-received';
            case 'exchanging': return 'status-exchanging';
            case 'completed': return 'status-completed';
            default: return 'status-waiting';
        }
    };

    const getActiveSteps = () => {
        switch(transactionStatus) {
            case 'waiting': return 1;
            case 'received': return 2;
            case 'exchanging': return 3;
            case 'completed': return 4;
            default: return 1;
        }
    };

    if (!exchangeData) {
        return <div>Loading...</div>;
    }

    return (
        <>
            <div className="page-header">
                <h1>Payment Confirmation</h1>
                <p>Complete your cryptocurrency exchange</p>
            </div>

            <div className="confirmation-header">
                <h2>Exchange Details</h2>
                <div className={`confirmation-status ${getStatusClass()}`}>
                    {getStatusText()}
                </div>
            </div>

            {/* Progress Steps */}
            <div className="exchange-progress">
                <div className="progress-steps">
                    {['Created', 'Payment Received', 'Exchanging', 'Completed'].map((step, index) => (
                        <div key={index} className={`progress-step ${index < getActiveSteps() ? 'active' : ''}`}>
                            <div className="step-dot"></div>
                            <div className="step-info">
                                <div className="step-name">{step}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Content */}
            <div className="three-column-layout">
                {/* QR Code Column */}
                <div className="column qr-column">
                    <div className="payment-address-container">
                        <div className="payment-address-header">
                            <div className="currency-icon from-currency-icon">
                                <img 
                                    src={`/images/currencies/${exchangeData.fromCurrency.toLowerCase()}.svg`}
                                    alt={exchangeData.fromCurrency}
                                    onError={(e) => { e.target.src = '/images/currencies/generic.svg'; }}
                                />
                            </div>
                            <div className="payment-address-title">
                                Send {exchangeData.fromCurrency} to this address:
                            </div>
                        </div>
                        
                        <div className="payment-qr-container">
                            <div id="qrcode"></div>
                            <div className="qr-caption">Scan with your wallet app</div>
                        </div>
                        
                        <div className="payment-address-data">
                            <div className="payment-address-text">{depositAddress}</div>
                            <button 
                                className="copy-button" 
                                onClick={() => copyToClipboard(depositAddress)}
                            >
                                Copy Address
                            </button>
                        </div>

                        <div className="payment-instructions">
                            <div className="instruction-title">Important:</div>
                            <ul className="instruction-list">
                                <li>Send only <span>{exchangeData.fromCurrency}</span> to this address</li>
                                <li>Send exactly <span>{exchangeData.sendAmount} {exchangeData.fromCurrency}</span></li>
                                <li>Transaction will be processed automatically</li>
                            </ul>
                        </div>
                    </div>
                </div>
                
                {/* Details Column */}
                <div className="column details-column">
                    <div className="exchange-details">
                        <div className="section-title">Exchange Details</div>
                        <div className="exchange-detail-item">
                            <span className="detail-label">You send:</span>
                            <span className="detail-value">{exchangeData.sendAmount} {exchangeData.fromCurrency}</span>
                        </div>
                        <div className="exchange-detail-item">
                            <span className="detail-label">Exchange rate:</span>
                            <span className="detail-value">{exchangeData.exchangeRate}</span>
                        </div>
                        <div className="exchange-detail-item">
                            <span className="detail-label">You get:</span>
                            <span className="detail-value">{exchangeData.receiveAmount} {exchangeData.toCurrency}</span>
                        </div>
                        <div className="exchange-detail-item">
                            <span className="detail-label">Rate type:</span>
                            <span className="detail-value">{exchangeData.rateType}</span>
                        </div>
                    </div>
                    
                    <div className="exchange-info">
                        <div className="section-title">Transaction Information</div>
                        
                        <div className="exchange-info-item">
                            <span className="info-label">Exchange ID:</span>
                            <span className="info-value">{exchangeData.exchangeId}</span>
                        </div>
                        
                        <div className="exchange-info-item">
                            <span className="info-label">Status:</span>
                            <span className={`info-value ${getStatusClass()}`}>{getStatusText()}</span>
                        </div>

                        {transactionHash && (
                            <div className="exchange-info-item">
                                <span className="info-label">Transaction Hash:</span>
                                <span className="info-value address-value">{transactionHash}</span>
                            </div>
                        )}
                    </div>
                </div>
                
                {/* Receiver Column */}
                <div className="column receiver-column">
                    <div className="receiver-info">
                        <div className="section-title">Receiver Information</div>
                        
                        <div className="exchange-info-item">
                            <span className="info-label">Receiving address:</span>
                            <span className="info-value address-value">{exchangeData.receivingAddress}</span>
                        </div>
                        
                        {exchangeData.refundAddress && exchangeData.refundAddress !== 'Not provided' && (
                            <div className="exchange-info-item">
                                <span className="info-label">Refund address:</span>
                                <span className="info-value address-value">{exchangeData.refundAddress}</span>
                            </div>
                        )}
                        
                        {exchangeData.email && exchangeData.email !== 'Not provided' && (
                            <div className="exchange-info-item">
                                <span className="info-label">Email notifications:</span>
                                <span className="info-value">{exchangeData.email}</span>
                            </div>
                        )}
                    </div>
                    
                    <div className="support-info">
                        <div className="support-info-header">Need Help?</div>
                        <p>If you have any issues with your transaction, please contact our support team with your Exchange ID.</p>
                        <a href="/support" className="support-link">Contact Support</a>
                    </div>
                </div>
            </div>

            {/* Mobile Layout */}
            <div className="mobile-layout">
                <div className="payment-address-container">
                    <div className="payment-address-header">
                        <div className="currency-icon from-currency-icon-mobile">
                            <img 
                                src={`/images/currencies/${exchangeData.fromCurrency.toLowerCase()}.svg`}
                                alt={exchangeData.fromCurrency}
                                onError={(e) => { e.target.src = '/images/currencies/generic.svg'; }}
                            />
                        </div>
                        <div className="payment-address-title">
                            Send {exchangeData.fromCurrency} to this address:
                        </div>
                    </div>
                    
                    <div className="payment-qr-container">
                        <div id="qrcodeMobile"></div>
                        <div className="qr-caption">Scan with your wallet app</div>
                    </div>
                    
                    <div className="payment-address-data">
                        <div className="payment-address-text">{depositAddress}</div>
                        <button 
                            className="copy-button" 
                            onClick={() => copyToClipboard(depositAddress)}
                        >
                            Copy Address
                        </button>
                    </div>
                </div>

                {/* Mobile Accordions */}
                <div className="mobile-accordion active">
                    <div className="accordion-header">
                        <span>Exchange Details</span>
                        <span className="accordion-icon">+</span>
                    </div>
                    <div className="accordion-content">
                        <div className="exchange-detail-item">
                            <span className="detail-label">You send:</span>
                            <span className="detail-value">{exchangeData.sendAmount} {exchangeData.fromCurrency}</span>
                        </div>
                        <div className="exchange-detail-item">
                            <span className="detail-label">Exchange rate:</span>
                            <span className="detail-value">{exchangeData.exchangeRate}</span>
                        </div>
                        <div className="exchange-detail-item">
                            <span className="detail-label">You get:</span>
                            <span className="detail-value">{exchangeData.receiveAmount} {exchangeData.toCurrency}</span>
                        </div>
                        <div className="exchange-detail-item">
                            <span className="detail-label">Rate type:</span>
                            <span className="detail-value">{exchangeData.rateType}</span>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default ConfirmationPage;