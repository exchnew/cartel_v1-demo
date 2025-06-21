import React, { useState, useEffect } from "react";
import { HashRouter as Router, Routes, Route, useNavigate } from "react-router-dom";
import "./App.css";
import axios from "axios";
import ConfirmationPage from "./components/ConfirmationPage";
import AdminPanel from "./components/AdminPanel";
import "./components/AdminPanel.css";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Currency validation patterns
const CURRENCY_PATTERNS = {
  BTC: /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/,
  ETH: /^0x[a-fA-F0-9]{40}$/,
  XMR: /^4[0-9AB][123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{93}$/,
  LTC: /^[LM3][a-km-zA-HJ-NP-Z1-9]{26,34}$/,
  XRP: /^r[0-9a-zA-Z]{24,34}$/,
  DOGE: /^D{1}[5-9A-HJ-NP-U]{1}[1-9A-HJ-NP-Za-km-z]{32}$/,
  DEFAULT: /.{10,}/
};

// Validate crypto address
const validateCryptoAddress = (address, currency) => {
  if (!address) return false;
  const pattern = CURRENCY_PATTERNS[currency] || CURRENCY_PATTERNS.DEFAULT;
  return pattern.test(address.trim());
};

// Header Component
const Header = ({ onMobileMenuToggle, mobileMenuOpen }) => {
  return (
    <header className="site-header">
      <div className="container header-container">
        <div className="logo-container">
          <a href="/" className="logo">
            <img 
              src="/images/cartel-logo.jpg" 
              alt="CARTEL" 
              className="logo-image"
              onError={(e) => {
                // Fallback to text if image fails to load
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'block';
              }}
            />
            <span className="logo-text" style={{display: 'none'}}>CARTEL</span>
          </a>
        </div>
        
        <nav className={`main-navigation ${mobileMenuOpen ? 'active' : ''}`}>
          <ul className="nav-list">
            <li><a href="/#/terms">Terms & Conditions</a></li>
            <li><a href="/#/privacy">Privacy Policy</a></li>
            <li><a href="/#/support">Support</a></li>
            <li><a href="/#/partners">Partners</a></li>
            <li><a href="/#/api">API</a></li>
          </ul>
        </nav>
        
        <div className="mobile-menu-toggle" onClick={onMobileMenuToggle}>
          <i className="fas fa-bars"></i>
        </div>
      </div>
    </header>
  );
};

// Footer Component
const Footer = () => {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-info">
            <div className="footer-logo">
              <img 
                src="/images/cartel-logo.jpg" 
                alt="CARTEL" 
                className="footer-logo-image"
                onError={(e) => {
                  // Fallback to text if image fails to load
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'block';
                }}
              />
              <span className="footer-logo-text" style={{display: 'none'}}>CARTEL</span>
            </div>
            <p className="footer-description">
              Secure and anonymous cryptocurrency exchange service with no registration required. 
              Visit <a href="https://cartelex.ch">cartelex.ch</a> for more information.
            </p>
          </div>
          
          <div className="footer-navigation">
            <div className="footer-nav-column">
              <h4>Navigation</h4>
              <ul>
                <li><a href="/#/">Exchange</a></li>
                <li><a href="/#/terms">Terms & Conditions</a></li>
                <li><a href="/#/privacy">Privacy Policy</a></li>
              </ul>
            </div>
            <div className="footer-nav-column">
              <h4>Resources</h4>
              <ul>
                <li><a href="/#/support">Support</a></li>
                <li><a href="/#/partners">Partners</a></li>
                <li><a href="/#/api">API Documentation</a></li>
              </ul>
            </div>
            <div className="footer-nav-column">
              <h4>Contact Us</h4>
              <ul className="contact-info">
                <li><a href="https://t.me/cartelex" target="_blank" rel="noopener noreferrer">
                  <i className="fab fa-telegram"></i> @cartelex
                </a></li>
                <li><a href="mailto:support@cartelex.ch">
                  <i className="far fa-envelope"></i> support@cartelex.ch
                </a></li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="copyright">
          <p>&copy; 2025 CARTEL. All rights reserved. <a href="https://cartelex.ch">cartelex.ch</a></p>
        </div>
      </div>
    </footer>
  );
};

