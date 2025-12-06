'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { ethers } from 'ethers';
import { motion } from 'framer-motion';
import { Shield, CloudRain, Wallet, ChevronRight } from 'lucide-react';
import Link from 'next/link';

const POLICY_MANAGER_ABI = require('../PolicyManagerABI.json');
const COLLATERAL_POOL_ABI = require('../CollateralPoolABI.json');
const WEATHER_ADAPTER_ABI = [
    "function isAdverse(string location) external view returns (bool)"
];
const FTSO_REGISTRY_ABI = [
    "function getCurrentPriceWithDecimals(string memory _symbol) external view returns (uint256 value, uint256 timestamp, uint256 decimals)"
];

const CONFIG = {
    policyManager: process.env.NEXT_PUBLIC_POLICY_MANAGER_ADDRESS || "0x24d656DEa3a449A894d3fDEB93dAc30eCCe2bADD",
    weatherAdapter: process.env.NEXT_PUBLIC_WEATHER_ADAPTER_ADDRESS || "0x0000000000000000000000000000000000000000",
    ftsoRegistry: process.env.NEXT_PUBLIC_FTSO_REGISTRY_ADDRESS || "0x48Da21ce34966A64E267CeFb78012C0282D0Ac87",
    ftsoSymbol: process.env.NEXT_PUBLIC_FTSO_SYMBOL || "C2FLR",
    rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || "https://coston2-api.flare.network/ext/C/rpc",
    collateralPool: process.env.NEXT_PUBLIC_COLLATERAL_POOL_ADDRESS || "0x0000000000000000000000000000000000000000",
};

