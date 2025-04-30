// src/popup/views/AccountView.tsx - Account view component

import React, { useState, useEffect } from 'react';
import { usePopupStore } from '../state/store';
import StatusMessage from '../components/StatusMessage';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LogOut, Key, CreditCard, ExternalLink } from 'lucide-react';

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
        <Card>
          <CardHeader>
            <CardTitle>Your Account</CardTitle>
            <CardDescription>
              Logged in as {authState.user?.email}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
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
                <div className="bg-secondary/40 p-4 rounded-md">
                  <div className="text-sm font-medium">Search Operation</div>
                  <div className="text-2xl font-bold">5 credits</div>
                </div>
                <div className="bg-secondary/40 p-4 rounded-md">
                  <div className="text-sm font-medium">Price Check</div>
                  <div className="text-2xl font-bold">2 credits</div>
                </div>
              </div>
            </div>
            
            <Button 
              className="w-full"
              onClick={() => window.open('https://ext.nanotomlogistics.com/purchase', '_blank')}
            >
              <CreditCard className="mr-2 h-4 w-4" /> Purchase More Credits
            </Button>
            
            <a
              href="https://ext.nanotomlogistics.com/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center text-sm text-primary hover:underline"
            >
              <ExternalLink className="mr-1 h-3 w-3" /> View Account Dashboard
            </a>
          </CardContent>
          
          <CardFooter>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={handleLogout}
              disabled={loading}
            >
              <LogOut className="mr-2 h-4 w-4" /> 
              {loading ? 'Logging out...' : 'Log Out'}
            </Button>
          </CardFooter>
        </Card>
      ) : (
        // Non-authenticated view
        <Card>
          <CardHeader>
            <CardTitle>Connect Your Account</CardTitle>
            <CardDescription>
              Enter your API key to connect to your account
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="apiKey" className="text-sm font-medium">
                  API Key
                </label>
                <Input
                  id="apiKey"
                  type="text"
                  placeholder="eaa_your_api_key_here"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  Your API key can be found in your account dashboard
                </p>
              </div>
              
              <Button 
                type="submit" 
                className="w-full"
                disabled={loading || !apiKey.trim()}
              >
                <Key className="mr-2 h-4 w-4" />
                {loading ? 'Validating...' : 'Connect Account'}
              </Button>
            </form>
          </CardContent>
          
          <CardFooter className="flex flex-col space-y-4">
            <div className="w-full border-t pt-4 text-center">
              <p className="text-sm text-muted-foreground mb-2">
                Don't have an account yet?
              </p>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => window.open('https://ext.nanotomlogistics.com/signup', '_blank')}
              >
                <ExternalLink className="mr-2 h-4 w-4" /> Create Account
              </Button>
            </div>
          </CardFooter>
        </Card>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle>E-commerce Arbitrage Assistant</CardTitle>
          <CardDescription>
            Find profitable arbitrage opportunities across marketplaces
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-md">
              <h3 className="font-medium mb-1">How Credits Work</h3>
              <p className="text-sm text-muted-foreground">
                Credits are consumed when you perform operations like searching for price comparisons across marketplaces. You can purchase more credits from your account dashboard.
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
        </CardContent>
      </Card>
    </div>
  );
};

export default AccountView;
