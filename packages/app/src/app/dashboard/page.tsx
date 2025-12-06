'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { motion } from 'framer-motion';
import { Shield, CloudRain, Wallet, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export default function Dashboard() {
    const [account, setAccount] = useState<string | null>(null);
    const [status, setStatus] = useState<string>('');
    const [loading, setLoading] = useState(false);

    // Form State
    const [location, setLocation] = useState('Bangalore');
    const [cropType, setCropType] = useState('Wheat');
    const [insuredAmount, setInsuredAmount] = useState('1000');

    const POLICY_MANAGER_ADDRESS = "0x24d656DEa3a449A894d3fDEB93dAc30eCCe2bADD";
    const POLICY_MANAGER_ABI = require('../PolicyManagerABI.json');

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

            const premium = ethers.parseEther("10");

            const tx = await contract.createPolicy(
                location,
                cropType,
                ethers.parseUnits(insuredAmount, 18),
                30 * 24 * 60 * 60,
                { value: premium }
            );

            setStatus('Transaction Sent: ' + tx.hash);
            await tx.wait();
            setStatus('Policy Created Successfully! 🎉');

        } catch (e: any) {
            console.error(e);
            if (e.code === 'ACTION_REJECTED' || e.code === 4001) {
                setStatus('Transaction cancelled by user 🚫');
            } else {
                setStatus('Error: ' + (e.reason || e.message || "Unknown error"));
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-green-500/30">
            {/* Navigation */}
            <nav className="border-b border-white/10 backdrop-blur-md fixed w-full z-50 bg-[#050505]/80">
                <div className="container mx-auto px-6 py-4 flex justify-between items-center">
                    <Link href="/" className="flex items-center space-x-2">
                        <Shield className="w-8 h-8 text-[#00ff9d]" />
                        <span className="text-xl font-bold tracking-tight">CropGuard</span>
                    </Link>
                    <button
                        onClick={connect}
                        className="flex items-center space-x-2 bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-full transition-all"
                    >
                        <Wallet className="w-4 h-4 text-[#00ff9d]" />
                        <span className="text-sm font-medium">
                            {account ? `${account.substring(0, 6)}...${account.substring(38)}` : 'Connect Wallet'}
                        </span>
                    </button>
                </div>
            </nav>

            <main className="container mx-auto px-6 pt-32 pb-20">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-12"
                >
                    <h1 className="text-4xl font-bold mb-4">Farmer Dashboard</h1>
                    <p className="text-gray-400">Manage your crop insurance policies and monitor weather risks.</p>
                </motion.div>

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Create Policy Card */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                        className="lg:col-span-2 backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl shadow-xl p-6 relative overflow-hidden group"
                    >
                        <div className="absolute top-0 right-0 w-64 h-64 bg-[#00ff9d]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-[#00ff9d]/10 transition-all duration-700"></div>

                        <h2 className="text-2xl font-bold mb-6 flex items-center">
                            <Shield className="w-6 h-6 text-[#00ff9d] mr-3" />
                            New Policy
                        </h2>

                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm text-gray-400">Farm Location</label>
                                <input
                                    type="text"
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-[#00ff9d]/50 transition-colors"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm text-gray-400">Crop Type</label>
                                <select
                                    value={cropType}
                                    onChange={(e) => setCropType(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-[#00ff9d]/50 transition-colors [&>option]:bg-black"
                                >
                                    <option>Wheat</option>
                                    <option>Rice</option>
                                    <option>Maize</option>
                                </select>
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-sm text-gray-400">Insured Amount (USD)</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                    <input
                                        type="number"
                                        value={insuredAmount}
                                        onChange={(e) => setInsuredAmount(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-4 py-3 focus:outline-none focus:border-[#00ff9d]/50 transition-colors"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 pt-8 border-t border-white/10 flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-400">Estimated Premium</p>
                                <p className="text-2xl font-bold text-[#00ff9d]">10 FLR</p>
                            </div>
                            <button
                                onClick={purchasePolicy}
                                disabled={loading}
                                className={`bg-[#00ff9d] text-black px-8 py-3 rounded-xl font-bold text-lg hover:shadow-[0_0_20px_rgba(0,255,157,0.4)] transition-all flex items-center ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {loading ? 'Processing...' : 'Purchase Coverage'}
                                {!loading && <ChevronRight className="w-5 h-5 ml-2" />}
                            </button>
                        </div>
                        {status && <p className="mt-4 text-center text-sm text-[#00ff9d]">{status}</p>}
                    </motion.div>

                    {/* Active Policies / Status */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="space-y-8"
                    >
                        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl shadow-2xl p-6">
                            <h3 className="text-lg font-bold mb-4 flex items-center text-white">
                                <CloudRain className="w-5 h-5 text-blue-400 mr-2" />
                                Live Weather Monitor
                            </h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center p-3 rounded-lg bg-white/5">
                                    <span className="text-gray-400">Location</span>
                                    <span className="font-medium">{location}</span>
                                </div>
                                <div className="flex justify-between items-center p-3 rounded-lg bg-white/5">
                                    <span className="text-gray-400">Condition</span>
                                    <span className="text-green-400 font-medium">Normal</span>
                                </div>
                                <div className="flex justify-between items-center p-3 rounded-lg bg-white/5">
                                    <span className="text-gray-400">Oracle Status</span>
                                    <span className="flex items-center text-xs text-[#00ff9d] bg-[#00ff9d]/10 px-2 py-1 rounded-full">
                                        <span className="w-2 h-2 bg-[#00ff9d] rounded-full mr-2 animate-pulse"></span>
                                        Online
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl shadow-2xl p-6">
                            <h3 className="text-lg font-bold mb-4 text-white">Your Wallet</h3>
                            {account ? (
                                <div className="space-y-2">
                                    <div className="p-3 bg-gradient-to-r from-green-500/10 to-blue-500/10 rounded-lg border border-white/5">
                                        <p className="text-xs text-gray-400 mb-1">Coston2 Testnet</p>
                                        <p className="font-mono text-sm break-all">{account}</p>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-gray-500 text-sm">Connect wallet to view details.</p>
                            )}
                        </div>
                    </motion.div>
                </div>
            </main>
        </div>
    );
}
