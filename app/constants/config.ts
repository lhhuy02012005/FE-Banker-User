/**
 * Service prefix configuration - supports flexible port routing
 * Works with both direct ports (localhost:8080) and Kong gateway
 */
const getServicePrefix = (serviceName: string): string => {
  const kongPrefixes: Record<string, string> = {
    IDENTITY: process.env.NEXT_PUBLIC_IDENTITY_SERVICE_PREFIX || '/identity-service/api',
    ACCOUNT: process.env.NEXT_PUBLIC_ACCOUNT_SERVICE_PREFIX || '/account-service/api',
    TRANSACTION: process.env.NEXT_PUBLIC_TRANSACTION_SERVICE_PREFIX || '/transaction-service/api',
    OTP: process.env.NEXT_PUBLIC_OTP_SERVICE_PREFIX || '/otp-service/api',
    SECURITY: process.env.NEXT_PUBLIC_SECURITY_SERVICE_PREFIX || '/security-service/api',
    CAMPAIGN: process.env.NEXT_PUBLIC_CAMPAIGN_SERVICE_PREFIX || '/campaign-service/api',
  };

  const portByService: Record<string, string> = {
    IDENTITY: process.env.NEXT_PUBLIC_IDENTITY_PORT || '8080',
    ACCOUNT: process.env.NEXT_PUBLIC_ACCOUNT_PORT || '8082',
    TRANSACTION: process.env.NEXT_PUBLIC_TRANSACTION_PORT || '8083',
    OTP: process.env.NEXT_PUBLIC_OTP_PORT || '8087',
    SECURITY: process.env.NEXT_PUBLIC_SECURITY_PORT || '8085',
    CAMPAIGN: process.env.NEXT_PUBLIC_CAMPAIGN_PORT || '8086',
  };

  const configuredPrefix = kongPrefixes[serviceName] || '';

  // Use gateway path mode when prefix starts with '/' and does not include env placeholders.
  if (
    configuredPrefix.startsWith('/') &&
    !configuredPrefix.includes('${') &&
    !configuredPrefix.includes('$')
  ) {
    return configuredPrefix;
  }

  // Fallback to direct port mode. This avoids invalid URLs like ':${NEXT_PUBLIC_PORT}/api'.
  const port = portByService[serviceName] || '8080';
  return `:${port}/api`;
};

export const SERVICE_PREFIX = {
  IDENTITY: getServicePrefix('IDENTITY'),
  ACCOUNT: getServicePrefix('ACCOUNT'),
  TRANSACTION: getServicePrefix('TRANSACTION'),
  OTP: getServicePrefix('OTP'),
  SECURITY: getServicePrefix('SECURITY'),
  CAMPAIGN: getServicePrefix('CAMPAIGN'),
};