import React, { useState, useEffect } from 'react';
import { getSuggestionsByNHC, updateSuggestionStatus } from '../api';
import logo from '../assets/logo.png';

const AllSuggestions = ({ user, onClose }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState(null);

  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        setLoading(true);
        const data = await getSuggestionsByNHC(user.nhcCode);
        setSuggestions(data || []);
      } catch (err) {
        console.error('Error fetching suggestions:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchSuggestions();
  }, [user.nhcCode]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'New':
        return '#3b82f6';
      case 'Read':
        return '#f59e0b';
      case 'Addressed':
        return '#10b981';
      default:
        return '#6b7280';
    }
  };

  const handleStatusChange = async (suggestionId, nextStatus) => {
    if (!nextStatus) return;
    setError('');
    setSavingId(suggestionId);
    try {
      await updateSuggestionStatus(suggestionId, nextStatus, user.nhcCode);
      setSuggestions((prev) =>
        prev.map((item) =>
          item.Id === suggestionId ? { ...item, Status: nextStatus } : item
        )
      );
    } catch (err) {
      setError(err.message || 'Failed to update suggestion status');
    } finally {
      setSavingId(null);
    }
  };

  const renderSuggestionList = () => {
    if (suggestions.length === 0) {
      return (
        <div style={{
          textAlign: 'center',
          padding: '40px 20px',
          color: '#666',
          backgroundColor: '#f9fafb',
          borderRadius: '8px'
        }}>
          <p>No suggestions yet</p>
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {suggestions.map((suggestion) => (
          <div
            key={suggestion.Id}
            style={{
              backgroundColor: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '12px'
            }}>
              <div style={{ flex: 1 }}>
                <h3 style={{
                  margin: '0 0 4px 0',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  color: '#1f2937'
                }}>
                  {suggestion.Title}
                </h3>
                <p style={{
                  margin: 0,
                  fontSize: '14px',
                  color: '#6b7280'
                }}>
                  Submitted by: {suggestion.UserName} (CNIC: {suggestion.UserCNIC})
                </p>
              </div>
              <div style={{
                backgroundColor: getStatusColor(suggestion.Status),
                color: 'white',
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 'bold',
                whiteSpace: 'nowrap',
                marginLeft: '12px'
              }}>
                {suggestion.Status || 'New'}
              </div>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <p style={{
                margin: '0 0 8px 0',
                fontSize: '14px',
                color: '#4b5563',
                lineHeight: '1.5'
              }}>
                {suggestion.Description}
              </p>
            </div>

            <div style={{
              fontSize: '12px',
              color: '#6b7280',
              fontStyle: 'italic'
            }}>
              Submitted on: {new Date(suggestion.CreatedDate).toLocaleDateString()}
            </div>

            <div style={{
              marginTop: '12px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '10px'
            }}>
              <label style={{ fontSize: '13px', color: '#374151', fontWeight: 'bold' }}>
                Update Status:
              </label>
              <select
                value={suggestion.Status || 'New'}
                onChange={(e) => handleStatusChange(suggestion.Id, e.target.value)}
                disabled={savingId === suggestion.Id}
                style={{
                  padding: '6px 10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '13px',
                  minWidth: '130px',
                  backgroundColor: 'white'
                }}
              >
                <option value="New">New</option>
                <option value="Read">Read</option>
                <option value="Addressed">Addressed</option>
              </select>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      zIndex: 1000,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '20px',
      overflowY: 'auto'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '40px 30px',
        width: '100%',
        maxWidth: '700px',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        {/* HEADER */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '30px'
        }}>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <img src={logo} alt="Logo" style={{ height: '50px', width: 'auto', marginBottom: '15px' }} />
            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 'bold', color: '#1f2937' }}>
              All Suggestions
            </h1>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '28px',
              cursor: 'pointer',
              color: '#6b7280'
            }}
          >
            ✕
          </button>
        </div>

        {/* USER INFO */}
        <div style={{
          textAlign: 'center',
          marginBottom: '30px',
          paddingBottom: '20px',
          borderBottom: '2px solid #e5e7eb'
        }}>
          <h2 style={{
            margin: '0 0 10px 0',
            fontSize: '18px',
            fontWeight: 'bold',
            color: '#1f2937'
          }}>
            Suggestions from NHC Members
          </h2>
          <p style={{
            margin: 0,
            fontSize: '14px',
            color: '#666'
          }}>
            Total Suggestions: {suggestions.length}
          </p>
        </div>

        {/* ERROR MESSAGE */}
        {error && (
          <div style={{
            backgroundColor: '#fee2e2',
            border: '2px solid #ef4444',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '20px',
            color: '#991b1b',
            fontSize: '14px'
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* LOADING STATE */}
        {loading && (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: '#666'
          }}>
            <p>Loading suggestions...</p>
          </div>
        )}

        {/* SUGGESTIONS LIST */}
        {!loading && renderSuggestionList()}
      </div>
    </div>
  );
};

export default AllSuggestions;
