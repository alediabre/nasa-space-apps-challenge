// pleiades-protocol-main/pleiades-ui/src/components/control/NEOSelector.jsx

import React, { useState, useEffect, useRef } from 'react';
import { getNEOList, getNEOData } from '../../services/nasaApiService';
import '../../styles/control/neo-selector.css';
import lupaImg from '../../assets/lupa.png';

const NEOSelector = ({ onSelect, className }) => {
    const [neos, setNeos] = useState([]);
    const [selectedNeo, setSelectedNeo] = useState(null);
    const [query, setQuery] = useState('');
    const [isActive, setIsActive] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const selectorRef = useRef(null);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const neoList = await getNEOList();
                if (!mounted) return;
                if (!neoList || neoList.length === 0) {
                    setError('No NEOs received from API. Check your connection.');
                    setIsLoading(false);
                    return;
                }
                console.log(`NEOSelector: loaded ${neoList.length} NEOs successfully`);
                setNeos(neoList);

                // Fetch full details for the first NEO if the list item lacks diameter or velocity
                const first = neoList[0];
                let detailed = first;
                if (!first.estimated_diameter?.meters || !first.close_approach_data?.[0]?.relative_velocity?.kilometers_per_second) {
                    try {
                        detailed = await getNEOData(first.id);
                    } catch (dErr) {
                        console.warn('NEOSelector: could not fetch details for first NEO, using partial data', dErr);
                        detailed = first; // fall back
                    }
                }

                setSelectedNeo(detailed);
                onSelect(detailed);
                setError(null);
            } catch (err) {
                console.error('NEOSelector: Error loading NEOs:', err);
                setError(`Connection error: ${err.message}`);
            } finally {
                if (mounted) setIsLoading(false);
            }
        })();
        return () => { mounted = false; };
    }, [onSelect]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (selectorRef.current && !selectorRef.current.contains(event.target)) {
                setIsActive(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = async (neo) => {
        // When user selects a NEO from the list, attempt to fetch full details
        setIsLoading(true);
        try {
            let detailed = neo;
            try {
                detailed = await getNEOData(neo.id);
            } catch (err) {
                // If detail fetch fails, fall back to the list item but log the error
                console.warn('NEOSelector: getNEOData failed, using list item as fallback', err);
                detailed = neo;
            }

            setSelectedNeo(detailed);
            onSelect(detailed);
            setQuery(detailed.name || neo.name);
            setError(null);
        } catch (err) {
            console.error('NEOSelector: Error selecting NEO', err);
            setError(`Error selecting NEO: ${err.message}`);
        } finally {
            setIsActive(false);
            setIsLoading(false);
        }
    };
    
    // Filtra los resultados si el usuario está escribiendo
    const filteredNeos = query === (selectedNeo?.name || '')
        ? neos
        : neos.filter(neo => neo.name.toLowerCase().includes(query.toLowerCase()));

    if (isLoading) return <div className="neo-selector-loading">Loading NEOs...</div>;
    if (error) return <div className="neo-selector-error">Error: {error}</div>;

    return (
        <div className={`search-bar-container ${className || ''}`} ref={selectorRef}>
            <div className="search-bar-header">
                <img src={lupaImg} alt="Search" className="neo-icon" />
                <h3>NEO Selector</h3>
            </div>
            <div className="search-input-wrapper">
                <input
                    type="text"
                    className="search-input"
                    value={query || selectedNeo?.name || ''}
                    onChange={(e) => { setQuery(e.target.value); setIsActive(true); }}
                    onFocus={() => { setIsActive(true); setQuery(''); }}
                    placeholder="Search for an asteroid..."
                />
            </div>
            {isActive && filteredNeos.length > 0 && (
                <ul className="search-results">
                    {filteredNeos.map(neo => (
                        <li key={neo.id} onClick={() => handleSelect(neo)}>
                            {neo.name}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default NEOSelector;