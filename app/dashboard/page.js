'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import UserNameModal from '@/components/UserNameModal';
import { useAuthStore } from '@/store/useAuthStore';
import { Wallet, TrendingUp, Eye, PieChart } from 'lucide-react';

// Import our custom components
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/SideBar';
import {
  BalanceCard,
  AssetCard,
  ActivityItem,
  CoinTableRow,
  ActionButton
} from '@/components/DashboardCards';

export default function Dashboard() {
  const { user, loading, setUser, setLoading, signOut } = useAuthStore();
  const router = useRouter();
  const [isUserNameModalOpen, setIsUserNameModalOpen] = useState(false);
  const [usernameChecked, setUsernameChecked] = useState(false);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');

  // Load user on mount
  useEffect(() => {
    const loadUser = async () => {
      try {
        const res = await fetch('/api/auth/me');
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
    if (!loading && !user) {
      router.push('/?authRequired=true');
    }
  }, [loading, user, router]);

  const handleUserNameModalClose = (username) => {
    setIsUserNameModalOpen(false);

    if (username) {
      setUser({
        ...user,
        userName: username
      });
    }
  };

  const toggleSidebar = () => {
    setSidebarOpen(!isSidebarOpen);
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
    <div className="flex h-screen bg-gray-900 overflow-hidden">
      {/* User name modal */}
      <UserNameModal
        isOpen={isUserNameModalOpen}
        onClose={handleUserNameModalClose}
        email={user?.email || ''}
      />

      {/* Desktop Sidebar */}
      <Sidebar
        user={user}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        signOut={signOut}
        router={router}
      />

      {/* Mobile Sidebar */}
      <Sidebar
        user={user}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isMobile={true}
        isOpen={isSidebarOpen}
        onClose={() => setSidebarOpen(false)}
        signOut={signOut}
        router={router}
      />

      {/* Main Content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Top Navigation */}
        <Navbar
          user={user}
          toggleSidebar={toggleSidebar}
          signOut={signOut}
          router={router}
        />

        {/* Main Dashboard Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-white">Welcome back, {user?.userName || user?.username || "User"}</h1>
              <p className="text-gray-400">Here's what's happening with your assets today.</p>
            </div>

            {/* Dashboard Summary Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <BalanceCard
                title="Total Balance"
                amount="$10,000.00"
                changePercentage={2.5}
                changeLabel="from yesterday"
                iconBg="bg-amber-500"
                icon={Wallet}
                ctaText="View Details"
              />

              <BalanceCard
                title="Total Invested"
                amount="$5,230.45"
                changePercentage={3.2}
                changeLabel="this week"
                iconBg="bg-blue-500"
                icon={TrendingUp}
                ctaText="View Details"
              />

              <BalanceCard
                title="Available Funds"
                amount="$4,769.55"
                changePercentage={-1.8}
                changeLabel="this week"
                iconBg="bg-purple-500"
                icon={Wallet}
                showAddFunds={true}
              />
            </div>

            {/* Portfolio Performance & Top Assets */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Portfolio Performance Chart */}
              <div className="bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-700 lg:col-span-2">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-white">Portfolio Performance</h2>
                  <div className="flex space-x-2">
                    <button className="px-3 py-1 text-sm bg-gray-700 text-white rounded-lg">1D</button>
                    <button className="px-3 py-1 text-sm bg-gray-900 text-white rounded-lg">1W</button>
                    <button className="px-3 py-1 text-sm bg-gray-900 text-white rounded-lg">1M</button>
                    <button className="px-3 py-1 text-sm bg-gray-900 text-white rounded-lg">1Y</button>
                  </div>
                </div>

                {/* Placeholder for chart - would integrate with an actual chart library */}
                <div className="h-64 bg-gray-700 bg-opacity-30 rounded-lg flex items-center justify-center">
                  <span className="text-gray-400">Chart Visualization Here</span>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-4">
                  <div className="bg-gray-700 bg-opacity-30 p-3 rounded-lg">
                    <p className="text-gray-400 text-xs">Today</p>
                    <p className="text-green-500 font-medium">+$142.35</p>
                    <p className="text-green-500 text-xs">+2.8%</p>
                  </div>

                  <div className="bg-gray-700 bg-opacity-30 p-3 rounded-lg">
                    <p className="text-gray-400 text-xs">This Week</p>
                    <p className="text-green-500 font-medium">+$267.89</p>
                    <p className="text-green-500 text-xs">+5.3%</p>
                  </div>

                  <div className="bg-gray-700 bg-opacity-30 p-3 rounded-lg">
                    <p className="text-gray-400 text-xs">This Month</p>
                    <p className="text-red-500 font-medium">-$122.45</p>
                    <p className="text-red-500 text-xs">-2.4%</p>
                  </div>
                </div>
              </div>

              {/* Top Assets */}
              <div className="bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-700">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-white">Top Assets</h2>
                  <button className="text-amber-500 text-sm hover:text-amber-400">View All</button>
                </div>

                <div className="space-y-4">
                  <AssetCard
                    name="Bitcoin"
                    symbol="BTC"
                    price="$43,267.89"
                    changePercentage={2.4}
                    amount="0.023 BTC"
                    color="bg-yellow-500"
                  />

                  <AssetCard
                    name="Solana"
                    symbol="SOL"
                    price="$106.78"
                    changePercentage={5.7}
                    amount="2.3 SOL"
                    color="bg-purple-500"
                  />
                  <AssetCard
                    name="Ethereum"
                    symbol="ETH"
                    price="$3,128.45"
                    changePercentage={3.1}
                    amount="0.42 ETH"
                    color="bg-blue-500"
                  />

                  <AssetCard
                    name="Cardano"
                    symbol="ADA"
                    price="$1.45"
                    changePercentage={-1.2}
                    amount="145 ADA"
                    color="bg-blue-400"
                  />
                </div>

                <button className="w-full mt-4 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg transition-colors">
                  Trade Now
                </button>
              </div>
            </div>

            {/* Market Overview */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">Market Overview</h2>
                <div className="flex space-x-2">
                  <button className="px-3 py-1 text-sm bg-gray-700 text-white rounded-lg">All</button>
                  <button className="px-3 py-1 text-sm bg-gray-900 text-white rounded-lg">Gainer</button>
                  <button className="px-3 py-1 text-sm bg-gray-900 text-white rounded-lg">Loser</button>
                </div>
              </div>

              <div className="bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-700">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-900">
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Asset</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Price</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">24h Change</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Market Cap</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      <CoinTableRow
                        name="Bitcoin"
                        symbol="BTC"
                        price="$43,267.89"
                        change={2.4}
                        marketCap="$812.7B"
                        color="bg-yellow-500"
                        onTradeClick={() => console.log('Trade Bitcoin')}
                      />

                      <CoinTableRow
                        name="Ethereum"
                        symbol="ETH"
                        price="$3,128.45"
                        change={3.1}
                        marketCap="$378.5B"
                        color="bg-blue-500"
                        onTradeClick={() => console.log('Trade Ethereum')}
                      />

                      <CoinTableRow
                        name="Cardano"
                        symbol="ADA"
                        price="$1.45"
                        change={-1.2}
                        marketCap="$48.2B"
                        color="bg-blue-400"
                        onTradeClick={() => console.log('Trade Cardano')}
                      />

                      <CoinTableRow
                        name="Solana"
                        symbol="SOL"
                        price="$106.78"
                        change={5.7}
                        marketCap="$42.1B"
                        color="bg-purple-500"
                        onTradeClick={() => console.log('Trade Solana')}
                      />
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Recent Activity & Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Recent Activity */}
              <div className="bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-700 lg:col-span-2">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-white">Recent Activity</h2>
                  <button className="text-amber-500 text-sm hover:text-amber-400">View All</button>
                </div>

                <div className="space-y-4">
                  <ActivityItem
                    title="Bought Bitcoin"
                    amount="+0.003 BTC"
                    amountLabel="$129.46"
                    date="Apr 2, 2025"
                    time="09:23 AM"
                    type="buy"
                  />

                  <ActivityItem
                    title="Sold Ethereum"
                    amount="-0.15 ETH"
                    amountLabel="$469.27"
                    date="Apr 1, 2025"
                    time="04:15 PM"
                    type="sell"
                  />

                  <ActivityItem
                    title="Deposit"
                    amount="+$500.00"
                    amountLabel="Completed"
                    date="Mar 30, 2025"
                    time="11:42 AM"
                    type="deposit"
                    status="completed"
                  />
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-700">
                <h2 className="text-xl font-bold text-white mb-6">Quick Actions</h2>

                <div className="space-y-3">
                  <ActionButton
                    icon={TrendingUp}
                    label="Trade Now"
                    primary={true}
                    onClick={() => console.log('Trade Now')}
                  />

                  <ActionButton
                    icon={Wallet}
                    label="Deposit"
                    onClick={() => console.log('Deposit')}
                  />

                  <ActionButton
                    icon={Eye}
                    label="View Watchlist"
                    onClick={() => console.log('View Watchlist')}
                  />

                  <ActionButton
                    icon={PieChart}
                    label="Portfolio Analytics"
                    onClick={() => console.log('Portfolio Analytics')}
                  />
                </div>

                <div className="mt-6 pt-6 border-t border-gray-700">
                  <div className="bg-gray-900 p-4 rounded-lg">
                    <h3 className="text-white font-medium mb-2">Need Help?</h3>
                    <p className="text-gray-400 text-sm mb-3">Our support team is here for you 24/7.</p>
                    <button className="w-full border border-amber-500 text-amber-500 hover:bg-amber-500 hover:text-black font-medium py-2 rounded-lg transition-colors">
                      Contact Support
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}