import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import Peer from 'simple-peer';
import {
    Mic, MicOff, Video, VideoOff, PhoneOff,
    MessageSquare, Users, Copy, Check, Menu, Info,
    Monitor, Hand, X, Send, Clock
} from 'lucide-react';

const MeetingRoom = ({ user }) => {
    const { id: roomId } = useParams();
    const navigate = useNavigate();
    const [peers, setPeers] = useState([]);
    const [participants, setParticipants] = useState([]);
    const [micOn, setMicOn] = useState(true);
    const [videoOn, setVideoOn] = useState(true);
    const [copied, setCopied] = useState(false);
    const [activeSpeakerId, setActiveSpeakerId] = useState(null);

    // New Feature States
    const [sidebarType, setSidebarType] = useState('none'); // 'none', 'chat', 'participants'
    const [messages, setMessages] = useState([]);
    const [msgInput, setMsgInput] = useState('');
    const [isHandRaised, setIsHandRaised] = useState(false);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [meetingTime, setMeetingTime] = useState(0);

    const socketRef = useRef();
    const userVideo = useRef();
    const peersRef = useRef([]);
    const userStream = useRef();
    const screenStream = useRef();
    const chatEndRef = useRef();

    useEffect(() => {
        // Timer logic
        const timer = setInterval(() => {
            setMeetingTime(prev => prev + 1);
        }, 1000);

        const apiUrl = import.meta.env.VITE_API_URL || 'https://meetup-dway.onrender.com';
        socketRef.current = io.connect(apiUrl);

        const joinRoom = () => {
            console.log("Emitting join-room for ID:", roomId, "as user:", user.displayName);
            socketRef.current.emit("join-room", roomId, { id: user.id, name: user.displayName });
        };

        if (socketRef.current.connected) {
            joinRoom();
        } else {
            socketRef.current.on('connect', () => {
                console.log("Socket connected! Joining room...");
                joinRoom();
            });
        }

        socketRef.current.on("all-users", users => {
            console.log("Existing users in room:", users);
            let checkStreamAttempts = 0;
            const checkStream = setInterval(() => {
                checkStreamAttempts++;
                if (userStream.current) {
                    clearInterval(checkStream);
                    users.forEach(remoteUser => {
                        const targetID = remoteUser.id || remoteUser;
                        const targetName = remoteUser.name || "Participant";
                        const peer = createPeer(targetID, socketRef.current.id, userStream.current);

                        peer.on("stream", stream => {
                            setPeers(prev => prev.map(p => p.peerID === targetID ? { ...p, stream } : p));
                        });

                        peersRef.current.push({ peerID: targetID, peer, name: targetName });
                        setPeers(prev => [...prev, { peerID: targetID, peer, name: targetName, stream: null }]);
                    });
                } else if (checkStreamAttempts > 20) {
                    clearInterval(checkStream);
                    console.error("Timeout waiting for local stream");
                }
            }, 500);
        });

        socketRef.current.on("user-joined", payload => {
            console.log("A newcomer joined:", payload.name);
            let checkStreamAttempts = 0;
            const checkStream = setInterval(() => {
                checkStreamAttempts++;
                if (userStream.current) {
                    clearInterval(checkStream);
                    const targetName = payload.name || "New Participant";
                    const peer = addPeer(payload.signal, payload.callerID, userStream.current);

                    peer.on("stream", stream => {
                        setPeers(prev => prev.map(p => p.peerID === payload.callerID ? { ...p, stream } : p));
                    });

                    peersRef.current.push({ peerID: payload.callerID, peer, name: targetName });
                    setPeers(prev => [...prev, { peerID: payload.callerID, peer, name: targetName, stream: null }]);
                } else if (checkStreamAttempts > 20) {
                    clearInterval(checkStream);
                }
            }, 500);
        });

        socketRef.current.on("receiving-returned-signal", payload => {
            const item = peersRef.current.find(p => p.peerID === payload.id);
            if (item) {
                item.peer.signal(payload.signal);
            }
        });

        socketRef.current.on("user-disconnected", userId => {
            const peerObj = peersRef.current.find(p => p.peerID === userId);
            if (peerObj) peerObj.peer.destroy();
            const remainingPeers = peersRef.current.filter(p => p.peerID !== userId);
            peersRef.current = remainingPeers;
            setPeers(remainingPeers);
        });

        // Participant List Listener
        socketRef.current.on("room-users", users => {
            console.log("Room users updated:", users);
            setParticipants(users);
        });

        // Chat Listener
        socketRef.current.on("receive-message", msg => {
            setMessages(prev => [...prev, msg]);
        });

        // Hand Raise Listener
        socketRef.current.on("user-raised-hand", ({ userId, raised }) => {
            setPeers(prev => prev.map(p => p.peerID === userId ? { ...p, handRaised: raised } : p));
            if (raised) {
                setActiveSpeakerId(userId);
            } else if (activeSpeakerId === userId) {
                setActiveSpeakerId(null);
            }
        });

        navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
            userStream.current = stream;
            if (userVideo.current) {
                userVideo.current.srcObject = stream;
            }
        }).catch(err => {
            console.error("Media Error:", err.message);
            // Fallback
            const canvas = document.createElement('canvas');
            canvas.width = 640; canvas.height = 480;
            const context = canvas.getContext('2d');
            context.fillStyle = '#0f172a';
            context.fillRect(0, 0, 640, 480);
            context.fillStyle = 'white';
            context.font = '24px Inter';
            context.fillText('No Camera Access', 220, 240);
            userStream.current = canvas.captureStream();
            if (userVideo.current) userVideo.current.srcObject = userStream.current;
        });

        return () => {
            clearInterval(timer);
            if (userStream.current) userStream.current.getTracks().forEach(track => track.stop());
            if (socketRef.current) socketRef.current.disconnect();
        };
    }, [roomId, user.id]);

    useEffect(() => {
        if (chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    function createPeer(userToSignal, callerID, stream) {
        const peer = new Peer({
            initiator: true,
            trickle: false,
            stream,
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:global.stun.twilio.com:3478' }
                ]
            }
        });
        peer.on("signal", signal => {
            socketRef.current.emit("sending-signal", { userToSignal, callerID, signal });
        });
        peer.on("error", err => console.error("Peer error:", err));
        return peer;
    }

    function addPeer(incomingSignal, callerID, stream) {
        const peer = new Peer({
            initiator: false,
            trickle: false,
            stream,
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:global.stun.twilio.com:3478' }
                ]
            }
        });
        peer.on("signal", signal => {
            socketRef.current.emit("returning-signal", { signal, callerID });
        });
        peer.on("error", err => console.error("Peer error:", err));
        peer.signal(incomingSignal);
        return peer;
    }

    const toggleMic = () => {
        setMicOn(!micOn);
        userStream.current.getAudioTracks()[0].enabled = !micOn;
    };

    const toggleVideo = () => {
        setVideoOn(!videoOn);
        userStream.current.getVideoTracks()[0].enabled = !videoOn;
    };

    const toggleHandRaise = () => {
        const newState = !isHandRaised;
        setIsHandRaised(newState);
        socketRef.current.emit("raise-hand", { roomId, raised: newState });
    };

    const toggleScreenShare = async () => {
        if (!isScreenSharing) {
            try {
                const stream = await navigator.mediaDevices.getDisplayMedia({ cursor: true });
                screenStream.current = stream;

                // Replace track for all peers
                const videoTrack = stream.getVideoTracks()[0];
                peersRef.current.forEach(({ peer }) => {
                    peer.replaceTrack(
                        userStream.current.getVideoTracks()[0],
                        videoTrack,
                        userStream.current
                    );
                });

                videoTrack.onended = () => stopScreenShare();
                setIsScreenSharing(true);
                if (userVideo.current) userVideo.current.srcObject = stream;
            } catch (err) {
                console.error("Screen share error:", err);
            }
        } else {
            stopScreenShare();
        }
    };

    const stopScreenShare = () => {
        if (screenStream.current) {
            screenStream.current.getTracks().forEach(track => track.stop());
            const videoTrack = userStream.current.getVideoTracks()[0];
            peersRef.current.forEach(({ peer }) => {
                peer.replaceTrack(
                    screenStream.current.getVideoTracks()[0],
                    videoTrack,
                    userStream.current
                );
            });
            setIsScreenSharing(false);
            if (userVideo.current) userVideo.current.srcObject = userStream.current;
        }
    };

    const sendMessage = (e) => {
        e.preventDefault();
        if (msgInput.trim()) {
            const msgData = {
                sender: user.displayName,
                senderId: user.id,
                text: msgInput,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            socketRef.current.emit("send-message", { roomId, message: msgData });
            setMessages(prev => [...prev, msgData]);
            setMsgInput('');
        }
    };

    const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const copyRoomId = () => {
        navigator.clipboard.writeText(roomId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div style={{ background: 'var(--bg)', height: '100vh', display: 'flex', overflow: 'hidden' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>

                {/* Top Header */}
                <div style={{ height: '70px', padding: '0 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10, background: 'rgba(3, 7, 18, 0.5)', backdropFilter: 'blur(10px)' }}>
                    <div className="flex align-center gap-1">
                        <div className="brand-logo" style={{ fontSize: '1.2rem', marginRight: '1rem' }}>Zoon</div>
                        <div style={{ background: 'var(--glass)', padding: '0.5rem 1rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid var(--glass-border)' }}>
                            <span style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text)' }}>{roomId}</span>
                            <button onClick={copyRoomId} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: '4px', display: 'flex' }}>
                                {copied ? <Check size={16} color="var(--success)" /> : <Copy size={16} />}
                            </button>
                        </div>
                    </div>

                    <div className="flex align-center gap-1">
                        <div style={{ background: 'rgba(33, 96, 253, 0.1)', color: 'var(--primary)', padding: '0.5rem 1rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '600', fontSize: '0.9rem' }}>
                            <Clock size={16} />
                            {formatTime(meetingTime)}
                        </div>
                        <div className="flex align-center gap-1" style={{ color: 'var(--text-dim)', fontSize: '0.9rem', fontWeight: '500' }}>
                            <Users size={18} />
                            {participants.length} participants
                        </div>
                    </div>
                </div>

                {/* Main Video Area */}
                <div style={{ flex: 1, padding: '2rem', display: 'flex', justifyContent: 'center', alignItems: 'center', overflowY: 'auto' }}>
                    <div className="video-grid" style={{
                        gridTemplateColumns: (peers.length + 1) === 1 ? '1fr' :
                            (peers.length + 1) === 2 ? '1fr 1fr' :
                                'repeat(auto-fit, minmax(350px, 1fr))',
                        maxWidth: (peers.length + 1) <= 4 ? '1200px' : '100%'
                    }}>
                        {/* My Video */}
                        <div className={`video-container fade-in ${isHandRaised ? 'active-speaker' : ''}`}>
                            <video muted ref={userVideo} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', transform: isScreenSharing ? 'none' : 'scaleX(-1)' }} />

                            <div className="status-indicators">
                                {!videoOn && !isScreenSharing && <div className="status-badge danger"><VideoOff size={14} /></div>}
                                {!micOn && <div className="status-badge danger"><MicOff size={14} /></div>}
                            </div>

                            <div className="video-label">
                                You ({user.displayName}) {isScreenSharing && "(Sharing)"}
                            </div>
                            {isHandRaised && <div className="hand-raised-badge"><Hand size={20} fill="currentColor" /></div>}
                            {!videoOn && !isScreenSharing && (
                                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #1e293b, #0f172a)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <div className={`avatar-pulse`} style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', fontWeight: '700', border: '4px solid var(--primary-glow)' }}>
                                        {user.displayName.charAt(0).toUpperCase()}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Peers Videos */}
                        {peers.map((peerObj) => (
                            <VideoComponent key={peerObj.peerID} peer={peerObj.peer} name={peerObj.name} handRaised={peerObj.handRaised} stream={peerObj.stream} />
                        ))}
                    </div>
                </div>

                {/* Floating Controls */}
                <div className="controls-bar" style={{ bottom: '2rem' }}>
                    <div className="flex gap-1">
                        <div className="tooltip-trigger">
                            <button onClick={toggleMic} className={`control-btn ${!micOn ? 'danger' : ''}`}>
                                {micOn ? <Mic size={22} /> : <MicOff size={22} />}
                            </button>
                            <span className="tooltip">{micOn ? 'Mute' : 'Unmute'}</span>
                        </div>

                        <div className="tooltip-trigger">
                            <button onClick={toggleVideo} className={`control-btn ${!videoOn ? 'danger' : ''}`}>
                                {videoOn ? <Video size={22} /> : <VideoOff size={22} />}
                            </button>
                            <span className="tooltip">{videoOn ? 'Stop Video' : 'Start Video'}</span>
                        </div>

                        <div style={{ width: '1px', background: 'var(--glass-border)', margin: '0 0.5rem' }}></div>

                        <div className="tooltip-trigger">
                            <button onClick={toggleScreenShare} className={`control-btn ${isScreenSharing ? 'active' : ''}`}>
                                <Monitor size={22} />
                            </button>
                            <span className="tooltip">{isScreenSharing ? 'Stop Sharing' : 'Share Screen'}</span>
                        </div>

                        <div className="tooltip-trigger">
                            <button onClick={toggleHandRaise} className={`control-btn ${isHandRaised ? 'active' : ''}`}>
                                <Hand size={22} />
                            </button>
                            <span className="tooltip">{isHandRaised ? 'Lower Hand' : 'Raise Hand'}</span>
                        </div>

                        <div style={{ width: '1px', background: 'var(--glass-border)', margin: '0 0.5rem' }}></div>

                        <div className="tooltip-trigger">
                            <button onClick={() => setSidebarType(sidebarType === 'chat' ? 'none' : 'chat')} className={`control-btn ${sidebarType === 'chat' ? 'active' : ''}`}>
                                <MessageSquare size={22} />
                            </button>
                            <span className="tooltip">Chat</span>
                        </div>

                        <div className="tooltip-trigger">
                            <button onClick={() => setSidebarType(sidebarType === 'participants' ? 'none' : 'participants')} className={`control-btn ${sidebarType === 'participants' ? 'active' : ''}`}>
                                <Users size={22} />
                            </button>
                            <span className="tooltip">Participants</span>
                        </div>

                        <div className="tooltip-trigger">
                            <button onClick={() => navigate('/')} className="control-btn danger" style={{ width: '70px', borderRadius: '18px' }}>
                                <PhoneOff size={24} />
                            </button>
                            <span className="tooltip">Leave Meeting</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sidebars */}
            {sidebarType !== 'none' && (
                <div className="meeting-sidebar fade-in">
                    <div className="sidebar-header">
                        <h3 className="flex align-center gap-1">
                            {sidebarType === 'chat' ? <><MessageSquare size={20} /> Chat</> : <><Users size={20} /> Participants</>}
                        </h3>
                        <button onClick={() => setSidebarType('none')} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}><X size={20} /></button>
                    </div>

                    <div className="sidebar-content">
                        {sidebarType === 'chat' ? (
                            <div className="chat-messages">
                                {messages.map((m, i) => (
                                    <div key={i} className={`chat-msg ${m.senderId === user.id ? 'me' : 'others'}`}>
                                        <span className="chat-sender">{m.sender} • {m.time}</span>
                                        <div className="chat-bubble">{m.text}</div>
                                    </div>
                                ))}
                                <div ref={chatEndRef} />
                            </div>
                        ) : (
                            <div className="participant-list">
                                <div className="participant-item">
                                    <div className="flex align-center gap-1">
                                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: '600' }}>{user.displayName.charAt(0).toUpperCase()}</div>
                                        <span>{user.displayName} (You)</span>
                                    </div>
                                    {isHandRaised && <Hand size={16} color="#fbbf24" />}
                                </div>
                                {participants.map(p => {
                                    if (p.id === socketRef.current?.id) return null;
                                    const peerObj = peers.find(peer => peer.peerID === p.id);
                                    return (
                                        <div key={p.id} className="participant-item">
                                            <div className="flex align-center gap-1">
                                                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--glass)', border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: '600' }}>
                                                    {p.name.charAt(0).toUpperCase()}
                                                </div>
                                                <span>{p.name}</span>
                                            </div>
                                            {peerObj?.handRaised && <Hand size={16} color="#fbbf24" />}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {sidebarType === 'chat' && (
                        <div className="sidebar-footer">
                            <form onSubmit={sendMessage} className="flex gap-1">
                                <input
                                    value={msgInput}
                                    onChange={(e) => setMsgInput(e.target.value)}
                                    placeholder="Type a message..."
                                    style={{ padding: '0.6rem 1rem' }}
                                />
                                <button type="submit" className="control-btn" style={{ width: '42px', height: '42px', minWidth: '42px', background: 'var(--primary)' }}>
                                    <Send size={18} />
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const VideoComponent = ({ peer, name, handRaised, stream }) => {
    const ref = useRef();

    useEffect(() => {
        if (ref.current && stream) {
            ref.current.srcObject = stream;
        }
    }, [stream]);

    return (
        <div className={`video-container fade-in ${handRaised ? 'active-speaker' : ''}`}>
            <video playsInline autoPlay ref={ref} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />

            <div className="status-indicators">
                {!stream && <div className="status-badge danger"><VideoOff size={14} /></div>}
                {/* For remote peers, we'd ideally get their mic status via socket */}
            </div>

            <div className="video-label">{name}</div>
            {handRaised && <div className="hand-raised-badge"><Hand size={20} fill="currentColor" /></div>}
            {!stream && (
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #1e293b, #0f172a)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--primary-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--primary)', boxShadow: '0 0 20px rgba(33, 96, 253, 0.3)' }}>
                        <span style={{ fontSize: '2rem', fontWeight: '700', color: 'white' }}>{name.charAt(0).toUpperCase()}</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MeetingRoom;
