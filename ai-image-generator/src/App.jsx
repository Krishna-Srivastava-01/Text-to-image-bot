import React, { useState, useEffect } from 'react';
import { Loader2, Image as ImageIcon, History, Send, Download, Sparkles, Trash2 } from 'lucide-react';
import './index.css';

export default function App() {
  const [prompt, setPrompt] = useState('');
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Initialize history from localStorage safely
  const [history, setHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('hf_prompt_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Keep history synced with localStorage
  useEffect(() => {
    localStorage.setItem('hf_prompt_history', JSON.stringify(history));
  }, [history]);

  // Core API Logic encapsulating the Hugging Face post request
  const generateImage = async (targetPrompt) => {
    if (!targetPrompt.trim()) {
      setError('Please provide a valid, descriptive prompt.');
      return;
    }

    setLoading(true);
    setError(null);
    setImage(null);

    try {
      const response = await fetch(
        '/api/hf/models/stabilityai/stable-diffusion-xl-base-1.0',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_HF_TOKEN}`
          },
          body: JSON.stringify({ inputs: targetPrompt }),
        }
      );

      if (!response.ok) {
        let errorMsg = 'Failed to generate image. Please verify your API token and try again.';
        try {
          // Attempt to parse Hugging Face's error JSON
          const errorData = await response.json();
          if (errorData && errorData.error) {
            errorMsg = `API Error: ${errorData.error}`;
            // Provide a clearer message if the model is just loading
            if (errorData.estimated_time) {
              errorMsg = `Model is loading. Please wait ~${Math.ceil(errorData.estimated_time)} seconds and try again!`;
            }
          } else {
            errorMsg = `API Error: ${response.status} ${response.statusText}`;
          }
        } catch (e) {
          errorMsg = `API Error: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMsg);
      }

      // Convert the binary image response into a renderable Blob URL
      const blob = await response.blob();
      const imageUrl = URL.createObjectURL(blob);
      setImage(imageUrl);

      // Manage prompt history (prevent duplicates and cap at 8 items)
      setHistory(prev => {
        const filtered = prev.filter(p => p !== targetPrompt);
        return [targetPrompt, ...filtered].slice(0, 8);
      });

    } catch (err) {
      setError(err.message || 'An unexpected error occurred during generation.');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    generateImage(prompt);
  };

  const handleDownload = () => {
    if (!image) return;
    const link = document.createElement('a');
    link.href = image;
    link.download = `sdxl-creation-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const clearHistory = () => setHistory([]);

  return (
    <div className="app-container">
      {/* Background visual effects */}
      <div className="bg-glow-1"></div>
      <div className="bg-glow-2"></div>

      <main className="main-content">
        <header className="header">
          <div className="logo">
            <Sparkles className="icon-glow" size={32} />
            <h1>AI Vision Pro</h1>
          </div>
          <p className="subtitle">Powered by Stable Diffusion XL</p>
        </header>

        <div className="grid-layout">
          {/* Left Column: Input Panel */}
          <section className="input-panel glass-panel">
            <form onSubmit={onSubmit} className="prompt-form">
              <label htmlFor="prompt-input" className="input-label">
                What do you want to create?
              </label>
              <textarea
                id="prompt-input"
                className="custom-textarea"
                placeholder="A futuristic cyber city bathed in neon pink and cyan lights, trending on artstation..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={loading}
                rows={4}
              />
              <button 
                type="submit" 
                className={`generate-btn ${loading ? 'loading' : ''}`}
                disabled={loading || !prompt.trim()}
              >
                {loading ? (
                  <>
                    <Loader2 className="spinner" size={20} />
                    Processing...
                  </>
                ) : (
                  <>
                    <Send size={20} />
                    Generate Image
                  </>
                )}
              </button>
            </form>

            {/* Error UI */}
            {error && (
              <div className="error-banner">
                <p>{error}</p>
              </div>
            )}

            {/* Prompt History */}
            <div className="history-section">
              <div className="history-header">
                <h3><History size={18} /> Recent Prompts</h3>
                {history.length > 0 && (
                  <button onClick={clearHistory} className="clear-btn" title="Clear History">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
              {history.length === 0 ? (
                <p className="empty-history">No history yet. Start generating!</p>
              ) : (
                <ul className="history-list">
                  {history.map((histPrompt, index) => (
                    <li 
                      key={index}
                      className="history-item"
                      onClick={() => {
                        setPrompt(histPrompt);
                      }}
                    >
                      <span className="history-text">{histPrompt}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {/* Right Column: Image Output */}
          <section className="output-panel glass-panel">
            <div className="image-container">
              {!image && !loading ? (
                <div className="placeholder-state">
                  <ImageIcon size={48} className="placeholder-icon" />
                  <p>Your masterpiece will appear here</p>
                </div>
              ) : loading ? (
                <div className="loading-state">
                  <div className="nexus-loader"></div>
                  <p className="loading-text">Synthesizing pixels...</p>
                </div>
              ) : (
                <div className="image-result-wrapper">
                  <img src={image} alt={prompt} className="generated-image" />
                  <button onClick={handleDownload} className="download-btn group">
                    <Download size={20} className="group-hover:animate-bounce" />
                    <span>Download HD</span>
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
