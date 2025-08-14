import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, onSnapshot, collection, query, orderBy, limit, serverTimestamp } from 'firebase/firestore';

/**
 * MindMatch 4 — production build
 *
 * This is a corrected and enhanced version of the MindMatch 4 game.
 * It's a single, self-contained React component ready to be used in your project.
 *
 * Key features include:
 * - A refined game loop and state management.
 * - Robust Firebase Firestore integration for a global, real-time leaderboard.
 * - Corrected and clean CSS styling for a responsive, modern UI.
 * - An intelligent AI opponent using the Minimax algorithm.
 *
 * @author Gemini
 */

// --- Global Constants & Utilities ---
const ROWS = 6;
const COLS = 7;
const HUMAN = 1;
const AI = 2;

const LS_PROFILE = "mm4_profile_v9";
const LS_STATS = "mm4_stats_v9";
const LS_NAME = "mm4_name";
const LS_THEME = "mm4_theme"; // "system" | "light" | "dark"

// Firebase global variables
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');

const clone = b => b.map(r => r.slice());
const empty = () => Array.from({ length: ROWS }, () => Array(COLS).fill(0));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// --- Theme Management ---
const applyTheme = (mode) => {
    if (mode === "system" || !mode) {
        document.documentElement.removeAttribute("data-theme");
        return;
    }
    document.documentElement.setAttribute("data-theme", mode);
};

const useTheme = () => {
    const cached = localStorage.getItem(LS_THEME);
    const init = (cached === "light" || cached === "dark" || cached === "system") ? cached : "system";
    const [mode, setMode] = useState(init);
    useEffect(() => {
        applyTheme(mode);
        localStorage.setItem(LS_THEME, mode || "system");
    }, [mode]);
    return [mode, setMode];
};

// --- Storage & Profile Management ---
const defProfile = () => ({
    humanColumnFreq: Array(COLS).fill(0),
    lastTen: [],
    aiConfig: { depth: 4, randomness: 0.2, style: "balanced" }
});

const loadProfile = () => {
    try {
        const s = localStorage.getItem(LS_PROFILE);
        if (!s) return defProfile();
        const p = JSON.parse(s);
        return { ...defProfile(), ...p, aiConfig: { ...defProfile().aiConfig, ...(p.aiConfig || {}) } };
    } catch {
        return defProfile();
    }
};

const saveProfile = (p) => localStorage.setItem(LS_PROFILE, JSON.stringify(p));

const defStats = () => ({
    games: 0, wins: 0, losses: 0, draws: 0, bestStreak: 0, curStreak: 0, rating: 1200
});

const loadStats = () => {
    try {
        return JSON.parse(localStorage.getItem(LS_STATS)) || defStats();
    } catch {
        return defStats();
    }
};

const saveStats = (s) => localStorage.setItem(LS_STATS, JSON.stringify(s));

// --- AI Logic (Minimax with Alpha-Beta Pruning) ---
const evalWin = (window, player) => {
    const opponent = player === AI ? HUMAN : AI;
    const playerCount = window.filter(x => x === player).length;
    const opponentCount = window.filter(x => x === opponent).length;
    const emptyCount = window.filter(x => x === 0).length;

    if (playerCount === 4) return 100000;
    if (playerCount === 3 && emptyCount === 1) return 200;
    if (playerCount === 2 && emptyCount === 2) return 40;
    if (opponentCount === 3 && emptyCount === 1) return -180;
    if (opponentCount === 2 && emptyCount === 2) return -30;
    return 0;
};

