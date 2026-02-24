type TimerFinishedPayload = {
    title: string;
    body: string;
};

class TimerAlertService {
    private wakeLock: WakeLockSentinel | null = null;
    private audioContext: AudioContext | null = null;
    private readonly notificationTag = 'gymbro-timer-finished';

    async acquireWakeLock(): Promise<void> {
        if (typeof window === 'undefined') return;
        if (!('wakeLock' in navigator)) return;
        if (document.visibilityState !== 'visible') return;
        if (this.wakeLock) return;

        try {
            this.wakeLock = await navigator.wakeLock.request('screen');
            this.wakeLock.addEventListener('release', () => {
                this.wakeLock = null;
            });
        } catch {
            this.wakeLock = null;
        }
    }

    releaseWakeLock(): void {
        if (!this.wakeLock) return;
        void this.wakeLock.release().catch(() => undefined);
        this.wakeLock = null;
    }

    async triggerTimerFinished(payload: TimerFinishedPayload): Promise<void> {
        this.vibrate();
        await this.playTone();
        await this.showNotification(payload);
    }

    private vibrate(): void {
        if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
        navigator.vibrate([220, 100, 220]);
    }

    private async playTone(): Promise<void> {
        if (typeof window === 'undefined' || typeof window.AudioContext === 'undefined') return;

        try {
            this.audioContext = this.audioContext || new window.AudioContext();
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }

            const oscillator = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            oscillator.type = 'sine';
            oscillator.frequency.value = 880;
            gain.gain.value = 0.08;

            oscillator.connect(gain);
            gain.connect(this.audioContext.destination);

            const now = this.audioContext.currentTime;
            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
            oscillator.start(now);
            oscillator.stop(now + 0.35);
        } catch {
            // Best effort only.
        }
    }

    private async showNotification(payload: TimerFinishedPayload): Promise<void> {
        if (typeof window === 'undefined' || !('Notification' in window)) return;

        try {
            if (Notification.permission === 'default') {
                await Notification.requestPermission();
            }

            if (Notification.permission !== 'granted') return;

            new Notification(payload.title, {
                body: payload.body,
                tag: this.notificationTag,
                renotify: true,
            });
        } catch {
            // Ignore notification errors.
        }
    }
}

export const timerAlertService = new TimerAlertService();

