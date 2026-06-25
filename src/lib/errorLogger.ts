import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, auth } from './firebase';
import { AppError } from '../types';

function getPlatform() {
  const path = window.location.pathname;
  if (path.startsWith('/admin')) return 'admin-panel';
  if (path.startsWith('/provider')) return 'provider-app';
  if (path.startsWith('/shop')) return 'shop-app';
  return 'customer-app';
}

function getOS() {
  const userAgent = window.navigator.userAgent;
  let os = "Unknown OS";
  if (userAgent.indexOf("Win") != -1) os = "Windows";
  if (userAgent.indexOf("Mac") != -1) os = "MacOS";
  if (userAgent.indexOf("X11") != -1) os = "UNIX";
  if (userAgent.indexOf("Linux") != -1) os = "Linux";
  if (/Android/.test(userAgent)) os = "Android";
  if (/iPhone|iPad|iPod/.test(userAgent)) os = "iOS";
  return os;
}

export const logErrorToDB = async (
  error: Error, 
  componentName: string = 'UnknownComponent', 
  severity: 'low' | 'medium' | 'critical' = 'critical'
) => {
  try {
    const user = auth.currentUser;
    const errorData: AppError = {
      message: error.message,
      stackTrace: error.stack?.substring(0, 1000) || '',
      location: {
        page: window.location.pathname,
        component: componentName,
        platform: getPlatform() as any,
      },
      deviceInfo: {
        os: getOS(),
        browserOrClient: navigator.userAgent.substring(0, 200),
      },
      status: 'unresolved',
      severity,
      timestamp: serverTimestamp(),
    };

    if (user) {
      errorData.userContext = {
        userId: user.uid,
        role: getPlatform().split('-')[0], // Approximation, better from Context but not easily available in static util
        userPhone: user.phoneNumber || '',
      };
    }

    await addDoc(collection(db, 'app_errors'), errorData);
    console.log('Error logged to DB successfully');
  } catch (e) {
    console.error('Failed to log error to DB:', e);
  }
};