const scorePosition = (board, player, style = "balanced") => {
    let score = 0;
    const center = Math.floor(COLS / 2);

    // Center column bias
    for (let r = 0; r < ROWS; r++) {
        if (board[r][center] === player) score += 8;
    }

    // Evaluate all 4-cell windows
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS - 3; c++) {
            score += evalWin([board[r][c], board[r][c + 1], board[r][c + 2], board[r][c + 3]], player);
        }
    }
    for (let c = 0; c < COLS; c++) {
        for (let r = 0; r < ROWS - 3; r++) {
            score += evalWin([board[r][c], board[r + 1][c], board[r + 2][c], board[r + 3][c]], player);
        }
    }
    for (let r = 0; r < ROWS - 3; r++) {
        for (let c = 0; c < COLS - 3; c++) {
            score += evalWin([board[r][c], board[r + 1][c + 1], board[r + 2][c + 2], board[r + 3][c + 3]], player);
        }
    }
    for (let r = 3; r < ROWS; r++) {
        for (let c = 0; c < COLS - 3; c++) {
            score += evalWin([board[r][c], board[r - 1][c + 1], board[r - 2][c + 2], board[r - 3][c + 3]], player);
        }
    }

    if (style === "aggressive") score *= 1.08;
    else if (style === "defensive") score *= 0.98;
    return score;
};

const checkWin = (board, player) => {
    // Horizontal check
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS - 3; c++) {
            if (board[r][c] === player && board[r][c + 1] === player && board[r][c + 2] === player && board[r][c + 3] === player) {
                return true;
            }
        }
    }
    // Vertical check
    for (let c = 0; c < COLS; c++) {
        for (let r = 0; r < ROWS - 3; r++) {
            if (board[r][c] === player && board[r + 1][c] === player && board[r + 2][c] === player && board[r + 3][c] === player) {
                return true;
            }
        }
    }
    // Diagonal (down-right) check
    for (let r = 0; r < ROWS - 3; r++) {
        for (let c = 0; c < COLS - 3; c++) {
            if (board[r][c] === player && board[r + 1][c + 1] === player && board[r + 2][c + 2] === player && board[r + 3][c + 3] === player) {
                return true;
            }
        }
    }
    // Diagonal (up-right) check
    for (let r = 3; r < ROWS; r++) {
        for (let c = 0; c < COLS - 3; c++) {
            if (board[r][c] === player && board[r - 1][c + 1] === player && board[r - 2][c + 2] === player && board[r - 3][c + 3] === player) {
                return true;
            }
        }
    }
    return false;
};

const isBoardFull = (board) => board[0].every(cell => cell !== 0);

const minimax = (board, depth, isMaximizing, style, bias, alpha = -Infinity, beta = Infinity) => {
    const terminal = checkWin(board, HUMAN) || checkWin(board, AI) || isBoardFull(board);
    if (depth === 0 || terminal) {
        if (checkWin(board, AI)) return { score: 1e9 };
        if (checkWin(board, HUMAN)) return { score: -1e9 };
        if (isBoardFull(board)) return { score: 0 };
        return { score: scorePosition(board, AI, style) };
    }

    const availableMoves = board[0].map((_, c) => c).filter(c => board[0][c] === 0);
    const moves = availableMoves.sort((a, b) => Math.abs(a - 3) - Math.abs(b - 3));
    const penalty = c => (bias[c] || 0) * 1.5;

    if (isMaximizing) {
        let best = { score: -Infinity, col: moves[0] };
        for (const c of moves) {
            const tempBoard = clone(board);
            let r = tempBoard.map((row, i) => i).reverse().find(i => tempBoard[i][c] === 0);
            if (r === undefined) continue;
            tempBoard[r][c] = AI;
            const { score } = minimax(tempBoard, depth - 1, false, style, bias, alpha, beta);
            const finalScore = score - penalty(c);
            if (finalScore > best.score) {
                best = { score: finalScore, col: c };
            }
            alpha = Math.max(alpha, finalScore);
            if (beta <= alpha) break;
        }
        return best;
    } else {
        let best = { score: Infinity, col: moves[0] };
        for (const c of moves) {
            const tempBoard = clone(board);
            let r = tempBoard.map((row, i) => i).reverse().find(i => tempBoard[i][c] === 0);
            if (r === undefined) continue;
            tempBoard[r][c] = HUMAN;
            const { score } = minimax(tempBoard, depth - 1, true, style, bias, alpha, beta);
            const finalScore = score + penalty(c);
            if (finalScore < best.score) {
                best = { score: finalScore, col: c };
            }
            beta = Math.min(beta, finalScore);
            if (beta <= alpha) break;
        }
        return best;
    }
};

