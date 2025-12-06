'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

export default function Home() {
  const [account, setAccount] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('');

  // Connect function
  const connect = async () => {
    if ((window as any).ethereum) {
      try {
        const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
        setAccount(accounts[0]);
        setStatus('Connected');
      } catch (err: any) {
        setStatus('Error: ' + err.message);
      }
    } else {
      setStatus('Please install MetaMask');
    }
  };

  // Placeholder for PolicyManager ABI and Address
  // In a real app, import from artifacts/contracts/modules/PolicyManager.sol/PolicyManager.json
  const POLICY_MANAGER_ADDRESS = "0x5EFDbb2F25d944F39D59f654Bf28Ebd8d49CD3fE"; // Deployed on Coston2

  const purchasePolicy = async () => {
    if (!account) return;
    try {
      // Mock interaction for Hackathon frontend prototype
      // specific logic would require ethers.Contract with ABI
      alert("Integrate PolicyManager.sol at " + POLICY_MANAGER_ADDRESS);
      console.log("Buying policy for location: ", "Bangalore");
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-green-50 text-gray-800 font-sans">
      <header className="flex justify-between items-center p-6 bg-green-600 text-white shadow-lg">
        <h1 className="text-3xl font-bold">CropGuard 🌾</h1>
        <button
          onClick={connect}
          className="bg-white text-green-700 px-4 py-2 rounded-full font-semibold hover:bg-green-100 transition"
        >
          {account ? `Connected: ${account.substring(0, 6)}...` : 'Connect Wallet'}
        </button>
      </header>

      <main className="container mx-auto p-10">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-extrabold text-green-800 mb-4">Decentralized Crop Insurance</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Parametric insurance powered by Flare Network. Instant payouts triggered by real-world weather data.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Card 1: Buy Policy */}
          <div className="bg-white p-8 rounded-2xl shadow-xl border border-green-100">
            <h3 className="text-2xl font-bold mb-4 text-green-700">Protect Your Crops</h3>
            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Location</label>
                <input type="text" placeholder="e.g. Bangalore, IN" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Crop Type</label>
                <select className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none">
                  <option>Wheat</option>
                  <option>Rice</option>
                  <option>Maize</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Insured Amount (USD)</label>
                <input type="number" placeholder="1000" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none" />
              </div>
              <button type="button" onClick={purchasePolicy} className="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transition">
                Calculate Premium & Pay
              </button>
            </form>
          </div>

          {/* Card 2: Status */}
          <div className="bg-white p-8 rounded-2xl shadow-xl border border-green-100">
            <h3 className="text-2xl font-bold mb-4 text-green-700">Your Policies</h3>
            {account ? (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex justify-between">
                    <span className="font-semibold">Policy #1024</span>
                    <span className="text-green-600 font-bold">Active</span>
                  </div>
                  <p className="text-sm text-gray-600">Location: Bangalore</p>
                  <p className="text-sm text-gray-600">Insured: $5,000</p>
                </div>
                <p className="text-sm text-gray-500 italic">Weather conditions are currently normal.</p>
              </div>
            ) : (
              <p className="text-gray-500">Connect your wallet to view your policies.</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