export default function Dashboard() {
    const [account, setAccount] = useState<string | null>(null);
    const [status, setStatus] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [chainLoading, setChainLoading] = useState(false);

    // Form State
    const [location, setLocation] = useState('Bangalore');
    const [cropType, setCropType] = useState('Wheat');
    const [insuredAmount, setInsuredAmount] = useState('1000');
    const [stakeAmount, setStakeAmount] = useState('10');
    const [unstakeAmount, setUnstakeAmount] = useState('0');
    const [pendingRewards, setPendingRewards] = useState<string>('0');
    const [poolLiquidity, setPoolLiquidity] = useState<string>('0');
    const [poolStaked, setPoolStaked] = useState<string>('0');
    const [premiumFLR, setPremiumFLR] = useState('10.0000'); // 1 FLR per $100 insured

    // Chain data
    const [latestPolicyId, setLatestPolicyId] = useState<number | null>(null);
    const [latestPolicyLocation, setLatestPolicyLocation] = useState<string>('');
    const [policyStatus, setPolicyStatus] = useState<string>('Not created yet');
    const [weatherStatus, setWeatherStatus] = useState<string>('Unknown');
    const [oracleOnline, setOracleOnline] = useState<boolean>(false);
    const [flrPrice, setFlrPrice] = useState<string>('');
    const [insuredAmountDisplay, setInsuredAmountDisplay] = useState<string>('');

    const rpcProvider = useMemo(() => new ethers.JsonRpcProvider(CONFIG.rpcUrl), []);

    const loadChainData = useCallback(async () => {
        setChainLoading(true);
        try {
            const policyContract = new ethers.Contract(CONFIG.policyManager, POLICY_MANAGER_ABI, rpcProvider);
            const ftsoContract = new ethers.Contract(CONFIG.ftsoRegistry, FTSO_REGISTRY_ABI, rpcProvider);
            const weatherAdapter = new ethers.Contract(CONFIG.weatherAdapter, WEATHER_ADAPTER_ABI, rpcProvider);
            const poolContract = new ethers.Contract(CONFIG.collateralPool, COLLATERAL_POOL_ABI, rpcProvider);

            const count: bigint = await policyContract.policyCount();
            if (count > BigInt(0)) {
                const policy = await policyContract.getPolicy(count);
                setLatestPolicyId(Number(count));
                setLatestPolicyLocation(policy.location);
                setPolicyStatus(policy.paidOut ? 'Paid out' : policy.active ? 'Active' : 'Inactive');
                setInsuredAmountDisplay((Number(policy.insuredAmount) / 100).toFixed(2)); // cents -> USD

                try {
                    const isAdverse: boolean = await weatherAdapter.isAdverse(policy.location);
                    setWeatherStatus(isAdverse ? 'Adverse (rain/heat)' : 'Normal');
                    setOracleOnline(true);
                } catch (err) {
                    setWeatherStatus('Unavailable (WeatherAdapter call failed)');
                    setOracleOnline(false);
                }
            } else {
                setPolicyStatus('No policies yet');
            }

            try {
                const [price, , decimals]: [bigint, bigint, bigint] = await ftsoContract.getCurrentPriceWithDecimals(CONFIG.ftsoSymbol);
                const formatted = Number(price) / Number((BigInt(10) ** decimals));
                setFlrPrice(`$${formatted.toFixed(6)} (${CONFIG.ftsoSymbol})`);
            } catch (err) {
                setFlrPrice('Unavailable');
            }

            try {
                const liquidity: bigint = await poolContract.totalLiquidity();
                const staked: bigint = await poolContract.totalStakedFLR();
                setPoolLiquidity(ethers.formatEther(liquidity));
                setPoolStaked(ethers.formatEther(staked));

                if (account) {
                    const pending: bigint = await poolContract.pendingRewards(account);
                    setPendingRewards(ethers.formatEther(pending));
                } else {
                    setPendingRewards('0');
                }
            } catch (err) {
                console.error('Failed to load pool data', err);
            }
        } catch (err: any) {
            console.error('Failed to load chain data', err);
            setPolicyStatus('Error loading data');
        } finally {
            setChainLoading(false);
        }
    }, [rpcProvider, account]);

    useEffect(() => {
        if ((window as any).ethereum) {
            (window as any).ethereum.request({ method: 'eth_accounts' })
                .then((accounts: string[]) => {
                    if (accounts.length > 0) setAccount(accounts[0]);
                });
        }
        loadChainData();
    }, [loadChainData]);

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
        const premiumNum = Number(premiumFLR);
        if (!premiumNum || premiumNum <= 0) {
            alert("Premium must be greater than zero");
            return;
        }
        setLoading(true);
        try {
            const provider = new ethers.BrowserProvider((window as any).ethereum);
            const signer = await provider.getSigner();
            const contract = new ethers.Contract(CONFIG.policyManager, POLICY_MANAGER_ABI, signer);

            const premium = ethers.parseEther(premiumNum.toFixed(6));

            const tx = await contract.createPolicy(
                location,
                cropType,
                ethers.parseUnits(insuredAmount, 2), // store as USD cents
                30 * 24 * 60 * 60,
                { value: premium }
            );

            setStatus('Transaction Sent: ' + tx.hash);
            await tx.wait();
            setStatus('Policy Created Successfully! 🎉');
            await loadChainData();

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

    const stakeFLR = async () => {
        if (!account) {
            alert("Please connect wallet first");
            return;
        }
        const amt = Number(stakeAmount);
        if (!amt || amt <= 0) {
            alert("Stake amount must be greater than zero");
            return;
        }
        try {
            const provider = new ethers.BrowserProvider((window as any).ethereum);
            const signer = await provider.getSigner();
            const pool = new ethers.Contract(CONFIG.collateralPool, COLLATERAL_POOL_ABI, signer);
            const tx = await pool.stake({ value: ethers.parseEther(amt.toFixed(6)) });
            setStatus('Staking TX: ' + tx.hash);
            await tx.wait();
            setStatus('Staked successfully');
            await loadChainData();
        } catch (e: any) {
            console.error(e);
            setStatus('Error staking: ' + (e.reason || e.message || 'Unknown'));
        }
    };

    const unstakeFLR = async () => {
        if (!account) {
            alert("Please connect wallet first");
            return;
        }
        const amt = Number(unstakeAmount);
        if (!amt || amt <= 0) {
            alert("Unstake amount must be greater than zero");
            return;
        }
        try {
            const provider = new ethers.BrowserProvider((window as any).ethereum);
            const signer = await provider.getSigner();
            const pool = new ethers.Contract(CONFIG.collateralPool, COLLATERAL_POOL_ABI, signer);
            const tx = await pool.unstake(ethers.parseEther(amt.toFixed(6)));
            setStatus('Unstake TX: ' + tx.hash);
            await tx.wait();
            setStatus('Unstaked successfully');
            await loadChainData();
        } catch (e: any) {
            console.error(e);
            setStatus('Error unstaking: ' + (e.reason || e.message || 'Unknown'));
        }
    };

    const claimRewards = async () => {
        if (!account) {
            alert("Please connect wallet first");
            return;
        }
        try {
            const provider = new ethers.BrowserProvider((window as any).ethereum);
            const signer = await provider.getSigner();
            const pool = new ethers.Contract(CONFIG.collateralPool, COLLATERAL_POOL_ABI, signer);
            const tx = await pool.claimRewards();
            setStatus('Claim TX: ' + tx.hash);
            await tx.wait();
            setStatus('Rewards claimed');
            await loadChainData();
        } catch (e: any) {
            console.error(e);
            setStatus('Error claiming: ' + (e.reason || e.message || 'Unknown'));
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

            <main className="container mx-auto px-6 pt-32 pb-20 space-y-12">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-3"
                >
                    <h1 className="text-4xl font-bold">CropGuard Dashboard</h1>
                    <p className="text-gray-400">Two tracks: Farmers buy coverage; Liquidity providers stake and earn.</p>
                </motion.div>

                {/* Farmer section */}
                <section className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs uppercase text-gray-400">Section</p>
                            <h2 className="text-2xl font-bold">Farmers</h2>
                        </div>
                        <div className="text-sm text-gray-500">Policy + Weather + Price</div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-4">
                        <StatCard label="Policy Status" value={policyStatus} accent="text-[#00ff9d]"/>
                        <StatCard label="FLR Price" value={flrPrice || 'Loading...'} />
                        <StatCard label="Condition" value={weatherStatus} accent={weatherStatus.includes('Adverse') ? 'text-red-400' : 'text-green-400'} />
                    </div>

                    <div className="grid lg:grid-cols-3 gap-6 items-start">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.05 }}
                            className="lg:col-span-2 backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl shadow-xl p-6 relative overflow-hidden group"
                        >
                            <div className="absolute top-0 right-0 w-64 h-64 bg-[#00ff9d]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-[#00ff9d]/10 transition-all duration-700"></div>

                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-2xl font-bold flex items-center">
                                    <Shield className="w-6 h-6 text-[#00ff9d] mr-3" />
                                    Create Coverage
                                </h3>
                                <div className="text-sm text-gray-400">Premium: 1 FLR per $100 insured</div>
                            </div>

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
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                setInsuredAmount(value);
                                                const num = Number(value || '0');
                                                const prem = Math.max(0, num * 0.01);
                                                setPremiumFLR(prem.toFixed(4));
                                            }}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-4 py-3 focus:outline-none focus:border-[#00ff9d]/50 transition-colors"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 pt-6 border-t border-white/10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                <div>
                                    <p className="text-sm text-gray-400">Estimated Premium</p>
                                    <p className="text-2xl font-bold text-[#00ff9d]">{premiumFLR} FLR</p>
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

                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 }}
                            className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl shadow-2xl p-6"
                        >
                            <h3 className="text-lg font-bold mb-4 flex items-center text-white">
                                <CloudRain className="w-5 h-5 text-blue-400 mr-2" />
                                Weather & Policy Status
                            </h3>
                            <div className="space-y-3">
                                <StatusRow label="Latest Policy" value={chainLoading ? 'Loading...' : latestPolicyId ? `#${latestPolicyId}` : 'None'} />
                                <StatusRow label="Location" value={latestPolicyLocation || location} />
                                <StatusRow label="Condition" value={chainLoading ? 'Checking...' : weatherStatus} valueClass={weatherStatus.includes('Adverse') ? 'text-red-400' : 'text-green-400'} />
                                <StatusRow label="Oracle" value={oracleOnline ? 'Online' : 'Offline'} valueClass={oracleOnline ? 'text-[#00ff9d]' : 'text-red-400'} />
                                <StatusRow label="FLR Price" value={flrPrice || 'Loading...'} />
                                <StatusRow label="Status" value={policyStatus} />
                                {insuredAmountDisplay && <StatusRow label="Insured Value" value={`$${insuredAmountDisplay}`} />}
                            </div>
                        </motion.div>
                    </div>
                </section>

                {/* Liquidity provider section */}
                <section className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs uppercase text-gray-400">Section</p>
                            <h2 className="text-2xl font-bold">Liquidity Providers</h2>
                        </div>
                        <div className="text-sm text-gray-500">Stake FLR, earn premiums</div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-4">
                        <StatCard label="Pool Liquidity" value={`${poolLiquidity} FLR`} />
                        <StatCard label="Total Staked" value={`${poolStaked} FLR`} />
                        <StatCard label="Your Pending" value={`${pendingRewards} FLR`} accent="text-[#00ff9d]" />
                    </div>

                    <div className="grid lg:grid-cols-3 gap-6 items-start">
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.05 }}
                            className="lg:col-span-2 backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl shadow-2xl p-6"
                        >
                            <h3 className="text-lg font-bold mb-4 text-white">Provide Liquidity (Stake FLR)</h3>
                            <div className="grid grid-cols-2 gap-3 text-sm text-gray-300 mb-4">
                                <StatusRow label="Pool Liquidity" value={`${poolLiquidity} FLR`} compact />
                                <StatusRow label="Total Staked" value={`${poolStaked} FLR`} compact />
                                <StatusRow label="Your Pending" value={`${pendingRewards} FLR`} valueClass="text-[#00ff9d]" compact />
                                {account ? <StatusRow label="Wallet" value={`${account.substring(0,6)}...${account.substring(38)}`} compact /> : <StatusRow label="Wallet" value="Not connected" compact />}
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <label className="text-sm text-gray-400">Stake FLR</label>
                                    <div className="flex gap-3 mt-1">
                                        <input
                                            type="number"
                                            value={stakeAmount}
                                            onChange={(e) => setStakeAmount(e.target.value)}
                                            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-[#00ff9d]/50 transition-colors"
                                        />
                                        <button
                                            onClick={stakeFLR}
                                            className="bg-[#00ff9d] text-black px-4 py-3 rounded-xl font-bold hover:shadow-[0_0_12px_rgba(0,255,157,0.4)] transition-all"
                                        >
                                            Stake
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-sm text-gray-400">Unstake FLR</label>
                                    <div className="flex gap-3 mt-1">
                                        <input
                                            type="number"
                                            value={unstakeAmount}
                                            onChange={(e) => setUnstakeAmount(e.target.value)}
                                            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-[#00ff9d]/50 transition-colors"
                                        />
                                        <button
                                            onClick={unstakeFLR}
                                            className="bg-white/5 text-white border border-white/10 px-4 py-3 rounded-xl font-bold hover:bg-white/10 transition-all"
                                        >
                                            Unstake
                                        </button>
                                    </div>
                                </div>
                                <button
                                    onClick={claimRewards}
                                    className="w-full bg-white/5 text-white border border-white/10 px-4 py-3 rounded-xl font-bold hover:bg-white/10 transition-all"
                                >
                                    Claim Rewards
                                </button>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 }}
                            className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl shadow-2xl p-6"
                        >
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
                        </motion.div>
                    </div>
                </section>
            </main>
        </div>
    );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
    return (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur">
            <p className="text-xs uppercase tracking-wide text-gray-400">{label}</p>
            <p className={`text-xl font-bold mt-2 ${accent || 'text-white'}`}>{value}</p>
        </div>
    );
}

function StatusRow({ label, value, valueClass, compact }: { label: string; value: string; valueClass?: string; compact?: boolean }) {
    return (
        <div className={`flex ${compact ? 'text-xs' : 'text-sm'} justify-between items-center p-3 rounded-lg bg-white/5`}>
            <span className="text-gray-400">{label}</span>
            <span className={`font-medium ${valueClass || 'text-white'}`}>{value}</span>
        </div>
    );
}
