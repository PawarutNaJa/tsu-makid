import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { LanguageContext } from '../context/LanguageContext';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn, Info, Shield, User } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('test@tsu.ac.th');
  const [password, setPassword] = useState('123456');
  const [error, setError] = useState('');
  const { login } = useContext(AuthContext);
  const { language } = useContext(LanguageContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="container" style={{ maxWidth: '500px', margin: '4rem auto', padding: '2rem', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', borderRadius: '8px', background: 'white' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
        <LogIn size={24} /> {language === 'TH' ? 'เข้าสู่ระบบ' : 'Login'}
      </h2>
      
      <div style={{ background: '#e0f2fe', color: '#0284c7', padding: '1rem', borderRadius: '4px', marginBottom: '1.5rem', fontSize: '0.9rem', display: 'flex', gap: '0.5rem' }}>
        <Info size={20} style={{ flexShrink: 0 }} />
        <div style={{ width: '100%' }}>
          <strong>{language === 'TH' ? 'ข้อมูลสำหรับทดสอบ (Test Credentials):' : 'Test Credentials:'}</strong><br/>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', gap: '1rem' }}>
            <div style={{ background: 'rgba(255,255,255,0.5)', padding: '0.5rem', borderRadius: '4px', flex: 1, cursor: 'pointer' }} onClick={() => { setEmail('test@tsu.ac.th'); setPassword('123456'); }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.25rem' }}><User size={16}/> <strong>User / Student</strong></div>
              Email: test@tsu.ac.th<br/>
              Password: 123456
            </div>
            <div style={{ background: 'rgba(255,255,255,0.5)', padding: '0.5rem', borderRadius: '4px', flex: 1, cursor: 'pointer' }} onClick={() => { setEmail('admin@tsu.ac.th'); setPassword('123456'); }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.25rem' }}><Shield size={16}/> <strong>Admin</strong></div>
              Email: admin@tsu.ac.th<br/>
              Password: 123456
            </div>
          </div>
        </div>
      </div>

      {error && <p style={{ color: 'red', textAlign: 'center', marginBottom: '1rem' }}>{error}</p>}
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <input 
          type="email" 
          placeholder={language === 'TH' ? 'อีเมล' : 'Email'} 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          required 
          style={{ padding: '0.75rem', borderRadius: '4px', border: '1px solid #ccc' }}
        />
        <input 
          type="password" 
          placeholder={language === 'TH' ? 'รหัสผ่าน' : 'Password'}
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          required 
          style={{ padding: '0.75rem', borderRadius: '4px', border: '1px solid #ccc' }}
        />
        <button type="submit" className="btn btn-primary" style={{ padding: '0.75rem', fontSize: '1rem', cursor: 'pointer', background: 'var(--primary-color)' }}>
          {language === 'TH' ? 'เข้าสู่ระบบ' : 'Login'}
        </button>
      </form>
      <p style={{ textAlign: 'center', marginTop: '1.5rem' }}>
        {language === 'TH' ? 'ยังไม่มีบัญชีใช่หรือไม่?' : "Don't have an account?"} <Link to="/register" style={{ color: '#0066cc' }}>{language === 'TH' ? 'สมัครสมาชิก' : 'Register'}</Link>
      </p>
    </div>
  );
};

export default Login;
