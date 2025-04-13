// app/layout.js
import './globals.css';
import NavbarLayout from '@/components/NavbarLayout'; 
import { OrderbookProvider } from '@/Context/OrderBookContext';

// Properly declare metadata export outside the component function
export const metadata = {
  title: 'PaperCoin - Risk-Free Crypto Trading',
  description: 'Learn and practice crypto trading with virtual currency',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
      <OrderbookProvider symbol="btcusdt">
        <NavbarLayout /> {/* Render NavbarLayout here */}
        {children}
      </OrderbookProvider>
      </body>
    </html>
  );
}
