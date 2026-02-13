import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import MeetingRoom from './components/MeetingRoom';

function App() {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));

    useEffect(() => {
        // Basic auto-login logic
        if (token) {
            // In a real app, verify token with backend
            const savedUser = JSON.parse(localStorage.getItem('user'));
            if (savedUser) setUser(savedUser);
        }
    }, [token]);

    return (
        <Router>
            <div className="app">
                <Routes>
                    <Route path="/login" element={!user ? <Login setToken={setToken} setUser={setUser} /> : <Navigate to="/" />} />
                    <Route path="/register" element={!user ? <Register /> : <Navigate to="/" />} />
                    <Route path="/" element={user ? <Dashboard user={user} setToken={setToken} setUser={setUser} /> : <Navigate to="/login" />} />
                    <Route path="/meeting/:id" element={user ? <MeetingRoom user={user} /> : <Navigate to="/login" />} />
                </Routes>
            </div>
        </Router>
    );
}

export default App;
