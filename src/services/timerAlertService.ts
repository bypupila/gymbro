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
    private warmedUp = false;

    /**
     * Call on any user interaction (e.g. starting guided mode) to pre-init
     * AudioContext so it's not suspended when the timer expires.
     */
    warmUp(): void {
        if (typeof window === 'undefined') return;
        if (this.warmedUp) return;
        this.warmedUp = true;
        try {
            if (!this.audioContext && typeof window.AudioContext !== 'undefined') {
                this.audioContext = new window.AudioContext();
            }
            if (this.audioContext?.state === 'suspended') {
                void this.audioContext.resume();
            }
        } catch {
            // Non-critical
        }
    }

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
        navigator.vibrate([200, 100, 200, 100, 300]);
    }

    private async playTone(): Promise<void> {
        if (typeof window === 'undefined') return;

        let played = false;

        // Try AudioContext first (preferred, works even in background on many browsers)
        if (typeof window.AudioContext !== 'undefined') {
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
                    gain.gain.linearRampToValueAtTime(1.0, startTime + 0.01);
                    gain.gain.exponentialRampToValueAtTime(0.0001, endTime);

                    oscillator.connect(gain);
                    gain.connect(this.audioContext!.destination);
                    oscillator.start(startTime);
                    oscillator.stop(endTime);
                };

                // Triple beep for an unmissable end-of-rest cue
                playBeep(0, 880, 0.15);
                playBeep(0.22, 988, 0.15);
                playBeep(0.44, 1047, 0.2);
                played = true;
            } catch {
                // Fall through to fallback
            }
        }

        // Fallback: use an HTML5 Audio element with a generated beep
        if (!played) {
            try {
                // Tiny WAV: 44.1kHz mono 8-bit, ~100ms 880Hz square wave
                const sampleRate = 44100;
                const durationSamples = Math.floor(sampleRate * 0.1);
                const buffer = new ArrayBuffer(44 + durationSamples);
                const view = new DataView(buffer);
                // WAV header
                const writeStr = (offset: number, str: string) => { for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i)); };
                writeStr(0, 'RIFF'); view.setUint32(4, 36 + durationSamples, true); writeStr(8, 'WAVE');
                writeStr(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
                view.setUint16(22, 1, true); view.setUint32(24, sampleRate, true);
                view.setUint32(28, sampleRate, true); view.setUint16(32, 1, true); view.setUint16(34, 8, true);
                writeStr(36, 'data'); view.setUint32(40, durationSamples, true);
                for (let i = 0; i < durationSamples; i++) {
                    const t = i / sampleRate;
                    view.setUint8(44 + i, Math.sin(2 * Math.PI * 880 * t) > 0 ? 200 : 56);
                }
                const blob = new Blob([buffer], { type: 'audio/wav' });
                const url = URL.createObjectURL(blob);
                const audio = new Audio(url);
                audio.volume = 1.0;
                await audio.play();
                setTimeout(() => URL.revokeObjectURL(url), 500);
            } catch {
                // Best effort only
            }
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
