import React, { useState } from 'react';
import axios from 'axios';
import { LogIn, Video } from 'lucide-react';
import { Link } from 'react-router-dom';

const Login = ({ setToken, setUser }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
            const res = await axios.post(`${apiUrl}/auth/login`, { email, password });
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('user', JSON.stringify(res.data.user));
            setToken(res.data.token);
            setUser(res.data.user);
        } catch (err) {
            setError(err.response?.data?.msg || 'An error occurred. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container flex justify-center align-center" style={{ height: '100vh' }}>
            <div className="glass-card fade-in" style={{ width: '100%', maxWidth: '420px' }}>
                <div className="text-center" style={{ marginBottom: '2.5rem' }}>
                    <div className="brand-logo justify-center" style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
                        <Video size={40} /> MeetUP
                    </div>
                    <p className="text-dim">Experience seamless video collaboration</p>
                </div>

                <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>Sign In</h2>

                {error && (
                    <div style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        color: 'var(--danger)',
                        padding: '0.75rem',
                        borderRadius: '12px',
                        marginBottom: '1.5rem',
                        fontSize: '0.9rem',
                        textAlign: 'center'
                    }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="flex flex-col gap-1">
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-dim)' }}>Email Address</label>
                        <input
                            type="email"
                            placeholder="name@company.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-dim)' }}>Password</label>
                        <input
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }} disabled={loading}>
                        {loading ? 'Signing in...' : <><LogIn size={20} /> Login</>}
                    </button>
                </form>

                <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                    <p className="text-dim" style={{ fontSize: '0.9rem' }}>
                        New to MeetUP? <Link to="/register" style={{ color: 'var(--primary)', fontWeight: '600', textDecoration: 'none' }}>Create an account</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
