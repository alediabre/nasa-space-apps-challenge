// pleiades-protocol-main/pleiades-ui/src/components/control/ImpactParametersControl.jsx

import React, {useState, useRef} from 'react';
import '../../styles/control/impactParametersControl.css';
import PlaceSelector from './PlaceSelector';

const ImpactParametersControl = ({ angle, setAngle, velocity, setVelocity, minVelocity, maxVelocity, handleTravelToPlace }) => {
    
    const [chatText, setChatText] = useState("I can tell you the effects of the impact for the selected asteroid. Write a place, press \"Launch\" and ask me about it");
    const inputRef = useRef(null);

    const predefinedResponse = "An Apophis-like impact in Seville, Spain, would be catastrophic. An asteroid like that would release energy equal to millions of tons of TNT, destroying everything within a wide radius. Shock waves would devastate Seville and nearby towns such as Dos Hermanas and Alcalá de Guadaíra, while intense heat would ignite massive fires reaching rural and natural areas like the Sierra de Líjar. The impact could trigger landslides, alter the terrain, and cause flooding from damaged drainage systems. Dust and debris would contaminate air and water, threatening public health. In the long term, ecosystem destruction and local climate disruption would affect agriculture and wildlife across the region."



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
        <div className="impact-parameters-container">
            <h3>Input Parameters</h3>
            
            {/* Slider para el Ángulo */}
            <div className="slider-control">
                <label htmlFor="angle-slider">
                    Entry Angle: <strong>{angle}°</strong>
                </label>
                <input
                    type="range"
                    id="angle-slider"
                    className="slider"
                    min="0"
                    max="90"
                    value={angle}
                    onChange={(e) => setAngle(Number(e.target.value))}
                />
            </div>

            {/* Slider for Velocity */}
            <div className="slider-control">
                <label htmlFor="velocity-slider">
                    Impact Velocity: <strong>{(velocity / 1000).toFixed(2)} km/s</strong>
                </label>
                <input
                    type="range"
                    id="velocity-slider"
                    className="slider"
                    min={minVelocity}
                    max={maxVelocity}
                    step="100"
                    value={velocity}
                    onChange={(e) => setVelocity(Number(e.target.value))}
                />
            </div>
            <PlaceSelector
                handleTravelToPlace={handleTravelToPlace}
            />
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
    );
};

export default ImpactParametersControl;