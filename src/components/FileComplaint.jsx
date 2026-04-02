import React, { useEffect, useState } from 'react';
import { getNHCMembersByCode, submitComplaint } from '../api';

const FileComplaint = ({ user, onClose, onSuccess }) => {
  const [category, setCategory] = useState('');
  const [complaintType, setComplaintType] = useState('normal');
  const [againstMemberCnic, setAgainstMemberCnic] = useState('');
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState([]);
  const [photoPreviews, setPhotoPreviews] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadMembers = async () => {
      if (complaintType !== 'against' || !user?.nhcCode) return;
      setMembersLoading(true);
      try {
        const data = await getNHCMembersByCode(user.nhcCode);
        const filtered = (data || []).filter((m) => String(m.CNIC) !== String(user.cnic));
        setMembers(filtered);
      } catch (err) {
        setError(err.message || 'Failed to load NHC members');
      } finally {
        setMembersLoading(false);
      }
    };
    loadMembers();
  }, [complaintType, user?.nhcCode, user?.cnic]);

  const handlePhotoChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const selectedFiles = files.slice(0, 5);
    setPhotos(selectedFiles);
    setPhotoPreviews(selectedFiles.map((file) => URL.createObjectURL(file)));
  };

  const removePhoto = (index) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!category.trim()) {
      setError('Please enter a complaint title');
      return;
    }
    if (!description.trim()) {
      setError('Please describe your complaint');
      return;
    }
    if (complaintType === 'against' && !againstMemberCnic) {
      setError('Please select the member this complaint is against');
      return;
    }

    setIsSubmitting(true);

    try {
      const againstMember = members.find((m) => String(m.CNIC) === String(againstMemberCnic));

      // Prepare form data
      const formData = new FormData();
      formData.append('userCnic', user.cnic);
      formData.append('userName', `${user.firstName} ${user.lastName}`);
      formData.append('nhcCode', user.nhcCode);
      formData.append('category', category);
      formData.append('description', description);
      formData.append('hasBudget', 0);
      formData.append('complaintType', complaintType);
      if (complaintType === 'against') {
        formData.append('againstMemberCnic', againstMemberCnic);
        formData.append('againstMemberName', againstMember ? `${againstMember.FirstName || ''} ${againstMember.LastName || ''}`.trim() : '');
      }
      photos.forEach((file) => {
        formData.append('photos', file);
      });

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
              Complaint Type *
            </label>
            <select
              value={complaintType}
              onChange={(e) => {
                setComplaintType(e.target.value);
                setAgainstMemberCnic('');
              }}
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
              <option value="normal">Normal</option>
              <option value="against">Against Member</option>
            </select>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: '600',
              color: '#1f2937'
            }}>
              Complaint Title *
            </label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Enter complaint title"
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                fontFamily: 'inherit',
                backgroundColor: 'white',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {complaintType === 'against' && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '600',
                color: '#1f2937'
              }}>
                Select Member You Are Complaining Against *
              </label>
              <select
                value={againstMemberCnic}
                onChange={(e) => setAgainstMemberCnic(e.target.value)}
                disabled={membersLoading}
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
                <option value="">-- Choose Member --</option>
                {members.map((member) => (
                  <option key={member.CNIC} value={member.CNIC}>
                    {member.FirstName} {member.LastName} ({member.CNIC})
                  </option>
                ))}
              </select>
            </div>
          )}

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
              multiple
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
              Supported: JPG, PNG, GIF, WebP (Max 5MB each, up to 5 photos)
            </p>

            {/* PHOTO PREVIEW */}
            {photoPreviews.length > 0 && (
              <div style={{
                marginTop: '12px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '10px'
              }}>
                {photoPreviews.map((preview, index) => (
                  <div key={index} style={{ textAlign: 'center' }}>
                    <img
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      style={{
                        width: '100%',
                        maxHeight: '140px',
                        objectFit: 'cover',
                        borderRadius: '8px',
                        border: '2px solid #d1d5db'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
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
                      Remove
                    </button>
                  </div>
                ))}
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
