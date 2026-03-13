type TimerFinishedPayload = {
    title: string;
    body: string;
};

type TimerAlertOptions = {
    showNotification?: boolean;
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

    async triggerTimerFinished(payload: TimerFinishedPayload, options?: TimerAlertOptions): Promise<void> {
        this.vibrate();
        await this.playTone();
        if (options?.showNotification !== false) {
            await this.showNotification(payload);
        }
    }

    private vibrate(): void {
        if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
        navigator.vibrate([140, 90, 140, 90, 220]);
    }

    private async playTone(): Promise<void> {
        if (typeof window === 'undefined' || typeof window.AudioContext === 'undefined') return;

        try {
            this.audioContext = this.audioContext || new window.AudioContext();
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }

            const now = this.audioContext.currentTime;
            const playBeep = (startOffset: number, frequency: number, duration: number) => {
                const oscillator = this.audioContext!.createOscillator();
                const gain = this.audioContext!.createGain();
                oscillator.type = 'square';
                oscillator.frequency.setValueAtTime(frequency, now + startOffset);

                const startTime = now + startOffset;
                const endTime = startTime + duration;

                gain.gain.setValueAtTime(0.0001, startTime);
                gain.gain.linearRampToValueAtTime(0.8, startTime + 0.01);
                gain.gain.exponentialRampToValueAtTime(0.0001, endTime);

                oscillator.connect(gain);
                gain.connect(this.audioContext!.destination);
                oscillator.start(startTime);
                oscillator.stop(endTime);
            };

            // Double short beep for a clearer end-of-timer cue.
            playBeep(0, 950, 0.13);
            playBeep(0.2, 1050, 0.13);
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
