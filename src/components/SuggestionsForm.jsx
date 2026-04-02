import React, { useEffect, useState } from 'react';
import { createSuggestion, getSuggestionsByUser } from '../api';
import logo from '../assets/logo.png';

const SuggestionsForm = ({ user, onClose, onSuccess }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [mySuggestions, setMySuggestions] = useState([]);
  const [listLoading, setListLoading] = useState(false);

  const resolvedCnic = user?.cnic || user?.CNIC || '';
  const resolvedFirstName = user?.firstName || user?.FirstName || '';
  const resolvedLastName = user?.lastName || user?.LastName || '';
  const resolvedNhcCode = user?.nhcCode || user?.NHC_Code || '';

  const getStatusColor = (status) => {
    if (status === 'Addressed') return '#10b981';
    if (status === 'Read') return '#f59e0b';
    return '#3b82f6';
  };

  const fetchMySuggestions = async () => {
    if (!resolvedCnic) return;
    setListLoading(true);
    try {
      const data = await getSuggestionsByUser(resolvedCnic);
      setMySuggestions(data || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch your suggestions');
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    fetchMySuggestions();
  }, [resolvedCnic]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setError('Please fill in all fields');
      return;
    }

    if (!resolvedCnic || !resolvedNhcCode) {
      setError('Your profile is missing CNIC or NHC code. Please update profile first.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await createSuggestion({
        userCnic: resolvedCnic,
        userName: `${resolvedFirstName} ${resolvedLastName}`.trim(),
        nhcCode: resolvedNhcCode,
        title,
        description
      });

      setSuccess(true);
      setTitle('');
      setDescription('');
      await fetchMySuggestions();
      
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.message || 'Failed to submit suggestion');
    } finally {
      setLoading(false);
    }
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
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '40px 30px',
        width: '100%',
        maxWidth: '720px',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <img src={logo} alt="Logo" style={{ height: '40px', width: 'auto' }} />
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#6b7280'
            }}
          >
            ✕
          </button>
        </div>

        <h1 style={{ margin: '0 0 10px 0', fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>
          Submit Suggestion
        </h1>
        <p style={{ margin: '0 0 30px 0', color: '#666', fontSize: '14px' }}>
          Share your ideas and suggestions with NHC leadership
        </p>

        {/* SUCCESS MESSAGE */}
        {success && (
          <div style={{
            backgroundColor: '#d1fae5',
            border: '2px solid #10b981',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '20px',
            color: '#065f46',
            fontSize: '14px'
          }}>
            ✓ Suggestion submitted successfully!
          </div>
        )}

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

        {/* FORM */}
        <form onSubmit={handleSubmit}>
          {/* TITLE */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: 'bold',
              color: '#1f2937',
              marginBottom: '8px'
            }}>
              Suggestion Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Improve street lighting in Zone A"
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                boxSizing: 'border-box',
                fontFamily: 'inherit'
              }}
              disabled={loading}
            />
          </div>

          {/* DESCRIPTION */}
          <div style={{ marginBottom: '30px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: 'bold',
              color: '#1f2937',
              marginBottom: '8px'
            }}>
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Please provide details about your suggestion..."
              rows="5"
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
                resize: 'vertical'
              }}
              disabled={loading}
            />
          </div>

          {/* BUTTONS */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 1,
                padding: '12px',
                backgroundColor: loading ? '#ccc' : '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Submitting...' : 'Submit Suggestion'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                flex: 1,
                padding: '12px',
                backgroundColor: '#f3f4f6',
                color: '#374151',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              Cancel
            </button>
          </div>
        </form>

        <div style={{ marginTop: '28px', borderTop: '1px solid #e5e7eb', paddingTop: '20px' }}>
          <h2 style={{ margin: '0 0 12px 0', fontSize: '18px', color: '#1f2937' }}>My Suggestions Status</h2>

          {listLoading && (
            <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>Loading your suggestions...</p>
          )}

          {!listLoading && mySuggestions.length === 0 && (
            <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>You have not submitted any suggestions yet.</p>
          )}

          {!listLoading && mySuggestions.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {mySuggestions.map((item) => (
                <div
                  key={item.Id}
                  style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: '10px',
                    padding: '12px',
                    backgroundColor: '#f9fafb'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                    <strong style={{ color: '#1f2937', fontSize: '14px' }}>{item.Title}</strong>
                    <span
                      style={{
                        backgroundColor: getStatusColor(item.Status || 'New'),
                        color: 'white',
                        padding: '3px 10px',
                        borderRadius: '999px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {item.Status || 'New'}
                    </span>
                  </div>
                  <p style={{ margin: '8px 0 6px 0', fontSize: '13px', color: '#4b5563' }}>{item.Description}</p>
                  <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>
                    Submitted: {new Date(item.CreatedDate).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SuggestionsForm;
