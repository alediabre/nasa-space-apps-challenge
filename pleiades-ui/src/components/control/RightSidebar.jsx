import React, { useEffect, useState, useMemo, useRef } from 'react';
import '../../styles/control/sidebar.css';
import '../../styles/hide-planets.css';
import ImpactParametersControl from './ImpactParametersControl';
import { getNEOList, getNEOData } from '../../services/nasaApiService';
import eyeIcon from '../../assets/icons/eye_icon_not_selected.png';
import eyeIconSelected from '../../assets/icons/eye_icon_selected.png';
import mercuryIcon from '../../assets/planets_icons/mercury.png';
import venusIcon from '../../assets/planets_icons/venus.png';
import earthIcon from '../../assets/planets_icons/earth.png';
import marsIcon from '../../assets/planets_icons/mars.png';
import jupiterIcon from '../../assets/planets_icons/jupiter.png';
import saturnIcon from '../../assets/planets_icons/saturn.png';
import uranusIcon from '../../assets/planets_icons/uranus.png';
import neptuneIcon from '../../assets/planets_icons/neptune.png';
import neoveoBanner from '../../assets/neoveo_banner.png';
import calendarIcon from '../../assets/icons/calendar_icon.png';
import travelIcon from '../../assets/icons/travel_icon.png';

