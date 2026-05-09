import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { api } from '../services/api';
import { INCIDENTS } from '../data/incidents';
import { ApprovalCard, ActivityFeed, Skeleton } from '../components';
import { usePageTitle } from '../hooks/usePageTitle';
import { useToast } from '../components/ToastProvider';
import { usePolling } from '../hooks/usePolling';

export default function AdminDashboard() {
  usePageTitle('Admin Dashboard');
  const [loading, setLoading] = useState(true);
  const [queue, setQueue] = useState([]);
  const [feedItems, setFeedItems] = useState([]);
  const [stats, setStats] = useState({ published: 0, fulfilled: 0, open: 0 });
  const [error, setError] = useState(null);
  
  const showToast = useToast();

  // Fetch data from API
  const loadData = async () => {
    try {
      const allRes = await api.getAllNeedCards();

      if (allRes.error) {
        setError(allRes.error);
        showToast(`Error fetching data: ${allRes.error}`, 'error');
        return;
      }

      if (allRes.data) {
        const pendingCards = allRes.data.filter(
          c => c.pending_approval === true && c.show_pd === false && c.fulfilled === false
        );
        setQueue(pendingCards);
        setStats({
          published: allRes.data.filter(c => c.show_pd).length,
          fulfilled: allRes.data.filter(c => c.fulfilled).length,
          open: allRes.data.filter(c => c.show_pd && !c.fulfilled).length
        });
        setError(null);
      }
      
      setLoading(false);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch data';
      setError(errorMsg);
      showToast(errorMsg, 'error');
    }
  };

  // Use polling hook for auto-refresh
  const pollInterval = parseInt(import.meta.env.VITE_POLL_INTERVAL_MS || '30000');
  usePolling(loadData, pollInterval, true);

  // Initial load
  useEffect(() => {
    loadData();
  }, []);

  const handleApprove = async (card) => {
    const res = await api.submitDecision(card.id, true);
    if (!res.error) {
      setQueue(prev => prev.filter(c => c.id !== card.id));
      setStats(prev => ({ ...prev, published: prev.published + 1, open: prev.open + 1 }));
      showToast(`Published: ${card.item} — volunteers can now see this need.`, 'success');
      
      // Refresh feed silently to get the new log
      api.getActivityFeed().then(f => f.data && setFeedItems(f.data));
    }
  };

  const handleDecline = async (card, reason) => {
    const res = await api.submitDecision(card.id, false);
    if (!res.error) {
      setQueue(prev => prev.filter(c => c.id !== card.id));
      showToast(`Card declined (${reason}) — will not appear on public dashboard.`, 'info');
      
      // Refresh feed silently
      api.getActivityFeed().then(f => f.data && setFeedItems(f.data));
    }
  };

  const getIncidentName = (id) => {
    const inc = INCIDENTS.find(i => i.id === id);
    return inc ? `${inc.name} — ${inc.state}` : id;
  };

  return (
    <div className="relative">
      {/* Top Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-bg-card border border-border rounded p-6 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Pending Approval</h3>
            {queue.length > 0 && (
              <span className="px-2 py-0.5 bg-accent-red text-white text-[10px] font-bold rounded-full animate-pulse">
                Action Required
              </span>
            )}
          </div>
          <p className="text-3xl font-mono font-bold text-text-primary">
            {loading ? <Skeleton width="w-16" height="h-8" /> : queue.length}
          </p>
        </div>
        
        <div className="bg-bg-card border border-border rounded p-6 shadow-sm">
          <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Published Needs</h3>
          <p className="text-3xl font-mono font-bold text-text-primary">
            {loading ? <Skeleton width="w-16" height="h-8" /> : stats.published}
          </p>
        </div>
        
        <div className="bg-bg-card border border-border rounded p-6 shadow-sm">
          <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Fulfilled Today</h3>
          <p className="text-3xl font-mono font-bold text-accent-green">
            {loading ? <Skeleton width="w-16" height="h-8" /> : stats.fulfilled}
          </p>
        </div>
        
        <div className="bg-bg-card border border-border rounded p-6 shadow-sm">
          <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Total Open Needs</h3>
          <p className="text-3xl font-mono font-bold text-accent-blue">
            {loading ? <Skeleton width="w-16" height="h-8" /> : stats.open}
          </p>
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Left Column — Approval Queue (80%) */}
        <div className="lg:w-[80%]">
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-2xl font-bold tracking-tight text-text-primary">Approval Queue</h2>
              <span className="bg-bg-secondary text-text-secondary px-2.5 py-0.5 rounded-full text-xs font-bold font-mono">
                {queue.length}
              </span>
            </div>
            <p className="text-sm text-text-secondary">
              Review AI-generated need cards before publishing to public dashboard.
            </p>
          </div>

          {loading ? (
            <div className="space-y-6">
              <Skeleton height="h-64" />
              <Skeleton height="h-64" />
            </div>
          ) : queue.length === 0 ? (
            <div className="bg-bg-card border border-border rounded-lg p-12 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 bg-accent-green/10 text-accent-green rounded-full flex items-center justify-center mb-4">
                <span className="text-2xl">✓</span>
              </div>
              <h3 className="text-lg font-bold text-text-primary mb-1">All need cards reviewed</h3>
              <p className="text-sm text-text-secondary font-mono">As of {new Date().toLocaleTimeString()}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              <AnimatePresence>
                {queue.map((card, index) => (
                  <ApprovalCard 
                    key={card.id}
                    needCard={card}
                    incidentName={getIncidentName(card.incident_id)}
                    onApprove={handleApprove}
                    onDecline={handleDecline}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Right Column — Activity/Audit Log (20%) */}
        <div className="lg:w-[20%]">
          <div className="mb-6">
            <h2 className="text-2xl font-bold tracking-tight text-text-primary mb-1">System Activity</h2>
            <p className="text-sm text-text-secondary">Unified audit log and live agent actions.</p>
          </div>
          
          {loading ? (
            <Skeleton height="h-[600px]" />
          ) : (
            <ActivityFeed items={feedItems} maxHeight="max-h-[800px]" />
          )}
        </div>

      </div>
    </div>
  );
}
