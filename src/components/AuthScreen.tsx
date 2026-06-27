import React, { useState } from 'react';
import { LogIn, User, Cloud, CloudOff, RefreshCw, LogOut, CheckCircle } from 'lucide-react';
import { signInWithGoogle, logoutUser } from '../firebase';
import { User as FirebaseUser } from 'firebase/auth';

interface AuthScreenProps {
  user: FirebaseUser | null;
  loading: boolean;
  onPlayGuest: () => void;
  onSyncSave: () => void;
  onLoadCloudSave: () => void;
  hasCloudSave: boolean;
  isSaving: boolean;
  isFirstLoad: boolean;
}

export default function AuthScreen({
  user,
  loading,
  onPlayGuest,
  onSyncSave,
  onLoadCloudSave,
  hasCloudSave,
  isSaving,
  isFirstLoad,
}: AuthScreenProps) {
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    setAuthError(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error(err);
      setAuthError(err.message || 'Error al iniciar sesión con Google.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    setAuthError(null);
    try {
      await logoutUser();
    } catch (err: any) {
      console.error(err);
      setAuthError('Error al cerrar sesión.');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-white h-64 bg-slate-900 rounded-2xl border border-slate-800">
        <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mb-4" />
        <p className="text-sm font-mono text-slate-400">Iniciando Firebase y cargando progreso...</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-950/80 backdrop-blur-md p-6 md:p-8 rounded-2xl border-2 border-slate-800 shadow-[0_0_50px_rgba(0,0,0,0.8)] text-white w-full max-w-md mx-auto text-center">
      <div className="mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-500/15 border-2 border-amber-500/40 text-amber-500 mb-4 animate-pulse">
          <Cloud className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-100">Guardado en la Nube</h2>
        <p className="text-xs text-slate-400 mt-2 leading-relaxed">
          Inicia sesión con Google para guardar tu nivel, HP, Maná y posición del mapa automáticamente en tiempo real.
        </p>
      </div>

      {authError && (
        <div className="bg-rose-950/40 border border-rose-800/60 p-3 rounded-lg text-rose-300 text-xs text-left mb-4 font-mono leading-relaxed">
          {authError}
        </div>
      )}

      {user ? (
        <div className="space-y-5">
          {/* Authenticated user profile info */}
          <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 flex items-center gap-3 text-left">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'User'}
                className="w-11 h-11 rounded-full border-2 border-amber-500 shadow-md"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-11 h-11 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-amber-400">
                <User className="w-6 h-6" />
              </div>
            )}
            <div className="min-w-0 flex-grow">
              <p className="font-semibold text-sm text-slate-100 truncate">
                {user.displayName || 'Jugador'}
              </p>
              <p className="text-xs text-slate-400 truncate">{user.email}</p>
              <div className="flex items-center gap-1.5 mt-1 text-[10px] text-emerald-400 font-mono">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Nube Conectada</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {hasCloudSave ? (
              <button
                onClick={onLoadCloudSave}
                disabled={isSaving}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg hover:shadow-emerald-500/20 active:translate-y-0.5 transition-all duration-150 cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${isSaving ? 'animate-spin' : ''}`} />
                <span>Cargar Nube</span>
              </button>
            ) : (
              <div className="flex flex-col justify-center border border-dashed border-slate-800 rounded-xl p-2 text-center">
                <span className="text-[10px] text-slate-500">Sin Datos Cloud</span>
              </div>
            )}

            <button
              onClick={onSyncSave}
              disabled={isSaving}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg active:translate-y-0.5 transition-all duration-150 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Cloud className="w-4 h-4" />
              )}
              <span>{isSaving ? 'Guardando...' : 'Subir Save'}</span>
            </button>
          </div>

          <div className="border-t border-slate-800/50 pt-4 flex items-center justify-between">
            <button
              onClick={onPlayGuest}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-all active:translate-y-0.5"
            >
              Iniciar Juego
            </button>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 font-mono transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Salir Cuenta</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <button
            onClick={handleLogin}
            disabled={isLoggingIn}
            className="w-full flex items-center justify-center gap-3 px-5 py-3.5 bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm rounded-xl shadow-lg transition-all duration-150 border border-slate-200 cursor-pointer active:translate-y-0.5"
          >
            {isLoggingIn ? (
              <RefreshCw className="w-5 h-5 animate-spin text-slate-800" />
            ) : (
              <LogIn className="w-5 h-5 text-slate-950" />
            )}
            <span>{isLoggingIn ? 'Conectando...' : 'Iniciar Sesión con Google'}</span>
          </button>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-slate-800/80"></div>
            <span className="flex-shrink mx-3 text-slate-500 text-[10px] uppercase font-mono tracking-widest">O</span>
            <div className="flex-grow border-t border-slate-800/80"></div>
          </div>

          <button
            onClick={onPlayGuest}
            className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-slate-800/80 hover:bg-slate-700/90 text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer border border-slate-700/50"
          >
            <CloudOff className="w-4 h-4 text-slate-400" />
            <span>Jugar en Modo Local (Offline)</span>
          </button>
          <p className="text-[10px] text-slate-500 font-mono">
            *El modo offline guardará el progreso en el almacenamiento local del navegador (LocalStorage).
          </p>
        </div>
      )}
    </div>
  );
}
