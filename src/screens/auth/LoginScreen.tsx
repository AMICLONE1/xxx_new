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
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types';
import { getErrorMessage, logError } from '@/utils/errorUtils';
import {
  validateIdentifier,
  validateTermsAccepted,
  detectIdentifierType,
  INDIA_COUNTRY_CODE,
} from '@/utils/authValidation';
import { authService } from '@/services/api/authService';
import { useAuthStore } from '@/store';

type LoginScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

interface Props {
  navigation: LoginScreenNavigationProp;
}

export default function LoginScreen({ navigation }: Props) {
  // Form state
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Touched state for validation display
  const [identifierTouched, setIdentifierTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [termsTouched, setTermsTouched] = useState(false);

  // Error state
  const [serverError, setServerError] = useState('');

  const { setUser, setToken } = useAuthStore();

  // Memoized validation
  const identifierValidation = useMemo(
    () => validateIdentifier(identifier),
    [identifier]
  );

  const identifierType = useMemo(
    () => detectIdentifierType(identifier),
    [identifier]
  );

  const termsValidation = useMemo(
    () => validateTermsAccepted(termsAccepted),
    [termsAccepted]
  );

  // Password validation - just checking non-empty for login
  const isPasswordValid = password.length >= 1;

  // Form validity
  const isFormValid = useMemo(() => {
    return (
      identifierValidation.isValid &&
      isPasswordValid &&
      termsValidation.isValid
    );
  }, [identifierValidation.isValid, isPasswordValid, termsValidation.isValid]);

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

  const handleLogin = async () => {
    // Mark all fields as touched
    setIdentifierTouched(true);
    setPasswordTouched(true);
    setTermsTouched(true);

    // Validate terms
    if (!termsValidation.isValid) {
      return;
    }

    // Validate identifier
    if (!identifierValidation.isValid) {
      return;
    }

    // Validate password
    if (!isPasswordValid) {
      return;
    }

    setIsLoading(true);
    setServerError('');

    try {
      if (__DEV__) {
        console.log('🚀 Starting sign in process...');
        console.log('📧 Identifier type:', identifierValidation.type);
        // SECURITY: Never log password
      }

      // Prepare credentials based on identifier type
      const credentials = {
        email: identifierValidation.type === 'email'
          ? identifierValidation.formattedValue
          : '', // Will be handled by backend when mobile is provided
        password: password,
        ...(identifierValidation.type === 'mobile' && {
          phoneNumber: identifierValidation.formattedValue,
        }),
      };

      // For now, use email-based login since backend expects email
      // In Phase 2, backend will support phone number lookup
      const response = await authService.signIn({
        email: identifierValidation.type === 'email'
          ? identifierValidation.formattedValue
          : `${identifierValidation.formattedValue.replace('+', '')}@phone.placeholder`,
        password: password,
      });

      // SECURITY: Clear password from state after submission
      setPassword('');

      if (__DEV__) {
        console.log('📥 Sign in response:', { success: response.success, error: response.error });
      }

      if (response.success && response.data) {
        if (__DEV__) {
          console.log('✅ Sign in successful, setting user and token...');
        }
        await setToken(response.data.token);
        setUser(response.data.user);

        // Navigation will happen automatically via AppNavigator when isAuthenticated becomes true
        if (__DEV__) {
          console.log('✅ User authenticated, AppNavigator will show Main screen automatically');
        }
      } else {
        if (__DEV__) {
          console.error('❌ Sign in failed:', response.error);
        }
        setServerError(response.error || 'Invalid credentials. Please try again.');
      }
    } catch (error: unknown) {
      logError('LoginScreen.handleSignIn', error);
      setServerError(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#e0f2fe', '#f0f9ff', '#ffffff']}
      style={styles.gradientBackground}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <Text style={styles.title}>PowerNetPro</Text>
            <Text style={styles.subtitle}>Democratizing Energy</Text>

            {/* Email or Mobile Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email or Mobile Number</Text>
              <View
                style={[
                  styles.inputWrapper,
                  identifierTouched && !identifierValidation.isValid && identifier.length > 0
                    ? styles.inputError
                    : identifierTouched && identifierValidation.isValid
                      ? styles.inputSuccess
                      : null,
                ]}
              >
                {identifierType === 'mobile' && (
                  <Text style={styles.countryCode}>{INDIA_COUNTRY_CODE}</Text>
                )}
                <TextInput
                  style={[
                    styles.input,
                    identifierType === 'mobile' && styles.inputWithPrefix,
                  ]}
                  placeholder={getPlaceholder()}
                  placeholderTextColor="#94a3b8"
                  keyboardType={getKeyboardType()}
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={identifier}
                  onChangeText={(text) => {
                    setIdentifier(text);
                    if (serverError) setServerError('');
                  }}
                  onBlur={() => setIdentifierTouched(true)}
                  autoFocus
                />
                {identifierTouched && identifier.length > 0 && (
                  <Ionicons
                    name={identifierValidation.isValid ? 'checkmark-circle' : 'alert-circle'}
                    size={20}
                    color={identifierValidation.isValid ? '#0ea5e9' : '#ef4444'}
                  />
                )}
              </View>
              {identifierTouched && !identifierValidation.isValid && identifier.length > 0 && (
                <Text style={styles.errorText}>{identifierValidation.error}</Text>
              )}
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <View
                style={[
                  styles.inputWrapper,
                  passwordTouched && !isPasswordValid && password.length > 0
                    ? styles.inputError
                    : null,
                ]}
              >
                <TextInput
                  style={styles.input}
                  placeholder="Enter your password"
                  placeholderTextColor="#94a3b8"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (serverError) setServerError('');
                  }}
                  onBlur={() => setPasswordTouched(true)}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={22}
                    color="#64748b"
                  />
                </TouchableOpacity>
              </View>
              {passwordTouched && !isPasswordValid && password.length === 0 && (
                <Text style={styles.errorText}>Password is required</Text>
              )}

              {/* Forgot Password Link */}
              <TouchableOpacity
                style={styles.forgotPasswordButton}
                onPress={() => navigation.navigate('ForgotPassword')}
              >
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>

            {/* Server Error */}
            {serverError ? (
              <View style={styles.serverErrorContainer}>
                <Ionicons name="alert-circle" size={16} color="#ef4444" />
                <Text style={styles.serverErrorText}>{serverError}</Text>
              </View>
            ) : null}

            {/* Terms & Conditions Checkbox */}
            <View style={styles.termsContainer}>
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => {
                  setTermsAccepted(!termsAccepted);
                  setTermsTouched(true);
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
                  {termsAccepted && (
                    <Ionicons name="checkmark" size={14} color="#ffffff" />
                  )}
                </View>
                <Text style={styles.termsText}>
                  I agree to the{' '}
                  <Text
                    style={styles.termsLink}
                    onPress={() => navigation.navigate('TermsConditions')}
                  >
                    Terms & Conditions
                  </Text>
                  {' '}and{' '}
                  <Text
                    style={styles.termsLink}
                    onPress={() => navigation.navigate('TermsConditions')}
                  >
                    Privacy Policy
                  </Text>
                </Text>
              </TouchableOpacity>
              {termsTouched && !termsValidation.isValid && (
                <Text style={styles.termsError}>{termsValidation.error}</Text>
              )}
            </View>

            {/* Sign In Button */}
            <TouchableOpacity
              style={[
                styles.button,
                (!isFormValid || isLoading) && styles.buttonDisabled,
              ]}
              onPress={handleLogin}
              disabled={!isFormValid || isLoading}
            >
              <Text style={styles.buttonText}>
                {isLoading ? 'Signing In...' : 'Sign In'}
              </Text>
            </TouchableOpacity>

            {/* Sign Up Link */}
            <TouchableOpacity
              onPress={() => navigation.navigate('UserTypeSelection')}
              style={styles.linkButton}
            >
              <Text style={styles.linkText}>
                Don't have an account? <Text style={styles.linkTextBold}>Sign Up</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradientBackground: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#0ea5e9',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 48,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#bae6fd',
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: '#ffffff',
  },
  inputError: {
    borderColor: '#f87171',
  },
  inputSuccess: {
    borderColor: '#0ea5e9',
  },
  countryCode: {
    fontSize: 16,
    color: '#1e293b',
    fontWeight: '500',
    marginRight: 4,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1e293b',
  },
  inputWithPrefix: {
    paddingLeft: 4,
  },
  eyeButton: {
    padding: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginTop: 8,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#0ea5e9',
    fontWeight: '500',
  },
  serverErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  serverErrorText: {
    flex: 1,
    fontSize: 14,
    color: '#ef4444',
    marginLeft: 8,
  },
  termsContainer: {
    marginBottom: 24,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#bae6fd',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    backgroundColor: '#ffffff',
  },
  checkboxChecked: {
    backgroundColor: '#0ea5e9',
    borderColor: '#0ea5e9',
  },
  termsText: {
    flex: 1,
    fontSize: 14,
    color: '#64748b',
    lineHeight: 22,
  },
  termsLink: {
    color: '#0ea5e9',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  termsError: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 8,
    marginLeft: 34,
  },
  button: {
    backgroundColor: '#0ea5e9',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
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
    marginTop: 16,
    alignItems: 'center',
  },
  linkText: {
    fontSize: 14,
    color: '#64748b',
  },
  linkTextBold: {
    color: '#0ea5e9',
    fontWeight: '600',
  },
});
