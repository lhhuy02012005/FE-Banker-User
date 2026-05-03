const getRpId = (): string => {
  if (typeof window === 'undefined') return 'localhost';
  return process.env.NEXT_PUBLIC_RP_ID || window.location.hostname;
};

const encodeText = (value: string): ArrayBuffer => {
  return new TextEncoder().encode(value).buffer.slice(0);
};

export const biometricUtils = {
  isSupported: async (): Promise<boolean> => {
    return (
      window.PublicKeyCredential &&
      (await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable())
    );
  },

  // Giải mã Base64/Base64URL sang Uint8Array
  bufferFromBase64: (base64: string) => {
    let b64 = base64.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  },

  // Mã hóa Buffer sang Base64URL (Xóa sạch ký tự gây lỗi trên Brave)
  base64FromBuffer: (buffer: ArrayBuffer) => {
    const binary = String.fromCharCode(...new Uint8Array(buffer));
    return btoa(binary)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  },

  authenticate: async (challenge: string, allowedCredentialIds?: string[]) => {
    const options: PublicKeyCredentialRequestOptions = {
      // Challenge từ Java gửi về cần dùng đúng helper để decode
      challenge: biometricUtils.bufferFromBase64(challenge),
      timeout: 60000,
      userVerification: "required",
      rpId: getRpId(),
    };

    if (allowedCredentialIds && allowedCredentialIds.length > 0) {
      options.allowCredentials = allowedCredentialIds.map(id => ({
        id: biometricUtils.bufferFromBase64(id),
        type: "public-key"
      }));
    }

    const assertion = (await navigator.credentials.get({
      publicKey: options,
    })) as any;

    return {
      credentialId: biometricUtils.base64FromBuffer(assertion.rawId),
      signature: biometricUtils.base64FromBuffer(assertion.response.signature),
      clientDataJSON: biometricUtils.base64FromBuffer(assertion.response.clientDataJSON),
      authenticatorData: biometricUtils.base64FromBuffer(assertion.response.authenticatorData),
    };
  },

  register: async (challenge: string, userIdentifier: string, displayName?: string) => {
    const rpId = getRpId();
    const options: PublicKeyCredentialCreationOptions = {
      challenge: biometricUtils.bufferFromBase64(challenge),
      rp: { name: "NeoBank", id: rpId },
      user: {
        id: encodeText(userIdentifier),
        name: userIdentifier,
        displayName: displayName || userIdentifier,
      },
      pubKeyCredParams: [
        { alg: -7, type: "public-key" },
        { alg: -257, type: "public-key" },
      ],
      timeout: 60000,
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required",
        residentKey: "required",
        requireResidentKey: true,
      },
    };

    const credential = (await navigator.credentials.create({
      publicKey: options,
    })) as any;

    return {
      credentialId: biometricUtils.base64FromBuffer(credential.rawId),
      deviceName: navigator.userAgent,
      publicKey: biometricUtils.base64FromBuffer(credential.response.getPublicKey()),
    };
  },
};