import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { PlayerState, OperationType, FirestoreErrorInfo } from './types';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Standard Firebase error handler mandated by the firebase-integration skill
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Login with Google Popup
export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Google Auth error:", error);
    throw error;
  }
}

// Sign out
export async function logoutUser() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Logout error:", error);
    throw error;
  }
}

// Save player progress to Firestore
export async function saveGameProgress(state: PlayerState): Promise<void> {
  if (!auth.currentUser) {
    throw new Error("User must be authenticated to save progress.");
  }
  const path = `saves/${state.userId}`;
  try {
    const saveRef = doc(db, 'saves', state.userId);
    const docSnap = await getDoc(saveRef);
    const exists = docSnap.exists();

    const payload = {
      userId: state.userId,
      displayName: state.displayName,
      posX: state.posX,
      posY: state.posY,
      hp: state.hp,
      maxHp: state.maxHp,
      mana: state.mana,
      maxMana: state.maxMana,
      level: state.level,
      exp: state.exp,
      interactedNPCs: state.interactedNPCs,
      inventory: state.inventory || [],
      updatedAt: serverTimestamp(),
    };

    // Since our rules require exact keys size 13 on creation, using setDoc ensures all 13 keys are present.
    await setDoc(saveRef, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Load player progress from Firestore
export async function loadGameProgress(userId: string): Promise<PlayerState | null> {
  const path = `saves/${userId}`;
  try {
    const saveRef = doc(db, 'saves', userId);
    const docSnap = await getDoc(saveRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        userId: data.userId,
        displayName: data.displayName,
        posX: data.posX,
        posY: data.posY,
        hp: data.hp,
        maxHp: data.maxHp,
        mana: data.mana,
        maxMana: data.maxMana,
        level: data.level,
        exp: data.exp,
        interactedNPCs: data.interactedNPCs || [],
        inventory: data.inventory || [],
      };
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}
