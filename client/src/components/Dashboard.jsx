import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Video,
    Plus,
    LogOut,
    Keyboard,
    Settings,
    HelpCircle,
    Clock,
    Calendar,
    History,
    Users,
    Share2,
    X
} from 'lucide-react';

const Dashboard = ({ user, setToken, setUser }) => {
    const [meetingId, setMeetingId] = useState('');
    const [time, setTime] = useState(new Date());
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [recentMeetings, setRecentMeetings] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);

        // Mock recent meetings from localStorage
        const stored = JSON.parse(localStorage.getItem('recentMeetings') || '[]');
        setRecentMeetings(stored);

        return () => clearInterval(timer);
    }, []);

    const formatTime = (date) => {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (date) => {
        const options = { weekday: 'short', month: 'short', day: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    };

    const getGreeting = () => {
        const hour = time.getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 18) return 'Good afternoon';
        return 'Good evening';
    };

    const handleCreateMeeting = () => {
        const id = Math.random().toString(36).substring(2, 11);
        const newMeeting = { id, title: 'New Meeting', date: new Date().toISOString() };
        const updated = [newMeeting, ...recentMeetings].slice(0, 5);
        localStorage.setItem('recentMeetings', JSON.stringify(updated));
        navigate(`/meeting/${id}`);
    };

    const handleJoinMeeting = (e) => {
        e.preventDefault();
        if (meetingId.trim()) {
            navigate(`/meeting/${meetingId}`);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken(null);
        setUser(null);
        navigate('/login');
    };

    return (
        <div className="container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <header className="dashboard-header flex justify-between align-center fade-in">
                <div className="brand-logo">
                    <Video size={32} /> MeetUP
                </div>
                <div className="flex align-center gap-2">
                    <div className="flex align-center gap-1" style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>
                        <HelpCircle size={18} className="cursor-pointer" />
                        <Settings size={18} className="cursor-pointer" />
                    </div>
                    <div style={{ width: '1px', height: '24px', background: 'var(--glass-border)' }}></div>
                    <div className="flex align-center gap-1">
                        <div style={{
                            width: '32px',
                            height: '32px',
                            background: 'var(--primary)',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: '600',
                            fontSize: '0.8rem'
                        }}>
                            {user?.displayName?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <span style={{ fontWeight: '500' }}>{user?.displayName}</span>
                    </div>
                    <button onClick={handleLogout} className="btn btn-outline" style={{ padding: '0.5rem 1rem' }}>
                        <LogOut size={16} /> <span className="hide-mobile">Logout</span>
                    </button>
                </div>
            </header>

            <main className="fade-in" style={{ flex: 1 }}>
                <section className="hero-section">
                    <div className="flex-col">
                        <div className="clock-display">{formatTime(time)}</div>
                        <div className="date-display">{formatDate(time)}</div>
                        <h1 className="greeting-text">
                            {getGreeting()}, {user?.displayName}!
                        </h1>
                        <p className="text-dim" style={{ fontSize: '1.2rem', maxWidth: '450px', marginBottom: '2.5rem' }}>
                            Ready for your next collaboration? Start or join a meeting with high-quality video and audio.
                        </p>

                        <div className="flex align-center gap-1" style={{ width: '100%', maxWidth: '500px' }}>
                            <button
                                onClick={handleCreateMeeting}
                                className="btn btn-primary"
                                style={{ padding: '1rem 1.5rem', borderRadius: '12px', whiteSpace: 'nowrap' }}
                            >
                                <Plus size={20} /> New Meeting
                            </button>

                            <form onSubmit={handleJoinMeeting} className="flex align-center" style={{ position: 'relative', flex: 1 }}>
                                <Keyboard
                                    size={20}
                                    style={{ position: 'absolute', left: '1rem', color: 'var(--text-dim)' }}
                                />
                                <input
                                    type="text"
                                    placeholder="Enter meeting code"
                                    value={meetingId}
                                    onChange={(e) => setMeetingId(e.target.value)}
                                    style={{ paddingLeft: '3rem', marginBottom: 0, borderRadius: '12px' }}
                                    required
                                />
                                {meetingId && (
                                    <button
                                        type="submit"
                                        style={{
                                            position: 'absolute',
                                            right: '0.5rem',
                                            padding: '0.4rem 0.8rem',
                                            border: 'none',
                                            background: 'transparent',
                                            color: 'var(--primary)',
                                            fontWeight: '600',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Join
                                    </button>
                                )}
                            </form>
                        </div>
                    </div>

                    <div className="hide-tablet">
                        <div className="glass-card" style={{
                            width: '320px',
                            height: '320px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'center',
                            background: 'linear-gradient(135deg, var(--glass), rgba(33, 96, 253, 0.05))',
                            padding: '2rem'
                        }}>
                            <div style={{
                                width: '100px',
                                height: '100px',
                                background: 'var(--primary-glow)',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: '1.5rem',
                                border: '1px solid var(--primary)'
                            }}>
                                <Users size={40} className="text-primary" />
                            </div>
                            <h3 style={{ marginBottom: '0.5rem', textAlign: 'center' }}>Secure Collaboration</h3>
                            <p className="text-dim text-center" style={{ fontSize: '0.85rem' }}>
                                End-to-end encryption for all your conversations and shared content.
                            </p>
                        </div>
                    </div>
                </section>

                <div className="feature-grid">
                    <div className="feature-card" onClick={() => setIsModalOpen(true)}>
                        <div className="feature-icon-wrapper"><Calendar size={24} /></div>
                        <div>
                            <h3>Schedule</h3>
                            <p className="text-dim">Plan your future meetings and set reminders.</p>
                        </div>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon-wrapper"><Share2 size={24} /></div>
                        <div>
                            <h3>Share Screen</h3>
                            <p className="text-dim">Collaborate instantly by sharing your desktop.</p>
                        </div>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon-wrapper"><History size={24} /></div>
                        <div>
                            <h3>Transcripts</h3>
                            <p className="text-dim">Review notes and recordings from past sessions.</p>
                        </div>
                    </div>
                </div>

                {recentMeetings.length > 0 && (
                    <div className="recent-meetings-container">
                        <h2 className="section-title"><History size={20} /> Recent Meetings</h2>
                        <div className="recent-meetings-list">
                            {recentMeetings.map((mtg, idx) => (
                                <div key={idx} className="recent-item cursor-pointer" onClick={() => navigate(`/meeting/${mtg.id}`)}>
                                    <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>{mtg.title}</div>
                                    <div className="text-dim" style={{ fontSize: '0.75rem' }}>ID: {mtg.id}</div>
                                    <div className="text-dim" style={{ fontSize: '0.75rem' }}>{new Date(mtg.date).toLocaleDateString()}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>

            {isModalOpen && (
                <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
                    <div className="modal-content glass-card" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between align-center" style={{ marginBottom: '1.5rem' }}>
                            <h2 style={{ margin: 0 }}>Schedule Meeting</h2>
                            <X size={24} className="cursor-pointer" onClick={() => setIsModalOpen(false)} />
                        </div>
                        <p className="text-dim" style={{ marginBottom: '1.5rem' }}>
                            Set up a meeting for later. This feature will be fully integrated with your calendar soon.
                        </p>
                        <div className="flex-col gap-1">
                            <input type="text" placeholder="Meeting Title" />
                            <input type="datetime-local" />
                            <button className="btn btn-primary" onClick={() => setIsModalOpen(false)}>
                                Create Schedule
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <footer style={{ marginTop: '4rem', padding: '2rem 0', borderTop: '1px solid var(--glass-border)' }}>
                <div className="flex justify-between align-center">
                    <p className="text-dim" style={{ fontSize: '0.85rem' }}>
                        &copy; 2026 MeetUP Inc. All rights reserved.
                    </p>
                    <div className="flex gap-2 text-dim" style={{ fontSize: '0.85rem' }}>
                        <span className="cursor-pointer">Privacy</span>
                        <span className="cursor-pointer">Terms</span>
                        <span className="cursor-pointer">Support</span>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default Dashboard;

