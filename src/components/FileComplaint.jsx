import React, { useState } from 'react';
import { submitComplaint } from '../api';

const FileComplaint = ({ user, onClose, onSuccess }) => {
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [hasBudget, setHasBudget] = useState('');
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const complaintCategories = [
    'Water Supply',
    'Sewage/Drainage',
    'Street Lighting',
    'Road Condition',
    'Garbage Collection',
    'Park Maintenance',
    'Security Issue',
    'Noise Pollution',
    'Construction/Demolition',
    'Other'
  ];

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!category) {
      setError('Please select a complaint category');
      return;
    }
    if (!description.trim()) {
      setError('Please describe your complaint');
      return;
    }
    if (hasBudget === '') {
      setError('Please specify if the complaint involves budget');
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare form data
      const formData = new FormData();
      formData.append('userCnic', user.cnic);
      formData.append('userName', `${user.firstName} ${user.lastName}`);
      formData.append('nhcCode', user.nhcCode);
      formData.append('category', category);
      formData.append('description', description);
      formData.append('hasBudget', hasBudget === 'yes' ? 1 : 0);
      if (photo) {
        formData.append('photo', photo);
      }

      await submitComplaint(formData);
      alert('Complaint submitted successfully!');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Error submitting complaint:', err);
      setError(err.message || 'Failed to submit complaint');
    } finally {
      setIsSubmitting(false);
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
        padding: '30px 25px',
        width: '100%',
        maxWidth: '600px',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)'
      }}>
        {/* HEADER */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          paddingBottom: '16px',
          borderBottom: '2px solid #e5e7eb'
        }}>
          <h2 style={{ margin: 0, fontSize: '24px', color: '#1f2937', fontWeight: 'bold' }}>📝 FILE A COMPLAINT</h2>
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

        {/* USER INFO */}
        <div style={{
          backgroundColor: '#f0f9ff',
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '24px',
          border: '1px solid #0ea5e9'
        }}>
          <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
            <span style={{ fontWeight: 'bold', color: '#0ea5e9' }}>👤 Filing as:</span> {user.firstName} {user.lastName}
          </div>
          <div style={{ fontSize: '14px', color: '#666' }}>
            <span style={{ fontWeight: 'bold', color: '#0ea5e9' }}>🏘️ NHC:</span> {user.nhcCode}
          </div>
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

        {/* FORM */}
        <form onSubmit={handleSubmit}>
          {/* CATEGORY DROPDOWN */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: '600',
              color: '#1f2937'
            }}>
              Select Complaint Category *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                fontFamily: 'inherit',
                backgroundColor: 'white',
                cursor: 'pointer',
                boxSizing: 'border-box'
              }}
            >
              <option value="">-- Choose Category --</option>
              {complaintCategories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* BUDGET RADIO BUTTONS */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '12px',
              fontSize: '14px',
              fontWeight: '600',
              color: '#1f2937'
            }}>
              Does this complaint involve Budget? *
            </label>
            <div style={{ display: 'flex', gap: '24px' }}>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="budget"
                  value="yes"
                  checked={hasBudget === 'yes'}
                  onChange={(e) => setHasBudget(e.target.value)}
                  style={{ marginRight: '8px', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '14px', color: '#374151' }}>Yes</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="budget"
                  value="no"
                  checked={hasBudget === 'no'}
                  onChange={(e) => setHasBudget(e.target.value)}
                  style={{ marginRight: '8px', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '14px', color: '#374151' }}>No</span>
              </label>
            </div>
          </div>

          {/* DESCRIPTION TEXTAREA */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: '600',
              color: '#1f2937'
            }}>
              Describe your Complaint *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Please provide details about your complaint..."
              rows="5"
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
                resize: 'vertical'
              }}
            />
          </div>

          {/* PHOTO UPLOAD */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: '600',
              color: '#1f2937'
            }}>
              📸 Attach Photo of Issue
            </label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handlePhotoChange}
              style={{
                padding: '8px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                width: '100%',
                boxSizing: 'border-box',
                cursor: 'pointer'
              }}
            />
            <p style={{ fontSize: '12px', color: '#666', margin: '4px 0 0 0' }}>
              Supported: JPG, PNG, GIF, WebP (Max 5MB)
            </p>

            {/* PHOTO PREVIEW */}
            {photoPreview && (
              <div style={{
                marginTop: '12px',
                textAlign: 'center'
              }}>
                <img
                  src={photoPreview}
                  alt="Preview"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '200px',
                    borderRadius: '8px',
                    border: '2px solid #d1d5db'
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    setPhoto(null);
                    setPhotoPreview(null);
                  }}
                  style={{
                    marginTop: '8px',
                    padding: '6px 12px',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  Remove Photo
                </button>
              </div>
            )}
          </div>

          {/* ACTION BUTTONS */}
          <div style={{
            display: 'flex',
            gap: '12px',
            marginTop: '30px',
            paddingTop: '20px',
            borderTop: '1px solid #e5e7eb'
          }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '12px 20px',
                backgroundColor: '#e5e7eb',
                color: '#374151',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#d1d5db'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#e5e7eb'}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                flex: 1,
                padding: '12px 20px',
                backgroundColor: isSubmitting ? '#d1d5db' : '#0ea5e9',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                if (!isSubmitting) e.target.style.backgroundColor = '#0284c7';
              }}
              onMouseLeave={(e) => {
                if (!isSubmitting) e.target.style.backgroundColor = '#0ea5e9';
              }}
            >
              {isSubmitting ? '⏳ Submitting...' : 'Submit Complaint'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FileComplaint;
