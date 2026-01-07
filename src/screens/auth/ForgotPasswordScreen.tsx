import React, { useState, useMemo } from 'react';
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
import { RootStackParamList } from '@/types';
import {
  validateIdentifier,
  detectIdentifierType,
  INDIA_COUNTRY_CODE,
} from '@/utils/authValidation';
import { supabaseAuthService } from '@/services/supabase/authService';
import { useTheme } from '@/contexts';
import { getThemedColors } from '@/utils/themedStyles';
import { getErrorMessage } from '@/utils/errorUtils';

type ForgotPasswordScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'ForgotPassword'
>;

interface Props {
  navigation: ForgotPasswordScreenNavigationProp;
}

export default function ForgotPasswordScreen({ navigation }: Props) {
  const { isDark } = useTheme();
  const colors = getThemedColors(isDark);
  
  const [identifier, setIdentifier] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [identifierTouched, setIdentifierTouched] = useState(false);

  // Memoized validation
  const identifierValidation = useMemo(
    () => validateIdentifier(identifier),
    [identifier]
  );

  const identifierType = useMemo(
    () => detectIdentifierType(identifier),
    [identifier]
  );

  // Get keyboard type based on detected identifier type
  const getKeyboardType = () => {
    if (identifierType === 'mobile') {
      return 'phone-pad';
    }
    return 'email-address';
  };

  // Get placeholder hint
  const getPlaceholder = () => {
    if (identifierType === 'mobile') {
      return 'Enter 10 digit mobile number';
    }
    return 'Email or mobile number';
  };

  const handleSendResetCode = async () => {
    setIdentifierTouched(true);

    if (!identifierValidation.isValid) {
      setError(identifierValidation.error || 'Please enter a valid email or mobile number');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      if (__DEV__) {
        console.log('📧 Sending password reset to:', identifierValidation.type, identifierValidation.formattedValue);
      }

      if (identifierValidation.type === 'email') {
        // Email-based password reset
        const response = await supabaseAuthService.resetPasswordForEmail(
          identifierValidation.formattedValue
        );

        if (response.success) {
          if (__DEV__) {
            console.log('✅ Password reset email sent successfully');
          }
          // Navigate to verify code screen
          navigation.navigate('VerifyResetCode', { 
            email: identifierValidation.formattedValue,
            // Phase 2: Add identifierType for SMS support
          });
        } else {
          setError(response.error || 'Failed to send reset code. Please try again.');
        }
      } else if (identifierValidation.type === 'mobile') {
        // Phase 2: Mobile-based password reset (SMS OTP)
        // For now, simulate success and navigate
        if (__DEV__) {
          console.log('📱 SMS OTP support - Phase 2 placeholder');
        }
        
        // TODO: Implement SMS OTP sending in Phase 2
        // For now, show a message that mobile reset will be supported soon
        setError('SMS-based password reset coming soon. Please use email for now.');
        
        // When implemented:
        // const response = await authService.sendSMSOTP(identifierValidation.formattedValue);
        // if (response.success) {
        //   navigation.navigate('VerifyResetCode', { 
        //     phoneNumber: identifierValidation.formattedValue 
        //   });
        // }
      } else {
        setError('Please enter a valid email or mobile number');
      }
    } catch (err: unknown) {
      if (__DEV__) {
        console.error('❌ Password reset error:', getErrorMessage(err));
      }
      setError(getErrorMessage(err) || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

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
            <Ionicons name="lock-closed-outline" size={48} color={colors.primary} />
          </View>

          <Text style={[styles.title, { color: colors.text }]}>Forgot Password?</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Enter the email address or mobile number associated with your account 
            and we'll send you a code to reset your password.
          </Text>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Email or Mobile Number</Text>
            <View
              style={[
                styles.inputWrapper,
                { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder },
                identifierTouched && !identifierValidation.isValid && identifier.length > 0
                  ? styles.inputError
                  : identifierTouched && identifierValidation.isValid
                  ? styles.inputSuccess
                  : null,
              ]}
            >
              {identifierType === 'mobile' ? (
                <Text style={[styles.countryCode, { color: colors.text }]}>{INDIA_COUNTRY_CODE}</Text>
              ) : (
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color={colors.textMuted}
                  style={styles.inputIcon}
                />
              )}
              <TextInput
                style={[
                  styles.input,
                  { color: colors.inputText },
                  identifierType === 'mobile' && styles.inputWithPrefix,
                ]}
                placeholder={getPlaceholder()}
                placeholderTextColor={colors.inputPlaceholder}
                keyboardType={getKeyboardType()}
                autoCapitalize="none"
                autoCorrect={false}
                value={identifier}
                onChangeText={(text) => {
                  setIdentifier(text);
                  if (error) setError('');
                }}
                onBlur={() => setIdentifierTouched(true)}
                autoFocus
              />
              {identifierTouched && identifier.length > 0 && (
                <Ionicons
                  name={identifierValidation.isValid ? 'checkmark-circle' : 'alert-circle'}
                  size={20}
                  color={identifierValidation.isValid ? colors.success : colors.error}
                />
              )}
            </View>
            {identifierTouched && !identifierValidation.isValid && identifier.length > 0 && (
              <Text style={[styles.validationError, { color: colors.error }]}>{identifierValidation.error}</Text>
            )}
          </View>

          {/* Delivery Method Hint */}
          {identifierValidation.isValid && (
            <View style={[styles.hintContainer, { backgroundColor: colors.primaryLight }]}>
              <Ionicons 
                name={identifierType === 'mobile' ? 'phone-portrait-outline' : 'mail-outline'} 
                size={16} 
                color={colors.primary} 
              />
              <Text style={[styles.hintText, { color: colors.primary }]}>
                {identifierType === 'mobile' 
                  ? 'We will send an OTP via SMS'
                  : 'We will send an OTP to your email'}
              </Text>
            </View>
          )}

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
              (!identifierValidation.isValid || isLoading) && styles.buttonDisabled,
            ]}
            onPress={handleSendResetCode}
            disabled={!identifierValidation.isValid || isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? 'Sending...' : 'Send Reset Code'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('Login')}
            style={styles.linkButton}
          >
            <Text style={[styles.linkText, { color: colors.textSecondary }]}>
              Remember your password?{' '}
              <Text style={[styles.linkTextBold, { color: colors.primary }]}>Sign In</Text>
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
    paddingHorizontal: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  inputError: {
    borderColor: '#ef4444',
  },
  inputSuccess: {
    borderColor: '#10b981',
  },
  inputIcon: {
    marginRight: 10,
  },
  countryCode: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
    marginRight: 4,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111827',
  },
  inputWithPrefix: {
    paddingLeft: 4,
  },
  validationError: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 6,
  },
  hintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  hintText: {
    fontSize: 13,
    color: '#10b981',
    marginLeft: 8,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
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
  linkButton: {
    alignItems: 'center',
  },
  linkText: {
    fontSize: 14,
    color: '#6b7280',
  },
  linkTextBold: {
    color: '#10b981',
    fontWeight: '600',
  },
});
