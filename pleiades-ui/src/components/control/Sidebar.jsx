import React, { useState, useCallback } from 'react';
import '../../styles/control/sidebar.css';
import NEOSelector from './NEOSelector';
import asteroidImg from '../../assets/asteroid.png';
import calcIcon from '../../assets/icons/calculos_icon.png';
import simIcon from '../../assets/icons/simulacion_icon.png';
import compIcon from '../../assets/icons/comparador_icon.png';
import prevIcon from '../../assets/icons/prevencion_icon.png';
import acercIcon from '../../assets/icons/acercamientos_icon.png';

const ThreatSummary = ({ level, nextPassage }) => (
    <div className="threat-summary">
        <h2>
            Threat Level: <span className={`threat-level--${(level || '').toLowerCase()}`}>{level}</span>
        </h2>
        <p>Next close approach: {nextPassage}</p>
    </div>
);

const ThreatBar = ({ percentage }) => (
    <div className="threat-bar-container">
        <div className="threat-bar" style={{ width: `${percentage}%` }}></div>
    </div>
);

export default function Sidebar(props) {
    const {
        selectedNEO: propSelectedNEO,
        setSelectedNEO: propSetSelectedNEO,
        impactAngle: propImpactAngle,
        setImpactAngle: propSetImpactAngle,
        impactVelocity: propImpactVelocity,
        setImpactVelocity: propSetImpactVelocity,
        velocityRange: propVelocityRange,
        setVelocityRange: propSetVelocityRange,
        impactLocation: propImpactLocation,
        setImpactLocation: propSetImpactLocation,
        activePanel,
        setActivePanel,
        windowSize,
    } = props || {};

    const [localSelectedNEO, localSetSelectedNEO] = useState(null);
    const [localImpactAngle, localSetImpactAngle] = useState(45);
    const [localImpactVelocity, localSetImpactVelocity] = useState(20000);
    const [localVelocityRange, localSetVelocityRange] = useState({ min: 10000, max: 30000 });
    const [localImpactLocation, localSetImpactLocation] = useState({ lat: 40.7128, lon: -74.0060 });

    const selectedNEO = propSelectedNEO !== undefined ? propSelectedNEO : localSelectedNEO;
    const setSelectedNEO = propSetSelectedNEO !== undefined ? propSetSelectedNEO : localSetSelectedNEO;

    const [collapsed, setCollapsed] = React.useState(false);

    const impactAngle = propImpactAngle !== undefined ? propImpactAngle : localImpactAngle;
    const setImpactAngle = propSetImpactAngle !== undefined ? propSetImpactAngle : localSetImpactAngle;

    const impactVelocity = propImpactVelocity !== undefined ? propImpactVelocity : localImpactVelocity;
    const setImpactVelocity = propSetImpactVelocity !== undefined ? propSetImpactVelocity : localSetImpactVelocity;

    const velocityRange = propVelocityRange !== undefined ? propVelocityRange : localVelocityRange;
    const setVelocityRange = propSetVelocityRange !== undefined ? propSetVelocityRange : localSetVelocityRange;

    const impactLocation = propImpactLocation !== undefined ? propImpactLocation : localImpactLocation;
    const setImpactLocation = propSetImpactLocation !== undefined ? propSetImpactLocation : localSetImpactLocation;

    const handleNEOSelect = useCallback((neo) => {
        setSelectedNEO(neo);
        if (neo?.close_approach_data?.[0]?.relative_velocity?.kilometers_per_second) {
            const baseVelocity = parseFloat(neo.close_approach_data[0].relative_velocity.kilometers_per_second) * 1000;
            setImpactVelocity(baseVelocity);
            setVelocityRange({ min: baseVelocity * 0.5, max: baseVelocity * 1.5 });
        } else {
            const defaultVelocity = 20000;
            setImpactVelocity(defaultVelocity);
            setVelocityRange({ min: 10000, max: 70000 });
        }
    }, [setSelectedNEO, setImpactVelocity, setVelocityRange]);

    const getThreatLevel = (neo) => {
        if (!neo) return { level: 'Low', percentage: 20, reason: 'Not selected' };
        const diameterObj = neo.estimated_diameter?.meters;
        const isHaz = !!neo.is_potentially_hazardous_asteroid;
    if (!diameterObj) return { level: 'Unknown', percentage: 50, reason: 'No diameter' };
        const avgDiameter = (diameterObj.estimated_diameter_min + diameterObj.estimated_diameter_max) / 2;
    const levels = ['Low', 'Moderate', 'Elevated', 'High', 'Extreme'];
        let idx = 0;
        if (avgDiameter > 3000) idx = 4;
        else if (avgDiameter > 1000) idx = 3;
        else if (avgDiameter > 300) idx = 2;
        else if (avgDiameter > 50) idx = 1;
        if (isHaz && idx < levels.length - 1) idx = Math.min(levels.length - 1, idx + 1);
        const level = levels[idx];
    const percentageMap = { 'Low': 15, 'Moderate': 40, 'Elevated': 60, 'High': 80, 'Extreme': 95 };
        return { level, percentage: percentageMap[level], reason: `diam: ${avgDiameter.toFixed(1)}m${isHaz ? ', hazard' : ''}` };
    };

    const threatInfo = getThreatLevel(selectedNEO);

    // React to windowSize changes (trigger re-render and allow CSS vars to take effect)
    React.useEffect(() => {
        // no-op, just to ensure the component updates when windowSize changes
    }, [windowSize]);

    let nextPassage = 'Not available';
    if (selectedNEO?.close_approach_data && Array.isArray(selectedNEO.close_approach_data)) {
        const now = Date.now();
        const parsed = selectedNEO.close_approach_data
            .map((cap) => {
                let d = null;
                const epoch = cap?.epoch_date_close_approach;
                if (epoch !== undefined && epoch !== null && epoch !== '') {
                    const n = Number(epoch);
                    if (!Number.isNaN(n)) {
                        const ms = n < 1e12 ? n * 1000 : n;
                        d = new Date(ms);
                    }
                }
                if (!d || Number.isNaN(d.getTime())) {
                    const cand = cap.close_approach_date_full || cap.close_approach_date || '';
                    if (cand) {
                        const p = new Date(cand);
                        if (!Number.isNaN(p.getTime())) d = p;
                    }
                }
                return { cap, date: d };
            })
            .filter(x => x.date && !Number.isNaN(x.date.getTime()));

        const future = parsed.filter(x => x.date.getTime() >= now).sort((a, b) => a.date.getTime() - b.date.getTime());
        if (future.length > 0) nextPassage = future[0].date.toLocaleDateString();
    }

    return (
        <div className={`sidebar-container ${collapsed ? 'collapsed' : ''}`}>
            <button
                aria-expanded={!collapsed}
                title={collapsed ? 'Open sidebar' : 'Collapse sidebar'}
                className={`sidebar-toggle sidebar-toggle-left`}
                onClick={() => setCollapsed(c => !c)}
            >
                {collapsed ? '›' : '‹'}
            </button>
            <div className="neo-topbar">
                <NEOSelector onSelect={handleNEOSelect} className="neo-top-selector" />
            </div>

            <div className="sidebar-content">
                {/* Threat card immediately under selector as requested */}
                <div className="sidebar-section">
                    <ThreatSummary level={threatInfo.level} nextPassage={nextPassage} />
                    <ThreatBar percentage={threatInfo.percentage} />
                </div>

                <div className="sidebar-section">
                    <h3>Information</h3>
                    {selectedNEO ? (
                        <div className="info-card">
                            <div className="info-avatar" aria-hidden="true" style={{ backgroundImage: `url(${asteroidImg})`, backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 12 }}>
                                    <div>
                                        <div className="info-title">{selectedNEO.name}</div>
                                        <div className="info-sub">{selectedNEO.designation || ''}</div>
                                    </div>
                                        <div className={`hazard-badge ${selectedNEO.is_potentially_hazardous_asteroid ? 'hazard-yes' : 'hazard-no'}`}>
                                        {selectedNEO.is_potentially_hazardous_asteroid ? 'Hazardous' : 'Not hazardous'}
                                    </div>
                                </div>
                                <div style={{ marginTop: 10 }}>
                <div className="info-row small">
                    <div><strong>Diameter</strong></div>
                    <div>{selectedNEO.estimated_diameter?.meters ? ((selectedNEO.estimated_diameter.meters.estimated_diameter_min + selectedNEO.estimated_diameter.meters.estimated_diameter_max) / 2).toFixed(1) + ' m' : 'N/A'}</div>
                </div>
                <div className="info-row small">
                    <div><strong>Velocity</strong></div>
                    <div>{impactVelocity ? impactVelocity.toFixed(0) + ' m/s' : 'N/A'}</div>
                </div>
                                    {/* Siguiente acercamiento removed per request */}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <p>Select an NEO to view details.</p>
                    )}
                </div>

                {/* Stack action cards vertically (CSS will enforce vertical layout) */}
                <div className="sidebar-section action-cards">
                                        <button className={`action-card ${activePanel === 'calculos' ? 'active' : ''}`} onClick={() => { console.log('Sidebar: setActivePanel -> calculos'); setActivePanel(activePanel === 'calculos' ? null : 'calculos'); }}>
                                                <img src={calcIcon} alt="calculos" className="action-icon" />
                                                <div>
                                                    <div className="card-title">Calculations</div>
                                                    <div className="card-sub">Energy, mass & damage estimates</div>
                                                </div>
                                        </button>

                                        <button className={`action-card ${activePanel === 'simulacion' ? 'active' : ''}`} onClick={() => { console.log('Sidebar: setActivePanel -> simulacion'); setActivePanel(activePanel === 'simulacion' ? null : 'simulacion'); }}>
                                                <img src={simIcon} alt="simulacion" className="action-icon" />
                                                <div>
                                                    <div className="card-title">Simulation</div>
                                                    <div className="card-sub">Input parameters & simulator</div>
                                                </div>
                                        </button>

                                        <button className={`action-card ${activePanel === 'comparador' ? 'active' : ''}`} onClick={() => { console.log('Sidebar: setActivePanel -> comparador'); setActivePanel(activePanel === 'comparador' ? null : 'comparador'); }}>
                                                <img src={compIcon} alt="comparador" className="action-icon" />
                                                <div>
                                                    <div className="card-title">Comparator</div>
                                                    <div className="card-sub">Compare NEOs & effects</div>
                                                </div>
                                        </button>

                                        <button className={`action-card ${activePanel === 'prevencion' ? 'active' : ''}`} onClick={() => { console.log('Sidebar: setActivePanel -> prevencion'); setActivePanel(activePanel === 'prevencion' ? null : 'prevencion'); }}>
                                                <img src={prevIcon} alt="prevencion" className="action-icon" />
                                                <div>
                                                    <div className="card-title">Mitigation</div>
                                                    <div className="card-sub">Mitigation strategies</div>
                                                </div>
                                        </button>

                                        <button className={`action-card ${activePanel === 'approaches' ? 'active' : ''}`} onClick={() => { console.log('Sidebar: setActivePanel -> approaches'); setActivePanel(activePanel === 'approaches' ? null : 'approaches'); }}>
                                                <img src={acercIcon} alt="acercamientos" className="action-icon" />
                                                <div>
                                                    <div className="card-title">Approaches</div>
                                                    <div className="card-sub">View upcoming approaches</div>
                                                </div>
                                        </button>
                </div>

                {/* Removed ImpactParametersControl per request (Parámetros de entrada removed from left) */}
            </div>
        </div>
    );
}
