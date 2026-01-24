// =====================================================
// GymBro PWA - Main App with Routing
// =====================================================

import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import MainLayout from './components/MainLayout';
import { BodyStatusPage } from './pages/BodyStatusPage';
import { CoachPage } from './pages/CoachPage';
import { DualTrainingPage } from './pages/DualTrainingPage';
import { HomePage } from './pages/HomePage';
import { MigratorPage } from './pages/MigratorPage';
import {
    OnboardingCompletado,
    OnboardingDatos,
    OnboardingHorarios,
    OnboardingWelcome
} from './pages/Onboarding';
import { ProfilePage } from './pages/ProfilePage';
import { ProgressPage } from './pages/ProgressPage';
import { RoutineDetailPage } from './pages/RoutineDetailPage';
import { SchedulePage } from './pages/SchedulePage';
import { TrainPage } from './pages/TrainPage';
import { useUserStore } from './stores/userStore';

// Protected Route wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { perfil } = useUserStore();

    if (!perfil.onboardingCompletado) {
        return <Navigate to="/onboarding" replace />;
    }

    return <>{children}</>;
};

// Onboarding Route wrapper (redirects if already completed)
const OnboardingRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { perfil } = useUserStore();

    if (perfil.onboardingCompletado) {
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
};

function App() {
    return (
        <BrowserRouter>
            <Routes>
                {/* Onboarding Routes - Full screen experience */}
                <Route path="/onboarding" element={
                    <OnboardingRoute><OnboardingWelcome /></OnboardingRoute>
                } />
                <Route path="/onboarding/datos" element={
                    <OnboardingRoute><OnboardingDatos /></OnboardingRoute>
                } />
                <Route path="/onboarding/horarios" element={
                    <OnboardingRoute><OnboardingHorarios /></OnboardingRoute>
                } />
                <Route path="/onboarding/completado" element={<OnboardingCompletado />} />

                {/* Main App Routes - Responsive Layout (Desktop Sidebar / Mobile Bottom Nav) */}
                <Route path="/" element={
                    <ProtectedRoute>
                        <MainLayout />
                    </ProtectedRoute>
                }>
                    <Route index element={<HomePage />} />
                    <Route path="train" element={<TrainPage />} />
                    <Route path="progress" element={<ProgressPage />} />
                    <Route path="profile" element={<ProfilePage />} />
                    <Route path="profile/schedule" element={<SchedulePage />} />
                    <Route path="routine" element={<RoutineDetailPage />} />

                    {/* New "Pencil" Windows */}
                    <Route path="coach" element={<CoachPage />} />
                    <Route path="body-status" element={<BodyStatusPage />} />
                    <Route path="dual-training" element={<DualTrainingPage />} />
                    <Route path="migrator" element={<MigratorPage />} />
                </Route>

                {/* Catch all - redirect to home or onboarding */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