// Currency Selector Component
const CurrencySelector = ({ 
  id, 
  selectedCurrency, 
  currencies, 
  onCurrencySelect, 
  isOpen, 
  onToggle 
}) => {
  return (
    <div className={`currency-select ${isOpen ? 'active' : ''}`} id={id}>
      <div className="selected-currency" onClick={onToggle}>
        <div className="currency-icon">
          <img 
            src={`/images/currencies/${selectedCurrency.currency.toLowerCase()}.svg`}
            alt={selectedCurrency.currency}
            onError={(e) => { e.target.src = '/images/currencies/generic.svg'; }}
          />
        </div>
        <div className="currency-info">
          <span className="currency-name">{selectedCurrency.currency}</span>
          <span className="network-name">{selectedCurrency.networks[0].name}</span>
        </div>
      </div>
      
      <div className="currency-list">
        {currencies.map((currency) => (
          <div 
            key={currency.currency}
            className={`currency-option ${selectedCurrency.currency === currency.currency ? 'selected' : ''}`}
            onClick={() => onCurrencySelect(currency)}
          >
            <div className="currency-icon">
              <img 
                src={`/images/currencies/${currency.currency.toLowerCase()}.svg`}
                alt={currency.currency}
                onError={(e) => { e.target.src = '/images/currencies/generic.svg'; }}
              />
            </div>
            <div className="currency-info">
              <span className="currency-name">{currency.currency}</span>
              <span className="network-name">{currency.networks[0].name}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Address Modal Component
const AddressModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  toCurrency, 
  fromCurrency 
}) => {
  const [receivingAddress, setReceivingAddress] = useState('');
  const [refundAddress, setRefundAddress] = useState('');
  const [email, setEmail] = useState('');
  const [validationMessages, setValidationMessages] = useState({
    receiving: '',
    refund: '',
    email: ''
  });
  const [isValid, setIsValid] = useState(false);

  const validateEmail = (email) => {
    const pattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return pattern.test(email);
  };

  const handleReceivingAddressChange = (e) => {
    const address = e.target.value;
    setReceivingAddress(address);
    
    if (!address) {
      setValidationMessages(prev => ({ ...prev, receiving: '' }));
      setIsValid(false);
    } else if (validateCryptoAddress(address, toCurrency.currency)) {
      setValidationMessages(prev => ({ ...prev, receiving: 'Valid address ✓' }));
      setIsValid(true);
    } else {
      setValidationMessages(prev => ({ 
        ...prev, 
        receiving: `Invalid ${toCurrency.currency} address. Please check and try again.` 
      }));
      setIsValid(false);
    }
  };

  const handleRefundAddressChange = (e) => {
    const address = e.target.value;
    setRefundAddress(address);
    
    if (!address) {
      setValidationMessages(prev => ({ ...prev, refund: '' }));
    } else if (validateCryptoAddress(address, fromCurrency.currency)) {
      setValidationMessages(prev => ({ ...prev, refund: 'Valid address ✓' }));
    } else {
      setValidationMessages(prev => ({ 
        ...prev, 
        refund: `Invalid ${fromCurrency.currency} address. Please check or leave empty.` 
      }));
    }
  };

  const handleEmailChange = (e) => {
    const emailValue = e.target.value;
    setEmail(emailValue);
    
    if (!emailValue) {
      setValidationMessages(prev => ({ ...prev, email: '' }));
    } else if (validateEmail(emailValue)) {
      setValidationMessages(prev => ({ ...prev, email: 'Valid email ✓' }));
    } else {
      setValidationMessages(prev => ({ 
        ...prev, 
        email: 'Invalid email. Please check or leave empty.' 
      }));
    }
  };

  const handleConfirm = () => {
    onConfirm({
      receivingAddress: receivingAddress.trim(),
      refundAddress: refundAddress.trim() || null,
      email: email.trim() || null
    });
  };

  const resetForm = () => {
    setReceivingAddress('');
    setRefundAddress('');
    setEmail('');
    setValidationMessages({ receiving: '', refund: '', email: '' });
    setIsValid(false);
  };

  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="modal active">
      <div className="modal-content">
        <span className="close-modal" onClick={onClose}>&times;</span>
        <h2>Enter Receiving Address</h2>
        
        <div className="modal-info">
          <div className="modal-currency-icon">
            <img 
              src={`/images/currencies/${toCurrency.currency.toLowerCase()}.svg`}
              alt={toCurrency.currency}
              onError={(e) => { e.target.src = '/images/currencies/generic.svg'; }}
            />
          </div>
          <div className="modal-currency-details">
            <span className="modal-currency-name">{toCurrency.currency}</span>
            <span className="modal-network-name">{toCurrency.networks[0].name}</span>
          </div>
        </div>
        
        <div className="address-input-container">
          <label htmlFor="receivingAddress">Receiving address (required):</label>
          <input 
            type="text" 
            id="receivingAddress" 
            className="address-input"
            placeholder="Enter valid address"
            value={receivingAddress}
            onChange={handleReceivingAddressChange}
          />
          <div className={`validation-message ${
            validationMessages.receiving.includes('✓') ? 'validation-success' : 
            validationMessages.receiving ? 'validation-error' : ''
          }`}>
            {validationMessages.receiving}
          </div>
        </div>
        
        <div className="address-input-container">
          <label htmlFor="refundAddress">Refund address (optional):</label>
          <input 
            type="text" 
            id="refundAddress" 
            className="address-input"
            placeholder="Address for refunds if needed"
            value={refundAddress}
            onChange={handleRefundAddressChange}
          />
          <div className={`validation-message ${
            validationMessages.refund.includes('✓') ? 'validation-success' : 
            validationMessages.refund ? 'validation-error' : ''
          }`}>
            {validationMessages.refund}
          </div>
        </div>
        
        <div className="address-input-container">
          <label htmlFor="emailAddress">Email address (optional):</label>
          <input 
            type="email" 
            id="emailAddress" 
            className="address-input"
            placeholder="For transaction updates"
            value={email}
            onChange={handleEmailChange}
          />
          <div className={`validation-message ${
            validationMessages.email.includes('✓') ? 'validation-success' : 
            validationMessages.email ? 'validation-error' : ''
          }`}>
            {validationMessages.email}
          </div>
        </div>
        
        <button 
          className="confirm-button" 
          disabled={!isValid}
          onClick={handleConfirm}
        >
          Confirm Exchange
        </button>
      </div>
    </div>
  );
};

// Home Page Component
const HomePage = () => {
  const navigate = useNavigate();
  const [currencies, setCurrencies] = useState([]);
  const [fromCurrency, setFromCurrency] = useState(null);
  const [toCurrency, setToCurrency] = useState(null);
  const [sendAmount, setSendAmount] = useState('0.1');
  const [receiveAmount, setReceiveAmount] = useState('');
  const [exchangeRate, setExchangeRate] = useState('Exchange Rate: Loading...');
  const [rateType, setRateType] = useState('float');
  const [showModal, setShowModal] = useState(false);
  const [openCurrencySelector, setOpenCurrencySelector] = useState(null);

  // Load currencies
  useEffect(() => {
    const loadCurrencies = async () => {
      try {
        const response = await axios.get(`${API}/currencies`);
        if (response.data.code === '200000' && response.data.data) {
          setCurrencies(response.data.data);
          setFromCurrency(response.data.data[0]); // BTC
          setToCurrency(response.data.data[2]); // XMR
        }
      } catch (error) {
        console.error('Error loading currencies:', error);
        // Fallback currencies
        const fallbackCurrencies = [
          { currency: 'BTC', name: 'Bitcoin', networks: [{ chain: 'BTC', name: 'Bitcoin Network' }] },
          { currency: 'ETH', name: 'Ethereum', networks: [{ chain: 'ETH', name: 'Ethereum Network' }] },
          { currency: 'XMR', name: 'Monero', networks: [{ chain: 'XMR', name: 'Monero Network' }] },
          { currency: 'LTC', name: 'Litecoin', networks: [{ chain: 'LTC', name: 'Litecoin Network' }] }
        ];
        setCurrencies(fallbackCurrencies);
        setFromCurrency(fallbackCurrencies[0]);
        setToCurrency(fallbackCurrencies[2]);
      }
    };

    loadCurrencies();
  }, []);

  // Update exchange rate
  useEffect(() => {
    const updateRate = async () => {
      if (!fromCurrency || !toCurrency) return;

      try {
        const response = await axios.get(`${API}/price`, {
          params: {
            from_currency: fromCurrency.currency,
            to_currency: toCurrency.currency,
            rate_type: rateType
          }
        });

        if (response.data.code === '200000' && response.data.data) {
          const rate = response.data.data.rate;
          const ratePrefix = rateType === 'fixed' ? '[Fixed] ' : '';
          setExchangeRate(`${ratePrefix}Exchange Rate: 1 ${fromCurrency.currency} = ${rate} ${toCurrency.currency}`);
          
          const newReceiveAmount = (parseFloat(sendAmount) * rate).toFixed(8);
          setReceiveAmount(newReceiveAmount);
        }
      } catch (error) {
        console.error('Error updating exchange rate:', error);
        setExchangeRate('Error loading exchange rate');
      }
    };

    updateRate();
  }, [fromCurrency, toCurrency, rateType, sendAmount]);

  const handleCurrencySelect = (currency, type) => {
    if (type === 'from') {
      setFromCurrency(currency);
    } else {
      setToCurrency(currency);
    }
    setOpenCurrencySelector(null);
  };

  const handleSendAmountChange = (e) => {
    setSendAmount(e.target.value);
  };

  const handleRateTypeChange = (type) => {
    setRateType(type);
  };

  const handleExchangeConfirm = async (addressData) => {
    try {
      const exchangeData = {
        from_currency: fromCurrency.currency,
        to_currency: toCurrency.currency,
        from_amount: parseFloat(sendAmount),
        to_amount: parseFloat(receiveAmount),
        receiving_address: addressData.receivingAddress,
        refund_address: addressData.refundAddress,
        email: addressData.email,
        rate_type: rateType
      };

      const response = await axios.post(`${API}/exchange`, exchangeData);
      
      // Prepare data for confirmation page
      const confirmationData = {
        fromCurrency: fromCurrency.currency,
        fromNetwork: fromCurrency.networks[0].name,
        toCurrency: toCurrency.currency,
        toNetwork: toCurrency.networks[0].name,
        sendAmount: sendAmount,
        receiveAmount: receiveAmount,
        exchangeRate: exchangeRate,
        rateType: rateType === 'fixed' ? 'Fixed rate' : 'Floating rate',
        receivingAddress: addressData.receivingAddress,
        refundAddress: addressData.refundAddress || 'Not provided',
        email: addressData.email || 'Not provided',
        date: new Date().toLocaleString(),
        exchangeId: response.data.id
      };

      // Navigate to confirmation page with data
      navigate('/confirmation', { state: { exchangeData: confirmationData } });
      setShowModal(false);
      
    } catch (error) {
      console.error('Error creating exchange:', error);
      alert('Error creating exchange. Please try again.');
    }
  };

  // Close currency selectors when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setOpenCurrencySelector(null);
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  if (!fromCurrency || !toCurrency) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <div className="page-header">
        <h1>CARTEL</h1>
        <p>The shadow market: where digital wealth moves untraced</p>
      </div>

      <div className="exchange-form">
        <div className="exchange-section">
          <div className="section-label">You send</div>
          <input 
            type="number" 
            className="amount-input" 
            value={sendAmount} 
            step="0.00000001"
            onChange={handleSendAmountChange}
          />
          <CurrencySelector
            id="fromCurrency"
            selectedCurrency={fromCurrency}
            currencies={currencies}
            onCurrencySelect={(currency) => handleCurrencySelect(currency, 'from')}
            isOpen={openCurrencySelector === 'from'}
            onToggle={(e) => {
              e.stopPropagation();
              setOpenCurrencySelector(openCurrencySelector === 'from' ? null : 'from');
            }}
          />
        </div>

        <div className="exchange-type">
          <div 
            className={`type-option ${rateType === 'float' ? 'active' : ''}`}
            onClick={() => handleRateTypeChange('float')}
          >
            ↔ Floating rate
          </div>
          <div 
            className={`type-option ${rateType === 'fixed' ? 'active' : ''}`}
            onClick={() => handleRateTypeChange('fixed')}
          >
            ⭐ Fixed rate
          </div>
        </div>

        <div className="exchange-rate">{exchangeRate}</div>

        <div className="exchange-section">
          <div className="section-label">You get</div>
          <input 
            type="number" 
            className="amount-input" 
            value={receiveAmount} 
            readOnly 
            step="0.00000001"
          />
          <CurrencySelector
            id="toCurrency"
            selectedCurrency={toCurrency}
            currencies={currencies}
            onCurrencySelect={(currency) => handleCurrencySelect(currency, 'to')}
            isOpen={openCurrencySelector === 'to'}
            onToggle={(e) => {
              e.stopPropagation();
              setOpenCurrencySelector(openCurrencySelector === 'to' ? null : 'to');
            }}
          />
        </div>

        <button className="exchange-button" onClick={() => setShowModal(true)}>
          Exchange
        </button>
      </div>
      
      <div className="terms-privacy">
        <p>
          By creating an exchange, you agree to our <a href="/#/terms">Terms & Conditions</a> and <a href="/#/privacy">Privacy Policy</a>
        </p>
      </div>

      {/* How It Works Section */}
      <div className="how-it-works-section">
        <h2>Shadow Operations</h2>
        <div className="steps-container">
          <div className="step-item">
            <div className="step-icon">
              <i className="fas fa-mask"></i>
            </div>
            <div className="step-line"></div>
            <h3>Select Your Targets</h3>
            <p>Choose your crypto assets to move through the shadow network without being traced.</p>
          </div>
          
          <div className="step-item">
            <div className="step-icon">
              <i className="fas fa-ghost"></i>
            </div>
            <div className="step-line"></div>
            <h3>Designate Safe House</h3>
            <p>Provide the destination wallet. Your funds will disappear from the grid and resurface here.</p>
          </div>
          
          <div className="step-item">
            <div className="step-icon">
              <i className="fas fa-skull"></i>
            </div>
            <div className="step-line"></div>
            <h3>Execute The Transfer</h3>
            <p>Send the required sum to our deposit point. The underground network takes over from here.</p>
          </div>
          
          <div className="step-item">
            <div className="step-icon">
              <i className="fas fa-crown"></i>
            </div>
            <h3>Collect Your Prize</h3>
            <p>Operation complete. Your assets now rest safely outside the reach of prying eyes.</p>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="features-section">
        <div className="features-container">
          <div className="feature-box">
            <div className="feature-icon">
              <i className="fas fa-infinity"></i>
            </div>
            <div className="feature-badge">No ceiling</div>
            <h3>Unlimited Power</h3>
            <p>No restrictions on trade volume. Move mountains of crypto without questions or limitations.</p>
          </div>
          
          <div className="feature-box">
            <div className="feature-icon">
              <i className="fas fa-shield-alt"></i>
            </div>
            <div className="feature-badge">Untouchable</div>
            <h3>Ghost Protocol</h3>
            <p>Your assets remain invisible to the outside world. We built walls that even we can't breach.</p>
          </div>
          
          <div className="feature-box">
            <div className="feature-icon">
              <i className="fas fa-user-secret"></i>
            </div>
            <div className="feature-badge">No traces</div>
            <h3>Phantom Deals</h3>
            <p>Trade without a trace. No identity verification, no accounts, no questions asked. Complete anonymity.</p>
          </div>
        </div>
        
        <div className="features-container">
          <div className="feature-box">
            <div className="feature-icon">
              <i className="fas fa-bolt"></i>
            </div>
            <div className="feature-badge">Elite rates</div>
            <h3>Blood Diamond Prices</h3>
            <p>We control the market's veins to extract value others can't access. Our rates are unmatched anywhere.</p>
          </div>
          
          <div className="feature-box">
            <div className="feature-icon">
              <i className="fas fa-chart-line"></i>
            </div>
            <div className="feature-badge">Full visibility</div>
            <h3>Hawk's Eye View</h3>
            <p>Watch your assets move through our network in real time. Complete command over your operation from start to finish.</p>
          </div>
          
          <div className="feature-box">
            <div className="feature-icon">
              <i className="fas fa-headset"></i>
            </div>
            <div className="feature-badge">Always available</div>
            <h3>Consigliere Service</h3>
            <p>Our shadow network of advisors stands ready 24/7. When trouble calls, we answer - no matter the hour.</p>
          </div>
        </div>
      </div>

      {/* Address Modal */}
      <AddressModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onConfirm={handleExchangeConfirm}
        toCurrency={toCurrency}
        fromCurrency={fromCurrency}
      />
    </>
  );
};

// Terms & Conditions Page Component
const TermsPage = () => {
  return (
    <>
      <div className="page-header">
        <h1>Terms & Conditions</h1>
        <p>Please read these terms carefully before using our service</p>
      </div>
      
      <div className="content-block">
        <h2>1. Agreement to Terms</h2>
        <p>By accessing or using the CARTEL service, you agree to be bound by these Terms and Conditions.</p>
        
        <h2>2. Exchange Services</h2>
        <p>Our platform provides cryptocurrency exchange services without requiring user registration or KYC verification. The exchange rates are sourced from external cryptocurrency markets and are subject to fluctuations.</p>
        
        <h2>3. Commission Fees</h2>
        <p>We apply the following commission fees to all exchanges:</p>
        <ul>
          <li>Floating rate: 1% commission (you receive 99 units when the base rate is 100)</li>
          <li>Fixed rate: 2% commission (you receive 98 units when the base rate is 100)</li>
        </ul>
        
        <h2>4. Transaction Processing</h2>
        <p>All transactions are processed in the order they are received. Transaction confirmation times depend on the blockchain network conditions and are not guaranteed.</p>
        
        <h2>5. Refunds</h2>
        <p>In case of transaction failures, refunds will be processed to the refund address provided during the exchange process. If no refund address was provided, please contact our support team at support@cartelex.ch.</p>
        
        <h2>6. Prohibited Activities</h2>
        <p>You agree not to use our service for any illegal activities, including but not limited to money laundering, terrorist financing, or fraud.</p>
        
        <h2>7. Disclaimer of Warranties</h2>
        <p>Our service is provided "as is" without any warranties of any kind, either express or implied.</p>
        
        <h2>8. Limitation of Liability</h2>
        <p>We shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use or inability to use our service.</p>
        
        <h2>9. Changes to Terms</h2>
        <p>We reserve the right to modify these terms at any time. Your continued use of our service after such changes constitutes your acceptance of the new terms.</p>
        
        <h2>10. Governing Law</h2>
        <p>These terms shall be governed by and construed in accordance with the laws of the jurisdiction in which our company is registered.</p>
      </div>
    </>
  );
};

// Support Page Component
const SupportPage = () => {
  return (
    <>
      <div className="page-header">
        <h1>Support Center</h1>
        <p>Get help with your cryptocurrency exchanges</p>
      </div>
      
      <div className="content-block">
        <div className="support-grid">
          <div className="support-section">
            <h2>Frequently Asked Questions</h2>
            
            <div className="faq-item">
              <h3>How long does an exchange take?</h3>
              <p>Exchange times vary depending on the cryptocurrencies involved and network congestion. Typically, most exchanges are completed within 10-30 minutes after receiving the required number of blockchain confirmations.</p>
            </div>
            
            <div className="faq-item">
              <h3>What if my transaction is taking too long?</h3>
              <p>If your transaction is taking longer than expected, check the status on our exchange page. If the status shows "Waiting for confirmation," the transaction is still being processed by the blockchain network. For further assistance, contact our support team with your transaction ID.</p>
            </div>
            
            <div className="faq-item">
              <h3>What are your commission fees?</h3>
              <p>We charge a 1% commission for floating rate exchanges and a 2% commission for fixed rate exchanges. These fees are included in the exchange rate displayed when you initiate a transaction.</p>
            </div>
            
            <div className="faq-item">
              <h3>Do I need to create an account?</h3>
              <p>No, our exchange service is completely anonymous and does not require account creation or KYC verification.</p>
            </div>
            
            <div className="faq-item">
              <h3>What if I entered the wrong recipient address?</h3>
              <p>Unfortunately, blockchain transactions are irreversible. Always double-check recipient addresses before confirming transactions. If you notice an error before sending funds, cancel and start a new exchange with the correct address.</p>
            </div>
          </div>
          
          <div className="support-section">
            <h2>Contact Support</h2>
            <p>If you couldn't find an answer to your question, please contact our support team:</p>
            
            <div className="contact-methods">
              <div className="contact-method">
                <i className="fab fa-telegram"></i>
                <h3>Telegram</h3>
                <p>For the fastest response, message us on Telegram</p>
                <a href="https://t.me/cartelex" className="button" target="_blank" rel="noopener noreferrer">@cartelex</a>
              </div>
              
              <div className="contact-method">
                <i className="far fa-envelope"></i>
                <h3>Email</h3>
                <p>Send us a detailed message about your issue</p>
                <a href="mailto:support@cartelex.ch" className="button">support@cartelex.ch</a>
              </div>
            </div>
            
            <div className="support-note">
              <h3>When contacting support, please include:</h3>
              <ul>
                <li>Your transaction ID (if applicable)</li>
                <li>The cryptocurrencies involved in the exchange</li>
                <li>A clear description of the issue</li>
                <li>Any error messages you received</li>
                <li>Screenshots if possible</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// Partners Page Component
const PartnersPage = () => {
  return (
    <>
      <div className="page-header">
        <h1>Partnership Program</h1>
        <p>Join our cryptocurrency exchange affiliate program</p>
      </div>
      
      <div className="content-block">
        <div className="partners-introduction">
          <h2>Earn With Our Partnership Program</h2>
          <p>Join our affiliate program and earn commission from every exchange transaction made through your referral link. Our partnership program is designed to be transparent, reliable, and profitable for cryptocurrency enthusiasts, content creators, and service providers.</p>
        </div>
        
        <div className="partner-benefits">
          <h2>Benefits of Becoming a Partner</h2>
          <div className="benefits-grid">
            <div className="benefit-item">
              <i className="fas fa-percentage"></i>
              <h3>Competitive Commission</h3>
              <p>Earn up to 50% of our service fee from every exchange made by your referrals.</p>
            </div>
            
            <div className="benefit-item">
              <i className="fas fa-chart-line"></i>
              <h3>Real-time Statistics</h3>
              <p>Access a comprehensive dashboard with real-time tracking of your referrals and earnings.</p>
            </div>
            
            <div className="benefit-item">
              <i className="fas fa-wallet"></i>
              <h3>Instant Payouts</h3>
              <p>Receive your commission directly to your cryptocurrency wallet without delays.</p>
            </div>
            
            <div className="benefit-item">
              <i className="fas fa-globe"></i>
              <h3>Global Accessibility</h3>
              <p>Our partnership program is available worldwide with no regional restrictions.</p>
            </div>
            
            <div className="benefit-item">
              <i className="fas fa-tools"></i>
              <h3>Marketing Materials</h3>
              <p>Get access to professional banners, widgets, and promotional content for your website.</p>
            </div>
            
            <div className="benefit-item">
              <i className="fas fa-headset"></i>
              <h3>Dedicated Support</h3>
              <p>Receive priority support from our partnership management team.</p>
            </div>
          </div>
        </div>
        
        <div className="partnership-tiers">
          <h2>Partnership Tiers</h2>
          <div className="tiers-container">
            <div className="tier-card">
              <div className="tier-header">
                <h3>Basic</h3>
                <span className="tier-percentage">30%</span>
              </div>
              <div className="tier-body">
                <ul>
                  <li><i className="fas fa-check"></i> 30% commission rate</li>
                  <li><i className="fas fa-check"></i> Basic statistics dashboard</li>
                  <li><i className="fas fa-check"></i> Standard referral links</li>
                  <li><i className="fas fa-check"></i> Monthly payouts</li>
                </ul>
                <p>Best for: Beginners and individual promoters</p>
              </div>
              <div className="tier-footer">
                <p>No minimum volume required</p>
              </div>
            </div>
            
            <div className="tier-card highlight">
              <div className="tier-header">
                <h3>Advanced</h3>
                <span className="tier-percentage">40%</span>
              </div>
              <div className="tier-body">
                <ul>
                  <li><i className="fas fa-check"></i> 40% commission rate</li>
                  <li><i className="fas fa-check"></i> Advanced analytics dashboard</li>
                  <li><i className="fas fa-check"></i> Custom referral links</li>
                  <li><i className="fas fa-check"></i> Weekly payouts</li>
                  <li><i className="fas fa-check"></i> API integration options</li>
                </ul>
                <p>Best for: Content creators and small businesses</p>
              </div>
              <div className="tier-footer">
                <p>Minimum volume: 10 BTC/month</p>
              </div>
            </div>
            
            <div className="tier-card">
              <div className="tier-header">
                <h3>Premium</h3>
                <span className="tier-percentage">50%</span>
              </div>
              <div className="tier-body">
                <ul>
                  <li><i className="fas fa-check"></i> 50% commission rate</li>
                  <li><i className="fas fa-check"></i> Premium real-time analytics</li>
                  <li><i className="fas fa-check"></i> White-label integration options</li>
                  <li><i className="fas fa-check"></i> Instant payouts</li>
                  <li><i className="fas fa-check"></i> Dedicated account manager</li>
                  <li><i className="fas fa-check"></i> Custom marketing materials</li>
                </ul>
                <p>Best for: Large websites and businesses</p>
              </div>
              <div className="tier-footer">
                <p>Minimum volume: 50 BTC/month</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="how-to-join">
          <h2>How to Join</h2>
          <div className="steps-container">
            <div className="step-item">
              <div className="step-number">1</div>
              <h3>Fill out the application form</h3>
              <p>Complete our partnership application form with information about you or your platform.</p>
            </div>
            
            <div className="step-item">
              <div className="step-number">2</div>
              <h3>Receive your referral link</h3>
              <p>After approval, you'll get your unique referral link and access to the partner dashboard.</p>
            </div>
            
            <div className="step-item">
              <div className="step-number">3</div>
              <h3>Promote our exchange</h3>
              <p>Share your link on your website, social media, or other channels to start earning commissions.</p>
            </div>
            
            <div className="step-item">
              <div className="step-number">4</div>
              <h3>Track performance & get paid</h3>
              <p>Monitor your performance in real-time and receive regular payments to your crypto wallet.</p>
            </div>
          </div>
        </div>
        
        <div className="partnership-contact">
          <h2>Interested in Becoming a Partner?</h2>
          <p>Contact our partnership department to discuss your options and get started:</p>
          <div className="contact-buttons">
            <a href="mailto:partners@cartelex.ch" className="button primary-button">
              <i className="far fa-envelope"></i> partners@cartelex.ch
            </a>
            <a href="https://t.me/cartelex_partners" className="button secondary-button" target="_blank" rel="noopener noreferrer">
              <i className="fab fa-telegram"></i> Telegram
            </a>
          </div>
        </div>
      </div>
    </>
  );
};

// Privacy Policy Page Component
const PrivacyPage = () => {
  return (
    <>
      <div className="page-header">
        <h1>Privacy Policy</h1>
        <p>How we handle your information when you use our service</p>
      </div>
      
      <div className="content-block">
        <h2>1. Introduction</h2>
        <p>At CARTEL, we respect your privacy and are committed to protecting your personal information. This Privacy Policy explains how we collect, use, and safeguard your information when you use our cryptocurrency exchange service.</p>
        
        <h2>2. Information We Collect</h2>
        <p>We collect minimal information to provide our service:</p>
        <ul>
          <li>Transaction data (cryptocurrency addresses, exchange amounts)</li>
          <li>Optional email address (if provided for transaction notifications)</li>
          <li>IP address and basic device information</li>
        </ul>
        <p>We do not require account creation, KYC verification, or personal identification.</p>
        
        <h2>3. How We Use Your Information</h2>
        <p>We use the collected information for:</p>
        <ul>
          <li>Processing cryptocurrency exchanges</li>
          <li>Sending transaction notifications (if email is provided)</li>
          <li>Preventing fraud and abuse</li>
          <li>Improving our service</li>
        </ul>
        
        <h2>4. Data Retention</h2>
        <p>We retain transaction data for a limited period necessary for operational purposes and to comply with applicable laws. Optional information such as email addresses is stored only for the duration of the transaction and follow-up support.</p>
        
        <h2>5. Data Security</h2>
        <p>We implement appropriate security measures to protect your information from unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the Internet or electronic storage is 100% secure.</p>
        
        <h2>6. No Data Sharing</h2>
        <p>We do not sell, trade, or otherwise transfer your information to third parties except when required by law or to protect our rights.</p>
        
        <h2>7. Cookies and Tracking</h2>
        <p>We use essential cookies to ensure the proper functioning of our service. You can configure your browser to refuse cookies, but this may affect the functionality of our service.</p>
        
        <h2>8. Your Rights</h2>
        <p>Depending on your jurisdiction, you may have rights to access, correct, or delete your personal information. Contact our support team to exercise these rights.</p>
        
        <h2>9. Changes to this Policy</h2>
        <p>We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page.</p>
        
        <h2>10. Contact Us</h2>
        <p>If you have any questions about this Privacy Policy, please contact us at support@cartelex.ch or via Telegram @cartelex.</p>
      </div>
    </>
  );
};

// API Documentation Page Component  
const APIPage = () => {
  return (
    <>
      <div className="page-header">
        <h1>API Documentation</h1>
        <p>Integrate our cryptocurrency exchange into your application</p>
      </div>
      
      <div className="content-block">
        <div className="api-introduction">
          <h2>API Overview</h2>
          <p>Our REST API allows you to access CARTEL functionality programmatically, including retrieving exchange rates, creating exchange transactions, and checking transaction status.</p>
          
          <div className="api-key-info">
            <h3><i className="fas fa-key"></i> API Key Authentication</h3>
            <p>To use our API, you need an API key. Contact us at <a href="mailto:api@cartelex.ch">api@cartelex.ch</a> to request one.</p>
          </div>
          
          <h3>Base URL</h3>
          <p className="endpoint-url">https://api.cartelex.ch/v1</p>
          
          <h3>Request Format</h3>
          <p>All requests should include your API key in the header:</p>
          <div className="response-example">
            <span className="code-comment">// API Key Header</span><br/>
            X-API-Key: your_api_key_here
          </div>
        </div>
        
        <h2>Endpoints</h2>
        
        <div className="api-endpoint">
          <div className="endpoint-header">
            <span className="http-method get">GET</span>
            <span className="endpoint-url">/rates</span>
          </div>
          <p>Get current exchange rates for all supported cryptocurrency pairs.</p>
          
          <h3>Response Example</h3>
          <div className="response-example">
            {JSON.stringify({
              "success": true,
              "timestamp": 1634556789,
              "rates": {
                "BTC-ETH": {
                  "floating_rate": 14.56783,
                  "fixed_rate": 14.42215,
                  "min_amount": 0.001,
                  "max_amount": 10
                },
                "BTC-XMR": {
                  "floating_rate": 112.78421,
                  "fixed_rate": 111.65637,
                  "min_amount": 0.001,
                  "max_amount": 5
                }
              }
            }, null, 2)}
          </div>
        </div>
        
        <div className="api-endpoint">
          <div className="endpoint-header">
            <span className="http-method post">POST</span>
            <span className="endpoint-url">/exchange</span>
          </div>
          <p>Create a new exchange transaction.</p>
          
          <h3>Response Example</h3>
          <div className="response-example">
            {JSON.stringify({
              "success": true,
              "transaction_id": "tx_8f7d6e5c4b3a2",
              "from": {
                "currency": "BTC",
                "amount": 0.5
              },
              "to": {
                "currency": "ETH", 
                "amount": 7.28392,
                "address": "0x1a2b3c4d5e6f..."
              },
              "deposit_address": "bc1q9h8j7k6l5...",
              "rate": 14.56783,
              "rate_type": "floating",
              "status": "waiting_for_deposit"
            }, null, 2)}
          </div>
        </div>
        
        <h2>Error Handling</h2>
        <p>When an error occurs, the API returns a JSON object containing an error message:</p>
        <div className="response-example">
          {JSON.stringify({
            "success": false,
            "error": {
              "code": 400,
              "message": "Invalid recipient address"
            }
          }, null, 2)}
        </div>
        
        <h2>Need Help?</h2>
        <p>If you have any questions about our API, contact our developer support team:</p>
        <a href="mailto:api@cartelex.ch" className="button">
          <i className="far fa-envelope"></i> api@cartelex.ch
        </a>
      </div>
    </>
  );
};

// Main App Component with Layout
function AppLayout({ children }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="site-wrapper">
      <Header 
        onMobileMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
        mobileMenuOpen={mobileMenuOpen}
      />
      
      <main className="site-content">
        <div className="container">
          {children}
        </div>
      </main>
      
      <Footer />
    </div>
  );
}

// Main App Component
function App() {
  return (
    <Router>
      <Routes>
        <Route 
          path="/" 
          element={
            <AppLayout>
              <HomePage />
            </AppLayout>
          } 
        />
        <Route 
          path="/confirmation" 
          element={
            <AppLayout>
              <ConfirmationPage />
            </AppLayout>
          } 
        />
        <Route 
          path="/partners" 
          element={
            <AppLayout>
              <PartnersPage />
            </AppLayout>
          } 
        />
        <Route 
          path="/privacy" 
          element={
            <AppLayout>
              <PrivacyPage />
            </AppLayout>
          } 
        />
        <Route 
          path="/terms" 
          element={
            <AppLayout>
              <TermsPage />
            </AppLayout>
          } 
        />
        <Route 
          path="/support" 
          element={
            <AppLayout>
              <SupportPage />
            </AppLayout>
          } 
        />
        <Route 
          path="/api" 
          element={
            <AppLayout>
              <APIPage />
            </AppLayout>
          } 
        />
        <Route 
          path="/admin" 
          element={<AdminPanel />} 
        />
      </Routes>
    </Router>
  );
}

export default App;