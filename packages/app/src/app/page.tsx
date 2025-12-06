'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

export default function Home() {
  const [account, setAccount] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Form State
  const [location, setLocation] = useState('Bangalore');
  const [cropType, setCropType] = useState('Wheat');
  const [insuredAmount, setInsuredAmount] = useState('1000');

  const POLICY_MANAGER_ADDRESS = "0x4D800a55Ccbac49473476D976afE0c83973d043a"; // Deployed on Coston2 (Real FTSO Integrated)
  const POLICY_MANAGER_ABI = require('./PolicyManagerABI.json');

  // Load account on mount
  useEffect(() => {
    if ((window as any).ethereum) {
      (window as any).ethereum.request({ method: 'eth_accounts' })
        .then((accounts: string[]) => {
          if (accounts.length > 0) setAccount(accounts[0]);
        });
    }
  }, []);

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

  const purchasePolicy = async () => {
    if (!account) {
      alert("Please connect wallet first");
      return;
    }
    setLoading(true);
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(POLICY_MANAGER_ADDRESS, POLICY_MANAGER_ABI, signer);

      // Calculate premium (Simple logic: 1% of insured amount for demo)
      // insuredAmount is in USD (simulated), so we deposit FLR equivalent roughly
      // For hackathon, let's just send 10 FLR as premium
      const premium = ethers.parseEther("10");

      const tx = await contract.createPolicy(
        location,
        cropType,
        ethers.parseUnits(insuredAmount, 18),
        30 * 24 * 60 * 60, // 30 days
        { value: premium }
      );

      setStatus('Transaction Sent: ' + tx.hash);
      await tx.wait();
      setStatus('Policy Created Successfully! 🎉');

    } catch (e: any) {
      console.error(e);
      setStatus('Error: ' + (e.reason || e.message));
    } finally {
      setLoading(false);
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
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Crop Type</label>
                <select
                  value={cropType}
                  onChange={(e) => setCropType(e.target.value)}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                >
                  <option>Wheat</option>
                  <option>Rice</option>
                  <option>Maize</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Insured Amount (USD)</label>
                <input
                  type="number"
                  value={insuredAmount}
                  onChange={(e) => setInsuredAmount(e.target.value)}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                />
              </div>
              <button
                type="button"
                onClick={purchasePolicy}
                disabled={loading}
                className={`w-full text-white py-3 rounded-xl font-bold transition ${loading ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'}`}
              >
                {loading ? 'Processing...' : 'Calculate Premium & Pay (10 FLR)'}
              </button>
              {status && <p className="text-center text-sm font-semibold text-green-800 mt-2">{status}</p>}
            </form>
          </div>

          {/* Card 2: Status */}
          <div className="bg-white p-8 rounded-2xl shadow-xl border border-green-100">
            <h3 className="text-2xl font-bold mb-4 text-green-700">Your Policies</h3>
            {account ? (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex justify-between">
                    <span className="font-semibold">Policy #--</span>
                    <span className="text-green-600 font-bold">Active</span>
                  </div>
                  <p className="text-sm text-gray-600">Location: {location}</p>
                  <p className="text-sm text-gray-600">Insured: ${insuredAmount}</p>
                </div>
                <p className="text-sm text-gray-500 italic">Global weather status: Monitoring...</p>
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