// --- Game Adaptation & Stats ---
const adapt = (profile, stats) => {
    const winRate = (stats.wins || 0) / Math.max(1, stats.games || 0);
    const streaky = (stats.curStreak || 0) >= 3;
    const depth = Math.round(3 + 4 * clamp(winRate * 1.4, 0, 1));
    const randomness = Math.max(0.05, 0.35 - winRate * 0.4 - (streaky ? 0.08 : 0));
    const centerFreq = (profile.humanColumnFreq[3] || 0) + (profile.humanColumnFreq[2] || 0) + (profile.humanColumnFreq[4] || 0);
    const edgeFreq = (profile.humanColumnFreq[0] || 0) + (profile.humanColumnFreq[1] || 0) + (profile.humanColumnFreq[5] || 0) + (profile.humanColumnFreq[6] || 0);
    profile.aiConfig = {
        depth,
        randomness: Number(randomness.toFixed(2)),
        style: centerFreq >= edgeFreq ? "defensive" : "aggressive"
    };
    return profile;
};

const updateStats = (stats, result) => {
    const newStats = { ...stats };
    newStats.games++;
    if (result === 'W') {
        newStats.wins++;
        newStats.curStreak++;
        newStats.bestStreak = Math.max(newStats.bestStreak, newStats.curStreak);
        newStats.rating += 12 + Math.max(0, 6 - Math.floor(newStats.curStreak / 2));
    } else if (result === 'L') {
        newStats.losses++;
        newStats.curStreak = 0;
        newStats.rating -= 10;
    } else {
        newStats.draws++;
        newStats.rating -= 2;
    }
    newStats.rating = clamp(Math.round(newStats.rating), 600, 3000);
    return newStats;
};

// --- UI Components ---
const Board = ({ board, onDrop, disabled }) => {
    const handleMouseUp = (e) => {
        if (disabled) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const colWidth = rect.width / COLS;
        const col = Math.floor(x / colWidth);
        onDrop(col);
    };

    return (
        <div
            className="grid gap-2 p-2 rounded-xl bg-gray-700 aspect-square w-full"
            style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}
            onMouseUp={handleMouseUp}
            onTouchEnd={e => {
                // To support touch, use the last touch point
                const touch = e.changedTouches[0];
                const rect = e.currentTarget.getBoundingClientRect();
                const x = touch.clientX - rect.left;
                const colWidth = rect.width / COLS;
                const col = Math.floor(x / colWidth);
                onDrop(col);
            }}
        >
            {board.map((row, r) =>
                row.map((cell, c) => (
                    <div
                        key={`${r}-${c}`}
                        className="bg-white rounded-full aspect-square relative overflow-hidden"
                    >
                        {cell !== 0 && (
                            <div className={`
                                absolute inset-1 rounded-full
                                ${cell === HUMAN ? 'bg-red-500' : 'bg-yellow-500'}
                                animate-drop
                            `} style={{ animationDelay: `${r * 0.05}s` }}></div>
                        )}
                    </div>
                ))
            )}
        </div>
    );
};

