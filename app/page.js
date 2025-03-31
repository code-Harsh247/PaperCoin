'use client'
import React, { useState } from 'react'
import Link from 'next/link'
import VideoModal from '@/components/VideoModal'

function Page() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false) 

  const features = [
    {
      title: "Practice Trading",
      description: "Use virtual funds to execute real market strategies",
      icon: "📈"
    },
    {
      title: "Learn the Basics",
      description: "Comprehensive tutorials for beginners to experts",
      icon: "🧠"
    },
    {
      title: "Market Analysis",
      description: "Real-time data and advanced analytics tools",
      icon: "📊"
    }
  ]

  const handleWatchDemo = () => {
    setIsModalOpen(true);
  };

  const handleScroll = (e, id) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      // Close mobile menu if it's open
      if (isMenuOpen) {
        setIsMenuOpen(false);
      }
      
      // Scroll to the element smoothly
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
      
      // Update URL without page reload (optional)
      window.history.pushState(null, '', `#${id}`);
    }
  };

  return (
    <div className="relative h-screen w-screen overflow-x-hidden bg-black">
      <VideoModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      {/* Navigation */}
      <nav className="absolute top-0 left-0 right-0 z-20 px-14 py-4">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center">
            <span className="text-2xl font-bold text-white">PaperCoin</span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex space-x-8">
            <a
              href="#features"
              onClick={(e) => handleScroll(e, 'features')}
              className="text-gray-300 hover:text-white transition-colors"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              onClick={(e) => handleScroll(e, 'how-it-works')}
              className="text-gray-300 hover:text-white transition-colors"
            >
              How It Works
            </a>
            <a
              href="#testimonials"
              onClick={(e) => handleScroll(e, 'testimonials')}
              className="text-gray-300 hover:text-white transition-colors"
            >
              Testimonials
            </a>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-gray-300 focus:outline-none"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              {isMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="md:hidden absolute top-16 right-6 bg-gray-900 rounded-lg shadow-lg p-4 w-48">
              <div className="flex flex-col space-y-3">
                <Link href="#features" className="text-gray-300 hover:text-white transition-colors">Features</Link>
                <Link href="#how-it-works" className="text-gray-300 hover:text-white transition-colors">How It Works</Link>
                <Link href="#testimonials" className="text-gray-300 hover:text-white transition-colors">Testimonials</Link>
                <Link href="#pricing" className="text-gray-300 hover:text-white transition-colors">Pricing</Link>
              </div>
            </div>
          )}

          {/* Login/Signup Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            <button className="text-white hover:text-amber-300 transition-colors">Login</button>
            <button className="bg-amber-500 hover:bg-amber-600 text-black font-bold py-2 px-4 rounded-lg transition-colors">Sign Up</button>
          </div>
        </div>
      </nav>

      {/* Main content container */}
      <div className="flex h-screen w-full pl-6 md:pl-14 relative z-10">
        {/* Left side: Text content */}
        <div className="w-full md:w-1/2 h-full flex flex-col justify-center">
          <h1 className="text-white text-4xl md:text-6xl font-bold leading-tight">
            Trade Crypto<br />
            <span style={{
              background: "linear-gradient(to right, #FFC107, #FF8A00)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              display: "inline-block"
            }}>
              Risk-Free
            </span>
          </h1>

          <p className="text-gray-400 text-lg mt-6 max-w-md leading-relaxed">
            Experience the thrill of crypto trading with virtual currency.
            Learn, practice, and master trading strategies without risking
            real money.
          </p>

          <div className="mt-8 md:mt-10 flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
            <button className="bg-amber-500 hover:bg-amber-600 text-black font-bold py-3 px-8 md:px-10 rounded-lg text-lg transition-colors">
              Start Trading
            </button>
            <button className="border border-gray-600 hover:border-gray-400 text-white font-bold py-3 px-8 md:px-10 rounded-lg text-lg transition-colors" onClick={handleWatchDemo}>
              Watch Demo
            </button>
          </div>

          {/* Trust indicators */}
          <div className="mt-12 hidden md:block">
            <p className="text-gray-500 text-sm mb-3">TRUSTED BY 5 PEOPLE IN IITKGP</p>
            <div className="flex space-x-8">
              <img src="/logos/trader1.svg" alt="Trader Logo" className="h-8 opacity-50 hover:opacity-80 transition-opacity" />
              <img src="/logos/trader2.svg" alt="Trader Logo" className="h-8 opacity-50 hover:opacity-80 transition-opacity" />
              <img src="/logos/trader3.svg" alt="Trader Logo" className="h-8 opacity-50 hover:opacity-80 transition-opacity" />
            </div>
          </div>
        </div>

        {/* Right side: Interactive 3D Bitcoin model */}
        <div className="hidden md:block w-1/2 h-full relative">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-full h-full">
              <img className='w-full h-full object-cover' src='/bg/bitcoins.png' alt='bitcoin bg' />
              {/* Uncomment if Bitcoin3DModel component is available */}
              {/* <Bitcoin3DModel /> */}
            </div>
          </div>

          {/* Subtle gradient glow effect */}
          <div className="absolute inset-0 bg-gradient-radial from-blue-900/20 to-transparent opacity-70 pointer-events-none"></div>
        </div>
      </div>

      {/* Feature Section */}
      <section id="features" className="bg-gray-900 py-20">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-4">
            Why Choose <span className="text-amber-500">PaperCoin</span>
          </h2>
          <p className="text-gray-400 text-center max-w-2xl mx-auto mb-16">
            Our platform is designed to help you master crypto trading without the financial risks.
            Practice with real market data and virtual funds.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-gray-800 rounded-xl p-8 hover:bg-gray-750 transition-colors">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
                <p className="text-gray-400">{feature.description}</p>
              </div>
            ))}
          </div>

          <div className="mt-16 text-center">
            <button className="bg-amber-500 hover:bg-amber-600 text-black font-bold py-3 px-10 rounded-lg text-lg transition-colors">
              Explore Features
            </button>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="bg-black py-20">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-4">
            How It Works
          </h2>
          <p className="text-gray-400 text-center max-w-2xl mx-auto mb-16">
            Get started in minutes and begin your journey to becoming a confident crypto trader
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-amber-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-black text-2xl font-bold">1</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Create an Account</h3>
              <p className="text-gray-400">Sign up for free and get instant access to your virtual trading dashboard</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-amber-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-black text-2xl font-bold">2</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Learn the Basics</h3>
              <p className="text-gray-400">Follow our guided tutorials or jump right into trading with $10,000 in virtual funds</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-amber-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-black text-2xl font-bold">3</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Start Trading</h3>
              <p className="text-gray-400">Execute trades, analyze performance, and refine your strategy risk-free</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="bg-gray-900 py-20">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-4">
            What Our Users Say
          </h2>
          <p className="text-gray-400 text-center max-w-2xl mx-auto mb-16">
            Join thousands of traders who have improved their skills using PaperCoin
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-gray-800 p-6 rounded-xl">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-gray-700 rounded-full mr-4"></div>
                <div>
                  <h4 className="text-white font-bold">Pallav Agarwal</h4>
                  <p className="text-gray-500 text-sm">Guy</p>
                </div>
              </div>
              <p className="text-gray-400">
                "They forced me to write this review but I have to say, this platform is amazing! I
                learned so much about crypto trading and the community is super supportive."
              </p>
              <div className="flex text-amber-500 mt-4">
                ★★★★★
              </div>
            </div>

            <div className="bg-gray-800 p-6 rounded-xl">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-gray-700 rounded-full mr-4"></div>
                <div>
                  <h4 className="text-white font-bold">Maria Chen</h4>
                  <p className="text-gray-500 text-sm">Beginner Investor</p>
                </div>
              </div>
              <p className="text-gray-400">
                "As someone new to crypto, this platform gave me a safe space to learn the basics
                without the stress of losing money. The tutorials are excellent!"
              </p>
              <div className="flex text-amber-500 mt-4">
                ★★★★★
              </div>
            </div>

            <div className="bg-gray-800 p-6 rounded-xl">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-gray-700 rounded-full mr-4"></div>
                <div>
                  <h4 className="text-white font-bold">James Wilson</h4>
                  <p className="text-gray-500 text-sm">Financial Advisor</p>
                </div>
              </div>
              <p className="text-gray-400">
                "I recommend PaperCoin to all my clients interested in crypto. It's the perfect
                way to understand market dynamics before putting real capital at risk."
              </p>
              <div className="flex text-amber-500 mt-4">
                ★★★★★
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-amber-600 to-amber-500">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-black mb-6">
            Ready to Start Your Trading Journey?
          </h2>
          <p className="text-black text-lg max-w-2xl mx-auto mb-8 opacity-90">
            Join thousands of traders who are mastering crypto trading without financial risk.
          </p>
          <button className="bg-black text-white font-bold py-3 px-10 rounded-lg text-lg hover:bg-gray-900 transition-colors">
            Get Started For Free
          </button>
        </div>
      </section>
      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400">
        {/* Main Footer */}
        <div className="container mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Company Info */}
            <div className="col-span-1 md:col-span-1">
              <div className="flex items-center mb-4">
                <span className="text-2xl font-bold text-white">PaperCoin</span>
              </div>
              <p className="mb-4">
                Learn to trade cryptocurrency without the financial risk. Practice with real market data and virtual funds.
              </p>
              <div className="flex space-x-4">
                <a href="#" className="text-gray-400 hover:text-amber-500 transition-colors">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" />
                  </svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-amber-500 transition-colors">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-amber-500 transition-colors">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.675 0h-21.35c-.732 0-1.325.593-1.325 1.325v21.351c0 .731.593 1.324 1.325 1.324h11.495v-9.294h-3.128v-3.622h3.128v-2.671c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12v9.293h6.116c.73 0 1.323-.593 1.323-1.325v-21.35c0-.732-.593-1.325-1.325-1.325z" />
                  </svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-amber-500 transition-colors">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-white font-bold text-lg mb-4">Quick Links</h3>
              <ul className="space-y-2">
                <li><a href="#features" className="hover:text-amber-500 transition-colors">Features</a></li>
                <li><a href="#how-it-works" className="hover:text-amber-500 transition-colors">How It Works</a></li>
                <li><a href="#testimonials" className="hover:text-amber-500 transition-colors">Testimonials</a></li>
                <li><a href="#" className="hover:text-amber-500 transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-amber-500 transition-colors">Help Center</a></li>
              </ul>
            </div>

            {/* Legal Links */}
            <div>
              <h3 className="text-white font-bold text-lg mb-4">Legal</h3>
              <ul className="space-y-2">
                <li><a href="#" className="hover:text-amber-500 transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-amber-500 transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-amber-500 transition-colors">Cookie Policy</a></li>
                <li><a href="#" className="hover:text-amber-500 transition-colors">Risk Disclosure</a></li>
              </ul>
            </div>

            {/* Newsletter */}
            <div>
              <h3 className="text-white font-bold text-lg mb-4">Stay Updated</h3>
              <p className="mb-4">Subscribe to our newsletter for trading tips and updates</p>
              <form className="flex flex-col sm:flex-row">
                <input
                  type="email"
                  placeholder="Your email address"
                  className="bg-gray-800 text-white px-4 py-2 rounded-lg mb-2 sm:mb-0 sm:mr-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <button
                  type="submit"
                  className="bg-amber-500 text-black font-bold py-2 px-4 rounded-lg hover:bg-amber-600 transition-colors"
                >
                  Subscribe
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-gray-800 py-6">
          <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center">
            <div className="text-sm mb-4 md:mb-0">
              &copy; {new Date().getFullYear()} PaperCoin. All rights reserved.
            </div>
            <div className="flex space-x-6 text-sm">
              <a href="#" className="hover:text-amber-500 transition-colors">Support</a>
              <a href="#" className="hover:text-amber-500 transition-colors">Contact</a>
              <a href="#" className="hover:text-amber-500 transition-colors">Careers</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Page;
