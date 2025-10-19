import { CSSProperties } from 'react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  // Style for the main footer element
  const footerStyle: CSSProperties = {
    marginTop: '2rem', // mt-8
    backgroundColor: '#ffffff', // bg-white
    borderTop: '1px solid #e5e7eb', // border-t with a standard light gray
  };

  // Style for the inner container
  const containerStyle: CSSProperties = {
    maxWidth: '1280px',
    marginLeft: 'auto',
    marginRight: 'auto',
    padding: '0.5rem',
    textAlign: 'center',
    color: '#6b7280',
  };

  return (
    <footer style={footerStyle}>
      <div style={containerStyle}>
        <p>&copy; {currentYear} Upscale Water Solutions. All Rights Reserved.</p>
      </div>
    </footer>
  );
}
