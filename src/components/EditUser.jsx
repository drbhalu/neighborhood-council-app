import React, { useState } from 'react';
import './SignUp.css';
import { updateUser } from '../api';

const EditUser = ({ user, onBack, onSave }) => {
  const [formData, setFormData] = useState({
    firstName: user.FirstName || '',
    lastName: user.LastName || '',
    phone: user.Phone || '',
    cnic: user.CNIC || '',
    role: user.Role || '',
    address: user.Address || '',
    email: user.Email || '',
    password: user.Password || '',
    nhcCode: user.nhcCodes && user.nhcCodes.length ? user.nhcCodes[0] : ''
  });

  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const updatedData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        address: formData.address,
        email: formData.email,
        nhcCode: formData.nhcCode,
        role: formData.role
      };
      await updateUser(formData.cnic, updatedData);
      alert('User updated successfully!');
      if (onSave) onSave(updatedData);
      if (onBack) onBack();
    } catch (error) {
      console.error('Failed to update user', error);
      alert('Failed to update user');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="admin-dashboard-container">
      
     
       <div></div>
         <br></br>
         <div></div>
         
        <button className="back-btn1" onClick={onBack}>← Back</button>
 
  
             <h2>EDIT USER</h2>
      <div className="signup-content" style={{ padding: '20px' }}>
        <form onSubmit={handleSubmit} className="signup-form">
          <div className="form-row">
            <div className="form-group">
              <label>First Name</label>
              <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Last Name</label>
              <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} />
            </div>
          </div>

          <div className="form-group">
            <label>Phone Number</label>
            <input type="tel" name="phone" value={formData.phone} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label>CNIC</label>
            <input type="text" name="cnic" value={formData.cnic} readOnly className="readonly-input" />
          </div>

          <div className="form-group">
            <label>Role</label>
            <select name="role" value={formData.role} onChange={handleChange} style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px' }}>
              <option value="User">User</option>
              <option value="Admin">Admin</option>
            </select>
          </div>

          <div className="form-group">
            <label>Address</label>
            <input type="text" name="address" value={formData.address} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label>Email</label>
            <input type="email" name="email" value={formData.email} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input type="password" name="password" value={formData.password} readOnly className="readonly-input" placeholder="Password (Read-only)" />
          </div>

          <div className="form-group">
            <label>NHC Code</label>
            <input type="text" name="nhcCode" value={formData.nhcCode} onChange={handleChange} />
          </div>

          <button type="submit" className="submit-btn" disabled={isSaving} style={{ width: '100%', marginTop: '20px' }}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default EditUser;
