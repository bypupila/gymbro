// =====================================================
// GymBro PWA - Main App with Routing
// =====================================================

import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import MainLayout from './components/MainLayout';
import { CloudSyncManager } from './components/CloudSyncManager';
import { useUserStore } from './stores/userStore';
import Loader from './components/Loader';

// Lazy load pages
const BodyStatusPage = lazy(() => import('./pages/BodyStatusPage').then(module => ({ default: module.BodyStatusPage })));
const CoachPage = lazy(() => import('./pages/CoachPage').then(module => ({ default: module.CoachPage })));
const DualTrainingPage = lazy(() => import('./pages/DualTrainingPage').then(module => ({ default: module.DualTrainingPage })));
const HomePage = lazy(() => import('./pages/HomePage').then(module => ({ default: module.HomePage })));
const MigratorPage = lazy(() => import('./pages/MigratorPage').then(module => ({ default: module.MigratorPage })));
const OnboardingWelcome = lazy(() => import('./pages/Onboarding').then(module => ({ default: module.OnboardingWelcome })));
const OnboardingDatos = lazy(() => import('./pages/Onboarding').then(module => ({ default: module.OnboardingDatos })));
const OnboardingHorarios = lazy(() => import('./pages/Onboarding').then(module => ({ default: module.OnboardingHorarios })));
const OnboardingCompletado = lazy(() => import('./pages/Onboarding').then(module => ({ default: module.OnboardingCompletado })));
const LoginPage = lazy(() => import('./pages/LoginPage').then(module => ({ default: module.LoginPage })));
const ProfilePage = lazy(() => import('./pages/ProfilePage').then(module => ({ default: module.ProfilePage })));
const ProgressPage = lazy(() => import('./pages/ProgressPage').then(module => ({ default: module.ProgressPage })));
const RoutineDetailPage = lazy(() => import('./pages/RoutineDetailPage').then(module => ({ default: module.RoutineDetailPage })));
const SchedulePage = lazy(() => import('./pages/SchedulePage').then(module => ({ default: module.SchedulePage })));
const TrainPage = lazy(() => import('./pages/TrainPage').then(module => ({ default: module.TrainPage })));
const CatalogPage = lazy(() => import('./pages/CatalogPage').then(module => ({ default: module.CatalogPage })));


// Protected Route wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { userId, perfil } = useUserStore();

    // If not logged in, ALWAYS go to login
    if (!userId) {
        return <Navigate to="/login" replace />;
    }

    // If logged in but onboarding not done, go to onboarding
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

import { AuthProvider } from './components/AuthProvider';
import { TrainingInvitationNotifier } from './components/TrainingInvitationNotifier';

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <Toaster position="top-center" toastOptions={{
                    duration: 3000,
                    style: {
                        background: '#1a1a1a',
                        color: '#fff',
                        borderRadius: '12px',
                        border: '1px solid rgba(255,255,255,0.1)'
                    }
                }} />
                <CloudSyncManager />
                <TrainingInvitationNotifier />
                <Suspense fallback={<Loader />}>
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

                        {/* Login Route */}
                        <Route path="/login" element={<LoginPage />} />

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
                            <Route path="catalog" element={<CatalogPage />} />

                            {/* New "Pencil" Windows */}
                            <Route path="coach" element={<CoachPage />} />
                            <Route path="body-status" element={<BodyStatusPage />} />
                            <Route path="dual-training" element={<DualTrainingPage />} />
                            <Route path="migrator" element={<MigratorPage />} />
                        </Route>

                        {/* Catch all - redirect to home or onboarding */}
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </Suspense>
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;
