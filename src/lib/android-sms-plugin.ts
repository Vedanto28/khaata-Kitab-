// Android SMS Plugin Interface for Capacitor
// This module handles native SMS reading on Android devices

import { Capacitor } from '@capacitor/core';
import { bufferSMS, processSMS, simulateSMSRead } from './sms-service';

// Check if running on Android
export const isAndroid = (): boolean => {
  return Capacitor.getPlatform() === 'android';
};

// Check if running on native platform (not web)
export const isNative = (): boolean => {
  return Capacitor.isNativePlatform();
};

// Permission status
export interface SMSPermissionStatus {
  readSMS: boolean;
  receiveSMS: boolean;
  readPhoneState: boolean;
}

// SMS permission handling - wraps native plugin calls
export const checkSMSPermissions = async (): Promise<SMSPermissionStatus> => {
  if (!isAndroid()) {
    console.log('SMS permissions only available on Android');
    return { readSMS: false, receiveSMS: false, readPhoneState: false };
  }
  
  // In development/web, return mock permissions
  if (!isNative()) {
    console.log('Running in web mode - SMS permissions simulated');
    return { readSMS: true, receiveSMS: true, readPhoneState: true };
  }
  
  try {
    // This would use the actual Capacitor SMS plugin
    // For now, return simulated status
    const storedPermission = localStorage.getItem('khaataKitab_smsPermission');
    const granted = storedPermission === 'granted';
    return { readSMS: granted, receiveSMS: granted, readPhoneState: granted };
  } catch (e) {
    console.error('Error checking SMS permissions:', e);
    return { readSMS: false, receiveSMS: false, readPhoneState: false };
  }
};

export const requestSMSPermissions = async (): Promise<SMSPermissionStatus> => {
  if (!isAndroid()) {
    console.log('SMS permissions only available on Android');
    return { readSMS: false, receiveSMS: false, readPhoneState: false };
  }
  
  // In development/web, simulate permission grant
  if (!isNative()) {
    console.log('Running in web mode - simulating permission grant');
    localStorage.setItem('khaataKitab_smsPermission', 'granted');
    return { readSMS: true, receiveSMS: true, readPhoneState: true };
  }
  
  try {
    // This would trigger native permission request via Capacitor plugin
    // Example: await SMSPlugin.requestPermissions();
    localStorage.setItem('khaataKitab_smsPermission', 'granted');
    return { readSMS: true, receiveSMS: true, readPhoneState: true };
  } catch (e) {
    console.error('Error requesting SMS permissions:', e);
    return { readSMS: false, receiveSMS: false, readPhoneState: false };
  }
};

// Read SMS messages from device
export const readSMSMessages = async (limit: number = 100, daysBack: number = 30): Promise<void> => {
  const permissions = await checkSMSPermissions();
  
  if (!permissions.readSMS) {
    console.log('SMS read permission not granted');
    return;
  }
  
  try {
    let messages;
    
    if (isNative() && isAndroid()) {
      // Native: Would use Capacitor SMS plugin
      // Example: messages = await SMSPlugin.getMessages({ limit, daysBack });
      // For now, use simulation
      messages = await simulateSMSRead();
    } else {
      // Web: Use simulated messages
      messages = await simulateSMSRead();
    }
    
    console.log(`Processing ${messages.length} SMS messages`);
    
    for (const sms of messages) {
      await processSMS(sms);
    }
  } catch (e) {
    console.error('Error reading SMS messages:', e);
  }
};

// Register SMS listener for real-time monitoring (Android only)
export const registerSMSListener = async (): Promise<boolean> => {
  if (!isAndroid()) {
    console.log('SMS listener only available on Android');
    return false;
  }
  
  const permissions = await checkSMSPermissions();
  
  if (!permissions.receiveSMS) {
    console.log('SMS receive permission not granted');
    return false;
  }
  
  try {
    if (isNative()) {
      // Native: Register broadcast receiver via Capacitor plugin
      // Example:
      // SMSPlugin.addListener('smsReceived', async (sms) => {
      //   await processSMS(sms);
      // });
      console.log('SMS listener registered (native)');
    } else {
      // Web: Simulate with periodic check (for development only)
      console.log('SMS listener simulated (web mode)');
    }
    
    return true;
  } catch (e) {
    console.error('Error registering SMS listener:', e);
    return false;
  }
};

// Unregister SMS listener
export const unregisterSMSListener = async (): Promise<void> => {
  if (!isNative()) return;
  
  try {
    // Native: Would unregister the listener
    // Example: await SMSPlugin.removeAllListeners();
    console.log('SMS listener unregistered');
  } catch (e) {
    console.error('Error unregistering SMS listener:', e);
  }
};

// Initialize SMS automation on app start
export const initializeSMSAutomation = async (): Promise<void> => {
  console.log('Initializing SMS automation...');
  
  // Check/request permissions
  let permissions = await checkSMSPermissions();
  
  if (!permissions.readSMS && isAndroid()) {
    console.log('Requesting SMS permissions...');
    permissions = await requestSMSPermissions();
  }
  
  if (permissions.readSMS) {
    // Read recent SMS messages
    await readSMSMessages(100, 7);
    
    // Register listener for new SMS
    await registerSMSListener();
  }
  
  console.log('SMS automation initialized');
};
