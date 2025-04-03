'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

import UserNameModal from '@/components/UserNameModal';
import { useAuthStore } from '@/store/useAuthStore';

export default function Dashboard() {
  const { user, loading, setUser, setLoading, signOut } = useAuthStore();
  const router = useRouter();
  const [isUserNameSet, setIsUserNameSet] = useState(true);

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

  // Check if username is set
  useEffect(() => {
    const checkUserName = async () => {
      try {
        const response = await axios.post('/api/auth/checkUser', {
          email: user.email,
        });
        setIsUserNameSet(response.data.isUserNameSet);
      } catch (error) {
        console.error('Error checking username:', error);
      }
    };

    if (user) checkUserName();
  }, [user]);

  const refreshUserStatus = async () => {
    try {
      const response = await axios.post('/api/auth/checkUser', {
        email: user.email,
      });
      setIsUserNameSet(response.data.isUserNameSet);
    } catch (error) {
      console.error('Error refreshing username:', error);
    }
  };

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/?authRequired=true');
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-900">
      <UserNameModal
        isOpen={!isUserNameSet}
        onClose={() => refreshUserStatus()}
        initialMode=''
        email={user.email}
      />
      <header className="bg-black shadow">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <span className="text-2xl font-bold text-white">PaperCoin</span>
          </div>

          <div className="flex items-center space-x-4">
            {/* User profile section */}
            <div className="flex items-center">
              {user.picture && (
                <img
                  src={user.picture}
                  alt={user.name}
                  className="w-10 h-10 rounded-full mr-3"
                />
              )}
              <span className="text-white font-medium mr-2">{user.name}</span>
            </div>

            {/* Logout button */}
            <button
              onClick={()=>{
                signOut();
                router.push('/');}}
              className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold text-white mb-6">Dashboard</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Portfolio Summary Card */}
          <div className="bg-gray-800 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">Portfolio Summary</h2>
            <div className="flex justify-between mb-2">
              <span className="text-gray-400">Total Balance</span>
              <span className="text-white font-bold">$10,000.00</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-400">Invested</span>
              <span className="text-white">$5,230.45</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Available</span>
              <span className="text-white">$4,769.55</span>
            </div>

            <div className="mt-6">
              <button className="bg-amber-500 hover:bg-amber-600 text-black font-bold w-full py-2 rounded-lg transition-colors">
                Add Funds
              </button>
            </div>
          </div>

          {/* Performance Card */}
          <div className="bg-gray-800 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">Performance</h2>
            <div className="flex justify-between mb-2">
              <span className="text-gray-400">Today</span>
              <span className="text-green-500">+$142.35 (2.8%)</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-400">This Week</span>
              <span className="text-green-500">+$267.89 (5.3%)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">This Month</span>
              <span className="text-red-500">-$122.45 (-2.4%)</span>
            </div>

            <div className="mt-6">
              <button className="border border-gray-600 hover:border-gray-500 text-white font-bold w-full py-2 rounded-lg transition-colors">
                View Details
              </button>
            </div>
          </div>

          {/* Quick Actions Card */}
          <div className="bg-gray-800 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">Quick Actions</h2>
            <div className="flex flex-col space-y-3">
              <button className="bg-amber-500 hover:bg-amber-600 text-black font-bold py-2 rounded-lg transition-colors">
                Trade Now
              </button>
              <button className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 rounded-lg transition-colors">
                View Watchlist
              </button>
              <button className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 rounded-lg transition-colors">
                Portfolio Analytics
              </button>
            </div>
          </div>
        </div>

        {/* Market Overview Section */}
        <div className="mt-8">
          <h2 className="text-xl font-bold text-white mb-4">Market Overview</h2>
          <div className="bg-gray-800 rounded-xl p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Sample crypto stats */}
              <div className="p-4 bg-gray-700 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-white font-bold">Bitcoin</span>
                  <span className="text-sm text-green-500">+2.4%</span>
                </div>
                <span className="text-2xl text-white font-bold">$43,267.89</span>
              </div>

              <div className="p-4 bg-gray-700 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-white font-bold">Ethereum</span>
                  <span className="text-sm text-green-500">+3.1%</span>
                </div>
                <span className="text-2xl text-white font-bold">$3,128.45</span>
              </div>

              <div className="p-4 bg-gray-700 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-white font-bold">Cardano</span>
                  <span className="text-sm text-red-500">-1.2%</span>
                </div>
                <span className="text-2xl text-white font-bold">$1.45</span>
              </div>

              <div className="p-4 bg-gray-700 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-white font-bold">Solana</span>
                  <span className="text-sm text-green-500">+5.7%</span>
                </div>
                <span className="text-2xl text-white font-bold">$106.78</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}