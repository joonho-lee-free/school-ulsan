// utils/firebaseAuth.ts
import { auth as authInstance } from '../lib/firebase';
import { setPersistence, browserLocalPersistence } from 'firebase/auth';

// ✅ withAuth, login 등 어디서든 쓸 수 있게 named + default 모두 제공
export { authInstance as auth };
export default authInstance;

// ✅ 과거 코드 호환용: initAuth 제공 (브라우저에서만 퍼시스턴스 설정)
export const initAuth = async () => {
  if (typeof window === 'undefined') return; // SSR 안전
  try {
    await setPersistence(authInstance, browserLocalPersistence);
  } catch {
    // 퍼시스턴스 설정 실패해도 로그인 자체는 가능하므로 조용히 무시
  }
};
