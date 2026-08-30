import { FIREBASE_CONFIG } from '../firebase-config.mjs';
import { accountCredentials, mergeProgressStates } from './core.mjs';

const FIREBASE_SDK_VERSION = '12.18.0';
const SDK_BASE = `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}`;
let auth = null;
let db = null;
let currentUser = null;
let firestoreApi = null;
let authApi = null;
let hooks = null;
let pendingState = null;
let saveTimer = null;
let syncInFlight = false;
let syncCompletion = Promise.resolve();

export function cloudOperationIsCurrent(operationUserId, user) {
  return Boolean(operationUserId && user?.uid === operationUserId);
}

export function cloudSyncConfigured() {
  return Boolean(FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.authDomain && FIREBASE_CONFIG.projectId && FIREBASE_CONFIG.appId);
}

function progressRef(userId) {
  return firestoreApi.doc(db, 'users', userId, 'progress', 'current');
}

function reportStatus(status, message = '') {
  hooks?.onStatus?.({ status, message, user: currentUser });
}

async function writeMergedProgress(localState, applyMerged = false) {
  const operationUserId = currentUser?.uid;
  if (!operationUserId || !firestoreApi || !db) return localState;
  if (syncInFlight) {
    await syncCompletion;
    if (!cloudOperationIsCurrent(operationUserId, currentUser)) return localState;
    return writeMergedProgress(localState, applyMerged);
  }
  let settleSync;
  syncCompletion = new Promise(resolve => { settleSync = resolve; });
  syncInFlight = true;
  reportStatus('syncing', '진도를 동기화하는 중…');
  try {
    const ref = progressRef(operationUserId);
    let mergedState = localState;
    await firestoreApi.runTransaction(db, async transaction => {
      const snapshot = await transaction.get(ref);
      const remoteState = snapshot.exists() ? snapshot.data().state || {} : {};
      mergedState = mergeProgressStates(localState, remoteState);
      mergedState.updatedAt = new Date().toISOString();
      transaction.set(ref, {
        state: mergedState,
        schemaVersion: 1,
        ownerUid: operationUserId,
        updatedAt: firestoreApi.serverTimestamp(),
      });
    });
    if (!cloudOperationIsCurrent(operationUserId, currentUser)) return localState;
    if (applyMerged) hooks?.applyMergedState?.(mergedState);
    if (pendingState === localState) pendingState = null;
    reportStatus('synced', '클라우드에 저장됨');
    return mergedState;
  } catch (error) {
    if (!cloudOperationIsCurrent(operationUserId, currentUser)) return localState;
    pendingState = localState;
    reportStatus('offline', navigator.onLine ? '동기화에 실패했어요. 다시 시도합니다.' : '오프라인 · 기기에 안전하게 저장됨');
    hooks?.onError?.(error);
    return localState;
  } finally {
    syncInFlight = false;
    settleSync();
    if (cloudOperationIsCurrent(operationUserId, currentUser) && pendingState && pendingState !== localState) {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        const nextState = pendingState;
        if (nextState) writeMergedProgress(nextState);
      }, 0);
    }
  }
}

export function queueCloudProgressSave(state) {
  pendingState = structuredClone(state);
  if (!currentUser) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const stateToSave = pendingState;
    if (stateToSave) writeMergedProgress(stateToSave);
  }, 700);
}

export async function createAccountWithPin(accountId, pin) {
  if (!auth || !authApi) throw new Error('Firebase 로그인이 아직 준비되지 않았어요.');
  const credentials = accountCredentials(accountId, pin);
  const result = await authApi.createUserWithEmailAndPassword(auth, credentials.email, credentials.password);
  await authApi.updateProfile(result.user, { displayName: credentials.accountId });
  return result.user;
}

export async function signInWithPin(accountId, pin) {
  if (!auth || !authApi) throw new Error('Firebase 로그인이 아직 준비되지 않았어요.');
  const credentials = accountCredentials(accountId, pin);
  const result = await authApi.signInWithEmailAndPassword(auth, credentials.email, credentials.password);
  return result.user;
}

export async function signOutFromAccount() {
  if (!auth || !authApi) return;
  await authApi.signOut(auth);
}

export async function initializeCloudSync(options) {
  hooks = options;
  if (!cloudSyncConfigured()) {
    reportStatus('unconfigured', 'Google 로그인 설정이 필요해요.');
    return { configured: false };
  }

  try {
    const [appModule, loadedAuthApi, loadedFirestoreApi] = await Promise.all([
      import(`${SDK_BASE}/firebase-app.js`),
      import(`${SDK_BASE}/firebase-auth.js`),
      import(`${SDK_BASE}/firebase-firestore.js`),
    ]);
    authApi = loadedAuthApi;
    firestoreApi = loadedFirestoreApi;
    const firebaseApp = appModule.initializeApp(FIREBASE_CONFIG);
    auth = authApi.getAuth(firebaseApp);
    db = firestoreApi.getFirestore(firebaseApp);

    let settleInitialAuth;
    const initialAuthReady = new Promise(resolve => { settleInitialAuth = resolve; });
    authApi.onAuthStateChanged(auth, async user => {
      try {
        const profileChanged = currentUser?.uid !== user?.uid;
        currentUser = user;
        if (profileChanged) {
          clearTimeout(saveTimer);
          pendingState = null;
        }
        hooks?.onUserChanged?.(user);
        if (!user) {
          reportStatus('signed-out', '로그인하면 여러 기기에서 진도가 이어져요.');
          return;
        }
        reportStatus('syncing', '계정 진도를 불러오는 중…');
        await writeMergedProgress(hooks.getLocalState(), true);
      } finally {
        if (settleInitialAuth) {
          settleInitialAuth();
          settleInitialAuth = null;
        }
      }
    });

    window.addEventListener('online', () => {
      if (currentUser && pendingState) writeMergedProgress(pendingState);
    });
    await initialAuthReady;
    return { configured: true };
  } catch (error) {
    reportStatus('error', 'Google 로그인 모듈을 불러오지 못했어요.');
    hooks?.onError?.(error);
    return { configured: false, error };
  }
}
