import React, { useState, useEffect } from 'react';
import './SignUp.css';
import { updateUser, uploadProfilePicture } from '../api';

const EditProfile = ({ user, onSave, onCancel }) => {
  // Editable profile fields for the signed-in member.
  const [formData, setFormData] = useState({
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email || '',
    phone: user.phone || '',
    address: user.address || '',
    cnic: user.cnic, // Read-only usually
    profileImage: user.profileImage || ''
  });

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewImage, setPreviewImage] = useState(user.profileImage || null);
  const [isUploading, setIsUploading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validate file size (max 5MB)
    const maxSizeMB = 5;
    if (file.size > maxSizeMB * 1024 * 1024) {
      alert(`Image size must be less than ${maxSizeMB}MB. Current: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
      return;
    }
    
    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      alert('Please upload a valid image file (JPG, PNG, GIF, or WebP)');
      return;
    }
    
    setSelectedFile(file);
    
    // Show preview
    const reader = new FileReader();
    reader.onload = (event) => {
      setPreviewImage(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      let finalFormData = { ...formData };
      
      // Upload a new profile image only when the user picked one.
      if (selectedFile) {
        setIsUploading(true);
        const uploadResponse = await uploadProfilePicture(formData.cnic, selectedFile);
        finalFormData.profileImage = uploadResponse.fileUrl;
        setIsUploading(false);
      } else {
        // If no new file selected, don't include profileImage in the update
        delete finalFormData.profileImage;
      }
      
      // Persist the profile fields and then notify the parent view.
      await updateUser(formData.cnic, finalFormData);
      onSave(finalFormData);
      alert('Profile updated successfully!');
    } catch (err) {
      console.error('Error updating profile:', err);
      alert('Failed to update profile: ' + err.message);
    }
  };

  const handleLocateAndSave = () => {
    if (!navigator.geolocation) return alert('Geolocation not supported');
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      let address = '';
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
        const data = await res.json();
        address = data.display_name || '';
      } catch (err) {
        console.error('Reverse geocode failed', err);
      }
      const updated = { ...formData, address };
      try {
        await updateUser(formData.cnic, updated);
        setFormData(updated);
        // Notify the parent after saving the new address.
        onSave({ ...updated, _saved: true });
        alert('Address updated');
      } catch (err) {
        console.error('Failed to save address', err);
        alert('Failed to save address');
      }
    }, (err) => { alert('Unable to get location'); });
  };

  return (
    <div className="signup-container" style={{ maxWidth: '450px' }}>
      <div className="simple-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>Edit Profile</h2>
        <button onClick={onCancel} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer' }}>✕</button>
      </div>
      
      <form onSubmit={handleSubmit} className="signup-form">
        {/* Profile picture preview and upload control. */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{
            width: '100px', height: '100px', borderRadius: '50%',
            backgroundColor: '#e2e8f0', display: 'flex', 
            justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
            margin: '0 auto 15px'
          }}>
            {previewImage ? (
              <img src={previewImage} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontSize: '40px', color: '#94a3b8' }}>👤</span>
            )}
          </div>
          <input 
            type="file" 
            accept="image/jpeg,image/png,image/gif,image/webp" 
            onChange={handleImageChange}
            style={{ cursor: 'pointer' }}
            disabled={isUploading}
          />
          <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
            {isUploading ? '⏳ Uploading...' : '📸 Upload Profile Picture (JPG, PNG, GIF, WebP - Max 5MB)'}
          </p>
        </div>

        <div className="form-row">
          <div className="form-group"><label>First Name</label><input type="text" name="firstName" value={formData.firstName} onChange={handleChange} /></div>
          <div className="form-group"><label>Last Name</label><input type="text" name="lastName" value={formData.lastName} onChange={handleChange} /></div>
        </div>

        <div className="form-group"><label>Email</label><input type="email" name="email" value={formData.email} onChange={handleChange} /></div>
        <div className="form-group"><label>Phone</label><input type="tel" name="phone" value={formData.phone} onChange={handleChange} /></div>
        <div className="form-group">
          <label>Address</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input type="text" name="address" value={formData.address} onChange={handleChange} style={{ flex: 1 }} />
            <button type="button" className="map-btn" onClick={handleLocateAndSave}>📍 Locate & Save</button>
          </div>
        </div>

        <div className="form-group">
          <label>CNIC (Cannot Change)</label>
          <input type="text" name="cnic" value={formData.cnic} readOnly className="readonly-input" />
        </div>

        <button type="submit" className="submit-btn" disabled={isUploading}>
          {isUploading ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
};

export default EditProfile;