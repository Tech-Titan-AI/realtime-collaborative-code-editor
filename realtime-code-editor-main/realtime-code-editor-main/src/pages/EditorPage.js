import React, { useState, useRef, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import ACTIONS from '../Actions';
import Client from '../components/Client';
import Editor from '../components/Editor';
import { initSocket } from '../socket';
import {
    useLocation,
    useNavigate,
    Navigate,
    useParams,
} from 'react-router-dom';

const EditorPage = () => {
    const socketRef = useRef(null);
    const codeRef = useRef(null);
    const location = useLocation();
    const { roomId } = useParams();
    const reactNavigator = useNavigate();
    const [clients, setClients] = useState([]);
    const [lang, setLang] = useState('javascript');

    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState([]);
    const chatRef = useRef(null);

    // Error handler ko useCallback mein dala taaki dependency stable rahe
    const handleErrors = useCallback((e) => {
        console.log('socket error', e);
        toast.error('Socket connection failed, try again later.');
        reactNavigator('/');
    }, [reactNavigator]);

    useEffect(() => {
        const init = async () => {
            socketRef.current = await initSocket();
            
            socketRef.current.on('connect_error', handleErrors);
            socketRef.current.on('connect_failed', handleErrors);

            socketRef.current.emit(ACTIONS.JOIN, {
                roomId,
                username: location.state?.username,
            });

            socketRef.current.on(
                ACTIONS.JOINED,
                ({ clients, username, socketId }) => {
                    if (username !== location.state?.username) {
                        toast.success(`${username} joined the room.`);
                    }
                    setClients(clients);
                    socketRef.current.emit(ACTIONS.SYNC_CODE, {
                        code: codeRef.current,
                        socketId,
                    });
                }
            );

            socketRef.current.on('language-change', ({ language }) => {
                setLang(language);
                toast.success(`Language changed to ${language}`);
            });

            socketRef.current.on('receive-message', (data) => {
                setMessages((prev) => [...prev, data]);
                setTimeout(() => {
                    chatRef.current?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
            });

            socketRef.current.on(
                ACTIONS.DISCONNECTED,
                ({ socketId, username }) => {
                    toast.success(`${username} left the room.`);
                    setClients((prev) => {
                        return prev.filter(
                            (client) => client.socketId !== socketId
                        );
                    });
                }
            );
        };

        init();

        // CLEANUP: Local variable use karke warnings fix ki
        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current.off(ACTIONS.JOINED);
                socketRef.current.off(ACTIONS.DISCONNECTED);
                socketRef.current.off('language-change');
                socketRef.current.off('receive-message');
            }
        };
    }, [roomId, location.state?.username, handleErrors]); // Dependencies add kar di

    const sendMessage = (e) => {
        e.preventDefault();
        if (message.trim()) {
            socketRef.current.emit('send-message', {
                roomId,
                message,
                username: location.state?.username,
            });
            setMessage('');
        }
    };

    const handleLangChange = (e) => {
        const newLang = e.target.value;
        setLang(newLang);
        socketRef.current.emit('language-change', {
            roomId,
            language: newLang,
        });
    };

    async function copyRoomId() {
        try {
            await navigator.clipboard.writeText(roomId);
            toast.success('Room ID has been copied to your clipboard');
        } catch (err) {
            toast.error('Could not copy the Room ID');
            console.error(err);
        }
    }

    function leaveRoom() {
        reactNavigator('/');
    }

    if (!location.state) {
        return <Navigate to="/" />;
    }

    return (
        <div className="mainWrap">
            <div className="aside">
                <div className="asideInner">
                    <div className="logo">
                        <img className="logoImage" src="/code-sync.png" alt="logo" />
                    </div>
                    
                    <div className="langSelectWrap">
                        <label style={{color: 'white', marginBottom: '10px', display: 'block'}}>Language:</label>
                        <select className="langSelect" value={lang} onChange={handleLangChange}>
                            <option value="javascript">Javascript</option>
                            <option value="python">Python</option>
                            <option value="clike">C / C++ / Java</option>
                            <option value="xml">HTML / XML</option>
                            <option value="css">CSS</option>
                        </select>
                    </div>

                    <h3>Connected Users</h3>
                    <div className="clientsList">
                        {clients.map((client) => (
                            <Client key={client.socketId} username={client.username} />
                        ))}
                    </div>

                    <div className="chatWrap">
                        <h4>Group Chat</h4>
                        <div className="messageList">
                            {messages.map((msg, index) => (
                                <div key={index} className="messageBox">
                                    <span className="msgUser">{msg.username}</span>
                                    <p className="msgText">{msg.message}</p>
                                    <span className="msgTime">{msg.time}</span>
                                </div>
                            ))}
                            <div ref={chatRef}></div>
                        </div>
                        <form className="chatInputWrap" onSubmit={sendMessage}>
                            <input 
                                type="text" 
                                value={message} 
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="Type a message..."
                            />
                            <button type="submit" className="sendBtn">Send</button>
                        </form>
                    </div>
                </div>

                <div className="asideButtons">
                    <button className="btn copyBtn" onClick={copyRoomId}>Copy ROOM ID</button>
                    <button className="btn leaveBtn" onClick={leaveRoom}>Leave</button>
                </div>
            </div>
            
            <div className="editorWrap">
                <Editor
                    socketRef={socketRef}
                    roomId={roomId}
                    language={lang}
                    onCodeChange={(code) => {
                        codeRef.current = code;
                    }}
                />
            </div>
        </div>
    );
};

export default EditorPage;