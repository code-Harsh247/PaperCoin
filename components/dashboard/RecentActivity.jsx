'use client';
import React from 'react';
import { ActivityItem } from '@/components/DashboardCards';

const RecentActivity = () => {
  const activities = [
    {
      title: "Bought Bitcoin",
      amount: "+0.003 BTC",
      amountLabel: "$129.46",
      date: "Apr 2, 2025",
      time: "09:23 AM",
      type: "buy"
    },
    {
      title: "Sold Ethereum",
      amount: "-0.15 ETH",
      amountLabel: "$469.27",
      date: "Apr 1, 2025",
      time: "04:15 PM",
      type: "sell"
    },
    {
      title: "Deposit",
      amount: "+$500.00",
      amountLabel: "Completed",
      date: "Mar 30, 2025",
      time: "11:42 AM",
      type: "deposit",
      status: "completed"
    }
  ];

  const handleViewAll = () => {
    console.log('View all activities');
  };

  return (
    <div className="bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-700 lg:col-span-2">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-white">Recent Activity</h2>
        <button 
          className="text-amber-500 text-sm hover:text-amber-400"
          onClick={handleViewAll}
        >
          View All
        </button>
      </div>
      <div className="space-y-4">
        {activities.map((activity, index) => (
          <ActivityItem
            key={`${activity.type}-${index}`}
            title={activity.title}
            amount={activity.amount}
            amountLabel={activity.amountLabel}
            date={activity.date}
            time={activity.time}
            type={activity.type}
            status={activity.status}
          />
        ))}
      </div>
    </div>
  );
};

export default RecentActivity;