// src/popup/views/AccountView.tsx - Account view component

import React, { useState, useEffect } from 'react';
import { usePopupStore } from '../state/store';
import StatusMessage from '../components/StatusMessage';

const AccountView: React.FC = () => {
  // Get state and actions from store
  const authState = usePopupStore(state => state.authState);
  const validateApiKey = usePopupStore(state => state.validateApiKey);
  const getCreditsBalance = usePopupStore(state => state.getCreditsBalance);
  const logout = usePopupStore(state => state.logout);
  const loading = usePopupStore(state => state.loading);
  
  // Local state
  const [apiKey, setApiKey] = useState('');
  
  // Get credits when component mounts
  useEffect(() => {
    if (authState.isAuthenticated) {
      getCreditsBalance();
    }
  }, [authState.isAuthenticated]);
  
  // Format credits with commas for thousands
  const formatCredits = (credits: number) => {
    return credits.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };
  
  // Handle API key submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await validateApiKey(apiKey);
  };
  
  // Handle logout
  const handleLogout = async () => {
    await logout();
  };
  
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Account</h2>
      
      <StatusMessage />
      
      {authState.isAuthenticated ? (
        // Authenticated view
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Your Account</h3>
            <div className="card-description">
              Logged in as {authState.user?.email}
            </div>
          </div>
          
          <div className="card-content space-y-6">
            <div className="bg-muted rounded-lg p-6 text-center">
              <h3 className="text-xl font-medium mb-1">Credits Balance</h3>
              <div className="text-3xl font-bold text-primary">
                {formatCredits(authState.user?.credits || 0)}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Credits are used for API operations
              </p>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Credit Usage</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-secondary p-4 rounded-md">
                  <div className="text-sm font-medium">Amazon Search</div>
                  <div className="text-2xl font-bold">1 credit</div>
                </div>
                <div className="bg-secondary p-4 rounded-md">
                  <div className="text-sm font-medium">Walmart Search</div>
                  <div className="text-2xl font-bold">1 credit</div>
                </div>
              </div>
              <div className="bg-secondary p-4 rounded-md">
                <div className="text-sm font-medium">Credit Cost Formula</div>
                <div className="text-md mt-1">1 credit per marketplace searched</div>
              </div>
            </div>
            
            <button 
              className="button w-full"
              onClick={() => window.open('https://ext.nanotomlogistics.com/purchase', '_blank')}
            >
              Purchase More Credits
            </button>
            
            <a
              href="https://ext.nanotomlogistics.com/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center text-sm text-primary hover:underline"
            >
              View Account Dashboard
            </a>
          </div>
          
          <div className="card-footer">
            <button 
              className="button outline w-full"
              onClick={handleLogout}
              disabled={loading}
            >
              {loading ? 'Logging out...' : 'Log Out'}
            </button>
          </div>
        </div>
      ) : (
        // Non-authenticated view
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Connect Your Account</h3>
            <div className="card-description">
              Enter your API key to connect to your account
            </div>
          </div>
          
          <div className="card-content">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="apiKey" className="text-sm font-medium">
                  API Key
                </label>
                <input
                  id="apiKey"
                  type="text"
                  className="input"
                  placeholder="eaa_your_api_key_here"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  Your API key can be found in your account dashboard
                </p>
              </div>
              
              <button 
                type="submit" 
                className="button w-full"
                disabled={loading || !apiKey.trim()}
              >
                {loading ? 'Validating...' : 'Connect Account'}
              </button>
            </form>
          </div>
          
          <div className="card-footer flex flex-col space-y-4">
            <div className="w-full border-t pt-4 text-center">
              <p className="text-sm text-muted-foreground mb-2">
                Don't have an account yet?
              </p>
              <button
                className="button outline w-full"
                onClick={() => window.open('https://ext.nanotomlogistics.com/signup', '_blank')}
              >
                Create Account
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">E-commerce Arbitrage Assistant</h3>
          <div className="card-description">
            Find profitable arbitrage opportunities across marketplaces
          </div>
        </div>
        
        <div className="card-content">
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-md">
              <h3 className="font-medium mb-1">How Credits Work</h3>
              <p className="text-sm text-muted-foreground">
                Credits are consumed when you perform operations like searching for price comparisons across marketplaces. Each marketplace search costs 1 credit. You can purchase more credits from your account dashboard.
              </p>
            </div>
            
            <div className="bg-muted p-4 rounded-md">
              <h3 className="font-medium mb-1">Need Help?</h3>
              <p className="text-sm text-muted-foreground">
                Visit our <a 
                  href="https://ext.nanotomlogistics.com/help" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >help center</a> for tutorials and troubleshooting.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountView;
