// =====================================================
// GymBro PWA - Home / Dashboard Page
// =====================================================

import { RoutineUpload } from '@/components/RoutineUpload';
import { useUserStore, EjercicioRutina, PartnerInfo } from '@/stores/userStore';
import Colors from '@/styles/colors';
import { Play, Plus, FileText, Zap, Battery, BatteryLow, BatteryMedium, BatteryFull, Flame, ChevronLeft, Calendar } from 'lucide-react';
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ActiveWorkout } from '@/components/ActiveWorkout';
import { SyncStatus } from '@/components/SyncStatus';
import { WeeklyProgressBar } from '@/components/WeeklyProgressBar';
import { MoodStats } from '@/components/MoodStats';
import { trainingInvitationService } from '@/services/trainingInvitationService';
import { liveSessionService } from '@/services/liveSessionService';
import { toast } from 'react-hot-toast';

export const HomePage: React.FC = () => {
    const navigate = useNavigate();
    const [showRoutineModal, setShowRoutineModal] = useState(false);
    const { perfil, getEntrenamientoHoy, activeSession, startSession } = useUserStore();
    const entrenamientoHoy = getEntrenamientoHoy();

    // Mood Tracking State
    const [showMoodModal, setShowMoodModal] = useState(false);
    const [showModeModal, setShowModeModal] = useState(false);
    const [modeStep, setModeStep] = useState<'choose' | 'selectPartner' | 'selectMode'>('choose');
    const [tempSessionData, setTempSessionData] = useState<{ day: string, exercises: EjercicioRutina[], name: string } | null>(null);
    const [tempMood, setTempMood] = useState<number | undefined>(undefined);
    const [selectedPartner, setSelectedPartner] = useState<PartnerInfo | null>(null);
    const [pendingInvitationId, setPendingInvitationId] = useState<string | null>(null);
    const [isWaitingForAccept, setIsWaitingForAccept] = useState(false);

    // Day picker state
    const [showDayPickerModal, setShowDayPickerModal] = useState(false);
    const [selectedTrackingDate, setSelectedTrackingDate] = useState<string | undefined>(undefined);

    const hasPartners = (perfil.partners && perfil.partners.length > 0) || !!perfil.partnerId;

    // Get current week days for day picker
    const getWeekDaysForPicker = () => {
        const today = new Date();
        const currentDay = today.getDay();
        const monday = new Date(today);
        monday.setDate(today.getDate() - (currentDay === 0 ? 6 : currentDay - 1));

        return Array.from({ length: 7 }, (_, i) => {
            const date = new Date(monday);
            date.setDate(monday.getDate() + i);
            return date;
        });
    };

    const formatDateKey = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const dayNamesShort = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];
    const dayNamesFull = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'];

    const cancelPendingInvitation = useCallback(async () => {
        if (pendingInvitationId) {
            try {
                const pendingInvitation = await trainingInvitationService.getInvitationById(pendingInvitationId);
                if (pendingInvitation?.liveSessionId) {
                    await liveSessionService.cancelSession(pendingInvitation.liveSessionId);
                }
                await trainingInvitationService.cancelInvitation(pendingInvitationId);
            } catch {
                // Ignore cleanup errors
            }
        }
        setIsWaitingForAccept(false);
        setPendingInvitationId(null);
    }, [pendingInvitationId, setIsWaitingForAccept, setPendingInvitationId]);

    const resetModeModal = useCallback(() => {
        void cancelPendingInvitation();
        setShowModeModal(false);
        setTempSessionData(null);
        setTempMood(undefined);
        setSelectedPartner(null);
        setSelectedTrackingDate(undefined);
        setModeStep('choose');
        setIsWaitingForAccept(false);
    }, [cancelPendingInvitation, setShowModeModal, setTempSessionData, setTempMood, setSelectedPartner, setSelectedTrackingDate, setModeStep, setIsWaitingForAccept]);

    const handleInitiateSession = (day: string, exercises: EjercicioRutina[], name: string) => {
        setTempSessionData({ day, exercises, name });
        setSelectedTrackingDate(formatDateKey(new Date())); // default to today
        setShowDayPickerModal(true);
    };

    const handleDayPickerConfirm = () => {
        setShowDayPickerModal(false);
        setShowMoodModal(true);
    };

    const confirmStartSession = (mood: number) => {
        if (tempSessionData) {
            setTempMood(mood);
            setShowMoodModal(false);
            
            if (hasPartners) {
                setModeStep('choose');
                setSelectedPartner(null);
                setShowModeModal(true);
            } else {
                startSession(tempSessionData.day, tempSessionData.exercises, tempSessionData.name, 'solo', mood, undefined, undefined, undefined, selectedTrackingDate);
                setTempSessionData(null);
                setTempMood(undefined);
                setSelectedTrackingDate(undefined);
            }
        }
    };

    const handleSoloMode = () => {
        if (tempSessionData && tempMood !== undefined) {
            startSession(tempSessionData.day, tempSessionData.exercises, tempSessionData.name, 'solo', tempMood, undefined, undefined, undefined, selectedTrackingDate);
            resetModeModal();
        }
    };

    const handlePartnerSelected = (partner: PartnerInfo) => {
        setSelectedPartner(partner);
        setModeStep('selectMode');
    };

    const handleModeConfirm = async (mode: 'shared' | 'linked') => {
        if (!tempSessionData || tempMood === undefined || !selectedPartner) return;
        let preparedLiveSessionId: string | null = null;

        if (mode === 'shared') {
            // Shared mode: start immediately, both on same device
            startSession(tempSessionData.day, tempSessionData.exercises, tempSessionData.name, mode, tempMood, undefined, undefined, selectedPartner, selectedTrackingDate);
            resetModeModal();
        } else {
            // Linked mode: send invitation and wait for acceptance
            try {
                const { userId, perfil } = useUserStore.getState();
                if (!userId) return;
                const liveSessionId = `session_${Date.now()}_${userId}`;
                preparedLiveSessionId = liveSessionId;

                await liveSessionService.createLiveSession(
                    userId,
                    selectedPartner.id,
                    {
                        dayName: tempSessionData.day,
                        routineName: tempSessionData.name,
                        exercises: tempSessionData.exercises.map((ex) => ({
                            id: ex.id,
                            nombre: ex.nombre,
                            targetSeries: ex.series,
                            targetReps: ex.repeticiones,
                            categoria: ex.categoria,
                            isOptional: ex.isOptional,
                            isCompleted: false,
                            sets: Array.from({ length: ex.series }, () => ({
                                completed: false,
                                skipped: false,
                                weight: 0,
                                reps: parseInt(ex.repeticiones) || 10,
                                duration: ex.segundos || 0,
                                rest: ex.descanso || 60
                            }))
                        }))
                    },
                    liveSessionId
                );

                const invitationId = await trainingInvitationService.sendInvitation(
                    userId,
                    perfil.usuario.nombre || perfil.alias || 'GymBro',
                    selectedPartner.id,
                    selectedPartner.nombre,
                    mode,
                    tempSessionData.name,
                    {
                        dayName: tempSessionData.day,
                        exercises: tempSessionData.exercises,
                        trackingDate: selectedTrackingDate,
                        liveSessionId,
                    }
                );
                setPendingInvitationId(invitationId);
                setIsWaitingForAccept(true);
                setModeStep('selectMode'); // stay on same step but show waiting state
            } catch (error) {
                console.error('Error sending invitation:', error);
                toast.error('No se pudo enviar la invitacion');
                if (preparedLiveSessionId) {
                    void liveSessionService.cancelSession(preparedLiveSessionId).catch(() => undefined);
                }
            }
        }
    };

    // Listen for invitation acceptance
    useEffect(() => {
        if (!pendingInvitationId || !isWaitingForAccept) return;

        const unsubscribe = trainingInvitationService.onInvitationStatusChange(
            pendingInvitationId,
            (invitation) => {
                if (!invitation) return;

                if (invitation.status === 'accepted') {
                    // Partner accepted! Start the session
                    if (tempSessionData && tempMood !== undefined && selectedPartner) {
                        const { userId } = useUserStore.getState();
                        const liveSessionId = invitation.liveSessionId || `session_${Date.now()}_${userId}`;

                        startSession(
                            tempSessionData.day,
                            tempSessionData.exercises,
                            tempSessionData.name,
                            'linked',
                            tempMood,
                            undefined,
                            undefined,
                            selectedPartner,
                            selectedTrackingDate,
                            liveSessionId
                        );
                        toast.success(`${selectedPartner.nombre} acepto! Entrenamiento iniciado`);
                    }
                    resetModeModal();
                } else if (invitation.status === 'declined') {
                    if (invitation.liveSessionId) {
                        void liveSessionService.cancelSession(invitation.liveSessionId).catch(() => undefined);
                    }
                    toast.error(`${selectedPartner?.nombre || 'Partner'} rechazo la invitacion`);
                    setIsWaitingForAccept(false);
                    setPendingInvitationId(null);
                } else if (invitation.status === 'expired') {
                    if (invitation.liveSessionId) {
                        void liveSessionService.cancelSession(invitation.liveSessionId).catch(() => undefined);
                    }
                    toast.error('La invitacion expiro');
                    setIsWaitingForAccept(false);
                    setPendingInvitationId(null);
                }
            }
        );

        return () => unsubscribe();
    }, [pendingInvitationId, isWaitingForAccept, resetModeModal, selectedPartner, selectedTrackingDate, startSession, tempMood, tempSessionData]);

    const nombreUsuario = perfil.usuario.nombre || 'Daniel';
    const fechaHoyRaw = new Date().toLocaleDateString('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
    });
    const fechaHoy = fechaHoyRaw.split(' ').map(word =>
        word.length > 2 ? word.charAt(0).toUpperCase() + word.slice(1) : word
    ).join(' ');

    return (
        <div style={styles.container}>
            {activeSession && (
                <ActiveWorkout
                    onFinish={() => { }}
                    onCancel={() => { }}
                />
            )}
            {/* Header */}
            <div style={styles.header}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h1 style={styles.greeting}>Hola, {nombreUsuario}</h1>
                        <SyncStatus />
                    </div>
                    <p style={styles.date}>{fechaHoy}</p>
                </div>
                <div
                    style={styles.avatar}
                    onClick={() => navigate('/profile')}
                >
                    <img
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${nombreUsuario}`}
                        alt="Avatar"
                        style={styles.avatarImg}
                    />
                </div>
            </div>

            {/* Weekly Progress Bar */}
            <WeeklyProgressBar />

            {/* Mood Analytics */}
            <MoodStats />

            {/* Main Workout Cards List */}
            {!perfil.rutina ? (
                <div
                    style={styles.routinePrompt}
                    onClick={() => setShowRoutineModal(true)}
                >
                    <div style={styles.promptIcon}>
                        <FileText size={24} color={Colors.primary} />
                    </div>
                    <div style={styles.promptContent}>
                        <h3 style={styles.promptTitle}>¿Tienes una rutina?</h3>
                        <p style={styles.promptSub}>Sube una foto y Gemini la analizará por ti.</p>
                    </div>
                    <div style={styles.promptAction}>
                        <Plus size={20} color={Colors.text} />
                    </div>
                </div>
            ) : (
                <div style={styles.daysList}>
                    {perfil.horario.dias.filter(d => d.entrena).map((trainingDay) => {
                        const dayExercises = perfil.rutina?.ejercicios.filter(ex =>
                            !ex.dia || ex.dia.toLowerCase().includes(trainingDay.dia.toLowerCase())
                        ) || [];

                        const isToday = trainingDay.dia.toLowerCase() === entrenamientoHoy.dia?.toLowerCase();

                        return (
                            <div
                                key={trainingDay.dia}
                                onClick={() => handleInitiateSession(trainingDay.dia, dayExercises, perfil.rutina?.nombre || 'Rutina')}
                                style={{
                                    ...styles.workoutCard,
                                    background: isToday ? Colors.gradientPrimary : Colors.surface,
                                    border: isToday ? 'none' : `1px solid ${Colors.border}`,
                                }}
                            >
                                <div style={styles.cardHeaderRow}>
                                    <div style={styles.cardBadge}>
                                        <span style={{ ...styles.badgeText, color: isToday ? '#FFF' : Colors.primary }}>
                                            {trainingDay.dia.toUpperCase()}
                                        </span>
                                    </div>
                                </div>

                                <h2 style={{ ...styles.cardTitle, color: isToday ? '#000' : Colors.text, fontSize: '24px' }}>
                                    {trainingDay.grupoMuscular}
                                </h2>

                                <div style={styles.cardFooter}>
                                    <div style={{ ...styles.exercisePreview, background: isToday ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.05)' }}>
                                        <Zap size={16} color={isToday ? '#000' : Colors.textSecondary} />
                                        <span style={{ ...styles.previewText, color: isToday ? '#000' : Colors.textSecondary }}>
                                            {dayExercises.length} Ejercicios
                                        </span>
                                    </div>
                                    <div style={{ ...styles.playButton, background: isToday ? '#000' : Colors.primary }}>
                                        <Play size={20} color={isToday ? '#FFF' : '#000'} fill={isToday ? '#FFF' : '#000'} />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Routine Upload Modal */}
            {showRoutineModal && (
                <RoutineUpload
                    onComplete={() => setShowRoutineModal(false)}
                    onCancel={() => setShowRoutineModal(false)}
                />
            )}

            {/* Day Picker Modal - Ask which day this workout counts for */}
            {showDayPickerModal && tempSessionData && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContent}>
                        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                            <Calendar size={32} color={Colors.primary} />
                        </div>
                        <h2 style={styles.modalTitle}>
                            {tempSessionData.day} - {tempSessionData.name}
                        </h2>
                        <p style={styles.modalSubtitle}>
                            Selecciona el dia para el que cuenta este entrenamiento
                        </p>

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(7, 1fr)',
                            gap: '6px',
                            marginBottom: '20px',
                        }}>
                            {getWeekDaysForPicker().map((date, index) => {
                                const dateKey = formatDateKey(date);
                                const isSelected = selectedTrackingDate === dateKey;
                                const isToday = formatDateKey(new Date()) === dateKey;
                                const isFuture = date > new Date();
                                const tracking = perfil.weeklyTracking?.[dateKey];
                                const isAlreadyCompleted = tracking === 'completed' || tracking === true;

                                return (
                                    <button
                                        key={dateKey}
                                        disabled={isFuture}
                                        onClick={() => setSelectedTrackingDate(dateKey)}
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: '4px',
                                            padding: '8px 4px',
                                            borderRadius: '12px',
                                            border: isSelected
                                                ? `2px solid ${Colors.primary}`
                                                : `1px solid ${Colors.border}`,
                                            background: isSelected
                                                ? `${Colors.primary}20`
                                                : isAlreadyCompleted
                                                    ? `${Colors.success}15`
                                                    : Colors.surface,
                                            cursor: isFuture ? 'not-allowed' : 'pointer',
                                            opacity: isFuture ? 0.3 : 1,
                                            transition: 'all 0.2s ease',
                                        }}
                                    >
                                        <span style={{
                                            fontSize: '10px',
                                            fontWeight: 600,
                                            color: isSelected ? Colors.primary : Colors.textSecondary,
                                            textTransform: 'uppercase',
                                        }}>
                                            {dayNamesShort[index]}
                                        </span>
                                        <span style={{
                                            fontSize: '16px',
                                            fontWeight: isSelected || isToday ? 700 : 500,
                                            color: isSelected ? Colors.primary : isToday ? Colors.text : Colors.textSecondary,
                                        }}>
                                            {date.getDate()}
                                        </span>
                                        {isToday && (
                                            <div style={{
                                                width: '4px',
                                                height: '4px',
                                                borderRadius: '50%',
                                                background: isSelected ? Colors.primary : Colors.textTertiary,
                                            }} />
                                        )}
                                        {isAlreadyCompleted && !isToday && (
                                            <div style={{
                                                width: '4px',
                                                height: '4px',
                                                borderRadius: '50%',
                                                background: Colors.success,
                                            }} />
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {selectedTrackingDate && selectedTrackingDate !== formatDateKey(new Date()) && (
                            <p style={{
                                fontSize: '13px',
                                color: Colors.warning,
                                textAlign: 'center',
                                marginBottom: '12px',
                                padding: '8px 12px',
                                background: `${Colors.warning}15`,
                                borderRadius: '8px',
                            }}>
                                Este entrenamiento se registrara para el{' '}
                                {(() => {
                                    const d = new Date(selectedTrackingDate + 'T12:00:00');
                                    const idx = (d.getDay() + 6) % 7; // Monday = 0
                                    return `${dayNamesFull[idx]} ${d.getDate()}`;
                                })()}
                            </p>
                        )}

                        <button
                            style={{
                                ...styles.confirmModeBtn,
                                opacity: selectedTrackingDate ? 1 : 0.5,
                            }}
                            disabled={!selectedTrackingDate}
                            onClick={handleDayPickerConfirm}
                        >
                            Continuar
                        </button>

                        <button
                            style={styles.cancelLink}
                            onClick={() => {
                                setShowDayPickerModal(false);
                                setTempSessionData(null);
                                setSelectedTrackingDate(undefined);
                            }}
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            )}

            {/* Mood / Energy Pre-Workout Modal */}
            {showMoodModal && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContent}>
                        <h2 style={styles.modalTitle}>¿Cómo te sientes hoy?</h2>
                        <p style={styles.modalSubtitle}>Nivel de energía antes de entrenar</p>

                        <div style={styles.moodGrid}>
                            {[
                                { val: 1, label: 'Agotado', icon: <Battery size={32} color={Colors.error} /> },
                                { val: 2, label: 'Bajo', icon: <BatteryLow size={32} color={Colors.warning} /> },
                                { val: 3, label: 'Normal', icon: <BatteryMedium size={32} color={Colors.textSecondary} /> },
                                { val: 4, label: 'Bien', icon: <BatteryFull size={32} color={Colors.success} /> },
                                { val: 5, label: 'A tope', icon: <Flame size={32} color={Colors.primary} fill={Colors.primary} /> }
                            ].map((mood) => (
                                <button
                                    key={mood.val}
                                    style={styles.moodBtn}
                                    onClick={() => confirmStartSession(mood.val)}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '40px' }}>
                                        {mood.icon}
                                    </div>
                                    <span style={styles.moodLabel}>{mood.label}</span>
                                </button>
                            ))}
                        </div>

                        <button
                            style={styles.cancelLink}
                            onClick={() => setShowMoodModal(false)}
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            )}

            {/* Mode Selector Modal - Multi-step */}
            {showModeModal && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContent}>
                        {/* Step 1: Solo or with someone */}
                        {modeStep === 'choose' && (
                            <>
                                <h2 style={styles.modalTitle}>Como entrenaras hoy?</h2>
                                <p style={styles.modalSubtitle}>Elige tu modo de entrenamiento</p>

                                <div style={styles.modeGrid}>
                                    <button style={styles.modeCard} onClick={handleSoloMode}>
                                        <div style={styles.modeIcon}>{'👤'}</div>
                                        <h3 style={styles.modeTitle}>Solo</h3>
                                        <p style={styles.modeDesc}>Entrena individualmente</p>
                                    </button>

                                    <button style={styles.modeCard} onClick={() => setModeStep('selectPartner')}>
                                        <div style={styles.modeIcon}>{'👥'}</div>
                                        <h3 style={styles.modeTitle}>Con alguien</h3>
                                        <p style={styles.modeDesc}>Elige tu partner de entrenamiento</p>
                                    </button>
                                </div>
                            </>
                        )}

                        {/* Step 2: Select Partner */}
                        {modeStep === 'selectPartner' && (
                            <>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', marginBottom: '16px' }}>
                                    <button onClick={() => setModeStep('choose')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px' }}>
                                        <ChevronLeft size={20} color={Colors.textSecondary} />
                                    </button>
                                    <h2 style={{ ...styles.modalTitle, marginBottom: 0, flex: 1, textAlign: 'left' }}>Con quien entrenas?</h2>
                                </div>
                                <p style={{ ...styles.modalSubtitle, textAlign: 'left', width: '100%' }}>Selecciona a tu partner</p>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', marginBottom: '24px', maxHeight: '300px', overflowY: 'auto' }}>
                                    {(perfil.partners && perfil.partners.length > 0) ? (
                                        perfil.partners.map((partner) => (
                                            <button
                                                key={partner.id}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '12px',
                                                    padding: '14px 16px',
                                                    background: Colors.surfaceLight,
                                                    border: `1px solid ${Colors.border}`,
                                                    borderRadius: '12px',
                                                    cursor: 'pointer',
                                                    textAlign: 'left',
                                                    transition: 'all 0.2s ease',
                                                }}
                                                onClick={() => handlePartnerSelected(partner)}
                                            >
                                                <img
                                                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${partner.nombre || partner.alias}`}
                                                    style={{ width: '40px', height: '40px', borderRadius: '12px', background: Colors.background }}
                                                    alt={partner.nombre}
                                                />
                                                <div style={{ flex: 1 }}>
                                                    <span style={{ fontSize: '15px', fontWeight: 700, color: Colors.text, display: 'block' }}>{partner.nombre}</span>
                                                    <span style={{ fontSize: '11px', color: Colors.textTertiary }}>@{partner.alias}</span>
                                                </div>
                                                <Zap size={18} color={Colors.primary} />
                                            </button>
                                        ))
                                    ) : perfil.partnerId ? (
                                        <button
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '12px',
                                                padding: '14px 16px',
                                                background: Colors.surfaceLight,
                                                border: `1px solid ${Colors.border}`,
                                                borderRadius: '12px',
                                                cursor: 'pointer',
                                                textAlign: 'left',
                                            }}
                                            onClick={() => handlePartnerSelected({
                                                id: perfil.partnerId!,
                                                alias: perfil.pareja?.nombre || 'Partner',
                                                nombre: perfil.pareja?.nombre || 'Partner',
                                            })}
                                        >
                                            <img
                                                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${perfil.pareja?.nombre || 'GymBro'}`}
                                                style={{ width: '40px', height: '40px', borderRadius: '12px', background: Colors.background }}
                                                alt="Partner"
                                            />
                                            <div style={{ flex: 1 }}>
                                                <span style={{ fontSize: '15px', fontWeight: 700, color: Colors.text, display: 'block' }}>{perfil.pareja?.nombre || 'Partner'}</span>
                                                <span style={{ fontSize: '11px', color: Colors.textTertiary }}>Vinculado</span>
                                            </div>
                                            <Zap size={18} color={Colors.primary} />
                                        </button>
                                    ) : (
                                        <p style={{ color: Colors.textSecondary, textAlign: 'center', padding: '20px' }}>
                                            No tienes partners vinculados. Ve a Entrenamiento Dual para agregar uno.
                                        </p>
                                    )}
                                </div>
                            </>
                        )}

                        {/* Step 3: Select Mode */}
                        {modeStep === 'selectMode' && selectedPartner && !isWaitingForAccept && (
                            <>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', marginBottom: '16px' }}>
                                    <button onClick={() => setModeStep('selectPartner')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px' }}>
                                        <ChevronLeft size={20} color={Colors.textSecondary} />
                                    </button>
                                    <h2 style={{ ...styles.modalTitle, marginBottom: 0, flex: 1, textAlign: 'left' }}>Modo de entrenamiento</h2>
                                </div>
                                <p style={{ ...styles.modalSubtitle, textAlign: 'left', width: '100%' }}>
                                    Entrenando con <span style={{ fontWeight: 700, color: Colors.primary }}>{selectedPartner.nombre}</span>
                                </p>

                                <div style={styles.modeGrid}>
                                    <button style={styles.modeCard} onClick={() => handleModeConfirm('shared')}>
                                        <div style={styles.modeIcon}>{'📱'}</div>
                                        <h3 style={styles.modeTitle}>Mismo celular</h3>
                                        <p style={styles.modeDesc}>Los dos en un solo dispositivo</p>
                                    </button>

                                    <button style={styles.modeCard} onClick={() => handleModeConfirm('linked')}>
                                        <div style={styles.modeIcon}>{'🔗'}</div>
                                        <h3 style={styles.modeTitle}>Cada quien su cel</h3>
                                        <p style={styles.modeDesc}>Sincronizacion en tiempo real</p>
                                    </button>
                                </div>
                            </>
                        )}

                        {/* Waiting for partner acceptance */}
                        {isWaitingForAccept && selectedPartner && (
                            <>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '20px 0', width: '100%' }}>
                                    <div style={{
                                        width: '64px',
                                        height: '64px',
                                        borderRadius: '50%',
                                        border: `3px solid ${Colors.primary}`,
                                        borderTopColor: 'transparent',
                                        animation: 'spin 1s linear infinite',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }} />
                                    <h2 style={{ ...styles.modalTitle, fontSize: '18px' }}>Esperando a {selectedPartner.nombre}</h2>
                                    <p style={styles.modalSubtitle}>
                                        Se envio una invitacion. Cuando la acepte, el entrenamiento comenzara automaticamente.
                                    </p>
                                    <img
                                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedPartner.nombre || selectedPartner.alias}`}
                                        style={{ width: '60px', height: '60px', borderRadius: '50%', background: Colors.background, border: `2px solid ${Colors.primary}` }}
                                        alt={selectedPartner.nombre}
                                    />
                                </div>
                                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                            </>
                        )}

                        <button style={styles.cancelLink} onClick={resetModeModal}>
                            Cancelar
                        </button>
                    </div>
                </div>
            )}



            {/* Premium Windows Grid (Pencil Mockup) */}

        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    container: {
        padding: '20px',
        paddingTop: 'calc(20px + env(safe-area-inset-top, 0px))',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
    },
    greeting: {
        fontSize: '24px',
        fontWeight: 800,
        color: Colors.text,
        margin: 0,
    },
    date: {
        fontSize: '13px',
        color: Colors.textSecondary,
        textTransform: 'capitalize',
        margin: 0,
    },
    avatar: {
        width: '50px',
        height: '50px',
        borderRadius: '50%',
        overflow: 'hidden',
        border: `2px solid ${Colors.surface}`,
        cursor: 'pointer',
    },
    avatarImg: {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
    },
    daysList: {
        display: 'flex',
        flexDirection: 'row',
        gap: '12px',
        marginBottom: '24px',
        overflowX: 'auto',
        paddingBottom: '12px',
        scrollbarWidth: 'none',
    },
    workoutCard: {
        flex: '0 0 240px',
        borderRadius: '24px',
        padding: '16px',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: '160px',
    },
    cardHeaderRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '4px',
    },
    routinePrompt: {
        background: Colors.surface,
        borderRadius: '24px',
        padding: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        marginBottom: '24px',
        cursor: 'pointer',
        border: `1px solid ${Colors.border}`,
        transition: 'transform 0.2s ease, border-color 0.2s ease',
    },
    promptIcon: {
        width: '48px',
        height: '48px',
        borderRadius: '16px',
        background: `${Colors.primary}15`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    promptContent: {
        flex: 1,
    },

    modalOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.8)',
        backdropFilter: 'blur(5px)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
    },
    modalContent: {
        background: Colors.surface,
        borderRadius: '24px',
        padding: '32px 24px',
        width: '100%',
        maxWidth: '350px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        border: `1px solid ${Colors.border}`,
        boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
    },
    modalTitle: {
        fontSize: '24px',
        fontWeight: 800,
        color: Colors.text,
        marginBottom: '8px',
        textAlign: 'center',
    },
    modalSubtitle: {
        fontSize: '14px',
        color: Colors.textSecondary,
        marginBottom: '24px',
        textAlign: 'center',
    },
    moodGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: '8px',
        width: '100%',
        marginBottom: '24px',
    },
    moodBtn: {
        background: 'transparent',
        border: 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
        cursor: 'pointer',
        padding: '8px 0',
        borderRadius: '12px',
        transition: 'background 0.2s',
    },
    moodLabel: {
        fontSize: '10px',
        fontWeight: 700,
        color: Colors.textSecondary,
    },
    cancelLink: {
        background: 'transparent',
        border: 'none',
        color: Colors.textSecondary,
        fontSize: '14px',
        textDecoration: 'underline',
        cursor: 'pointer',
    },
    confirmModeBtn: {
        width: '100%',
        padding: '14px 20px',
        borderRadius: '16px',
        background: Colors.primary,
        color: '#000',
        fontSize: '16px',
        fontWeight: 800,
        border: 'none',
        cursor: 'pointer',
        marginBottom: '12px',
        transition: 'opacity 0.2s ease',
    },
    modeGrid: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        width: '100%',
        marginBottom: '24px',
    },
    modeCard: {
        background: Colors.surfaceLight,
        border: `1px solid ${Colors.border}`,
        borderRadius: '16px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        textAlign: 'center',
    },
    modeIcon: {
        fontSize: '32px',
        marginBottom: '4px',
    },
    modeTitle: {
        fontSize: '16px',
        fontWeight: 800,
        color: Colors.text,
        margin: 0,
    },
    modeDesc: {
        fontSize: '12px',
        color: Colors.textSecondary,
        margin: 0,
    },
    promptTitle: {
        fontSize: '16px',
        fontWeight: 800,
        color: Colors.text,
        margin: '0 0 2px 0',
    },
    promptSub: {
        fontSize: '12px',
        color: Colors.textSecondary,
        margin: 0,
    },
    promptAction: {
        width: '32px',
        height: '32px',
        borderRadius: '50%',
        background: Colors.surfaceLight,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardBadge: {
        display: 'inline-block',
        background: 'rgba(0,0,0,0.15)',
        padding: '4px 8px',
        borderRadius: '8px',
    },
    badgeText: {
        fontSize: '9px',
        fontWeight: 900,
        letterSpacing: '0.5px',
    },
    cardTime: {
        padding: '4px 8px',
        borderRadius: '8px',
        fontSize: '11px',
        fontWeight: 800,
    },
    cardTitle: {
        fontWeight: 900,
        margin: '12px 0',
        lineHeight: 1.1,
    },
    cardFooter: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
    },
    exercisePreview: {
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: '6px 10px',
        borderRadius: '12px',
    },
    previewText: {
        fontSize: '11px',
        fontWeight: 700,
    },
    playButton: {
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    section: {
        marginBottom: '24px',
    },
    sectionTitle: {
        fontSize: '18px',
        fontWeight: 800,
        color: Colors.text,
        margin: '0 0 16px 0',
    },
    readinessRow: {
        display: 'flex',
        gap: '12px',
    },
    readinessBtn: {
        flex: 1,
        height: '80px',
        borderRadius: '24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        border: '1px solid',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
    },
    statsGrid: {
        display: 'flex',
        gap: '12px',
        marginBottom: '24px',
    },
    statCard: {
        flex: 1,
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
    },
    statHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        marginBottom: '4px',
    },
    statValue: {
        fontSize: '16px',
        fontWeight: 800,
        color: Colors.text,
    },
    statLabel: {
        fontSize: '10px',
        fontWeight: 700,
        color: Colors.textTertiary,
    },
    powerCard: {
        padding: '24px',
        background: '#111113',
    },
    powerContent: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
    },
    powerText: {
        display: 'flex',
        flexDirection: 'column',
    },
    powerLabel: {
        fontSize: '10px',
        fontWeight: 800,
        color: Colors.textTertiary,
        letterSpacing: '1px',
        marginBottom: '4px',
    },
    powerValue: {
        fontSize: '44px',
        fontWeight: 900,
        color: Colors.text,
    },
    powerStatus: {
        fontSize: '14px',
        fontWeight: 800,
    },
    powerVisual: {
        width: '90px',
        height: '90px',
    },
    powerCircle: {
        width: '90px',
        height: '90px',
        borderRadius: '50%',
        background: '#1E1E22',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        position: 'relative',
    },
    powerFill: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        width: '100%',
        opacity: 0.3,
        transition: 'height 0.3s ease',
    },
    aiTip: {
        fontSize: '13px',
        lineHeight: 1.5,
        color: Colors.textSecondary,
        margin: 0,
        paddingTop: '16px',
        borderTop: `1px solid ${Colors.border}`,
    },
    premiumGrid: {
        display: 'flex',
        gap: '12px',
        overflowX: 'auto',
        padding: '4px',
        margin: '0 -4px',
        scrollbarWidth: 'none',
    },
    premiumCard: {
        flex: '0 0 110px',
        background: Colors.surface,
        borderRadius: '20px',
        padding: '16px 12px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '10px',
        border: `1px solid ${Colors.border}`,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
    },
    premiumIcon: {
        width: '40px',
        height: '40px',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    premiumLabel: {
        fontSize: '11px',
        fontWeight: 700,
        color: Colors.text,
        textAlign: 'center',
    },
    routineSection: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        marginBottom: '24px',
    },
    todayExercises: {
        background: Colors.surface,
        borderRadius: '24px',
        padding: '20px',
        border: `1px solid ${Colors.border}`,
    },
    todayHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
    },
    todayTitle: {
        fontSize: '16px',
        fontWeight: 800,
        color: Colors.text,
        margin: 0,
    },
    viewRoutineBtn: {
        fontSize: '12px',
        fontWeight: 700,
        color: Colors.primary,
        background: 'none',
        border: 'none',
        cursor: 'pointer',
    },
    exerciseScroll: {
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
    },
    miniExCard: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px',
        background: Colors.surfaceLight,
        borderRadius: '16px',
        cursor: 'pointer',
    },
    miniExDot: {
        width: '8px',
        height: '8px',
        borderRadius: '50%',
    },
    miniExInfo: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
    },
    miniExName: {
        fontSize: '14px',
        fontWeight: 700,
        color: Colors.text,
    },
    miniExMeta: {
        fontSize: '11px',
        color: Colors.textSecondary,
    },
};

export default HomePage;