const StatsPanel = ({ stats, userId, playerName }) => {
    const formatRating = (rating) => {
        if (rating === 3000) return "Master";
        if (rating >= 2000) return "Expert";
        if (rating >= 1500) return "Advanced";
        return "Novice";
    }

    return (
        <div className="p-4 bg-gray-800 text-white rounded-xl shadow-lg flex flex-col gap-4">
            <h2 className="text-xl font-bold">Player Stats</h2>
            <p className="text-sm">User ID: <span className="font-mono text-xs">{userId || 'Loading...'}</span></p>
            <div className="grid grid-cols-2 gap-2 text-sm">
                <div>Games Played: {stats.games}</div>
                <div>Wins: {stats.wins}</div>
                <div>Losses: {stats.losses}</div>
                <div>Draws: {stats.draws}</div>
                <div>Current Streak: {stats.curStreak}</div>
                <div>Best Streak: {stats.bestStreak}</div>
                <div>Rating: {stats.rating} ({formatRating(stats.rating)})</div>
            </div>
            <p className="text-sm text-center mt-2 opacity-70">
                Play more games to see your stats change!
            </p>
        </div>
    );
};

const Leaderboard = ({ leaders }) => {
    return (
        <div className="p-4 bg-gray-800 text-white rounded-xl shadow-lg">
            <h2 className="text-xl font-bold mb-4">Global Leaderboard</h2>
            <ul className="space-y-2">
                {leaders.length > 0 ? (
                    leaders.map((leader, index) => (
                        <li key={leader.id} className="flex justify-between items-center bg-gray-700 p-2 rounded-md">
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-lg">{index + 1}.</span>
                                <span className="truncate">{leader.name || 'Anonymous'}</span>
                            </div>
                            <span className="font-semibold text-lg">{leader.stats.rating}</span>
                        </li>
                    ))
                ) : (
                    <li className="text-sm opacity-70">Loading leaderboard...</li>
                )}
            </ul>
        </div>
    );
};

