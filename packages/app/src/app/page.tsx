'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Shield, CloudRain, Zap, Globe, ArrowRight, LayoutDashboard } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-[#00ff9d]/30 overflow-hidden">

      {/* Navbar */}
      <nav className="fixed w-full z-50 backdrop-blur-md border-b border-white/5 bg-[#050505]/80">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Shield className="w-8 h-8 text-[#00ff9d]" />
            <span className="text-xl font-bold tracking-tight">CropGuard</span>
          </div>
          <div className="hidden md:flex space-x-8 text-sm font-medium text-gray-300">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
          </div>
          <Link href="/dashboard">
            <button className="bg-white/5 hover:bg-white/10 border border-white/10 px-6 py-2 rounded-full text-sm font-medium transition-all group">
              Launch App
              <ArrowRight className="w-4 h-4 ml-2 inline-block group-hover:translate-x-1 transition-transform" />
            </button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-24 pb-16 md:pt-36 md:pb-24 overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-[#00ff9d]/10 rounded-full blur-[120px] -z-10"></div>
        <div className="absolute bottom-0 right-0 w-[800px] h-[600px] bg-blue-500/10 rounded-full blur-[100px] -z-10"></div>

        <div className="container mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center space-x-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 mb-8 backdrop-blur-md">
              <span className="w-2 h-2 bg-[#00ff9d] rounded-full animate-pulse"></span>
              <span className="text-sm text-gray-300">Live on Flare Coston2</span>
            </div>

            <h1 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight leading-tight">
              Parametric Insurance for the <br />
              <span className="text-gradient">Decentralized Future</span>
            </h1>

            <p className="text-lg text-gray-400 max-w-xl mx-auto mb-10 leading-relaxed font-light">
              Protect your crops against adverse weather instantly. Powered by Flare's FTSO prices and FDC data verification. No claims, no paperwork, just code.
            </p>

            <div className="flex justify-center flex-col md:flex-row gap-4">
              <Link href="/dashboard">
                <button className="bg-[#00ff9d] text-black px-8 py-3 rounded-full font-bold text-lg hover:shadow-[0_0_30px_rgba(0,255,157,0.4)] hover:-translate-y-1 transition-all flex items-center justify-center min-w-[200px]">
                  Get Protected
                  <Shield className="ml-2 w-5 h-5" />
                </button>
              </Link>
              <button className="bg-white/5 text-white border border-white/10 px-8 py-3 rounded-full font-bold text-lg hover:bg-white/10 hover:-translate-y-1 transition-all min-w-[200px]">
                Read Documentation
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Problem / Solution Grid */}
      <section className="py-20 bg-white/5" id="features">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <CloudRain className="w-8 h-8 text-blue-400" />,
                title: "The Problem",
                desc: "Traditional insurance is slow, bureaucratic, and prone to fraud. Farmers imply wait months for payouts."
              },
              {
                icon: <Zap className="w-8 h-8 text-[#00ff9d]" />,
                title: "The Solution",
                desc: "Parametric logic triggers payouts automatically when weather APIs verify adverse conditions via Flare's FDC."
              },
              {
                icon: <Globe className="w-8 h-8 text-purple-400" />,
                title: "FAsset Payments",
                desc: "Pay premiums and receive payouts in native assets like BTC, XRP, or DOGE bridged trustlessly to Flare."
              }
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl shadow-xl p-6 hover:border-[#00ff9d]/30 hover:-translate-y-2 transition-all duration-300"
              >
                <div className="bg-white/5 w-16 h-16 rounded-2xl flex items-center justify-center mb-6">
                  {item.icon}
                </div>
                <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                <p className="text-gray-400 leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works / Tech Stack */}
      <section className="py-24 relative" id="how-it-works">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center gap-16">
            <div className="md:w-1/2">
              <h2 className="text-4xl font-bold mb-6">Powered by <span className="text-gradient">Flare Network</span></h2>
              <p className="text-gray-400 mb-8 text-lg">
                We leverage Flare's enshrined oracles to build a system that is both trustless and data-rich.
              </p>

              <div className="space-y-6">
                {[
                  { title: "FTSO Integration", desc: "Real-time FLR/USD price feeds for accurate premium calculation." },
                  { title: "Flare Data Connector", desc: "Verifies off-chain weather API data trustlessly on-chain." },
                  { title: "Collateral Pools", desc: "Deep liquidity pools allow localized staking and yield generation." }
                ].map((item, i) => (
                  <div key={i} className="flex items-start space-x-4">
                    <div className="w-6 h-6 rounded-full bg-[#00ff9d]/20 flex items-center justify-center mt-1">
                      <div className="w-2 h-2 rounded-full bg-[#00ff9d]"></div>
                    </div>
                    <div>
                      <h4 className="font-bold text-white">{item.title}</h4>
                      <p className="text-gray-500 text-sm">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="md:w-1/2 relative">
              <div className="absolute inset-0 bg-gradient-to-r from-[#00ff9d] to-blue-500 blur-[100px] opacity-20"></div>
              <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl shadow-2xl p-8 relative border-t border-l border-white/20">
                <div className="flex items-center space-x-4 mb-6 border-b border-white/10 pb-4">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-xs text-gray-500 font-mono ml-auto">System Status: Active</span>
                </div>
                <div className="space-y-3 font-mono text-sm">
                  <p className="text-gray-500"># Verifying weather conditions...</p>
                  <p className="text-purple-400">{">"} Querying FDC for Location: 'London'</p>
                  <p className="text-blue-400">{">"} FTSO Price 'C2FLR': $0.0129</p>
                  <p className="text-[#00ff9d]">{">"} Condition: Rain {">"} 5mm (Threshold Met)</p>
                  <p className="text-white bg-green-500/20 inline-block px-2 py-1 rounded">
                    {">"} Payout Triggered: 5000 USD
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12 bg-black/50">
        <div className="container mx-auto px-6 text-center">
          <p className="text-gray-600 text-sm">© 2024 CropGuard. Built for the Flare Hackathon.</p>
        </div>
      </footer>
    </div>
  );
}
