import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

// Transaction Monitor class for real blockchain monitoring
class TransactionMonitor {
    constructor() {
        this.pollingIntervals = {};
        this.lastCheckedTime = {};
        this.callLimits = {
            'BTC': 30000,     // 30 seconds for Bitcoin
            'ETH': 20000,     // 20 seconds for Ethereum
            'XMR': 60000,     // 60 seconds for Monero (privacy coin)
            'LTC': 30000,     // 30 seconds for Litecoin
            'XRP': 10000,     // 10 seconds for XRP (fast)
            'DOGE': 30000,    // 30 seconds for Dogecoin
            'default': 30000
        };
    }

    startMonitoring(address, currency, exchangeId, statusCallback) {
        console.log(`Starting real blockchain monitoring for ${currency} address: ${address}`);
        
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
        
        // Check immediately
        this.checkForDeposit(address, currency, exchangeId, statusCallback);
    }
    
    stopMonitoring(exchangeId) {
        if (this.pollingIntervals[exchangeId]) {
            clearInterval(this.pollingIntervals[exchangeId]);
            delete this.pollingIntervals[exchangeId];
        }
        if (this.pollingIntervals[`${exchangeId}_confirmations`]) {
            clearInterval(this.pollingIntervals[`${exchangeId}_confirmations`]);
            delete this.pollingIntervals[`${exchangeId}_confirmations`];
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
            // Call backend API to check blockchain for deposits
            const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/exchange/${exchangeId}/check-deposit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const result = await response.json();
                
                if (result.detected) {
                    const transaction = result.transaction;
                    
                    localStorage.setItem(`txHash_${exchangeId}`, transaction.tx_hash);
                    localStorage.setItem(`txStatus_${exchangeId}`, 'received');
                    localStorage.setItem(`actualAmount_${exchangeId}`, transaction.amount);
                    localStorage.setItem(`confirmations_${exchangeId}`, transaction.confirmations || 0);
                    
                    this.stopMonitoring(exchangeId);
                    
                    if (statusCallback) {
                        statusCallback('received', transaction.tx_hash, transaction.confirmations, this.getRequiredConfirmations(currency));
                    }
                    
                    // Start monitoring confirmations
                    this.checkTransactionConfirmations(currency, transaction.tx_hash, exchangeId, statusCallback);
                    
                    // Show amount adjustment notification if needed
                    if (!transaction.amount_match) {
                        this.showAmountAdjustmentNotification(transaction.expected_amount, transaction.amount, currency);
                    }
                }
            } else {
                console.error('Error checking deposit:', response.statusText);
            }
        } catch (error) {
            console.error(`Error checking ${currency} deposit:`, error);
        }
    }
    
    async checkTransactionConfirmations(currency, txHash, exchangeId, statusCallback) {
        const interval = this.callLimits[currency] || this.callLimits.default;
        
        this.pollingIntervals[`${exchangeId}_confirmations`] = setInterval(async () => {
            try {
                // Get latest exchange status from backend
                const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/exchange/${exchangeId}/status`);
                
                if (response.ok) {
                    const exchange = await response.json();
                    
                    const confirmations = exchange.confirmations || 0;
                    const requiredConfirmations = this.getRequiredConfirmations(currency);
                    
                    localStorage.setItem(`confirmations_${exchangeId}`, confirmations);
                    
                    if (statusCallback) {
                        statusCallback('received', txHash, confirmations, requiredConfirmations);
                    }
                    
                    if (confirmations >= requiredConfirmations) {
                        clearInterval(this.pollingIntervals[`${exchangeId}_confirmations`]);
                        delete this.pollingIntervals[`${exchangeId}_confirmations`];
                        
                        localStorage.setItem(`txStatus_${exchangeId}`, 'exchanging');
                        if (statusCallback) statusCallback('exchanging', txHash);
                        
                        // Simulate exchange processing time (5-15 seconds)
                        setTimeout(() => {
                            localStorage.setItem(`txStatus_${exchangeId}`, 'completed');
                            if (statusCallback) statusCallback('completed', txHash);
                        }, Math.floor(Math.random() * 10000) + 5000);
                    }
                }
            } catch (error) {
                console.error(`Error checking confirmations:`, error);
            }
        }, interval);
    }
    
    getRequiredConfirmations(currency) {
        switch(currency) {
            case 'BTC': return 2;
            case 'ETH': return 15;
            case 'XMR': return 12;
            case 'LTC': return 6;
            case 'XRP': return 500;
            case 'DOGE': return 500;
            case 'USDT-ERC20': return 15;  // Same as ETH network
            case 'USDC-ERC20': return 15;  // Same as ETH network
            case 'USDT-TRX': return 19;    // Tron network confirmations
            case 'TRX': return 19;          // Tron network confirmations
            default: return 2;
        }
    }
    
    showAmountAdjustmentNotification(expected, actual, currency) {
        const message = `Amount adjustment: Expected ${expected} ${currency}, received ${actual} ${currency}. Your exchange amount has been adjusted accordingly.`;
        
        // You can replace this with a proper notification system
        if (window.showNotification) {
            window.showNotification(message, 'info');
        } else {
            console.info(message);
            // Create a simple notification
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: #4A7CFE;
                color: white;
                padding: 15px;
                border-radius: 8px;
                z-index: 9999;
                max-width: 300px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            `;
            notification.textContent = message;
            document.body.appendChild(notification);
            
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 10000);
        }
    }
}

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
    const [realExchangeData, setRealExchangeData] = useState(null);
    
    // CARTEL completion messages in multiple languages
    const completionMessages = [
        // Russian
        "и теперь ты часть картеля...",
        "все что происходило тут остается тоже тут...",
        "твой след исчез в тенях цифрового мира...",
        "операция завершена, следов не осталось...",
        "добро пожаловать в подпольную сеть...",
        
        // English
        "and now you are part of the cartel...",
        "everything that happened here stays here too...",
        "your trace vanished in the shadows of the digital world...",
        "operation completed, no traces left...",
        "welcome to the underground network...",
        
        // Serbian
        "и сада си део картела...",
        "све што се десило овде остаје и овде...",
        "твој траг је нестао у сенкама дигиталног света...",
        "операција завршена, нема трагова...",
        "добродошао у подземну мрежу...",
        
        // French
        "et maintenant tu fais partie du cartel...",
        "tout ce qui s'est passé ici reste ici aussi...",
        "ta trace a disparu dans les ombres du monde numérique...",
        "opération terminée, aucune trace laissée...",
        "bienvenue dans le réseau souterrain...",
        
        // German
        "und jetzt bist du Teil des Kartells...",
        "alles was hier geschah bleibt auch hier...",
        "deine Spur verschwand in den Schatten der digitalen Welt...",
        "Operation abgeschlossen, keine Spuren hinterlassen...",
        "willkommen im Untergrundnetzwerk...",
        
        // Chinese
        "现在你是卡特尔的一部分了...",
        "这里发生的一切也留在这里...",
        "你的踪迹消失在数字世界的阴影中...",
        "行动完成，没有留下痕迹...",
        "欢迎来到地下网络...",
        
        // Italian
        "e ora fai parte del cartello...",
        "tutto quello che è successo qui rimane anche qui...",
        "la tua traccia è svanita nelle ombre del mondo digitale...",
        "operazione completata, nessuna traccia lasciata...",
        "benvenuto nella rete sotterranea..."
    ];
    
    const [currentMessage, setCurrentMessage] = useState(
        completionMessages[Math.floor(Math.random() * completionMessages.length)]
    );
    const [isVisible, setIsVisible] = useState(true);

    // Function to simulate status progression for demo purposes
    const startDemoStatusProgression = (exchangeId) => {
        console.log('🎬 Starting DEMO status progression for exchange:', exchangeId);
        
        // Simulate receiving payment after 5-10 seconds
        setTimeout(() => {
            console.log('🎬 DEMO: Payment received');
            const demoTxHash = 'demo_' + Math.random().toString(36).substr(2, 16);
            handleStatusUpdate('received', demoTxHash, 0, requiredConfirmations);
            
            // Simulate confirmations increasing
            let confirmationCount = 0;
            const confirmationInterval = setInterval(() => {
                confirmationCount++;
                console.log(`🎬 DEMO: Confirmation ${confirmationCount}/${requiredConfirmations}`);
                handleStatusUpdate('received', demoTxHash, confirmationCount, requiredConfirmations);
                
                if (confirmationCount >= requiredConfirmations) {
                    clearInterval(confirmationInterval);
                    
                    // Move to exchanging status
                    setTimeout(() => {
                        console.log('🎬 DEMO: Exchanging currencies');
                        handleStatusUpdate('exchanging', demoTxHash);
                        
                        // Complete the exchange after 5-8 seconds
                        setTimeout(() => {
                            console.log('🎬 DEMO: Exchange completed!');
                            handleStatusUpdate('completed', demoTxHash);
                        }, 5000 + Math.random() * 3000);
                    }, 2000);
                }
            }, 2000); // New confirmation every 2 seconds
        }, 5000 + Math.random() * 5000); // Start after 5-10 seconds
    };

    useEffect(() => {
        // Get exchange data from location state
        let data = location.state?.exchangeData;
        
        if (!data) {
            // Redirect to home if no exchange data
            navigate('/');
            return;
        }

        setExchangeData(data);
        setRealExchangeData(data);
        setRequiredConfirmations(getRequiredConfirmationsForCurrency(data.fromCurrency));

        // Use the deposit address from the exchange data (real address from backend)
        const address = data.exchangeId ? 
            (async () => {
                try {
                    const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/exchange/${data.exchangeId}`);
                    if (response.ok) {
                        const exchangeDetails = await response.json();
                        setDepositAddress(exchangeDetails.deposit_address);
                        
                        // Generate QR codes after getting the real address
                        setTimeout(() => {
                            generateQRCode(exchangeDetails.deposit_address, 'qrcode');
                            generateQRCode(exchangeDetails.deposit_address, 'qrcodeMobile');
                        }, 100);
                        
                        // Initialize transaction monitoring with real address
                        const transactionMonitor = new TransactionMonitor();
                        setMonitor(transactionMonitor);
                        
                        // DEMO MODE: Start automatic status progression for demonstration
                        startDemoStatusProgression(data.exchangeId);
                        
                        transactionMonitor.startMonitoring(
                            exchangeDetails.deposit_address,
                            data.fromCurrency,
                            data.exchangeId,
                            handleStatusUpdate
                        );
                    }
                } catch (error) {
                    console.error('Error fetching exchange details:', error);
                    // Even if API fails, start demo progression
                    startDemoStatusProgression(data.exchangeId);
                }
            })() : null;

        return () => {
            if (monitor) {
                monitor.stopMonitoring(data.exchangeId);
            }
        };
    }, [location, navigate]);

    // Rotate messages every 5 seconds with fade animation (only when completed)
    useEffect(() => {
        if (transactionStatus === 'completed') {
            const interval = setInterval(() => {
                setIsVisible(false);
                setTimeout(() => {
                    const randomIndex = Math.floor(Math.random() * completionMessages.length);
                    setCurrentMessage(completionMessages[randomIndex]);
                    setIsVisible(true);
                }, 250);
            }, 5000);
            
            return () => clearInterval(interval);
        }
    }, [transactionStatus, completionMessages]);

    const getRequiredConfirmationsForCurrency = (currency) => {
        switch(currency) {
            case 'BTC': return 2;
            case 'ETH': return 15;
            case 'XMR': return 12;
            case 'LTC': return 6;
            case 'XRP': return 500;
            case 'DOGE': return 500;
            case 'USDT-ERC20': return 15;  // Same as ETH network
            case 'USDC-ERC20': return 15;  // Same as ETH network
            case 'USDT-TRX': return 19;    // Tron network confirmations
            case 'TRX': return 19;          // Tron network confirmations
            default: return 2;
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

    // Show completion page when transaction is completed
    if (transactionStatus === 'completed') {        
        return (
            <>
                <div className="page-header">
                    <h1>Operation Completed</h1>
                    <p className={`cartel-message ${isVisible ? 'fade-in' : 'fade-out'}`}>{currentMessage}</p>
                </div>

                <div className="completion-container">
                    <div className="completion-summary">
                        <div className="completion-icon">
                            <div className="success-icon">◆</div>
                        </div>
                        
                        <div className="completion-details">
                            <h2>Transaction Summary</h2>
                            
                            <div className="completion-item">
                                <span className="completion-label">You sent:</span>
                                <span className="completion-value">{exchangeData.sendAmount} {exchangeData.fromCurrency}</span>
                            </div>
                            
                            <div className="completion-item">
                                <span className="completion-label">You received:</span>
                                <span className="completion-value">{exchangeData.receiveAmount} {exchangeData.toCurrency}</span>
                            </div>
                            
                            <div className="completion-item">
                                <span className="completion-label">From address:</span>
                                <span className="completion-value address-value">{depositAddress}</span>
                            </div>
                            
                            <div className="completion-item">
                                <span className="completion-label">To address:</span>
                                <span className="completion-value address-value">{exchangeData.receivingAddress}</span>
                            </div>
                            
                            {transactionHash && (
                                <div className="completion-item">
                                    <span className="completion-label">Transaction hash:</span>
                                    <span className="completion-value address-value">{transactionHash}</span>
                                </div>
                            )}
                            
                            <div className="completion-item">
                                <span className="completion-label">Exchange ID:</span>
                                <span className="completion-value">{exchangeData.exchangeId}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="completion-actions">
                        <button 
                            className="cartel-primary-button"
                            onClick={() => navigate('/')}
                        >
                            <span className="button-icon">◇</span>
                            Initiate New Operation
                        </button>
                        
                        <a href="/#/support" className="cartel-secondary-button">
                            <span className="button-icon">▲</span>
                            Contact Underground
                        </a>
                    </div>
                </div>
            </>
        );
    }

    // Show processing page for received/exchanging status (without QR code and headers)
    if (transactionStatus === 'received' || transactionStatus === 'exchanging') {
        return (
            <>
                <div className="confirmation-header">
                    <h2>Operation in Progress</h2>
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

                {/* Main Content without QR Code */}
                <div className="two-column-layout">
                    {/* Details Column */}
                    <div className="column details-column">
                        <div className="exchange-details">
                            <div className="section-title">Exchange Details</div>
                            <div className="exchange-detail-item">
                                <span className="detail-label">You sent:</span>
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
                    
                    {/* Combined Receiver and Support Column */}
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
                            <a href="/#/support" className="support-link">Contact Support</a>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    // Default waiting state with QR code
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

            {/* Main Content with QR Code */}
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