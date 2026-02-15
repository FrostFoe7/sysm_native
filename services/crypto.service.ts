// services/crypto.service.ts
// End-to-end encryption service using Web Crypto API (RSA-OAEP + AES-GCM).
// Private keys stored in AsyncStorage (encrypted at rest by OS keychain on device).
// Server never sees plaintext message content.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, getCachedUserId } from './supabase';

const PRIVATE_KEY_STORAGE_KEY = '@sysm:e2ee_private_key';
const KEY_PAIR_VERSION_KEY = '@sysm:e2ee_key_version';

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface EncryptedPayload {
  ciphertext: string;    // base64-encoded AES-GCM ciphertext
  iv: string;            // base64-encoded AES-GCM IV (12 bytes)
  encryptedKey: string;  // base64-encoded RSA-OAEP encrypted AES key
  keyVersion: number;
}

export interface KeyPair {
  publicKey: string;     // base64 SPKI-exported public key
  privateKey: string;    // base64 PKCS8-exported private key
}

// ─── Encoding Helpers ───────────────────────────────────────────────────────────

function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function stringToArrayBuffer(str: string): ArrayBuffer {
  const encoder = new TextEncoder();
  return encoder.encode(str).buffer;
}

function arrayBufferToString(buffer: ArrayBuffer): string {
  const decoder = new TextDecoder();
  return decoder.decode(buffer);
}

// ─── Key Generation ─────────────────────────────────────────────────────────────

/**
 * Generate an RSA-OAEP key pair for asymmetric encryption.
 * Public key → shared to Supabase.
 * Private key → stored locally in AsyncStorage.
 */
async function generateKeyPair(): Promise<KeyPair> {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true, // extractable
    ['encrypt', 'decrypt'],
  );

  const publicKeyBuffer = await crypto.subtle.exportKey('spki', keyPair.publicKey);
  const privateKeyBuffer = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);

  return {
    publicKey: arrayBufferToBase64(publicKeyBuffer),
    privateKey: arrayBufferToBase64(privateKeyBuffer),
  };
}

/** Generate a random AES-256-GCM symmetric key */
async function generateSymmetricKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt'],
  );
}

// ─── Key Import ─────────────────────────────────────────────────────────────────

async function importPublicKey(base64: string): Promise<CryptoKey> {
  const buffer = base64ToArrayBuffer(base64);
  return crypto.subtle.importKey(
    'spki',
    buffer,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['encrypt'],
  );
}

async function importPrivateKey(base64: string): Promise<CryptoKey> {
  const buffer = base64ToArrayBuffer(base64);
  return crypto.subtle.importKey(
    'pkcs8',
    buffer,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['decrypt'],
  );
}

async function importSymmetricKey(raw: ArrayBuffer): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    raw,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

// ─── Encryption ─────────────────────────────────────────────────────────────────

/**
 * Encrypt a message for a recipient.
 * 1. Generate random AES-256-GCM key
 * 2. Encrypt plaintext with AES key
 * 3. Encrypt AES key with recipient's RSA public key
 */
async function encryptMessage(
  plaintext: string,
  recipientPublicKeyBase64: string,
  keyVersion: number,
): Promise<EncryptedPayload> {
  // 1. Generate symmetric key
  const aesKey = await generateSymmetricKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // 2. Encrypt plaintext
  const plaintextBuffer = stringToArrayBuffer(plaintext);
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    plaintextBuffer,
  );

  // 3. Export AES key and encrypt with recipient's public key
  const rawAesKey = await crypto.subtle.exportKey('raw', aesKey);
  const recipientPubKey = await importPublicKey(recipientPublicKeyBase64);
  const encryptedAesKey = await crypto.subtle.encrypt(
    { name: 'RSA-OAEP' },
    recipientPubKey,
    rawAesKey,
  );

  return {
    ciphertext: arrayBufferToBase64(ciphertext),
    iv: arrayBufferToBase64(iv),
    encryptedKey: arrayBufferToBase64(encryptedAesKey),
    keyVersion,
  };
}

/**
 * Encrypt a message for multiple recipients (group chat).
 * Uses same AES key, encrypted separately for each recipient.
 */
async function encryptMessageForGroup(
  plaintext: string,
  recipientKeys: Array<{ userId: string; publicKey: string; keyVersion: number }>,
): Promise<{
  ciphertext: string;
  iv: string;
  encryptedKeys: Array<{ userId: string; encryptedKey: string; keyVersion: number }>;
}> {
  const aesKey = await generateSymmetricKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const plaintextBuffer = stringToArrayBuffer(plaintext);
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    plaintextBuffer,
  );

  const rawAesKey = await crypto.subtle.exportKey('raw', aesKey);

  const encryptedKeys = await Promise.all(
    recipientKeys.map(async ({ userId, publicKey, keyVersion }) => {
      const pubKey = await importPublicKey(publicKey);
      const encryptedAesKey = await crypto.subtle.encrypt(
        { name: 'RSA-OAEP' },
        pubKey,
        rawAesKey,
      );
      return {
        userId,
        encryptedKey: arrayBufferToBase64(encryptedAesKey),
        keyVersion,
      };
    }),
  );

  return {
    ciphertext: arrayBufferToBase64(ciphertext),
    iv: arrayBufferToBase64(iv),
    encryptedKeys,
  };
}

