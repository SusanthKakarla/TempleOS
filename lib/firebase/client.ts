import { getApps, initializeApp, type FirebaseOptions } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { devLog } from "@/lib/firebase/errors";

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
};

let cachedAuth: Auth | undefined;

// Lazy so this module can be imported by a "use client" page without
// initializing Firebase during Next.js's server-side prerender pass.
export function getFirebaseAuth(): Auth {
  if (!cachedAuth) {
    devLog("Initializing Firebase client", {
      origin: typeof window === "undefined" ? "server" : window.location.origin,
      authDomain: firebaseConfig.authDomain,
      projectId: firebaseConfig.projectId,
      apiKeyPrefix: firebaseConfig.apiKey?.slice(0, 8),
    });
    const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
    cachedAuth = getAuth(app);
  }
  return cachedAuth;
}
