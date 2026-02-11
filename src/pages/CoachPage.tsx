// =====================================================
// GymBro PWA - Coach AI Page
// =====================================================

import { useUserStore } from '@/stores/userStore';
import Colors from '@/styles/colors';
import { Bot, Send } from 'lucide-react';
import React, { useState } from 'react';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
}

export const CoachPage: React.FC = () => {
    const perfil = useUserStore((state) => state.perfil);
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            role: 'assistant',
            content: `Hola ${perfil.usuario.nombre || 'atleta'}! 👋 Soy tu Coach IA personal. En que puedo ayudarte hoy? Puedo darte consejos sobre tu rutina, nutricion, o ayudarte a planificar tus entrenamientos.`,
        },
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);

    const quickReplies = [
        'Que entreno hoy?',
        'Dame tips de nutricion',
        'Como mejoro mi tecnica?',
    ];

    const handleSend = async (text: string) => {
        if (!text.trim()) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: text,
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput('');
        setIsTyping(true);

        try {
            const { coachChat } = await import('@/services/geminiService');

            // Format history for Gemini
            const aiHistory = messages.map(msg => ({
                role: msg.role === 'user' ? 'user' as const : 'model' as const,
                parts: [{ text: msg.content }]
            }));

            const response = await coachChat(text, aiHistory, perfil.usuario);

            const aiMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: response,
            };

            setMessages((prev) => [...prev, aiMessage]);
        } catch (error) {
            console.error("Coach AI Error:", error);
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: "Hubo un error al contactar con mi cerebro digital. Podrias intentar de nuevo?",
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <div style={styles.coachIcon}>
                    <Bot size={24} color="#000" />
                </div>
                <div>
                    <h1 style={styles.title}>Coach IA</h1>
                    <p style={styles.subtitle}>Tu asistente de fitness personal</p>
                </div>
            </div>

            {/* Messages */}
            <div style={styles.messagesContainer}>
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        style={{
                            ...styles.messageBubble,
                            ...(msg.role === 'user' ? styles.userBubble : styles.aiBubble),
                        }}
                    >
                        {msg.role === 'assistant' && (
                            <div style={styles.botIcon}>
                                <Bot size={16} color={Colors.primary} />
                            </div>
                        )}
                        <p style={styles.messageText}>{msg.content}</p>
                    </div>
                ))}
                {isTyping && (
                    <div style={{ ...styles.messageBubble, ...styles.aiBubble }}>
                        <div style={styles.botIcon}>
                            <Bot size={16} color={Colors.primary} />
                        </div>
                        <p style={styles.messageText}>Escribiendo...</p>
                    </div>
                )}
            </div>

            {/* Quick Replies */}
            <div style={styles.quickReplies}>
                {quickReplies.map((reply, i) => (
                    <button
                        key={i}
                        onClick={() => handleSend(reply)}
                        style={styles.quickReplyBtn}
                    >
                        {reply}
                    </button>
                ))}
            </div>

            {/* Input */}
            <div style={styles.inputContainer}>
                <input
                    style={styles.input}
                    placeholder="Preguntale a tu Coach..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSend(input)}
                />
                <button style={styles.sendBtn} onClick={() => handleSend(input)}>
                    <Send size={20} color="#000" />
                </button>
            </div>
        </div>
    );
};



const styles: Record<string, React.CSSProperties> = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: Colors.background,
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '20px',
        paddingTop: 'calc(20px + env(safe-area-inset-top, 0px))',
        borderBottom: `1px solid ${Colors.border}`,
    },
    coachIcon: {
        width: '48px',
        height: '48px',
        borderRadius: '16px',
        background: Colors.gradientPrimary,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: '20px',
        fontWeight: 800,
        color: Colors.text,
        margin: 0,
    },
    subtitle: {
        fontSize: '13px',
        color: Colors.textSecondary,
        margin: '2px 0 0 0',
    },
    messagesContainer: {
        flex: 1,
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        overflowY: 'auto',
    },
    messageBubble: {
        maxWidth: '85%',
        padding: '14px 18px',
        borderRadius: '20px',
        display: 'flex',
        gap: '10px',
    },
    userBubble: {
        alignSelf: 'flex-end',
        background: Colors.primary,
        borderBottomRightRadius: '4px',
    },
    aiBubble: {
        alignSelf: 'flex-start',
        background: Colors.surface,
        borderBottomLeftRadius: '4px',
    },
    botIcon: {
        width: '24px',
        height: '24px',
        borderRadius: '8px',
        background: `${Colors.primary}20`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    messageText: {
        margin: 0,
        fontSize: '15px',
        lineHeight: 1.5,
        color: Colors.text,
    },
    quickReplies: {
        display: 'flex',
        gap: '8px',
        padding: '0 20px 12px',
        overflowX: 'auto',
    },
    quickReplyBtn: {
        padding: '10px 16px',
        background: Colors.surface,
        border: `1px solid ${Colors.border}`,
        borderRadius: '20px',
        fontSize: '13px',
        fontWeight: 600,
        color: Colors.textSecondary,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
    },
    inputContainer: {
        display: 'flex',
        gap: '12px',
        padding: '16px 20px',
        paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
        borderTop: `1px solid ${Colors.border}`,
        background: Colors.surface,
    },
    input: {
        flex: 1,
        padding: '14px 18px',
        background: Colors.background,
        borderRadius: '24px',
        fontSize: '15px',
        color: Colors.text,
        border: `1px solid ${Colors.border}`,
    },
    sendBtn: {
        width: '50px',
        height: '50px',
        borderRadius: '25px',
        background: Colors.gradientPrimary,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        border: 'none',
    },
};

export default CoachPage;


