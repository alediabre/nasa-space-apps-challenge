import React, { useState } from 'react';
import { getAllGeocodeByName } from '../../utils/maps/geocoderUtils';
import '../../styles/control/impactParametersControl.css';
import '../../styles/control/neo-selector.css';

const PlaceSelector = ({handleTravelToPlace}) => {
    const [places, setPlaces] = useState([])
    const [showPlacesOptions, setShowPlacesOptions] = useState(false);
    const [selectedPlace, setSelectedPlace] = useState(null);
    const [query, setQuery] = useState(null)

    const handleSelect = (place) => {
        // When user selects a place from the list flies to that place
        setPlaces([])
        setQuery(composeName(place));
        setSelectedPlace(place);
        setShowPlacesOptions(false);
    };

    const handleWrite = async (value) => {
        setSelectedPlace(null)
        try {
            const fetchedPlaces = await getAllGeocodeByName(value)
            setPlaces(fetchedPlaces)
        } catch (err) {
            console.error('PlaceSelector: Error selecting place', err);
        } finally {
            setShowPlacesOptions(true);
        }
    }

    const handleClick = () => {
        setPlaces([])
        setQuery(null)
        if (selectedPlace) {
            handleTravelToPlace(selectedPlace)
        }
    }

    const composeName = (placeObject) => {
        let composedName = placeObject.name
        let country = placeObject.country || null
        let admin1 = placeObject.admin1 || null
        if (country){
            composedName = composedName + ' - ' + country
        }
        if (admin1){
            composedName = composedName + ' - ' + admin1
        }
        return composedName
    }

    return (
        <div className='search-input-container'>
            <div className="search-input-wrapper">
                <input
                    type="text"
                    className="search-input"
                    id="placeSelector"
                    value={query || selectedPlace?.name || ''}
                    onChange={(e) => { setQuery(e.target.value); setShowPlacesOptions(false); 
                        handleWrite(e.target.value)
                    }}
                    placeholder="Search for a place..."
                />
            </div>
            {showPlacesOptions && places && places.length > 0 && (
                <ul className="search-results">
                    {places.map(place => (
                        <li key={place.id} onClick={() => handleSelect(place)}>
                            {composeName(place)}
                        </li>
                    ))}
                </ul>
            )}
            {/* Botón Lanzar debajo de la caja */}
            <div style={{ marginTop: '15px', textAlign: 'center' }}>
                <button
                onClick={() => handleClick()}
                className="launch-btn"
                style={{
                    padding: '10px 20px',
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '20px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: "25px"
                }}
                >
                Launch
                </button>
            </div>
        </div>
    );
};

export default PlaceSelector;