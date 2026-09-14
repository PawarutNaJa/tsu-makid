import React from 'react';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="container flex flex-col items-center justify-center gap-4">
        <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary-color)', letterSpacing: '-0.05em' }}>TSU Market</div>
        <p style={{ color: 'var(--text-secondary)' }}>© 2026 TSU Market. ตลาดนัดนิสิต มหาวิทยาลัยทักษิณ</p>
      </div>
    </footer>
  );
};

export default Footer;