const OncomingApproaches = ({ title = 'Oncoming approaches', setSelectedApproachNEO = () => {}, remainingMs, setRemainingMs }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 6; // number of day-groups per page
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const neos = await getNEOList();
        if (!mounted) return;

        // collect all close approach entries into a flat list
        const flat = [];
        for (const n of neos) {
          const list = (n.close_approach_data || []).map(ca => ({
            id: `${n.id}-${ca.close_approach_date || ca.close_approach_date_full || ''}`,
            name: n.name,
            date: ca.close_approach_date_full || ca.close_approach_date || null,
            miss_distance_km: ca.miss_distance?.kilometers || null,
            velocity_kps: ca.relative_velocity?.kilometers_per_second || null,
            hazardous: n.is_potentially_hazardous_asteroid || false,
            // keep original NEO object reference so we can use it for approach-only selection
            neo: n,
          }));
          flat.push(...list);
        }

        // parse dates and filter future
        const parsed = flat
          .map(e => ({ ...e, dateObj: e.date ? new Date(e.date) : null }))
          .filter(e => e.dateObj && !Number.isNaN(e.dateObj.getTime()))
          .filter(e => e.dateObj.getTime() >= Date.now())
          .sort((a, b) => a.dateObj - b.dateObj);

        setEvents(parsed);
      } catch (err) {
        console.warn('OncomingApproaches: failed to load neos', err);
        setEvents([]);
      } finally {
        setLoading(false);
      }
    })();
    return () => { mounted = false };
  }, []);

  // apply date filters
  const filteredEvents = events.filter(ev => {
    if (!ev.dateObj) return false;
    if (fromDate) {
      const from = new Date(fromDate.split('/').reverse().join('-'));
      if (ev.dateObj < from) return false;
    }
    if (toDate) {
      const to = new Date(toDate.split('/').reverse().join('-'));
      // include the full day for 'to'
      to.setHours(23,59,59,999);
      if (ev.dateObj > to) return false;
    }
    return true;
  });

  // group by date (YYYY-MM-DD)
  const grouped = filteredEvents.reduce((acc, ev) => {
    const key = ev.dateObj.toISOString().slice(0,10);
    acc[key] = acc[key] || [];
    acc[key].push(ev);
    return acc;
  }, {});

  const keys = Object.keys(grouped).sort();
  const totalPages = Math.max(1, Math.ceil(keys.length / pageSize));
  const pageKeys = keys.slice((page - 1) * pageSize, page * pageSize);

  // selection + countdown state
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [selectedEventTargetMs, setSelectedEventTargetMs] = useState(null);

  // helper to format remaining remainingMsmilliseconds into human readable string
  const formatRemaining = (ms) => {
    if (ms <= 0) return '0s';
    const s = Math.floor(ms / 1000);
    const days = Math.floor(s / 86400);
    const hours = Math.floor((s % 86400) / 3600);
    const minutes = Math.floor((s % 3600) / 60);
    const seconds = s % 60;
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  };

  useEffect(() => {
    let iv;
    if (selectedEventTargetMs) {
      // initialize remaining
      setRemainingMs(Math.max(0, selectedEventTargetMs - Date.now()));
      iv = setInterval(() => {
        setRemainingMs(Math.max(0, selectedEventTargetMs - Date.now()));
      }, 1000);
    } else {
      setRemainingMs(null);
    }
    return () => { if (iv) clearInterval(iv); };
  }, [selectedEventTargetMs]);

  // clear selection when page or filters change
  useEffect(() => { setSelectedEventId(null); setSelectedEventTargetMs(null); setRemainingMs(null); }, [page, fromDate, toDate]);

  return (
    <div className="approaches-calendar">
      <h4 className="calendar-title large-title">{title}</h4>
  {loading ? <div className="muted">Loading approaches...</div> : (
        keys.length === 0 ? <div className="muted">No upcoming approaches found.</div> : (
          <div className="calendar-list">
            {/* Pagination controls and filters */}
            <div className="calendar-controls">
              <div className="calendar-filter">
                <label>From</label>
                <input className="date-input" value={fromDate} onChange={e => { setFromDate(e.target.value); setPage(1); }} placeholder="dd/mm/yyyy" />
              </div>
              <div className="calendar-filter">
                <label>To</label>
                <input className="date-input" value={toDate} onChange={e => { setToDate(e.target.value); setPage(1); }} placeholder="dd/mm/yyyy" />
              </div>
            </div>

            {pageKeys.map(k => (
              <div className="calendar-day" key={k}>
                <div className="calendar-day-header large-text">{new Date(k).toLocaleDateString()}</div>
                <ul>
                  {grouped[k].map(ev => (
                    <li key={ev.id} className={`calendar-item ${ev.hazardous ? 'hazard' : ''} ${selectedEventId === ev.id ? 'selected' : ''}`} onClick={() => {
                      // Use an async IIFE because we need to fetch the full NEO detail (which includes orbital_data)
                      (async () => {
                        if (selectedEventId === ev.id) {
                          // clear only the approach selection state (do not change the main NEO selector)
                          setSelectedEventId(null); setSelectedEventTargetMs(null); setSelectedApproachNEO(null);
                          return;
                        }

                        setSelectedEventId(ev.id);
                        setSelectedEventTargetMs(ev.dateObj.getTime());

                        // Try to fetch the full NEO record (this contains orbital_data needed to draw the orbit)
                        try {
                          const full = await getNEOData(ev.neo?.id || ev.id);
                          setSelectedApproachNEO(full || ev.neo || null);
                        } catch (err) {
                          console.warn('RightSidebar: failed to load full NEO data for approach, falling back to supplied object', err);
+                          // fallback: still set the lightweight object if available (may not draw an orbit)
+                          setSelectedApproachNEO(ev.neo || null);
                        }
                      })();
                    }} style={{ cursor: 'pointer' }}>
                      <div className="ci-left">
                        <div className="ci-name large-text">{ev.name}</div>
                        <div className="ci-meta medium-text">{ev.miss_distance_km ? `${Math.round(ev.miss_distance_km).toLocaleString()} km` : 'N/D'}</div>
                      </div>
                      <div className="ci-right">
                        <div className="ci-time large-text">{ev.dateObj.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            {/* Page navigation */}
            <div className="calendar-pagination">
              <button onClick={() => setPage(1)} disabled={page === 1}>« First</button>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>‹ Prev</button>
              <span className="page-indicator">Page {page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next ›</button>
              <button onClick={() => setPage(totalPages)} disabled={page === totalPages}>Last »</button>
            </div>
            {/* Global countdown below the calendar card */}
            {selectedEventId && selectedEventTargetMs && (
              (() => {
                // find the selected event from filteredEvents
                const sel = filteredEvents.find(e => e.id === selectedEventId);
                if (!sel) return null;
                return (
                  <div className="selected-countdown" style={{ marginTop: 12 }}>
                    <div className="countdown-box">
                      <div>
                        <div className="countdown-main">{formatRemaining(remainingMs)}</div>
                        <div className="countdown-sub">until {sel.name} ({new Date(sel.dateObj).toLocaleString()})</div>
                      </div>
                    </div>
                  </div>
                );
              })()
            )}
          </div>
        )
      )}
    </div>
  )
}

const MetricCard = ({ title, value, description }) => (
  <div className="metric-card">
    <h4>{title}</h4>
    <div className="metric-value-container">
      <h3 className="value-large">{value}</h3>
    </div>
    <p>{description}</p>
  </div>
);

// Enhanced MetricCard with color-coding based on relative values
const EnhancedMetricCard = ({ title, value, description, numericValue, minValue, maxValue, unit = '' }) => {
  // Calculate color using green-yellow-red gradient based on relative position
  const getColorFromValue = (val, min, max) => {
    if (min === max || val === null || val === undefined) return '#888'; // Gray for no data
    
    const normalized = Math.max(0, Math.min(1, (val - min) / (max - min)));
    
    // Create moderately stronger gradient: Green (0) → Yellow (0.5) → Red (1)
    let hue, saturation, lightness;
    
    if (normalized <= 0.5) {
      // Green to Yellow: Hue from 120° (green) to 60° (yellow)
      hue = 120 - (normalized * 2) * 60; // 120° to 60°
      saturation = 50 + (normalized * 2) * 20; // 50% to 70% (moderately stronger)
      lightness = 65 + (normalized * 2) * 5; // 65% to 70% (slightly less light)
    } else {
      // Yellow to Red: Hue from 60° (yellow) to 0° (red)
      const redNormalized = (normalized - 0.5) * 2; // 0 to 1 in the red range
      hue = 60 - (redNormalized * 60); // 60° to 0°
      saturation = 70 + (redNormalized * 15); // 70% to 85% (stronger but not too much)
      lightness = 70 - (redNormalized * 15); // 70% to 55% (more visible)
    }
    
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  };

  const textColor = getColorFromValue(numericValue, minValue, maxValue);

  return (
    <div className="metric-card" style={{ marginBottom: 16 }}>
      <h3 style={{ 
        fontSize: 18, 
        fontWeight: 700, 
        color: '#ffffff', 
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
      }}>
        {title}
      </h3>
      <div className="metric-value-container">
        <h2 style={{ 
          fontSize: 24, 
          fontWeight: 800, 
          color: textColor,
          marginBottom: 8,
          lineHeight: 1.2
        }}>
          {value}
        </h2>
      </div>
      <p style={{ 
        color: '#cccccc', 
        fontSize: 13, 
        marginBottom: 0,
        lineHeight: 1.4
      }}>
        {description}
      </p>
    </div>
  );
};

const NextApproaches = ({ setSelectedApproachNEO = () => {} }) => {
  const [nextApproach, setNextApproach] = useState(null);
  const [nextDangerous, setNextDangerous] = useState(null);
  const [loading, setLoading] = useState(true);
  const [countdowns, setCountdowns] = useState({ next: '', dangerous: '' });
  const [selectedApproach, setSelectedApproach] = useState(null); // Track which approach is selected

  // Function to calculate countdown
  const calculateCountdown = (targetDate) => {
    if (!targetDate) return '';
    
    const now = new Date();
    const target = new Date(targetDate);
    const diff = target.getTime() - now.getTime();
    
    if (diff <= 0) return 'Approaching now';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const neos = await getNEOList();
        if (!mounted) return;

        // collect all close approach entries into a flat list
        const flat = [];
        for (const n of neos) {
          const list = (n.close_approach_data || []).map(ca => ({
            id: `${n.id}-${ca.close_approach_date || ca.close_approach_date_full || ''}`,
            name: n.name,
            date: ca.close_approach_date_full || ca.close_approach_date || null,
            miss_distance_km: ca.miss_distance?.kilometers || null,
            velocity_kps: ca.relative_velocity?.kilometers_per_second || null,
            hazardous: n.is_potentially_hazardous_asteroid || false,
            neo: n,
          }));
          flat.push(...list);
        }

        // parse dates and filter future
        const parsed = flat
          .map(e => ({ ...e, dateObj: e.date ? new Date(e.date) : null }))
          .filter(e => e.dateObj && !Number.isNaN(e.dateObj.getTime()))
          .filter(e => e.dateObj.getTime() >= Date.now())
          .sort((a, b) => a.dateObj - b.dateObj);

        // Find next approach (first in sorted list)
        const next = parsed.length > 0 ? parsed[0] : null;
        setNextApproach(next);

        // Find next dangerous approach
        const nextDanger = parsed.find(e => e.hazardous) || null;
        setNextDangerous(nextDanger);
      } catch (err) {
        console.warn('NextApproaches: failed to load neos', err);
        setNextApproach(null);
        setNextDangerous(null);
      } finally {
        setLoading(false);
      }
    })();
    return () => { mounted = false };
  }, []);

  // Update countdowns every minute
  useEffect(() => {
    const updateCountdowns = () => {
      setCountdowns({
        next: calculateCountdown(nextApproach?.date),
        dangerous: calculateCountdown(nextDangerous?.date)
      });
    };

    updateCountdowns();
    const interval = setInterval(updateCountdowns, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [nextApproach, nextDangerous]);

  const handleApproachClick = async (approach, approachType) => {
    if (!approach) return;
    
    // Check if this approach is already selected
    const isCurrentlySelected = selectedApproach?.id === approach.id;
    
    if (isCurrentlySelected) {
      // Deselect: hide orbit and clear selection
      setSelectedApproach(null);
      setSelectedApproachNEO(null);
    } else {
      // Select: show orbit and set selection
      setSelectedApproach({ ...approach, type: approachType });
      try {
        const full = await getNEOData(approach.neo?.id || approach.id);
        setSelectedApproachNEO(full || approach.neo || null);
      } catch (err) {
        console.warn('NextApproaches: failed to load full NEO data', err);
        setSelectedApproachNEO(approach.neo || null);
      }
    }
  };

  if (loading) {
    return (
      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 12,
        padding: 16,
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
          <img src={calendarIcon} alt="Calendar" style={{ width: 28, height: 28, marginRight: 12 }} />
          <span style={{ color: '#ffffff', fontWeight: 600, fontSize: 22 }}>Next Approaches</span>
        </div>
        <div style={{ color: '#888', fontSize: 16 }}>Loading approaches...</div>
      </div>
    );
  }

  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.05)',
      borderRadius: 12,
      padding: 16,
      border: '1px solid rgba(255, 255, 255, 0.1)'
    }}>
      <h4 className="calendar-title large-title">Next Approaches</h4>
      
      {/* Next Close Approach */}
      <div 
        onClick={() => handleApproachClick(nextApproach, 'close')}
        style={{ 
          background: selectedApproach?.id === nextApproach?.id 
            ? 'rgba(144, 238, 144, 0.25)' 
            : 'rgba(144, 238, 144, 0.1)',
          border: selectedApproach?.id === nextApproach?.id 
            ? '2px solid rgba(144, 238, 144, 0.6)' 
            : '1px solid rgba(144, 238, 144, 0.3)',
          borderRadius: 8,
          padding: 16,
          marginBottom: 16,
          cursor: nextApproach ? 'pointer' : 'default',
          transition: 'all 0.2s ease',
          transform: selectedApproach?.id === nextApproach?.id ? 'scale(0.98)' : 'scale(1)'
        }}
      >
        <div style={{ color: '#90EE90', fontSize: 16, fontWeight: 600, textTransform: 'uppercase', marginBottom: 10 }}>
          Next Close Approach
        </div>
        {nextApproach ? (
          <>
            <div style={{ color: '#ffffff', fontWeight: 700, fontSize: 28, marginBottom: 8 }}>
              {countdowns.next}
            </div>
            <div style={{ color: '#cccccc', fontSize: 16 }}>
              {nextApproach.name}
            </div>
          </>
        ) : (
          <div style={{ color: '#888', fontSize: 16 }}>No upcoming approaches</div>
        )}
      </div>

      {/* Next Dangerous Approach */}
      <div 
        onClick={() => handleApproachClick(nextDangerous, 'dangerous')}
        style={{ 
          background: selectedApproach?.id === nextDangerous?.id 
            ? 'rgba(255, 99, 99, 0.25)' 
            : 'rgba(255, 99, 99, 0.1)',
          border: selectedApproach?.id === nextDangerous?.id 
            ? '2px solid rgba(255, 99, 99, 0.6)' 
            : '1px solid rgba(255, 99, 99, 0.3)',
          borderRadius: 8,
          padding: 16,
          cursor: nextDangerous ? 'pointer' : 'default',
          transition: 'all 0.2s ease',
          transform: selectedApproach?.id === nextDangerous?.id ? 'scale(0.98)' : 'scale(1)'
        }}
      >
        <div style={{ color: '#ff6363', fontSize: 16, fontWeight: 600, textTransform: 'uppercase', marginBottom: 10 }}>
          Next Dangerous Approach
        </div>
        {nextDangerous ? (
          <>
            <div style={{ color: '#ffffff', fontWeight: 700, fontSize: 28, marginBottom: 8 }}>
              {countdowns.dangerous}
            </div>
            <div style={{ color: '#cccccc', fontSize: 16 }}>
              {nextDangerous.name}
            </div>
          </>
        ) : (
          <div style={{ color: '#888', fontSize: 16 }}>No dangerous approaches</div>
        )}
      </div>
    </div>
  );
};

const HidePlanets = ({ hiddenBodies, toggleHiddenBody }) => {
  const planets = [
    { id: 'mercury', name: 'Mercury', icon: mercuryIcon },
    { id: 'venus', name: 'Venus', icon: venusIcon },
    { id: 'earth', name: 'Earth', icon: earthIcon },
    { id: 'mars', name: 'Mars', icon: marsIcon },
    { id: 'jupiter', name: 'Jupiter', icon: jupiterIcon },
    { id: 'saturn', name: 'Saturn', icon: saturnIcon },
    { id: 'uranus', name: 'Uranus', icon: uranusIcon },
    { id: 'neptune', name: 'Neptune', icon: neptuneIcon }
  ];

  return (
    <div className="hide-planets-panel">
      <h4 className="calendar-title large-title">Hide planets</h4>
      <div className="planet-cards-grid">
        {planets.map(planet => (
          <div
            key={planet.id}
            className={`planet-card ${hiddenBodies?.has(planet.id) ? 'hidden' : ''}`}
            onClick={() => toggleHiddenBody(planet.id)}
            title={`${hiddenBodies?.has(planet.id) ? 'Show' : 'Hide'} ${planet.name}`}
          >
            <div className="planet-card-image">
              <img src={planet.icon} alt={planet.name} className="planet-icon" />
            </div>
            <div className="planet-card-name">{planet.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function RightSidebar({ selectedNEO, selectedApproachNEO, setSelectedApproachNEO, impactAngle, impactVelocity, impactLocation, activePanel, setActivePanel, setImpactAngle, setImpactVelocity, setVelocityRange, setImpactLocation, windowSize, hiddenBodies, toggleHiddenBody, setDate, setIsPaused, date, isPaused, travelState, handleTravelToggle, remainingMs, setRemainingMs, handleTravelToPlace }) {
  const [activeCard, setActiveCard] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const [impactEnergy, setImpactEnergy] = useState({ title: 'Impact Energy', value: 'Select an NEO', description: '' });
  const [computedMetrics, setComputedMetrics] = useState([]);
  const [enhancedMetrics, setEnhancedMetrics] = useState([]);
  const [neoPool, setNeoPool] = useState([]);
  const [neoRanges, setNeoRanges] = useState({
    energy: { min: 0, max: 0 },
    mass: { min: 0, max: 0 },
    tnt: { min: 0, max: 0 },
    damageRadius: { min: 0, max: 0 },
    craterDiameter: { min: 0, max: 0 }
  });

  const [chatText, setChatText] = useState("I can help you to adopt the best approach to mitigate the threat of the selected asteroid. Ask me your doubts!");
  const inputRef = useRef(null);

  // Load all NEOs on component mount to establish proper ranges for color-coding
  useEffect(() => {
    const loadAllNEOs = async () => {
      try {
        const neos = await getNEOList();
        setNeoPool(neos || []);
      } catch (err) {
        console.warn('Failed to load NEO pool for color-coding:', err);
        setNeoPool([]);
      }
    };

    loadAllNEOs();
  }, []);

  useEffect(() => {
    if (!selectedNEO) {
      setImpactEnergy({ title: 'Impact Energy', value: 'Select an NEO', description: '' });
      setComputedMetrics([]);
      return;
    }

    const calculate = () => {
      const diameterMeters = selectedNEO?.estimated_diameter?.meters;
      if (!diameterMeters?.estimated_diameter_min || !diameterMeters?.estimated_diameter_max) {
        setImpactEnergy({ title: 'Impact Energy', value: 'Error', description: 'Diameter not available' });
        setComputedMetrics([]);
        return;
      }

      const diameter = (diameterMeters.estimated_diameter_min + diameterMeters.estimated_diameter_max) / 2;
      const radiusMeters = diameter / 2;
      const volume = (4 / 3) * Math.PI * Math.pow(radiusMeters, 3);
      const density = 3000;
      const mass = volume * density;
      const energyJ = 0.5 * mass * Math.pow(impactVelocity, 2);
      const energyMegatons = energyJ / 4.184e15;

  setImpactEnergy({ title: 'Impact Energy', value: `${energyJ.toExponential(3)} J`, description: `~${energyMegatons.toFixed(3)} Megatons` });

      const tntKilotons = energyMegatons * 1000;
      const moderateDamageRadiusKm = 4.6 * Math.pow(tntKilotons, 1 / 3);
      const craterDiameterKm = 0.1 * Math.pow(Math.max(energyMegatons, 1e-6), 1 / 3);

      setComputedMetrics([
        { title: 'Estimated mass', value: `${mass.toExponential(3)} kg`, description: `Density used: ${density} kg/m³, diameter ≈ ${diameter.toFixed(1)} m` },
        { title: 'TNT equivalent', value: `${tntKilotons.toFixed(0)} kt`, description: `~${energyMegatons.toFixed(3)} Megatons` },
        { title: 'Moderate damage radius', value: `${moderateDamageRadiusKm.toFixed(1)} km`, description: 'Estimated radius (heuristic)' },
        { title: 'Estimated crater diameter', value: `${craterDiameterKm.toFixed(2)} km`, description: 'Heuristic estimate based on energy' }
      ]);

      // Create enhanced metrics with numeric values for color-coding
      setEnhancedMetrics([
        { 
          title: 'Impact Energy', 
          value: `${energyJ.toExponential(2)} J`, 
          description: `~${energyMegatons.toFixed(3)} Megatons`,
          numericValue: energyJ
        },
        { 
          title: 'Estimated Mass', 
          value: `${mass.toExponential(2)} kg`, 
          description: `Density: ${density} kg/m³, Ø ${diameter.toFixed(1)} m`,
          numericValue: mass
        },
        { 
          title: 'TNT Equivalent', 
          value: `${tntKilotons.toFixed(0)} kt`, 
          description: `${energyMegatons.toFixed(3)} Megatons`,
          numericValue: tntKilotons
        },
        { 
          title: 'Damage Radius', 
          value: `${moderateDamageRadiusKm.toFixed(1)} km`, 
          description: 'Moderate damage estimate',
          numericValue: moderateDamageRadiusKm
        },
        { 
          title: 'Crater Diameter', 
          value: `${craterDiameterKm.toFixed(2)} km`, 
          description: 'Heuristic estimate',
          numericValue: craterDiameterKm
        }
      ]);
    };

    calculate();
  }, [selectedNEO, impactVelocity]);

  // Compute ranges from all NEOs for color-coding
  useEffect(() => {
    if (neoPool.length === 0) return;

    // Use a standard reference velocity for range computation to ensure proper scaling
    const referenceVelocity = 20000; // 20 km/s - typical asteroid impact velocity

    const calculations = neoPool.map(neo => {
      const diameterMeters = neo?.estimated_diameter?.meters;
      if (!diameterMeters?.estimated_diameter_min || !diameterMeters?.estimated_diameter_max) {
        return null;
      }

      const diameter = (diameterMeters.estimated_diameter_min + diameterMeters.estimated_diameter_max) / 2;
      const radiusMeters = diameter / 2;
      const volume = (4 / 3) * Math.PI * Math.pow(radiusMeters, 3);
      const density = 3000;
      const mass = volume * density;
      
      // Use reference velocity for range calculation to get proper min/max spread
      const energyJ = 0.5 * mass * Math.pow(referenceVelocity, 2);
      const energyMegatons = energyJ / 4.184e15;
      const tntKilotons = energyMegatons * 1000;
      const moderateDamageRadiusKm = 4.6 * Math.pow(tntKilotons, 1 / 3);
      const craterDiameterKm = 0.1 * Math.pow(Math.max(energyMegatons, 1e-6), 1 / 3);

      return {
        energy: energyJ,
        mass: mass,
        tnt: tntKilotons,
        damageRadius: moderateDamageRadiusKm,
        craterDiameter: craterDiameterKm
      };
    }).filter(calc => calc !== null);

    if (calculations.length > 0) {
      const energies = calculations.map(c => c.energy);
      const masses = calculations.map(c => c.mass);
      const tnts = calculations.map(c => c.tnt);
      const damageRadii = calculations.map(c => c.damageRadius);
      const craterDiameters = calculations.map(c => c.craterDiameter);

      setNeoRanges({
        energy: { min: Math.min(...energies), max: Math.max(...energies) },
        mass: { min: Math.min(...masses), max: Math.max(...masses) },
        tnt: { min: Math.min(...tnts), max: Math.max(...tnts) },
        damageRadius: { min: Math.min(...damageRadii), max: Math.max(...damageRadii) },
        craterDiameter: { min: Math.min(...craterDiameters), max: Math.max(...craterDiameters) }
      });
    }
  }, [neoPool]); // Removed impactVelocity dependency since using reference velocity

  /* Comparator: categories, selection, sorting and results */
  const [compLoading, setCompLoading] = useState(false);
  const comparatorCategories = [
    { key: 'hazardous', label: 'Dangerous' },
    { key: 'safe', label: 'Harmless' },
    { key: 'farthest', label: 'Farthest' },
    { key: 'closest', label: 'Closest' },
    { key: 'largest', label: 'Largest' },
    { key: 'smallest', label: 'Smallest' }
  ];

  const [selectedCategories, setSelectedCategories] = useState(new Set());
  const [sortDesc, setSortDesc] = useState(true); // default: high to low
  const [comparatorResults, setComparatorResults] = useState([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setCompLoading(true);
      try {
        const neos = await getNEOList();
        if (!mounted) return;
        setNeoPool(neos);
      } catch (err) {
        console.warn('Comparator: failed to load NEO list', err);
        setNeoPool([]);
      } finally {
        setCompLoading(false);
      }
    })();
    return () => { mounted = false };
  }, []);

  const toggleCategory = (key) => {
    const copy = new Set(selectedCategories);
    const already = copy.has(key);

    // Define contradictory pairs
    const contradictions = {
      hazardous: 'safe',
      safe: 'hazardous',
      farthest: 'closest',
      closest: 'farthest',
      largest: 'smallest',
      smallest: 'largest'
    };

    const conflict = contradictions[key];

    if (already) {
      copy.delete(key);
      setSelectedCategories(copy);
      return;
    }

    // Prevent selecting if it conflicts with an already selected opposite
    if (conflict && copy.has(conflict)) {
      // do nothing - do not allow contradictory selection
      // could show UI hint; for now just return
      console.warn(`Comparator: cannot select ${key} while ${conflict} is selected`);
      return;
    }

    // Prevent selecting more than 3 options
    if (copy.size >= 3) {
      console.warn('Comparator: limit of 3 categories reached');
      return;
    }

    copy.add(key);
    setSelectedCategories(copy);
  };

  const computeComparator = () => {
    if (selectedCategories.size === 0) { setComparatorResults([]); return; }
    // We'll normalize key metrics across the current neoPool to combine them fairly.
    // Metrics used: diameter (meters), miss distance (km), hazardous (boolean as 0/1).
    const pool = neoPool.map(n => {
      const d = n.estimated_diameter?.meters;
      const diameter = d ? ((d.estimated_diameter_min || 0) + (d.estimated_diameter_max || 0)) / 2 : null;
      const nextApproach = (n.close_approach_data && n.close_approach_data[0]) || null;
      const missKm = nextApproach?.miss_distance?.kilometers ? parseFloat(nextApproach.miss_distance.kilometers) : null;
      const hazardous = !!n.is_potentially_hazardous_asteroid;
      return { neo: n, diameter, missKm, hazardous };
    });

    // compute min/max for normalization (ignore nulls)
    const diameters = pool.map(p => p.diameter).filter(v => v !== null && v !== undefined);
    const missitudes = pool.map(p => p.missKm).filter(v => v !== null && v !== undefined);
    const dMin = diameters.length ? Math.min(...diameters) : 0;
    const dMax = diameters.length ? Math.max(...diameters) : 1;
    const mMin = missitudes.length ? Math.min(...missitudes) : 0;
    const mMax = missitudes.length ? Math.max(...missitudes) : 1;

    const normalize = (val, min, max) => {
      if (val === null || val === undefined) return 0;
      if (max === min) return 0.5;
      return (val - min) / (max - min);
    };

    // Build scored items honoring selected categories. We compute a normalized metric per category
    const items = pool.map(p => {
      let score = 0;
      selectedCategories.forEach(cat => {
        switch (cat) {
          case 'hazardous': score += p.hazardous ? 1 : 0; break;
          case 'safe': score += p.hazardous ? 0 : 1; break;
          case 'farthest': score += normalize(p.missKm, mMin, mMax); break; // higher is better
          case 'closest': score += (1 - normalize(p.missKm, mMin, mMax)); break; // smaller miss -> higher
          case 'largest': score += normalize(p.diameter, dMin, dMax); break; // larger is better
          case 'smallest': score += (1 - normalize(p.diameter, dMin, dMax)); break; // smaller is better
          default: break;
        }
      });

      // also keep raw metrics for the compare card
      return { neo: p.neo, score, diameter: p.diameter, missKm: p.missKm, hazardous: p.hazardous };
    });

    items.sort((a, b) => sortDesc ? (b.score - a.score) : (a.score - b.score));
    setComparatorResults(items);
    // clear any existing visual comparison selection when computing new results
    setCompareSelection([]);
  };

  /* Compare card: allow selecting up to 3 NEOs from comparatorResults for side-by-side visual comparison */
  const [compareSelection, setCompareSelection] = useState([]);

  const toggleCompareSelect = (id) => {
    const copy = [...compareSelection];
    const idx = copy.indexOf(id);
    if (idx >= 0) {
      copy.splice(idx, 1);
      setCompareSelection(copy);
      return;
    }
    if (copy.length >= 5) {
      console.warn('Compare: limit of 5 items');
      return;
    }
    copy.push(id);
    setCompareSelection(copy);
  };

  // compute category ranks across the pool for selectedCategories display
  const [categoryRanks, setCategoryRanks] = useState({});

  useEffect(() => {
    console.log('RightSidebar: activePanel changed ->', activePanel);
  }, [activePanel]);

  // React to windowSize changes to allow reflow when moving between displays
  useEffect(() => {
    // placeholder: can be used to recompute derived layout if necessary
  }, [windowSize]);

  useEffect(() => {
    if (!neoPool || neoPool.length === 0) { setCategoryRanks({}); return; }

    const ranks = {};
    const buildRank = (key, sorter) => {
      const arr = neoPool.slice().map(n => {
        const d = n.estimated_diameter?.meters;
        const diameter = d ? ((d.estimated_diameter_min || 0) + (d.estimated_diameter_max || 0)) / 2 : null;
        const nextApproach = (n.close_approach_data && n.close_approach_data[0]) || null;
        const missKm = nextApproach?.miss_distance?.kilometers ? parseFloat(nextApproach.miss_distance.kilometers) : null;
        const hazardous = !!n.is_potentially_hazardous_asteroid;
        return { id: n.id, neo: n, diameter, missKm, hazardous };
      });

      arr.sort(sorter);
      const map = new Map();
      let rank = 1;
      for (const it of arr) {
        // if metric missing, assign dash later, but still provide sequential ranking
        map.set(it.id, rank++);
      }
      ranks[key] = map;
    };

    // define sorters per category
    buildRank('hazardous', (a, b) => {
      if (a.hazardous === b.hazardous) return 0;
      return (a.hazardous ? -1 : 1);
    });
    buildRank('safe', (a, b) => {
      if (a.hazardous === b.hazardous) return 0;
      return (a.hazardous ? 1 : -1);
    });
    buildRank('farthest', (a, b) => (b.missKm || -Infinity) - (a.missKm || -Infinity));
    buildRank('closest', (a, b) => (a.missKm || Infinity) - (b.missKm || Infinity));
    buildRank('largest', (a, b) => (b.diameter || -Infinity) - (a.diameter || -Infinity));
    buildRank('smallest', (a, b) => (a.diameter || Infinity) - (b.diameter || Infinity));

    setCategoryRanks(ranks);
  }, [neoPool]);

  // Clear travel state when approach selection changes
  useEffect(() => {
    if (!selectedApproachNEO && travelState?.isActive) {
      setTravelState(null);
    }
  }, [selectedApproachNEO, travelState]);


  const predefinedResponse = "Based on the asteroid data and technical results, the recommended mitigation strategy is kinetic impact. This involves using high-speed impactors to alter the asteroid's trajectory, with a high confidence score of 1.0. The asteroid's current miss distance is 50,000 km, and after mitigation it is projected to be 62,742 km, indicating a successful deflection.\
    Suggested parameters include a delta-v of approximately 0.0269 m/s, tangential and prograde impact direction, commencing as soon as possible, and using 54 impactors. With 15 years of lead time and sufficient impactor resources, this strategy is highly reliable and effective for mitigating the asteroid threat."

  const handleSend = () => {
    // Limpiamos el input
    const question = inputRef.current.value;
    inputRef.current.value = "";

    // Limpiamos el texto de respuesta antes de escribirlo
    setChatText("");

    let index = 0;
    const chunkSize = 5; // cantidad de letras por “tick”

    const interval = setInterval(() => {
      // Tomamos un trozo de 3 caracteres
      const nextChunk = predefinedResponse.slice(index, index + chunkSize);
      setChatText((prev) => prev + nextChunk);

      index += chunkSize;

      if (index >= predefinedResponse.length) {
        clearInterval(interval);
      }
    }, 30);
  };


  return (
    <div className={`sidebar-container sidebar-right-fixed ${collapsed ? 'collapsed-right' : ''}`}>
      <button
        aria-expanded={!collapsed}
        title={collapsed ? 'Open sidebar' : 'Collapse sidebar'}
        className={`sidebar-toggle sidebar-toggle-right`}
        onClick={() => setCollapsed(c => !c)}
      >
        {collapsed ? '‹' : '›'}
      </button>
      <div className="sidebar-content">
        <div className="sidebar-section">
          <div className="right-card-content" style={{ marginTop: 4 }}>
            {activePanel === 'calculos' ? (
              <div>
                <h2 style={{ 
                  fontSize: 24, 
                  fontWeight: 800, 
                  color: '#ffffff', 
                  marginBottom: 20,
                  textAlign: 'center',
                  textTransform: 'uppercase',
                  letterSpacing: '1px'
                }}>
                  Impact Calculations
                </h2>
                
                <div className="enhanced-calcs-container">
                  {enhancedMetrics.map((metric, i) => (
                    <EnhancedMetricCard 
                      key={`enhanced-${i}`} 
                      {...metric}
                      minValue={
                        i === 0 ? neoRanges.energy.min :
                        i === 1 ? neoRanges.mass.min :
                        i === 2 ? neoRanges.tnt.min :
                        i === 3 ? neoRanges.damageRadius.min :
                        neoRanges.craterDiameter.min
                      }
                      maxValue={
                        i === 0 ? neoRanges.energy.max :
                        i === 1 ? neoRanges.mass.max :
                        i === 2 ? neoRanges.tnt.max :
                        i === 3 ? neoRanges.damageRadius.max :
                        neoRanges.craterDiameter.max
                      }
                    />
                  ))}
                </div>

                {/* Color Scale Indicator */}
                <div style={{ 
                  marginTop: 24, 
                  padding: 16, 
                  background: 'rgba(255, 255, 255, 0.05)', 
                  borderRadius: 8,
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <h4 style={{ 
                    color: '#ffffff', 
                    marginBottom: 12, 
                    fontSize: 14,
                    fontWeight: 600,
                    textAlign: 'center'
                  }}>
                    Relative Scale
                  </h4>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    marginBottom: 8
                  }}>
                    <div style={{ 
                      background: 'linear-gradient(to right, hsl(120, 50%, 65%), hsl(60, 70%, 70%), hsl(0, 85%, 55%))',
                      height: 12,
                      flex: 1,
                      borderRadius: 6,
                      margin: '0 12px'
                    }}></div>
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    fontSize: 11,
                    color: '#aaa'
                  }}>
                    <span>Lowest (Green)</span>
                    <span>Medium (Yellow)</span>
                    <span>Highest (Red)</span>
                  </div>
                </div>
              </div>
            ) : activePanel === 'simulacion' ? (
                <div>
                <h4 style={{ marginTop: 0, color: '#cfeeff' }}>Input Parameters</h4>
                <ImpactParametersControl
                  angle={impactAngle} setAngle={setImpactAngle}
                  velocity={impactVelocity} setVelocity={setImpactVelocity}
                  minVelocity={0} maxVelocity={100000}
                  handleTravelToPlace={handleTravelToPlace}
                />
              </div>
            ) : activePanel === 'approaches' ? (
              <div style={{ marginTop: 4 }}>
                <OncomingApproaches title="Oncoming approaches" setSelectedApproachNEO={setSelectedApproachNEO} remainingMs={remainingMs} setRemainingMs={setRemainingMs}/>
                
                {/* Travel to approach button */}
                {selectedApproachNEO && (
                  <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center' }}>
                    <button
                      onClick={handleTravelToggle}
                      style={{
                        padding: '16px 24px',
                        borderRadius: 50,
                        border: 'none',
                        background: travelState?.isActive 
                          ? 'linear-gradient(135deg, #e3f2fd 0%, #2196f3 50%, #1565c0 100%)'
                          : 'linear-gradient(135deg, #ffffff 0%, #e3f2fd 30%, #2196f3 100%)',
                        color: '#1a1a1a',
                        fontWeight: 700,
                        fontSize: 18,
                        cursor: 'pointer',
                        opacity: travelState?.isActive ? 0.8 : 1,
                        transition: 'all 0.3s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 12,
                        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
                        transform: 'scale(1)',
                        textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                        whiteSpace: 'nowrap',
                        ':hover': {
                          transform: 'scale(1.02)',
                          boxShadow: '0 6px 20px rgba(0, 0, 0, 0.3)'
                        }
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.transform = 'scale(1.02)';
                        e.target.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.3)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.transform = 'scale(1)';
                        e.target.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.2)';
                      }}
                    >
                      <img 
                        src={travelIcon} 
                        alt="Travel" 
                        style={{ 
                          width: 28, 
                          height: 28, 
                          filter: 'brightness(0) saturate(100%) invert(12%) sepia(5%) saturate(0%) hue-rotate(359deg) brightness(95%) contrast(86%)' 
                        }} 
                      />
                      {travelState?.isActive ? 'Return to Present' : 'Travel to Approach'}
                    </button>
                  </div>
                )}
              </div>
            ) : activePanel === 'comparador' ? (
              <div style={{ marginTop: 4 }} className="comparator-panel">
                <h4 className="calendar-title large-title">NEO Comparator</h4>
                <div className="comparator-controls">
                  <div className="comparator-categories">
                    {comparatorCategories.map(cat => (
                      <button key={cat.key} className={`comp-btn ${selectedCategories.has(cat.key) ? 'active' : ''}`} onClick={() => toggleCategory(cat.key)}>{cat.label}</button>
                    ))}
                  </div>

                  <div className="comparator-actions">
                    <label className="sort-label">Sort</label>
                    <button className="sort-toggle" onClick={() => { setSortDesc(s => !s); }}>{sortDesc ? 'High → Low' : 'Low → High'}</button>
                    <button className="compute-btn" onClick={computeComparator} disabled={compLoading}>Compute</button>
                  </div>
                </div>

                <div className="comparator-results">
                  {compLoading ? <div className="muted">Loading NEOs...</div> : (
                    comparatorResults.length === 0 ? <div className="muted">Select one or more categories and press Compute</div> : (
                      <div className="results-list">
                        {comparatorResults.map((it, idx) => (
                          <div key={it.neo.id || idx} className="result-item">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <div className="ri-left">
                                <div className="ri-name">{it.neo.name}</div>
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <div className="ri-bubbles">
                                {Array.from(selectedCategories).map(catKey => {
                                  const map = categoryRanks[catKey];
                                  const pos = map ? map.get(it.neo.id) : null;
                                  return (
                                    <div key={`${it.neo.id}-${catKey}`} className={`cat-bubble cat-${catKey}`} title={`${catKey} #${pos || '-'} }`}>{pos || '-'}</div>
                                  );
                                })}
                              </div>
                              <div className="ri-select">
                                <img
                                  src={compareSelection.includes(it.neo.id) ? eyeIconSelected : eyeIcon}
                                  alt={compareSelection.includes(it.neo.id) ? 'visible' : 'show'}
                                  className="eye-icon"
                                  onClick={() => toggleCompareSelect(it.neo.id)}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  )}
                </div>

                {/* Visual compare card - appears when user selects 2-3 items to compare */}
                {compareSelection.length > 0 && (
                  <div className="compare-card">
                    <h4 className="compare-title">Visual Comparison</h4>
                    {/* If two or more items selected, render grouped barplots for main metrics */}
                    {compareSelection.length >= 2 ? (
                      (() => {
                        const items = compareSelection.map(id => comparatorResults.find(r => r.neo.id === id)).filter(Boolean);
                        // compute max values across selected for normalization
                        const maxDiameter = Math.max(...items.map(i => i.diameter || 0), 1);
                        const maxMiss = Math.max(...items.map(i => i.missKm || 0), 1);
                        return (
                          <div className="compare-table">
                            <div className="ct-header">
                              <div className="ct-cell name">NEO</div>
                              <div className="ct-cell">Diameter (m)</div>
                              <div className="ct-cell">Miss distance (km)</div>
                            </div>

                            <div className="ct-body">
                              {items.map(it => (
                                <div key={it.neo.id} className="ct-row">
                                  <div className="ct-cell name">{it.neo.name}</div>

                                  <div className="ct-cell">
                                    <div className="ct-bar"><div className="ct-fill" style={{ width: `${Math.round(((it.diameter || 0) / maxDiameter) * 100)}%` }} /></div>
                                    <div className="ct-value">{it.diameter ? Math.round(it.diameter) + ' m' : 'n/a'}</div>
                                  </div>

                                  <div className="ct-cell">
                                    <div className="ct-bar"><div className={`ct-fill ${it.hazardous ? 'haz-yes' : 'haz-no'}`} style={{ width: `${Math.round(((it.missKm || 0) / maxMiss) * 100)}%` }} /></div>
                                    <div className="ct-value">{it.missKm ? Math.round(it.missKm).toLocaleString() + ' km' : 'n/a'}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      // single selection: keep the previous compact per-item cards
                      <div className="compare-grid">
                        {compareSelection.map((id) => {
                          const item = comparatorResults.find(r => r.neo.id === id);
                          if (!item) return null;
                          return (
                            <div key={id} className="compare-item">
                              <div className="compare-header">{item.neo.name}</div>
                              <div className="compare-metric">
                                <div className="cm-label">Diameter (m)</div>
                                <div className="cm-bar"><div className="cm-fill" style={{ width: `${(item.diameter ? (Math.min(1, item.diameter / (comparatorResults[0]?.diameter || 1)) * 100) : 0)}%` }} /></div>
                                <div className="cm-value">{item.diameter ? `${Math.round(item.diameter)} m` : 'n/a'}</div>
                              </div>
                              <div className="compare-metric">
                                <div className="cm-label">Miss distance (km)</div>
                                <div className="cm-bar"><div className="cm-fill" style={{ width: `${(item.missKm ? (Math.min(1, item.missKm / (comparatorResults[0]?.missKm || 1)) * 100) : 0)}%` }} /></div>
                                <div className="cm-value">{item.missKm ? `${Math.round(item.missKm).toLocaleString()} km` : 'n/a'}</div>
                              </div>
                              <div className="compare-metric">
                                <div className="cm-label">Hazardous</div>
                                <div className="cm-hazard">{item.hazardous ? 'Yes' : 'No'}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : activePanel === 'prevencion' ? (
              // Mitigation panel - show banner and title only
              <div style={{ marginTop: 4 }}>
                {/* NEOVEO Banner */}
                <div style={{ marginBottom: 16 }}>
                  <img 
                    src={neoveoBanner} 
                    alt="NEOVEO" 
                    style={{ 
                      width: '100%', 
                      height: 'auto',
                      borderRadius: 8,
                      display: 'block'
                    }} 
                  />
                </div>
                {/* Mitigation Title and Description */}
                <div style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: 12,
                  padding: 24,
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  textAlign: 'center'
                }}>
                  <h2 style={{
                    fontSize: 32,
                    fontWeight: 800,
                    color: '#ffffff',
                    marginBottom: 16,
                    textTransform: 'uppercase',
                    letterSpacing: '1px'
                  }}>
                    Mitigation
                  </h2>
                  <p style={{
                    fontSize: 18,
                    color: '#cccccc',
                    margin: 0,
                    lineHeight: 1.6
                  }}>
                    Prevent disasters from happening
                  </p>
                </div>
                <div
                className="chat-container"
                style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  borderRadius: "12px",
                  padding: "25px",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  textAlign: "center",
                  marginTop: "15px"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", marginBottom: "16px" }}>
                  <img 
                    src="" 
                    alt="Chat Icon" 
                    style={{ width: "32px", height: "32px" }} 
                  />
                  <h2 style={{ color: "#fff", margin: 0 }}>NIO AI Assistant</h2>
                </div>
                <div
                  className="chat-output"
                  style={{
                    height: "350px",
                    padding: "15px",
                    borderRadius: "12px",
                    background: "rgba(255,255,255,0.1)",
                    color: "#fff",
                    textAlign: "left",
                    fontStyle: "italic",
                    overflowY: "auto", /* añade scroll vertical si hay mucho texto */
                    boxSizing: "border-box", /* padding incluido en el tamaño */
                    fontSize: "20px"
                  }}
                >
                  {chatText}
                </div>
              </div>

              {/* Input y botón debajo del texto */}
              <div
                className="chat-input-wrapper"
                style={{
                  display: "flex",
                  gap: "10px",
                  width: "400px",
                  margin: "0 auto",
                  marginTop: "15px",
                }}
              >
                <input
                  ref={inputRef}
                  type="text"
                  className="chat-input"
                  placeholder="Write your question..."
                  rows ={2}
                  style={{
                    flex: 1,
                    padding: "10px 15px",
                    borderRadius: "20px",
                    border: "1px solid #ccc",
                    fontSize: "16px",
                    outline: "none",
                    backgroundColor: "#545454",
                    color: "white",
                    fontStyle: "italic",
                    fontWeight: "bold",
                    resize: "auto",
                    overflowY: "auto"
                  }}
                />
                <button
                  className="chat-send-btn"
                  onClick={handleSend}
                  style={{
                    padding: "10px 20px",
                    backgroundColor: "#4a90e2",
                    color: "white",
                    border: "none",
                    borderRadius: "20px",
                    cursor: "pointer",
                    fontWeight: "bold",
                  }}
                >
                  Ask
                </button>
              </div>
              </div>
            ) : (
              // If no activePanel is set, show the Hide Planets panel and calendar
              <div style={{ marginTop: 4 }}>
                {/* NEOVEO Banner */}
                <div style={{ marginBottom: 16 }}>
                  <img 
                    src={neoveoBanner} 
                    alt="NEOVEO" 
                    style={{ 
                      width: '100%', 
                      height: 'auto',
                      borderRadius: 8,
                      display: 'block'
                    }} 
                  />
                </div>
                <HidePlanets hiddenBodies={hiddenBodies} toggleHiddenBody={toggleHiddenBody} />
                <div style={{ marginTop: 16 }}>
                  <NextApproaches setSelectedApproachNEO={setSelectedApproachNEO} />
                </div>
                {/* Travel to approach button for main panel */}
                {selectedApproachNEO && (
                  <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center' }}>
                    <button
                      onClick={handleTravelToggle}
                      style={{
                        padding: '16px 24px',
                        borderRadius: 50,
                        border: 'none',
                        background: travelState?.isActive 
                          ? 'linear-gradient(135deg, #e3f2fd 0%, #2196f3 50%, #1565c0 100%)'
                          : 'linear-gradient(135deg, #ffffff 0%, #e3f2fd 30%, #2196f3 100%)',
                        color: '#1a1a1a',
                        fontWeight: 700,
                        fontSize: 18,
                        cursor: 'pointer',
                        opacity: travelState?.isActive ? 0.8 : 1,
                        transition: 'all 0.3s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 12,
                        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
                        transform: 'scale(1)',
                        textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                        whiteSpace: 'nowrap'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.transform = 'scale(1.02)';
                        e.target.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.3)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.transform = 'scale(1)';
                        e.target.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.2)';
                      }}
                    >
                      <img 
                        src={travelIcon} 
                        alt="Travel" 
                        style={{ 
                          width: 28, 
                          height: 28, 
                          filter: 'brightness(0) saturate(100%) invert(12%) sepia(5%) saturate(0%) hue-rotate(359deg) brightness(95%) contrast(86%)' 
                        }} 
                      />
                      {travelState?.isActive ? 'Return to Present' : 'Travel to Approach'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
