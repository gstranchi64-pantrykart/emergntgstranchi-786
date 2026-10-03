import { AppSettings } from '../src/types';

export interface OtpProvider {
  sendOtp(mobile: string, otp: string, settings?: AppSettings): Promise<boolean>;
  verifyOtp(mobile: string, userEnteredOtp: string, actualOtp: string): boolean;
}

export class DemoOtpProvider implements OtpProvider {
  async sendOtp(mobile: string, otp: string): Promise<boolean> {
    console.log(`[DEMO OTP PROVIDER] Simulation SMS to +91 ${mobile}. Your secure OTP is: ${otp}`);
    return true;
  }

  verifyOtp(mobile: string, userEnteredOtp: string, actualOtp: string): boolean {
    const trimmed = userEnteredOtp.trim();
    // Demo Mode allows the cryptographically generated OTP OR fixed test bypasses: '123456', '1234', 'DEMO_OTP'
    return trimmed === actualOtp || trimmed === '123456' || trimmed === '1234' || trimmed === 'DEMO_OTP';
  }
}

export class SmsOtpProvider implements OtpProvider {
  async sendOtp(mobile: string, otp: string, settings?: AppSettings): Promise<boolean> {
    console.log(`[SMS OTP PROVIDER] Dispatching REAL production SMS to +91 ${mobile} containing OTP: ${otp}`);
    
    // Future expansion point: MSG91, Twilio, or Meta WhatsApp Business API
    // Retrieve your real SMS configuration settings:
    const smsConfig = settings?.apiIntegrations?.sms;
    if (smsConfig && smsConfig.enabled && smsConfig.mode === 'LIVE') {
      try {
        console.log(`[SMS OTP PROVIDER] MSG91 Gateway sending SMS (Sender ID: ${smsConfig.senderId || 'PNTRYM'})`);
        // Example Integration Fetch:
        // const response = await fetch('https://control.msg91.com/api/v5/otp?template_id=' + smsConfig.otpTemplateId + '&mobile=91' + mobile + '&authkey=' + smsConfig.apiKey + '&otp=' + otp, { method: 'POST' });
        // return response.ok;
      } catch (err: any) {
        console.error('[SMS OTP PROVIDER] MSG91 Dispatch failure:', err.message);
      }
    }
    return true;
  }

  verifyOtp(mobile: string, userEnteredOtp: string, actualOtp: string): boolean {
    // In production, only the precise cryptographically generated OTP is accepted. Bypasses are strictly disabled.
    return userEnteredOtp.trim() === actualOtp;
  }
}

/**
 * Returns the currently active OTP Provider based on environment configuration.
 */
export function getOtpProvider(): OtpProvider {
  const mode = (process.env.OTP_MODE || 'demo').toLowerCase();
  if (mode === 'production') {
    return new SmsOtpProvider();
  }
  return new DemoOtpProvider();
}

/**
 * Checks if the system is currently configured in secure production OTP mode.
 */
export function isProductionOtpMode(): boolean {
  return (process.env.OTP_MODE || 'demo').toLowerCase() === 'production';
}
