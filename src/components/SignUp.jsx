import React, { useState } from 'react';
import './SignUp.css';
import { signUpUser, uploadProfilePicture } from '../api'; 
import logo from '../assets/logo.png';
// We removed the api import here because App.jsx handles the data fetching

// MATH: Check if point is inside polygon
function isPointInPolygon(point, vs) {
    let x = point.lat, y = point.lng;
    let inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        let xi = vs[i].lat, yi = vs[i].lng;
        let xj = vs[j].lat, yj = vs[j].lng;
        let intersect = ((yi > y) != (yj > y))
            && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

const SignUp = ({ onSwitchToLogin, onSignupSuccess, nhcList }) => {
  // State
  const [formData, setFormData] = useState({
    firstName: 'Junaid', lastName: 'Ahmad', gender: 'Male', cnic: '37405 - 4118859 - 5', 
    phone: '03204567888', address: '6th road rawalpindi', email: 'hasnat@gmail.com', 
    password: '', confirmPassword: '', ownership: 'Home owner', location: '', 
    nhcCode: '', profileImage: null
  });

  const [profileImageFile, setProfileImageFile] = useState(null);
  const [profileImagePreview, setProfileImagePreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    const val = type === 'radio' ? value : value;
    setFormData({ ...formData, [name]: val });
  };

  const handleImageUpload = (e) => {
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
    
    // Store the file object
    setProfileImageFile(file);
    
    // Create preview for display
    const reader = new FileReader();
    reader.onloadend = () => { 
      setProfileImagePreview(reader.result); 
    };
    reader.readAsDataURL(file);
  };

  const getLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const userLat = position.coords.latitude;
          const userLng = position.coords.longitude;
          const userPoint = { lat: userLat, lng: userLng };

          console.log("✓ User Location retrieved:", userPoint);

          // Fetch address from Nominatim
          let locationAddress = "Unknown Location";
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${userLat}&lon=${userLng}`,
              { timeout: 5000 }
            );
            if (response.ok) {
              const data = await response.json();
              locationAddress = data.display_name || "Unknown Location";
              console.log("✓ Address retrieved:", locationAddress);
            } else {
              console.warn("Nominatim returned status:", response.status);
            }
          } catch (err) {
            console.warn("Address fetch error (non-critical):", err.message);
          }

          // Check NHC list
          console.log("Checking against NHC List:", nhcList);
          if (!nhcList || nhcList.length === 0) {
            console.warn("⚠ NHC list is empty or undefined");
            setFormData({ ...formData, location: locationAddress, nhcCode: '' });
            alert(`Location: ${locationAddress}\n\n⚠ Warning: NHC list not loaded. Please reload and try again.`);
            return;
          }

          let foundNHC = null;
          for (let nhc of nhcList) {
            console.log(`Checking Zone: ${nhc.name}`);
            if (!nhc.points || nhc.points.length === 0) {
              console.warn(`⚠ Zone ${nhc.name} has no polygon points`);
              continue;
            }
            const isInside = isPointInPolygon(userPoint, nhc.points);
            if (isInside) {
              foundNHC = nhc.name;
              console.log("✓ MATCH FOUND:", foundNHC);
              break;
            }
          }

          if (foundNHC) {
            setFormData({ ...formData, location: locationAddress, nhcCode: foundNHC });
            alert(`✓ Found NHC: ${foundNHC}\nLocation: ${locationAddress}`);
          } else {
            setFormData({ ...formData, location: locationAddress, nhcCode: '' });
            alert(`No NHC found in your area.\nLocation: ${locationAddress}\n\nYou can still proceed or select an NHC manually.`);
          }
        } catch (err) {
          console.error("Unexpected error in location handler:", err);
          alert("Error processing location: " + err.message);
        }
      },
      (error) => {
        // Silently log error; don't show alert
        console.error("Geolocation error:", error.code, error.message);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

   const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 1. Validate Passwords
    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    try {
      let finalFormData = { ...formData };
      
      // 2. Upload profile picture if selected
      if (profileImageFile) {
        setIsUploading(true);
        try {
          const uploadResponse = await uploadProfilePicture(formData.cnic, profileImageFile);
          finalFormData.profileImage = uploadResponse.fileUrl;
          setIsUploading(false);
        } catch (uploadErr) {
          alert("Failed to upload profile picture: " + uploadErr.message);
          setIsUploading(false);
          return;
        }
      } else {
        finalFormData.profileImage = null;
      }
      
      // 3. Send registration data to SQL Server via API
      const response = await signUpUser(finalFormData);
      
      // 4. Check response
      if (response.message === "User Registered") {
        alert("Registration Successful! Saved to Database.");
        
        // 5. If success, tell the parent (App.jsx) to switch views
        if (onSignupSuccess) {
          onSignupSuccess(finalFormData);
        }
      } else {
        // If server returned an error (like duplicate CNIC)
        alert("Error: " + (response.error || "Unknown error"));
      }
    } catch (error) {
      console.error("Signup Error:", error);
      alert("Network Error: Could not connect to server.");
    }
  };
  return (
    <div className="signup-container">
      
      {/* LOGO */}
      <img 
        src={logo} 
        alt="App Logo" 
      />        

      <div className="signup-content">
        <h2 className="page-title">Sign Up For NHC</h2>
        <form onSubmit={handleSubmit} className="signup-form">
          
          <div className="form-row">
            <div className="form-group">
              <label>First Name</label>
              <input 
                type="text" 
                name="firstName" 
                value={formData.firstName} 
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label>Last Name</label>
              <input 
                type="text" 
                name="lastName" 
                value={formData.lastName} 
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Gender</label>
            <div className="gender-options">
              <label className="radio-label">
                <input type="radio" name="gender" value="Male" checked={formData.gender === 'Male'} onChange={handleChange} />
                Male
              </label>
              <label className="radio-label">
                <input type="radio" name="gender" value="Female" checked={formData.gender === 'Female'} onChange={handleChange} />
                Female
              </label>
            </div>
          </div>

          <div className="form-group">
            <label>CNIC</label>
            <input 
              type="text" 
              name="cnic" 
              value={formData.cnic} 
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label>Phone No.</label>
            <input 
              type="tel" 
              name="phone" 
              value={formData.phone} 
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label>Address</label>
            <input 
              type="text" 
              name="address" 
              value={formData.address} 
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input 
              type="email" 
              name="email" 
              value={formData.email} 
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input 
              type="password" 
              name="password" 
              value={formData.password} 
              onChange={handleChange} 
              placeholder="Enter Password"
            />
          </div>
          <div className="form-group">
            <label>Confirm Password</label>
            <input 
              type="password" 
              name="confirmPassword" 
              value={formData.confirmPassword} 
              onChange={handleChange} 
              placeholder="Confirm Password"
            />
          </div>

          <div className="form-group">
            <label>Status</label>
            <div className="gender-options">
              <label className="radio-label">
                <input type="radio" name="ownership" value="Home owner" checked={formData.ownership === 'Home owner'} onChange={handleChange} />
                Home owner
              </label>
              <label className="radio-label">
                <input type="radio" name="ownership" value="Rented" checked={formData.ownership === 'Rented'} onChange={handleChange} />
                Rented
              </label>
            </div>
          </div>

          <div className="form-group">
            <label>Location (Auto-detected)</label>
            <div className="location-wrapper">
              <input 
                type="text" 
                name="location" 
                value={formData.location || ''} 
                readOnly 
                placeholder="Click Locate Me to get location"
              />
              <button 
                type="button" 
                className="map-btn" 
                onClick={getLocation}
              >
                📍 Locate
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>NHC Code</label>
            <input 
              type="text" 
              name="nhcCode" 
              value={formData.nhcCode} 
              readOnly 
              className="readonly-input"
            />
          </div>

          <div className="form-group">
            <label>Upload Profile Image</label>
            <input 
              type="file" 
              accept="image/jpeg,image/png,image/gif,image/webp" 
              onChange={handleImageUpload} 
              className="file-input"
              disabled={isUploading}
            />
            <p style={{ fontSize: '12px', color: '#666', margin: '5px 0' }}>
              {isUploading ? '⏳ Uploading...' : '📸 Supported: JPG, PNG, GIF, WebP (Max 5MB)'}
            </p>
            {profileImagePreview && (
              <div className="image-preview">
                <img 
                  src={profileImagePreview} 
                  alt="Profile Preview"
                />
              </div>
            )}
          </div>

          <button 
            type="submit"
            disabled={isUploading}
          >
            Sign Up
          </button>
          <div className="signup-link">
            I have an account? <span onClick={onSwitchToLogin}>Log In</span>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SignUp;