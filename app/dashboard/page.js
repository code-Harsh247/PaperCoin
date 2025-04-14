'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import UserNameModal from '@/components/UserNameModal';
import AddFundsModal from '@/components/dashboard/AddFundsModal';
import { useAuthStore } from '@/store/useAuthStore';
import { Wallet, TrendingUp, Eye, PieChart, CheckCircle, XCircle, Info, AlertCircle } from 'lucide-react';
// Import our custom components
import { BalanceCard } from '@/components/DashboardCards';

// Import the new components
import PortfolioPerformance from '@/components/dashboard/PortfolioPerformance';
import TopAssets from '@/components/dashboard/TopAssets';
import MarketOverview from '@/components/dashboard/MarketOverview';
import RecentActivity from '@/components/dashboard/RecentActivity';
import QuickActions from '@/components/dashboard/QuickActions';

// Simple Toast Component
const Toast = ({ message, type = 'success', onClose }) => {
  const Icon = type === 'success' ? CheckCircle : 
               type === 'error' ? AlertCircle : 
               type === 'info' ? Info : 
               AlertCircle;
  
  const bgColor = type === 'success' ? 'from-green-500/20 to-green-600/20 border-green-500/30' : 
                  type === 'error' ? 'from-red-500/20 to-red-600/20 border-red-500/30' : 
                  type === 'info' ? 'from-blue-500/20 to-blue-600/20 border-blue-500/30' : 
                  'from-amber-500/20 to-amber-600/20 border-amber-500/30';
  
  const iconColor = type === 'success' ? 'text-green-500' : 
                   type === 'error' ? 'text-red-500' : 
                   type === 'info' ? 'text-blue-500' : 
                   'text-amber-500';
              
  return (
    <div className={`fixed top-4 right-4 z-50 bg-gradient-to-r ${bgColor} border rounded-lg p-4 shadow-lg w-72 transform transition-all duration-300 animate-fadeIn`}>
      <div className="flex items-start">
        <div className={`${iconColor} mr-3`}>
          <Icon size={20} />
        </div>
        <div className="flex-1">
          <p className="text-white text-sm">{message}</p>
        </div>
        <button 
          onClick={onClose}
          className="text-gray-400 hover:text-white"
        >
          <XCircle size={16} />
        </button>
      </div>
    </div>
  );
};

// Highlight Banner Component for Dashboard
const HighlightBanner = ({ amount, onClose }) => {
  return (
    <div className="bg-gradient-to-r from-green-500/10 to-green-600/10 border border-green-500/30 rounded-xl p-4 mb-6 animate-fadeIn flex items-center justify-between">
      <div className="flex items-center">
        <div className="bg-green-500/20 p-2 rounded-full mr-3">
          <CheckCircle size={20} className="text-green-500" />
        </div>
        <div>
          <p className="text-white font-medium">Funds Added Successfully</p>
          <p className="text-gray-300 text-sm">
            {typeof amount === 'number' 
              ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount) 
              : amount} has been added to your account
          </p>
        </div>
      </div>
      <button 
        onClick={onClose}
        className="text-gray-400 hover:text-white"
      >
        <XCircle size={16} />
      </button>
    </div>
  );
};