/**
 * Encrypt binary data (images, audio, video) with AES-GCM.
 * Returns encrypted blob + encrypted AES key for recipient.
 */
async function encryptBinary(
  data: ArrayBuffer,
  recipientPublicKeyBase64: string,
  keyVersion: number,
): Promise<EncryptedPayload> {
  const aesKey = await generateSymmetricKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    data,
  );

  const rawAesKey = await crypto.subtle.exportKey('raw', aesKey);
  const recipientPubKey = await importPublicKey(recipientPublicKeyBase64);
  const encryptedAesKey = await crypto.subtle.encrypt(
    { name: 'RSA-OAEP' },
    recipientPubKey,
    rawAesKey,
  );

  return {
    ciphertext: arrayBufferToBase64(ciphertext),
    iv: arrayBufferToBase64(iv),
    encryptedKey: arrayBufferToBase64(encryptedAesKey),
    keyVersion,
  };
}

// ─── Decryption ─────────────────────────────────────────────────────────────────

/**
 * Decrypt a message using the local private key.
 * 1. Decrypt AES key with RSA private key
 * 2. Decrypt ciphertext with AES key
 */
async function decryptMessage(payload: EncryptedPayload): Promise<string> {
  const privateKeyBase64 = await getPrivateKey();
  if (!privateKeyBase64) {
    throw new Error('E2EE_NO_PRIVATE_KEY');
  }

  try {
    const privateKey = await importPrivateKey(privateKeyBase64);

    // Decrypt AES key
    const encryptedAesKeyBuffer = base64ToArrayBuffer(payload.encryptedKey);
    const rawAesKey = await crypto.subtle.decrypt(
      { name: 'RSA-OAEP' },
      privateKey,
      encryptedAesKeyBuffer,
    );

    // Import AES key and decrypt message
    const aesKey = await importSymmetricKey(rawAesKey);
    const iv = base64ToArrayBuffer(payload.iv);
    const ciphertext = base64ToArrayBuffer(payload.ciphertext);

    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(iv) },
      aesKey,
      ciphertext,
    );

    return arrayBufferToString(plaintext);
  } catch (error) {
    console.error('E2EE decryption failed:', error);
    throw new Error('E2EE_DECRYPT_FAILED');
  }
}

/**
 * Decrypt binary data (media files).
 */
async function decryptBinary(payload: EncryptedPayload): Promise<ArrayBuffer> {
  const privateKeyBase64 = await getPrivateKey();
  if (!privateKeyBase64) {
    throw new Error('E2EE_NO_PRIVATE_KEY');
  }

  const privateKey = await importPrivateKey(privateKeyBase64);
  const rawAesKey = await crypto.subtle.decrypt(
    { name: 'RSA-OAEP' },
    privateKey,
    base64ToArrayBuffer(payload.encryptedKey),
  );

  const aesKey = await importSymmetricKey(rawAesKey);
  return crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(base64ToArrayBuffer(payload.iv)) },
    aesKey,
    base64ToArrayBuffer(payload.ciphertext),
  );
}

// ─── Key Storage (local device) ─────────────────────────────────────────────────

async function storePrivateKey(base64PrivateKey: string): Promise<void> {
  await AsyncStorage.setItem(PRIVATE_KEY_STORAGE_KEY, base64PrivateKey);
}

async function getPrivateKey(): Promise<string | null> {
  return AsyncStorage.getItem(PRIVATE_KEY_STORAGE_KEY);
}

async function storeKeyVersion(version: number): Promise<void> {
  await AsyncStorage.setItem(KEY_PAIR_VERSION_KEY, String(version));
}

async function getKeyVersion(): Promise<number> {
  const v = await AsyncStorage.getItem(KEY_PAIR_VERSION_KEY);
  return v ? parseInt(v, 10) : 0;
}

async function clearLocalKeys(): Promise<void> {
  await AsyncStorage.multiRemove([PRIVATE_KEY_STORAGE_KEY, KEY_PAIR_VERSION_KEY]);
}

// ─── Key Registration with Supabase ─────────────────────────────────────────────

/**
 * Generate keypair, store private locally, upload public to Supabase.
 * Called on signup or when key rotation is needed.
 */
