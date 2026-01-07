import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '@/types';
import { supabaseAuthService } from '@/services/supabase/authService';
import { useTheme } from '@/contexts';
import { getThemedColors } from '@/utils/themedStyles';
import { getErrorMessage } from '@/utils/errorUtils';

type VerifyResetCodeScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'VerifyResetCode'
>;

type VerifyResetCodeScreenRouteProp = RouteProp<
  RootStackParamList,
  'VerifyResetCode'
>;

interface Props {
  navigation: VerifyResetCodeScreenNavigationProp;
  route: VerifyResetCodeScreenRouteProp;
}

const CODE_LENGTH = 6;

export default function VerifyResetCodeScreen({ navigation, route }: Props) {
  const { isDark } = useTheme();
  const colors = getThemedColors(isDark);
  
  const { email } = route.params;
  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  
  const inputRefs = useRef<(TextInput | null)[]>([]);

  // Countdown timer for resend
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Auto-focus first input
  useEffect(() => {
    setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 100);
  }, []);

  const handleCodeChange = (index: number, value: string) => {
    // Only allow numeric input
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    setError('');

    // Move to next input if value entered
    if (value && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits are entered
    if (value && index === CODE_LENGTH - 1) {
      const fullCode = newCode.join('');
      if (fullCode.length === CODE_LENGTH) {
        handleVerifyCode(fullCode);
      }
    }
  };

  const handleKeyPress = (index: number, key: string) => {
    if (key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      const newCode = [...code];
      newCode[index - 1] = '';
      setCode(newCode);
    }
  };

  const handleVerifyCode = async (codeToVerify?: string) => {
    const verificationCode = codeToVerify || code.join('');

    if (verificationCode.length !== CODE_LENGTH) {
      setError('Please enter the complete 6-digit code');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      if (__DEV__) {
        console.log('🔐 Verifying OTP code for:', email);
      }

      const response = await supabaseAuthService.verifyRecoveryOTP(email, verificationCode, 'recovery');

      if (response.success) {
        if (__DEV__) {
          console.log('✅ OTP verified successfully');
        }
        // Navigate to reset password screen
        navigation.navigate('ResetPassword', { email, token: verificationCode });
      } else {
        setError(response.error || 'Invalid verification code. Please try again.');
        // Clear the code on error
        setCode(Array(CODE_LENGTH).fill(''));
        inputRefs.current[0]?.focus();
      }
    } catch (err: unknown) {
      if (__DEV__) {
        console.error('❌ OTP verification error:', getErrorMessage(err));
      }
      setError(getErrorMessage(err) || 'An unexpected error occurred. Please try again.');
      setCode(Array(CODE_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0) return;

    setIsLoading(true);
    setError('');

    try {
      const response = await supabaseAuthService.resetPasswordForEmail(email);

      if (response.success) {
        setResendCooldown(60); // 60 second cooldown
        setCode(Array(CODE_LENGTH).fill(''));
        inputRefs.current[0]?.focus();
      } else {
        setError(response.error || 'Failed to resend code. Please try again.');
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err) || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const codeString = code.join('');
  const isCodeComplete = codeString.length === CODE_LENGTH;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.content}>
          {/* Icon */}
          <View style={[styles.iconContainer, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="mail-open-outline" size={48} color={colors.primary} />
          </View>

          <Text style={[styles.title, { color: colors.text }]}>Verify Your Email</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            We've sent a 6-digit verification code to{'\n'}
            <Text style={[styles.emailText, { color: colors.primary }]}>{email}</Text>
          </Text>

          {/* OTP Input Boxes */}
          <View style={styles.codeContainer}>
            {Array(CODE_LENGTH)
              .fill(0)
              .map((_, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => {
                    inputRefs.current[index] = ref;
                  }}
                  style={[
                    styles.codeInput,
                    { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.inputText },
                    code[index] ? styles.codeInputFilled : null,
                    error ? styles.codeInputError : null,
                  ]}
                  value={code[index]}
                  onChangeText={(value) => handleCodeChange(index, value)}
                  onKeyPress={({ nativeEvent }) =>
                    handleKeyPress(index, nativeEvent.key)
                  }
                  keyboardType="number-pad"
                  maxLength={1}
                  selectTextOnFocus
                />
              ))}
          </View>

          {/* Error Message */}
          {error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={16} color={colors.error} />
              <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[
              styles.button,
              (!isCodeComplete || isLoading) && styles.buttonDisabled,
            ]}
            onPress={() => handleVerifyCode()}
            disabled={!isCodeComplete || isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? 'Verifying...' : 'Verify Code'}
            </Text>
          </TouchableOpacity>

          {/* Resend Code */}
          <View style={styles.resendContainer}>
            <Text style={[styles.resendText, { color: colors.textSecondary }]}>Didn't receive the code? </Text>
            <TouchableOpacity
              onPress={handleResendCode}
              disabled={resendCooldown > 0 || isLoading}
            >
              <Text
                style={[
                  styles.resendLink,
                  { color: colors.primary },
                  (resendCooldown > 0 || isLoading) && styles.resendLinkDisabled,
                ]}
              >
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend'}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={() => navigation.navigate('Login')}
            style={styles.linkButton}
          >
            <Text style={styles.linkText}>
              <Ionicons name="arrow-back" size={14} color="#6b7280" /> Back to
              Sign In
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    flexGrow: 1,
  },
  backButton: {
    padding: 16,
    marginTop: Platform.OS === 'ios' ? 44 : 16,
  },
  content: {
    flex: 1,
    padding: 24,
    paddingTop: 0,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  emailText: {
    color: '#10b981',
    fontWeight: '600',
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  codeInput: {
    width: 48,
    height: 56,
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderRadius: 12,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    color: '#111827',
    backgroundColor: '#f9fafb',
  },
  codeInputFilled: {
    borderColor: '#10b981',
    backgroundColor: '#ecfdf5',
  },
  codeInputError: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: '#ef4444',
    marginLeft: 8,
  },
  button: {
    backgroundColor: '#10b981',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 24,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
  },
  resendText: {
    fontSize: 14,
    color: '#6b7280',
  },
  resendLink: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '600',
  },
  resendLinkDisabled: {
    color: '#9ca3af',
  },
  linkButton: {
    alignItems: 'center',
  },
  linkText: {
    fontSize: 14,
    color: '#6b7280',
  },
});
