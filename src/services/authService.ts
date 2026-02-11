import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    signOut as firebaseSignOut,
    onAuthStateChanged,
    User,
    updateEmail
} from 'firebase/auth';
import { auth } from '../config/firebase';

export const authService = {
    // Login con email/password
    async signIn(email: string, password: string) {
        const result = await signInWithEmailAndPassword(auth, email, password);
        return result.user;
    },

    // Registro
    async signUp(email: string, password: string) {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        return result.user;
    },

    // Recuperacion de contrasena (envia email de reseteo)
    async sendPasswordReset(email: string) {
        await sendPasswordResetEmail(auth, email);
    },

    // Logout
    async signOut() {
        await firebaseSignOut(auth);
    },

    onAuthChange(callback: (user: User | null) => void) {
        return onAuthStateChanged(auth, callback);
    },

    // Usuario actual
    getCurrentUser() {
        return auth.currentUser;
    },

    async updateEmail(newEmail: string) {
        if (!auth.currentUser) throw new Error('NO_USER');
        
        await updateEmail(auth.currentUser, newEmail);
    }
};