async function registerKeys(): Promise<{ publicKey: string; keyVersion: number }> {
  const userId = await getCachedUserId();
  const keyPair = await generateKeyPair();

  // Get current key version
  const { data: existingKeys } = await supabase
    .from('user_keys')
    .select('key_version')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('key_version', { ascending: false })
    .limit(1);

  const newVersion = ((existingKeys?.[0]?.key_version as number) ?? 0) + 1;

  // Deactivate old keys
  await supabase
    .from('user_keys')
    .update({ is_active: false })
    .eq('user_id', userId);

  // Store new public key
  const { error } = await supabase.from('user_keys').insert({
    user_id: userId,
    public_key: keyPair.publicKey,
    key_version: newVersion,
    is_active: true,
  });

  if (error) throw error;

  // Store private key locally
  await storePrivateKey(keyPair.privateKey);
  await storeKeyVersion(newVersion);

  return { publicKey: keyPair.publicKey, keyVersion: newVersion };
}

/**
 * Check if E2EE keys exist locally. If not, user needs re-onboarding.
 */
async function hasLocalKeys(): Promise<boolean> {
  const pk = await getPrivateKey();
  return pk !== null && pk.length > 0;
}

/**
 * Fetch a user's active public key from Supabase.
 */
async function getRecipientPublicKey(
  userId: string,
): Promise<{ publicKey: string; keyVersion: number } | null> {
  const { data, error } = await supabase
    .from('user_keys')
    .select('public_key, key_version')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('key_version', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return { publicKey: data.public_key, keyVersion: data.key_version };
}

/**
 * Fetch public keys for all participants in a conversation.
 */
async function getConversationParticipantKeys(
  conversationId: string,
): Promise<Array<{ userId: string; publicKey: string; keyVersion: number }>> {
  const { data: participants } = await supabase
    .from('conversation_participants')
    .select('user_id')
    .eq('conversation_id', conversationId);

  if (!participants) return [];

  const keys: Array<{ userId: string; publicKey: string; keyVersion: number }> = [];
  for (const p of participants) {
    const key = await getRecipientPublicKey(p.user_id);
    if (key) {
      keys.push({ userId: p.user_id, ...key });
    }
  }
  return keys;
}

/**
 * Store encrypted conversation key for a specific user (group E2EE).
 */
async function storeConversationKey(
  conversationId: string,
  userId: string,
  encryptedKey: string,
  keyVersion: number,
): Promise<void> {
  await supabase.from('conversation_keys').upsert(
    {
      conversation_id: conversationId,
      user_id: userId,
      encrypted_key: encryptedKey,
      key_version: keyVersion,
    },
    { onConflict: 'conversation_id,user_id,key_version' },
  );
}

/**
 * Get the encrypted conversation key for the current user.
 */
async function getMyConversationKey(
  conversationId: string,
): Promise<{ encryptedKey: string; keyVersion: number } | null> {
  const userId = await getCachedUserId();
  const { data } = await supabase
    .from('conversation_keys')
    .select('encrypted_key, key_version')
    .eq('conversation_id', conversationId)
    .eq('user_id', userId)
    .order('key_version', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  return { encryptedKey: data.encrypted_key, keyVersion: data.key_version };
}

/**
 * Rotate conversation key — called by admin when members change.
 * Generates new AES key, encrypts for all current participants.
 */
async function rotateConversationKey(conversationId: string): Promise<void> {
  const participantKeys = await getConversationParticipantKeys(conversationId);
  if (participantKeys.length === 0) return;

  const aesKey = await generateSymmetricKey();
  const rawAesKey = await crypto.subtle.exportKey('raw', aesKey);

  // Get current max version
  const { data: existing } = await supabase
    .from('conversation_keys')
    .select('key_version')
    .eq('conversation_id', conversationId)
    .order('key_version', { ascending: false })
    .limit(1);

  const newVersion = ((existing?.[0]?.key_version as number) ?? 0) + 1;

  // Encrypt for each participant
  for (const { userId, publicKey } of participantKeys) {
    const pubKey = await importPublicKey(publicKey);
    const encryptedAesKey = await crypto.subtle.encrypt(
      { name: 'RSA-OAEP' },
      pubKey,
      rawAesKey,
    );

    await storeConversationKey(
      conversationId,
      userId,
      arrayBufferToBase64(encryptedAesKey),
      newVersion,
    );
  }
}

export const CryptoService = {
  // Key management
  generateKeyPair,
  registerKeys,
  hasLocalKeys,
  clearLocalKeys,
  getPrivateKey,
  getKeyVersion,
  getRecipientPublicKey,
  getConversationParticipantKeys,
  rotateConversationKey,
  getMyConversationKey,
  storeConversationKey,

  // Encryption
  encryptMessage,
  encryptMessageForGroup,
  encryptBinary,

  // Decryption
  decryptMessage,
  decryptBinary,

  // Helpers
  arrayBufferToBase64,
  base64ToArrayBuffer,
};