export default function Dashboard() {
  const { user, loading, setUser, setLoading, signOut } = useAuthStore();
  const router = useRouter();
  const [isUserNameModalOpen, setIsUserNameModalOpen] = useState(false);
  const [isAddFundsModalOpen, setIsAddFundsModalOpen] = useState(false);
  const [usernameChecked, setUsernameChecked] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isDataLoading, setIsDataLoading] = useState(true);
  
  // Toast notification
  const [toastConfig, setToastConfig] = useState({ visible: false, message: '', type: 'success' });
  
  // Success highlight banner
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  const [addedAmount, setAddedAmount] = useState(null);
  
  // Show toast notification
  const showToast = (message, type = 'success') => {
    setToastConfig({ visible: true, message, type });
    
    // Auto-hide after 4 seconds
    setTimeout(() => {
      setToastConfig(prev => ({ ...prev, visible: false }));
    }, 1000);
  };

  // Load user on mount
  useEffect(() => {
    const loadUser = async () => {
      try {
        const res = await fetch('/api/auth/me');
        console.log("User response: ", res);
        if (res.ok) {
          const data = await res.json();
          setUser(data);
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error('Failed to load user', err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, [setUser, setLoading]);

  // Fetch username when user is loaded, but only once
  useEffect(() => {
    const getUserName = async () => {
      if (usernameChecked || !user?.email) {
        return;
      }
      try {
        const response = await axios.post('/api/auth/fetchUserName', {
          email: user.email,
        });
        if (response.data?.username) {
          console.log("Fetched UserName: ", response.data.username);
          setUser({
            ...user,
            userName: response.data.username,
          });
        } else {
          console.log("No username found, opening modal");
          setIsUserNameModalOpen(true);
        }
      } catch (error) {
        console.error('Error fetching username:', error);
        setIsUserNameModalOpen(true);
      } finally {
        setUsernameChecked(true);
      }
    };
    if (user && user.email && !usernameChecked) {
      getUserName();
    }
  }, [user, usernameChecked, setUser]);

  // Redirect if not authenticated
  useEffect(() => {
    console.log("Loading: ", loading, "User: ", user);
    if (!loading && !user) {
      router.push('/?authRequired=true');
    }
  }, [loading, user, router]);


  useEffect(() => {
    console.log("User: ", user);
  },[user]);

  // Fetch Users portfolio data
  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setIsDataLoading(true);
        console.log(user)
        const response = await axios.post('/api/weeklySnapshots',
          {
            email: user.email,
          }
        );
        setDashboardData(response.data.dashboard);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError(err.response?.data?.error || 'Failed to fetch dashboard data');
      } finally {
        setIsDataLoading(false);
      }
    };

    if (user?.email) {
      fetchDashboardData();
    }
  }, [user]);

  // Remove auto-hide for success banner
  // Previous auto-hide useEffect has been removed

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  const handleUserNameModalClose = (username) => {
    setIsUserNameModalOpen(false);
    if (username) {
      setUser({
        ...user,
        userName: username
      });
    }
  };

  const handleAddFundsSuccess = (amount) => {
    // Refresh dashboard data after adding funds
    if (user?.email) {
      fetchDashboardData();
    }
    
    // Don't show the toast notification for fund additions
    // The following line has been removed:
    // showToast(`$${amount.toFixed(2)} added successfully to your account!`, 'success');
    
    // Show highlight banner (which will stay until manually closed)
    setAddedAmount(amount);
    setShowSuccessBanner(true);
  };

  const fetchDashboardData = async () => {
    try {
      setIsDataLoading(true);
      const response = await axios.post('/api/weeklySnapshots', {
        email: user.email,
      });
      setDashboardData(response.data.dashboard);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err.response?.data?.error || 'Failed to fetch dashboard data');
    } finally {
      setIsDataLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex h-screen bg-[#111722] overflow-hidden">
      {/* Toast Notification - kept for other notifications */}
      {toastConfig.visible && (
        <Toast 
          message={toastConfig.message} 
          type={toastConfig.type} 
          onClose={() => setToastConfig(prev => ({ ...prev, visible: false }))}
        />
      )}
      
      {/* User name modal */}
      <UserNameModal
        isOpen={isUserNameModalOpen}
        onClose={handleUserNameModalClose}
        email={user?.email || ''}
      />

      {/* Add Funds Modal */}
      <AddFundsModal
        isOpen={isAddFundsModalOpen}
        onClose={() => setIsAddFundsModalOpen(false)}
        onSuccess={handleAddFundsSuccess}
      />

      {/* Main Content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Main Dashboard Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-white">Welcome back, {user?.userName || user?.username || "User"}</h1>
              <p className="text-gray-400">Here's what's happening with your assets today.</p>
            </div>
            
            {/* Success Banner - now stays until manually closed */}
            {showSuccessBanner && (
              <HighlightBanner 
                amount={addedAmount} 
                onClose={() => setShowSuccessBanner(false)} 
              />
            )}

            {/* Dashboard Summary Cards */}
            {isDataLoading ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <div className="bg-gray-800 rounded-lg p-6 animate-pulse h-32"></div>
                <div className="bg-gray-800 rounded-lg p-6 animate-pulse h-32"></div>
                <div className="bg-gray-800 rounded-lg p-6 animate-pulse h-32"></div>
              </div>
            ) : dashboardData ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <BalanceCard
                  title="Total Balance"
                  amount={formatCurrency(dashboardData.total_balance)}
                  changePercentage={parseFloat(dashboardData.weekly_balance_change_pct)}
                  changeLabel="this week"
                  iconBg="bg-amber-500"
                  icon={Wallet}
                  ctaText="View Details"
                  imgUrl="/Images/Balance.png"
                  onCtaClick={() => console.log("View total balance details")}
                />
                <BalanceCard
                  title="Total Invested"
                  amount={formatCurrency(dashboardData.total_invested)}
                  changePercentage={parseFloat(dashboardData.weekly_invested_change_pct)}
                  changeLabel="this week"
                  iconBg="bg-blue-500"
                  icon={TrendingUp}
                  imgUrl="/Images/bitcoins.png"
                  ctaText="View Details"
                  showBitcoinCount={true}
                  bitcoinCount={parseFloat(dashboardData.btc_coins)}
                  onCtaClick={() => console.log("View invested details")}
                />
                
                <BalanceCard
                  title="Available Funds"
                  amount={formatCurrency(dashboardData.available_funds)}
                  changePercentage={parseFloat(dashboardData.weekly_available_change_pct)}
                  changeLabel="this week"
                  iconBg="bg-purple-500"
                  icon={Wallet}
                  showAddFunds={true}
                  onCtaClick={() => setIsAddFundsModalOpen(true)}
                />
              </div>
            ) : (
              <div className="bg-red-800 text-white p-4 rounded-lg mb-8">
                <p>{error || "Failed to load dashboard data. Please try again later."}</p>
              </div>
            )}

            {!isDataLoading && dashboardData && (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                  {/* Portfolio Performance Chart Component */}
                  <PortfolioPerformance />
                  
                  {/* Top Assets Component */}
                  <TopAssets />
                </div>

                {/* Market Overview Component */}
                <MarketOverview />

                {/* Recent Activity & Quick Actions */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Recent Activity Component */}
                  <RecentActivity />
                  
                  {/* Quick Actions Component */}
                  <QuickActions onAddFunds={() => setIsAddFundsModalOpen(true)} />
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}