import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../services/api';
import { updateCardInList } from '../utils/api';
import { INCIDENTS } from '../data/incidents';
import { PublicNeedCard, ActivityFeed, TakeUpModal, Skeleton, LivePulse } from '../components';
import { usePageTitle } from '../hooks/usePageTitle';
import { usePolling } from '../hooks/usePolling';
import { useToast } from '../components/ToastProvider';

const filterTabs = [
  { label: 'All', value: 'all' },
  { label: 'Food', value: 'send_food' },
  { label: 'Medicine', value: 'send_meds' },
  { label: 'Water', value: 'send_water' },
  { label: 'Rescue', value: 'send_rescue_team' },
  { label: 'Resources', value: 'reserve_resource' },
];

export default function PublicDashboard() {
  usePageTitle('Public Dashboard');
  const navigate = useNavigate();
  const showToast = useToast();
  
  const [loading, setLoading] = useState(true);
  const [needCards, setNeedCards] = useState([]);
  const [feedItems, setFeedItems] = useState([]);
  const [fulfilledCount, setFulfilledCount] = useState(0);
  const [error, setError] = useState(null);
  
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedCard, setSelectedCard] = useState(null);

  // Fetch data from API
  const fetchData = async () => {
    try {
      const pollInterval = parseInt(import.meta.env.VITE_POLL_INTERVAL_MS || '30000');
      const [allCardsRes] = await Promise.all([
        api.getAllNeedCards(),
        new Promise(resolve => setTimeout(resolve, 100)) // Stagger requests
      ]);

      if (allCardsRes.error) {
        setError(allCardsRes.error);
        showToast(`Error fetching data: ${allCardsRes.error}`, 'error');
        return;
      }

      if (allCardsRes.data) {
        setNeedCards(allCardsRes.data);
        setFulfilledCount(allCardsRes.data.filter(c => c.fulfilled).length);
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
  usePolling(fetchData, pollInterval, true);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, []);

  // Simulate new feed item every 12s
  useEffect(() => {
    if (feedItems.length === 0) return;

    const interval = setInterval(() => {
      setFeedItems(prev => {
        // Pick a random past event to "re-occur" or just duplicate the oldest one to the top
        const randomIndex = Math.floor(Math.random() * prev.length);
        const newItem = { 
          ...prev[randomIndex], 
          id: `sim_${Date.now()}`, 
          timestamp: new Date().toISOString() 
        };
        return [newItem, ...prev].slice(0, 50); // keep max 50
      });
    }, 12000);

    return () => clearInterval(interval);
  }, [feedItems.length]);

  const handleTakeUp = (card) => {
    setSelectedCard(card);
  };

  const handleDonate = (card) => {
    navigate(`/contribute/${card.id}`, { state: { mode: 'donate' } });
  };

  const handleTakeUpSuccess = (updatedCard) => {
    setNeedCards(prev => updateCardInList(prev, updatedCard));
  };

  // Derived state - filter for public dashboard
  const publicCards = needCards.filter(card => card.show_pd === true && card.fulfilled === false);
  const filteredCards = publicCards.filter(card => activeFilter === 'all' || card.tool_name === activeFilter);
  
  // Group by incident
  const groupedCards = filteredCards.reduce((acc, card) => {
    if (!acc[card.incident_id]) acc[card.incident_id] = [];
    acc[card.incident_id].push(card);
    return acc;
  }, {});

  const getIncidentName = (id) => {
    const inc = INCIDENTS.find(i => i.id === id);
    return inc ? `${inc.name} — ${inc.state}` : id;
  };

  return (
    <div className="bg-bg-primary min-h-screen pb-12">
      {/* Top Stats Bar */}
      <div className="bg-bg-card border-b border-border">
        <div className="max-w-[1400px] mx-auto px-6 py-6 grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-4 divide-y md:divide-y-0 md:divide-x divide-border">
          <div className="flex flex-col items-center text-center px-4">
            <span className="text-3xl font-mono font-bold text-text-primary">
              {loading ? <Skeleton width="w-16" height="h-8" /> : needCards.length}
            </span>
            <span className="text-xs uppercase tracking-wider font-bold text-text-secondary mt-1">Open Needs</span>
          </div>
          <div className="flex flex-col items-center text-center px-4 pt-6 md:pt-0">
            <span className="text-3xl font-mono font-bold text-accent-green">
              {loading ? <Skeleton width="w-16" height="h-8" /> : fulfilledCount}
            </span>
            <span className="text-xs uppercase tracking-wider font-bold text-text-secondary mt-1">Needs Fulfilled Today</span>
          </div>
          <div className="flex flex-col items-center text-center px-4 pt-6 md:pt-0">
            <span className="text-3xl font-mono font-bold text-text-primary">{INCIDENTS.length}</span>
            <span className="text-xs uppercase tracking-wider font-bold text-text-secondary mt-1">Active Incidents</span>
          </div>
          <div className="flex flex-col items-center text-center px-4 pt-6 md:pt-0">
            <span className="text-3xl font-mono font-bold text-text-primary">47</span>
            <span className="text-xs uppercase tracking-wider font-bold text-text-secondary mt-1">Volunteers Active</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1400px] mx-auto px-6 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Left Column — Open Needs Feed */}
          <div className="lg:w-[70%]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold tracking-tight text-text-primary">Open Needs</h2>
                <span className="bg-bg-secondary text-text-secondary px-2.5 py-0.5 rounded-full text-xs font-bold font-mono">
                  {filteredCards.length}
                </span>
              </div>
              
              {/* Filters */}
              <div className="flex flex-wrap gap-2">
                {filterTabs.map(tab => (
                  <button
                    key={tab.value}
                    onClick={() => setActiveFilter(tab.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-colors ${
                      activeFilter === tab.value 
                        ? 'bg-text-primary text-white' 
                        : 'bg-bg-card border border-border text-text-secondary hover:bg-border'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="space-y-6">
                <Skeleton height="h-48" />
                <Skeleton height="h-48" />
                <Skeleton height="h-48" />
              </div>
            ) : filteredCards.length === 0 ? (
              <div className="bg-bg-card border border-border rounded-lg p-12 text-center text-text-secondary">
                No open needs right now — all needs are currently fulfilled or under review.
              </div>
            ) : (
              <div className="space-y-8">
                {Object.entries(groupedCards).map(([incidentId, cards]) => (
                  <div key={incidentId}>
                    {/* Section Divider */}
                    <div className="flex items-center gap-4 mb-4">
                      <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider whitespace-nowrap">
                        {getIncidentName(incidentId)}
                      </h3>
                      <div className="h-px bg-border flex-grow"></div>
                    </div>
                    
                    {/* Cards */}
                    <div className="space-y-4">
                      <AnimatePresence mode="popLayout">
                        {cards.map((card, index) => (
                          <motion.div
                            key={card.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.08 }}
                            layout
                          >
                            <PublicNeedCard 
                              needCard={card} 
                              incidentName={getIncidentName(incidentId)}
                              onTakeUp={handleTakeUp}
                              onDonate={handleDonate}
                            />
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column — Live Activity */}
          <div className="lg:w-[30%] flex flex-col">
            <div className="sticky top-6">
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-2xl font-bold tracking-tight text-text-primary">Live Activity</h2>
              </div>
              
              <ActivityFeed items={feedItems} maxHeight="max-h-[600px]" />
            </div>
          </div>
          
        </div>
      </div>

      {/* Take Up Modal */}
      {selectedCard && (
        <TakeUpModal 
          needCard={selectedCard}
          incidentName={getIncidentName(selectedCard.incident_id)}
          onClose={() => setSelectedCard(null)}
          onSuccess={handleTakeUpSuccess}
        />
      )}
    </div>
  );
}