const Confetti = () => (
    <div className="confetti-container">
        {Array.from({ length: 50 }).map((_, i) => (
            <div
                key={i}
                className="confetti-piece"
                style={{
                    left: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 1.5}s`,
                    backgroundColor: `hsl(${Math.random() * 360}, 100%, 50%)`,
                    '--x': `${(Math.random() - 0.5) * 200}px`,
                    '--y': `${(Math.random() * 200) + 100}vh`,
                    '--r': `${Math.random() * 360}deg`
                }}
            ></div>
        ))}
    </div>
);

// --- Main App Component ---
export default function App() {
    // State management for game and UI
    const [theme, setTheme] = useTheme();
    const [board, setBoard] = useState(empty());
    const [turn, setTurn] = useState(HUMAN);
    const [status, setStatus] = useState("Your turn");
    const [profile, setProfile] = useState(loadProfile);
    const [stats, setStats] = useState(loadStats);
    const [name, setName] = useState(() => localStorage.getItem(LS_NAME) || "Player");
    const [overlay, setOverlay] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);
    const [isFirebaseReady, setIsFirebaseReady] = useState(false);
    const [userId, setUserId] = useState(null);
    const [leaders, setLeaders] = useState([]);

    const boardPanelRef = useRef(null);

    const isGameOver = useMemo(() => {
        return checkWin(board, HUMAN) || checkWin(board, AI) || isBoardFull(board);
    }, [board]);

    // --- Firebase Init & State Management ---
    useEffect(() => {
        let unsubscribe = () => {};

        const initFirebase = async () => {
            try {
                const app = initializeApp(firebaseConfig);
                const auth = getAuth(app);
                const db = getFirestore(app);

                // Sign in with custom token if available, otherwise anonymously
                if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token.length > 0) {
                    await signInWithCustomToken(auth, __initial_auth_token);
                } else {
                    await signInAnonymously(auth);
                }

                onAuthStateChanged(auth, async (user) => {
                    if (user) {
                        setUserId(user.uid);
                        setIsFirebaseReady(true);

                        // Check if the user has a profile, create one if not
                        const userDocRef = doc(db, `artifacts/${appId}/users/${user.uid}/profile`, 'stats');
                        const userDocSnap = await getDoc(userDocRef);

                        if (!userDocSnap.exists()) {
                            await setDoc(userDocRef, { name: name, stats: stats, createdAt: serverTimestamp() });
                        }

                        // Set up leaderboard listener
                        const leaderboardCollection = collection(db, `artifacts/${appId}/public/data/leaderboard`);
                        const q = query(leaderboardCollection, orderBy('stats.rating', 'desc'), limit(10));
                        unsubscribe = onSnapshot(q, (querySnapshot) => {
                            const newLeaders = querySnapshot.docs.map(d => ({
                                id: d.id,
                                ...d.data()
                            }));
                            setLeaders(newLeaders);
                        });

                    } else {
                        setUserId(null);
                        setIsFirebaseReady(true);
                    }
                });

            } catch (error) {
                console.error("Error initializing Firebase:", error);
            }
        };

        initFirebase();

        // Cleanup listener on component unmount
        return () => unsubscribe();
    }, [name, stats]);

    // --- Game Logic Functions ---
    const dropDisc = useCallback((col, player) => {
        const newBoard = clone(board);
        for (let r = ROWS - 1; r >= 0; r--) {
            if (newBoard[r][col] === 0) {
                newBoard[r][col] = player;
                return newBoard;
            }
        }
        return null;
    }, [board]);

    const handlePlayerMove = useCallback((col) => {
        if (turn !== HUMAN || isGameOver || board[0][col] !== 0) return;

        // Update profile with column choice
        const newProfile = { ...profile };
        newProfile.humanColumnFreq[col]++;
        saveProfile(newProfile);
        setProfile(newProfile);

        const newBoard = dropDisc(col, HUMAN);
        if (newBoard) {
            setBoard(newBoard);
            setTurn(AI);
            setStatus("AI is thinking...");
        }
    }, [turn, isGameOver, profile, dropDisc, board]);

    const handleGameEnd = useCallback(async (winner) => {
        let result = 'D';
        if (winner === HUMAN) {
            setStatus("You win! 🎉");
            setShowConfetti(true);
            result = 'W';
        } else if (winner === AI) {
            setStatus("AI wins... try again!");
            result = 'L';
        } else {
            setStatus("It's a draw!");
        }

        // Update local stats and profile
        const newStats = updateStats(stats, result);
        saveStats(newStats);
        setStats(newStats);

        const newProfile = adapt(profile, newStats);
        saveProfile(newProfile);
        setProfile(newProfile);

        // Update Firestore if user is authenticated
        if (userId && isFirebaseReady) {
            const db = getFirestore();
            const userDocRef = doc(db, `artifacts/${appId}/users/${userId}/profile`, 'stats');
            await setDoc(userDocRef, { name: name, stats: newStats, lastPlayed: serverTimestamp() }, { merge: true });

            // Also update the public leaderboard
            const publicDocRef = doc(db, `artifacts/${appId}/public/data/leaderboard`, userId);
            await setDoc(publicDocRef, { name: name, stats: newStats, lastPlayed: serverTimestamp() }, { merge: true });
        }
        setOverlay(true);
    }, [stats, profile, userId, isFirebaseReady, name]);

    // --- AI Turn Logic ---
    useEffect(() => {
        if (turn !== AI || isGameOver) return;

        setOverlay(true);
        const { depth, randomness, style } = profile.aiConfig;

        const aiMoveTimer = setTimeout(() => {
            let bestCol;
            if (Math.random() < randomness) {
                // Take a random move for fun/variety
                const moves = board[0].map((_, c) => c).filter(c => board[0][c] === 0);
                bestCol = moves[Math.floor(Math.random() * moves.length)];
            } else {
                // Use minimax for a strategic move
                const { col } = minimax(board, depth, true, style, profile.humanColumnFreq);
                bestCol = col;
            }

            const newBoard = dropDisc(bestCol, AI);
            if (newBoard) {
                setBoard(newBoard);
                setTurn(HUMAN);
                setStatus("Your turn");
            }
            setOverlay(false);
        }, 1000); // Simulate AI thinking time

        return () => clearTimeout(aiMoveTimer);
    }, [turn, isGameOver, profile, board, dropDisc]);

    // Check for win/draw after each move
    useEffect(() => {
        if (isGameOver) {
            const humanWin = checkWin(board, HUMAN);
            const aiWin = checkWin(board, AI);
            if (humanWin) {
                handleGameEnd(HUMAN);
            } else if (aiWin) {
                handleGameEnd(AI);
            } else {
                handleGameEnd(0); // Draw
            }
        }
    }, [isGameOver, board, handleGameEnd]);


    // --- Main Render ---
    return (
        <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4 font-sans">
            {showConfetti && <Confetti />}
            <div className="w-full max-w-4xl p-6 bg-gray-800 rounded-3xl shadow-2xl flex flex-col md:flex-row gap-6">

                {/* Left Panel: Stats & Controls */}
                <div className="flex-1 flex flex-col items-center justify-start gap-4 p-4 md:p-0">
                    <h1 className="text-4xl font-bold text-center">MindMatch 4</h1>
                    <div className="mt-4 w-full flex flex-col gap-4">
                        {isFirebaseReady && <StatsPanel stats={stats} userId={userId} playerName={name} />}
                        {isFirebaseReady && <Leaderboard leaders={leaders} />}
                    </div>
                </div>

                {/* Right Panel: Game Board */}
                <div ref={boardPanelRef} className="flex-1 w-full flex flex-col items-center justify-center gap-4 relative">
                    <div className="w-full text-center">
                        <p className="text-xl font-semibold">{status}</p>
                    </div>
                    <Board board={board} onDrop={handlePlayerMove} disabled={overlay} />
                    <div className="flex flex-col gap-2 mt-4 w-full">
                        <button
                            onClick={() => {
                                setBoard(empty());
                                setTurn(HUMAN);
                                setStatus("Your turn");
                                setOverlay(false);
                                setShowConfetti(false);
                            }}
                            className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all transform hover:scale-105"
                        >
                            Play vs AI
                        </button>
                    </div>
                </div>
            </div>
            <style>
                {`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap');
                
                :root {
                    --bg-color: #1a202c;
                    --text-color: #e2e8f0;
                    --container-bg: #2d3748;
                    --board-bg: #4a5568;
                    --player1-color: #f56565;
                    --player2-color: #ecc94b;
                }
                
                @media (prefers-color-scheme: light) {
                    :root {
                        --bg-color: #f0f4f8;
                        --text-color: #1a202c;
                        --container-bg: #ffffff;
                        --board-bg: #cbd5e0;
                        --player1-color: #e53e3e;
                        --player2-color: #f6ad55;
                    }
                }
                
                body {
                    font-family: 'Inter', sans-serif;
                }
                .bg-gray-900 { background-color: var(--bg-color); }
                .bg-gray-800 { background-color: var(--container-bg); }
                .text-white { color: var(--text-color); }
                .bg-gray-700 { background-color: var(--board-bg); }
                .bg-red-500 { background-color: var(--player1-color); }
                .bg-yellow-500 { background-color: var(--player2-color); }
                
                @keyframes drop {
                    from { transform: translateY(-100vh); }
                    to { transform: translateY(0); }
                }
                
                .animate-drop {
                    animation: drop 0.5s cubic-bezier(0.5, 0, 0.5, 1.5) forwards;
                }

                .confetti-container {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    pointer-events: none;
                    overflow: hidden;
                    z-index: 1000;
                }
                .confetti-piece {
                    position: absolute;
                    width: 10px;
                    height: 10px;
                    opacity: 0;
                    animation: fall 2s ease-out forwards;
                }
                @keyframes fall {
                    0% { transform: translate(0, 0) rotate(0deg); opacity: 1; }
                    100% { transform: translate(var(--x), var(--y)) rotate(var(--r)); opacity: 0; }
                }
                `}
            </style>
        </div>
    );
}

