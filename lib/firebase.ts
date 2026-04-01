// 파일명: lib/firebase.ts

import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import firebaseConfig from "./firebaseConfig"; // ✅ 수정된 부분: 중괄호 제거

// Firebase App 초기화
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Firestore 인스턴스 내보내기
export const db = getFirestore(app);

// Firebase Auth 인스턴스 내보내기
export const auth = getAuth(app);
