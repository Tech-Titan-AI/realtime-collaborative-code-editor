import React, { useEffect, useRef } from 'react';
import Codemirror from 'codemirror';
import 'codemirror/lib/codemirror.css';
import 'codemirror/theme/dracula.css';

// Language modes
import 'codemirror/mode/javascript/javascript';
import 'codemirror/mode/python/python';
import 'codemirror/mode/clike/clike'; 
import 'codemirror/mode/xml/xml';     
import 'codemirror/mode/css/css';

import 'codemirror/addon/edit/closetag';
import 'codemirror/addon/edit/closebrackets';
import ACTIONS from '../Actions';

const Editor = ({ socketRef, roomId, onCodeChange, language }) => {
    const editorRef = useRef(null);
    const timeoutRef = useRef(null); // Auto-save timer ke liye

    useEffect(() => {
        async function init() {
            editorRef.current = Codemirror.fromTextArea(
                document.getElementById('realtimeEditor'),
                {
                    mode: { name: language, json: true },
                    theme: 'dracula',
                    autoCloseTags: true,
                    autoCloseBrackets: true,
                    lineNumbers: true,
                    gutters: ["CodeMirror-lint-markers"],
                    lint: true,
                }
            );

            // Jab hum editor mein kuch type karte hain
            editorRef.current.on('change', (instance, changes) => {
                const { origin } = changes;
                const code = instance.getValue();
                onCodeChange(code); 
                
                if (origin !== 'setValue') {
                    // 1. Real-time sync dusre users ke liye
                    if (socketRef.current) {
                        socketRef.current.emit(ACTIONS.CODE_CHANGE, {
                            roomId,
                            code,
                        });

                        // 2. Debounced Auto-save Logic
                        // Purana timer clear karo
                        if (timeoutRef.current) clearTimeout(timeoutRef.current);
                        
                        // Naya timer set karo: 2 second baad DB mein save hoga
                        timeoutRef.current = setTimeout(() => {
                            socketRef.current.emit('save-document', {
                                roomId,
                                code,
                            });
                            console.log('Auto-saving to Database...');
                        }, 2000); 
                    }
                }
            });
        }
        init();

        // Cleanup function
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            if (editorRef.current) {
                editorRef.current.toTextArea();
            }
        };
    }, []); 

    useEffect(() => {
        if (editorRef.current) {
            editorRef.current.setOption('mode', {
                name: language,
                json: true,
            });
        }
    }, [language]);

    useEffect(() => {
        if (socketRef.current) {
            socketRef.current.on(ACTIONS.CODE_CHANGE, ({ code }) => {
                if (code !== null) {
                    if (editorRef.current.getValue() !== code) {
                        editorRef.current.setValue(code);
                    }
                }
            });
        }

        return () => {
            if (socketRef.current) {
                socketRef.current.off(ACTIONS.CODE_CHANGE);
            }
        };
    }, [socketRef.current]);

    return <textarea id="realtimeEditor"></textarea>;
};

export default Editor;