// app/layout.js
import './globals.css';
import NavbarLayout from '@/components/NavbarLayout'; 

// Properly declare metadata export outside the component function
export const metadata = {
  title: 'PaperCoin - Risk-Free Crypto Trading',
  description: 'Learn and practice crypto trading with virtual currency',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <NavbarLayout /> {/* Render NavbarLayout here */}
        {children}
      </body>
    </html>
  );
}
