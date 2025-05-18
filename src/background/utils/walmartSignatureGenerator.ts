// src/background/utils/walmartSignatureGenerator.ts
// Utility for generating Walmart API authentication signatures

/**
 * Canonicalizes headers by creating a sorted key set to enforce order
 * @param headersToSign - Headers to be signed
 * @returns Canonicalized string array with header names and values
 */
export const canonicalize = (headersToSign: Record<string, string>): string[] => {
  let canonicalizedStrBuffer = '';
  let parameterNamesBuffer = '';
  
  // Create a sorted set of keys to enforce order
  const sortedKeys = Object.keys(headersToSign).sort();
  
  for (const key of sortedKeys) {
    const val = headersToSign[key];
    parameterNamesBuffer += `${key.trim()};`;
    canonicalizedStrBuffer += `${val.toString().trim()}\n`;
  }
  
  return [parameterNamesBuffer, canonicalizedStrBuffer];
};

/**
 * Signs the request with the private key using SHA256WithRSA algorithm
 * @param privateKey - The private key in PEM format
 * @param stringToSign - The canonicalized string to sign
 * @returns The Base64-encoded signature
 */
export const generateSignature = async (privateKey: string, stringToSign: string): Promise<string> => {
  try {
    console.log('[WalmartSignature] Starting signature generation process');
    console.log('[WalmartSignature] String to sign length:', stringToSign.length);
    console.log('[WalmartSignature] Private key length:', privateKey.length);
    
    // Convert private key from PEM format
    const pemHeader = "-----BEGIN PRIVATE KEY-----";
    const pemFooter = "-----END PRIVATE KEY-----";
    
    // Extract the base64 part of the key
    let pemContents = privateKey;
    if (privateKey.includes(pemHeader)) {
      console.log('[WalmartSignature] Private key contains PEM header, removing headers and whitespace');
      pemContents = privateKey
        .replace(pemHeader, '')
        .replace(pemFooter, '')
        .replace(/\s+/g, '');
      console.log('[WalmartSignature] Stripped private key length:', pemContents.length);
    } else {
      console.log('[WalmartSignature] Private key does not contain PEM header, assuming it\'s already in the correct format');
    }
    
    try {
      // Import the private key
      console.log('[WalmartSignature] Converting base64 string to ArrayBuffer');
      const binaryDer = base64StringToArrayBuffer(pemContents);
      console.log('[WalmartSignature] Binary DER length:', binaryDer.byteLength);
      
      console.log('[WalmartSignature] Importing the private key with SubtleCrypto');
      const cryptoKey = await crypto.subtle.importKey(
        'pkcs8',
        binaryDer,
        {
          name: 'RSASSA-PKCS1-v1_5',
          hash: { name: 'SHA-256' },
        },
        false,
        ['sign']
      );
      console.log('[WalmartSignature] Private key imported successfully');
      
      // Sign the data
      console.log('[WalmartSignature] Encoding string to sign');
      const textEncoder = new TextEncoder();
      const data = textEncoder.encode(stringToSign);
      console.log('[WalmartSignature] Encoded data length:', data.length);
      
      console.log('[WalmartSignature] Signing data');
      const signature = await crypto.subtle.sign(
        { name: 'RSASSA-PKCS1-v1_5' },
        cryptoKey,
        data
      );
      console.log('[WalmartSignature] Data signed successfully, signature length:', signature.byteLength);
      
      // Convert the signature to Base64
      console.log('[WalmartSignature] Converting signature to Base64');
      const base64Signature = arrayBufferToBase64String(signature);
      console.log('[WalmartSignature] Base64 signature length:', base64Signature.length);
      
      return base64Signature;
    } catch (cryptoError) {
      console.error('[WalmartSignature] Error in crypto operations:', cryptoError);
      throw new Error(`Crypto operation failed: ${cryptoError instanceof Error ? cryptoError.message : String(cryptoError)}`);
    }
  } catch (error) {
    console.error('[WalmartSignature] Error generating signature:', error);
    throw new Error(`Failed to generate signature: ${error instanceof Error ? error.message : String(error)}`);
  }
};

/**
 * Converts a base64 string to an ArrayBuffer
 * @param base64 - Base64 string to convert
 * @returns ArrayBuffer representation
 */
function base64StringToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Converts an ArrayBuffer to a Base64 string
 * @param buffer - ArrayBuffer to convert
 * @returns Base64 string representation
 */
function arrayBufferToBase64String(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Generates authentication headers for Walmart API
 * @param consumerId - The consumer ID from Walmart Developer portal
 * @param privateKey - The private key in PEM format
 * @param privateKeyVersion - The version of the private key
 * @returns The headers required for Walmart API authentication
 */
export const generateWalmartAuthHeaders = async (
  consumerId: string,
  privateKey: string,
  privateKeyVersion: string
): Promise<Record<string, string>> => {
  try {
    console.log('[WalmartAuth] Starting auth header generation');
    
    // Input validation
    if (!consumerId) {
      throw new Error('Consumer ID is required');
    }
    if (!privateKey) {
      throw new Error('Private key is required');
    }
    if (!privateKeyVersion) {
      throw new Error('Private key version is required');
    }
    
    console.log('[WalmartAuth] Input validation passed');
    
    // Generate timestamp (milliseconds since epoch)
    const timestamp = Date.now().toString();
    console.log(`[WalmartAuth] Generated timestamp: ${timestamp}`);
    
    // Create the headers to sign
    const headersToSign: Record<string, string> = {
      'WM_CONSUMER.ID': consumerId,
      'WM_CONSUMER.INTIMESTAMP': timestamp,
      'WM_SEC.KEY_VERSION': privateKeyVersion
    };
    
    console.log('[WalmartAuth] Created headers to sign:', headersToSign);
    
    // Canonicalize the headers
    console.log('[WalmartAuth] Canonicalizing headers');
    const [parameterNames, canonicalizedString] = canonicalize(headersToSign);
    console.log(`[WalmartAuth] Parameter names: ${parameterNames}`);
    console.log(`[WalmartAuth] Canonicalized string: ${canonicalizedString}`);
    
    try {
      // Generate the signature
      console.log('[WalmartAuth] Generating signature');
      const signature = await generateSignature(privateKey, canonicalizedString);
      console.log(`[WalmartAuth] Signature generated (length: ${signature.length})`);
      
      // Return all the headers needed for the request
      const headers = {
        'WM_CONSUMER.ID': consumerId,
        'WM_CONSUMER.INTIMESTAMP': timestamp,
        'WM_SEC.KEY_VERSION': privateKeyVersion,
        'WM_SEC.AUTH_SIGNATURE': signature
      };
      
      console.log('[WalmartAuth] Auth headers generated successfully');
      return headers;
    } catch (signatureError) {
      console.error('[WalmartAuth] Error generating signature:', signatureError);
      throw new Error(`Signature generation failed: ${signatureError instanceof Error ? signatureError.message : String(signatureError)}`);
    }
  } catch (error) {
    console.error('[WalmartAuth] Error generating Walmart auth headers:', error);
    throw new Error(`Failed to generate Walmart auth headers: ${error instanceof Error ? error.message : String(error)}`);
  }
};