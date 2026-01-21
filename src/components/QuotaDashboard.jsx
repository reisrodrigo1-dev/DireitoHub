/**
 * Real-time quota display for admin panel
 * Shows Firestore free tier usage
 */

import React, { useEffect, useState } from 'react';
import { db } from '../firebase/config';
import { collection, doc, getDoc, query, where, getDocs } from 'firebase/firestore';

export default function QuotaDashboard() {
  const [quota, setQuota] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [tribunalStats, setTribunalStats] = useState({});

  const FREE_TIER_WRITES = 20000;
  
  useEffect(() => {
    const fetchQuota = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const logDoc = await getDoc(doc(db, 'sync_logs', today));
        
        if (logDoc.exists()) {
          const data = logDoc.data();
          let totalWrites = 0;
          const stats = {};
          
          Object.entries(data).forEach(([key, value]) => {
            if (typeof value === 'object' && value !== null && value.success !== undefined) {
              const writes = (value.success || 0) + (value.updated || 0);
              totalWrites += writes;
              stats[key] = {
                writes,
                failed: value.failed || 0,
                dedup: value.updated || 0,
                fetched: value.totalFetched || 0
              };
            }
          });
          
          const percent = Math.round((totalWrites / FREE_TIER_WRITES) * 100);
          
          setQuota({
            writes: totalWrites,
            remaining: FREE_TIER_WRITES - totalWrites,
            percent,
            status: percent >= 95 ? 'danger' : percent >= 80 ? 'warning' : 'ok'
          });
          
          setTribunalStats(stats);
        } else {
          setQuota({
            writes: 0,
            remaining: FREE_TIER_WRITES,
            percent: 0,
            status: 'ok'
          });
        }
        
        setLastUpdate(new Date());
      } catch (error) {
        console.error('Error fetching quota:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchQuota();
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchQuota, 300000);
    return () => clearInterval(interval);
  }, []);
  
  if (loading) return <div className="quota-loading">Carregando quota...</div>;
  if (!quota) return <div className="quota-error">Sem dados de quota</div>;
  
  const statusColors = {
    ok: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444'
  };
  
  const statusLabels = {
    ok: '✅ Saudável',
    warning: '⚠️ Próximo ao limite',
    danger: '❌ Zona de perigo'
  };
  
  return (
    <div className="quota-dashboard" style={{ padding: '20px', background: '#f3f4f6', borderRadius: '8px' }}>
      <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '600' }}>
        Status do Firestore (Free Tier)
      </h3>
      
      {/* Progress Bar */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{
          background: '#e5e7eb',
          borderRadius: '8px',
          height: '24px',
          overflow: 'hidden',
          marginBottom: '8px'
        }}>
          <div 
            style={{
              background: statusColors[quota.status],
              height: '100%',
              width: `${quota.percent}%`,
              transition: 'width 0.3s ease'
            }}
          />
        </div>
        
        <div style={{ fontSize: '14px', color: '#6b7280', display: 'flex', justifyContent: 'space-between' }}>
          <span>{quota.writes.toLocaleString()} / {FREE_TIER_WRITES.toLocaleString()} writes</span>
          <span>{quota.percent}%</span>
        </div>
      </div>
      
      {/* Status Badge */}
      <div style={{
        padding: '12px',
        background: statusColors[quota.status],
        color: 'white',
        borderRadius: '6px',
        marginBottom: '20px',
        textAlign: 'center',
        fontWeight: '500'
      }}>
        {statusLabels[quota.status]}
      </div>
      
      {/* Statistics */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '12px',
        marginBottom: '20px'
      }}>
        <div style={{ background: 'white', padding: '12px', borderRadius: '6px' }}>
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Writes Usados</div>
          <div style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937' }}>
            {quota.writes.toLocaleString()}
          </div>
        </div>
        
        <div style={{ background: 'white', padding: '12px', borderRadius: '6px' }}>
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Restantes</div>
          <div style={{ fontSize: '18px', fontWeight: '600', color: '#10b981' }}>
            {quota.remaining.toLocaleString()}
          </div>
        </div>
        
        <div style={{ background: 'white', padding: '12px', borderRadius: '6px' }}>
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Tribunais Sync</div>
          <div style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937' }}>
            {Object.keys(tribunalStats).length}
          </div>
        </div>
      </div>
      
      {/* Tribunal Details */}
      {Object.keys(tribunalStats).length > 0 && (
        <div style={{ background: 'white', borderRadius: '6px', padding: '12px' }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600' }}>
            Detalhes por Tribunal
          </h4>
          
          <div style={{ fontSize: '13px', color: '#6b7280', lineHeight: '1.8' }}>
            {Object.entries(tribunalStats).map(([tribunal, stats]) => (
              <div key={tribunal} style={{ 
                padding: '8px',
                background: '#f9fafb',
                borderRadius: '4px',
                marginBottom: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ fontWeight: '500', color: '#1f2937' }}>{tribunal}</span>
                <span>
                  Writes: {stats.writes} | 
                  Skipped: {stats.dedup} | 
                  Erros: {stats.failed}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Last Update */}
      <div style={{ 
        marginTop: '16px',
        fontSize: '12px',
        color: '#9ca3af',
        textAlign: 'right'
      }}>
        Última atualização: {lastUpdate?.toLocaleTimeString('pt-BR')}
      </div>
    </div>
  );
}
