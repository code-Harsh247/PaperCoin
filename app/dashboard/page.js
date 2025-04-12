'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import UserNameModal from '@/components/UserNameModal';
import { useAuthStore } from '@/store/useAuthStore';
import { Wallet, TrendingUp, Eye, PieChart } from 'lucide-react';
// Import our custom components
import { BalanceCard } from '@/components/DashboardCards';

// Import the new components
import PortfolioPerformance from '@/components/dashboard/PortfolioPerformance';
import TopAssets from '@/components/dashboard/TopAssets';
import MarketOverview from '@/components/dashboard/MarketOverview';
import RecentActivity from '@/components/dashboard/RecentActivity';
import QuickActions from '@/components/dashboard/QuickActions';

export default function Dashboard() {
  const { user, loading, setUser, setLoading, signOut } = useAuthStore();
  const router = useRouter();
  const [isUserNameModalOpen, setIsUserNameModalOpen] = useState(false);
  const [usernameChecked, setUsernameChecked] = useState(false);
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
    console.log("Loading: ", loading, "User: ", user);
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

      {/* Main Content */}
      <div className="flex flex-col flex-1 overflow-hidden">
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
              <QuickActions />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}