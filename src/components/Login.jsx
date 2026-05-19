import React, { useState } from 'react';
import './SignUp.css'; 
import { loginUser } from '../api'; 
import logo from '../assets/logo.png';

const Login = ({ onLoginSuccess, onSwitchToSignup }) => {
  // Keep the login form state local to this screen.
  const [formData, setFormData] = useState({
    cnic: '',
    password: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const response = await loginUser(formData.cnic, formData.password);

      if (response.role) {
        alert(`Welcome, ${response.firstName}!`);
        
        // IMPORTANT: Pass the whole object
        onLoginSuccess(response); 
      } else {
        alert(response.error || "Login Failed");
      }
    } catch (error) {
      console.error(error);
      alert("Network Error");
    }
  };

  return (
    <div className="signup-container" style={{ maxWidth: '450px', padding: '40px 20px' }}>
      <div className="signup-content" style={{ textAlign: 'center' }}>

        {/* Brand mark and page title. */}
        <img 
          src={logo} 
          alt="Logo" 
          style={{ height: '150px', width: 'auto', marginBottom: '30px' }} 
        />
        <h2 className="page-title" style={{ fontSize: '24px', marginBottom: '30px', color: '#1f2937' }}>Login</h2>
        <form onSubmit={handleSubmit} className="signup-form">
          
          <div className="form-group" style={{ marginBottom: '20px', textAlign: 'left' }}>
            <label style={{ fontSize: '14px', color: '#374151', marginBottom: '8px', display: 'block' }}>CNIC</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <span style={{ position: 'absolute', left: '12px', fontSize: '18px' }}>📧</span>
              <input 
                type="text" 
                name="cnic" 
                value={formData.cnic} 
                onChange={handleChange} 
                placeholder="Enter CNIC" 
                required 
                style={{
                  width: '100%',
                  padding: '12px 12px 12px 40px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '30px', textAlign: 'left' }}>
            <label style={{ fontSize: '14px', color: '#374151', marginBottom: '8px', display: 'block' }}>Password</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <span style={{ position: 'absolute', left: '12px', fontSize: '18px' }}>🔒</span>
              <input 
                type="password" 
                name="password" 
                value={formData.password} 
                onChange={handleChange} 
                placeholder="Enter Password" 
                required 
                style={{
                  width: '100%',
                  padding: '12px 12px 12px 40px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="submit-btn"
          >
            LOGIN
          </button>
          
          <div className="signup-link" style={{ fontSize: '14px', color: '#6b7280' }}>
            Don't have an account? <span onClick={onSwitchToSignup} style={{ color: '#10b981', cursor: 'pointer', fontWeight: '500' }}>Create one</span>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;