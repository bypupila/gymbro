
import React from 'react';
import { useUserStore } from '../stores/userStore';
import { Colors } from '../styles/colors';
import { Cloud, CloudOff, Loader2, CheckCircle2 } from 'lucide-react';

export const SyncStatus: React.FC = () => {
    const { isSyncing, lastSyncError, userId } = useUserStore();

    if (!userId) return null;

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: '12px',
            background: lastSyncError ? `${Colors.error}15` : isSyncing ? `${Colors.primary}10` : 'transparent',
            border: `1px solid ${lastSyncError ? Colors.error + '30' : 'transparent'}`,
            transition: 'all 0.3s ease'
        }} title={lastSyncError || (isSyncing ? 'Sincronizando...' : 'Sincronizado con la nube')}>
            {isSyncing ? (
                <>
                    <Loader2 size={14} color={Colors.primary} className="animate-spin" />
                    <span style={{ fontSize: '10px', fontWeight: 700, color: Colors.primary }}>SYNC...</span>
                </>
            ) : lastSyncError ? (
                <>
                    <CloudOff size={14} color={Colors.error} />
                    <span style={{ fontSize: '10px', fontWeight: 700, color: Colors.error }}>LOCAL</span>
                </>
            ) : (
                <>
                    <CheckCircle2 size={14} color={Colors.success} />
                    <span style={{ fontSize: '10px', fontWeight: 700, color: Colors.success }}>SAFE</span>
                </>
            )}
        </div>
    );
};
