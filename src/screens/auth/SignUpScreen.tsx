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
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList, UserType } from '@/types';
import { getErrorMessage, logError } from '@/utils/errorUtils';
import {
  validateEmail,
  validateMobileNumber,
  validatePassword,
  passwordsMatch,
  validateTermsAccepted,
  INDIA_COUNTRY_CODE,
} from '@/utils/authValidation';
import { authService } from '@/services/api/authService';
import { useAuthStore } from '@/store';

type SignUpScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'SignUp'>;
type SignUpScreenRouteProp = RouteProp<RootStackParamList, 'SignUp'>;

interface Props {
  navigation: SignUpScreenNavigationProp;
  route: SignUpScreenRouteProp;
}

export default function SignUpScreen({ navigation, route }: Props) {
  // Get userType from route params
  const userType = route.params.userType;

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Touched state
  const [emailTouched, setEmailTouched] = useState(false);
  const [mobileTouched, setMobileTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [confirmPasswordTouched, setConfirmPasswordTouched] = useState(false);
  const [termsTouched, setTermsTouched] = useState(false);

  // Server error state
  const [serverError, setServerError] = useState('');

  const { setUser, setToken } = useAuthStore();

  // Memoized validations
  const emailValidation = useMemo(
    () => validateEmail(email),
    [email]
  );

  const mobileValidation = useMemo(
    () => validateMobileNumber(mobileNumber),
    [mobileNumber]
  );

  const passwordValidation = useMemo(
    () => validatePassword(password),
    [password]
  );

  const doPasswordsMatch = useMemo(
    () => passwordsMatch(password, confirmPassword),
    [password, confirmPassword]
  );

  const termsValidation = useMemo(
    () => validateTermsAccepted(termsAccepted),
    [termsAccepted]
  );

  // Form validity
  const isFormValid = useMemo(() => {
    return (
      emailValidation.isValid &&
      mobileValidation.isValid &&
      passwordValidation.isValid &&
      doPasswordsMatch &&
      termsValidation.isValid
    );
  }, [
    emailValidation.isValid,
    mobileValidation.isValid,
    passwordValidation.isValid,
    doPasswordsMatch,
    termsValidation.isValid,
  ]);

  // Handle mobile number input with formatting
  const handleMobileChange = (text: string) => {
    // Only allow digits
    const digitsOnly = text.replace(/\D/g, '');
    // Limit to 10 digits
    const limited = digitsOnly.slice(0, 10);
    setMobileNumber(limited);
    if (serverError) setServerError('');
  };

  const handleSignUp = async () => {
    // Mark all fields as touched
    setEmailTouched(true);
    setMobileTouched(true);
    setPasswordTouched(true);
    setConfirmPasswordTouched(true);
    setTermsTouched(true);

    // Validate all fields
    if (!isFormValid) {
      return;
    }

    setIsLoading(true);
    setServerError('');

    try {
      if (__DEV__) {
        console.log('🚀 Starting sign up process...');
        console.log('👤 User type:', userType);
        // SECURITY: Never log password
      }

      const response = await authService.signUp({
        email: emailValidation.formattedEmail,
        password: password,
        name: name.trim() || undefined,
        phoneNumber: mobileValidation.formattedNumber,
        userType: userType || undefined,
      });

      // SECURITY: Clear passwords from state after submission
      setPassword('');
      setConfirmPassword('');

      if (__DEV__) {
        console.log('📥 Sign up response:', { success: response.success, error: response.error });
      }

      if (response.success && response.data) {
        if (__DEV__) {
          console.log('✅ Sign up successful, setting user and token...');
        }
        await setToken(response.data.token);
        setUser(response.data.user);

        if (__DEV__) {
          console.log('✅ Navigation to Onboarding...');
        }
        Alert.alert('Success', 'Account created successfully!', [
          {
            text: 'OK',
            onPress: () => navigation.replace('Onboarding'),
          },
        ]);
      } else {
        if (__DEV__) {
          console.error('❌ Sign up failed:', response.error);
        }
        setServerError(response.error || 'Failed to create account. Please try again.');
      }
    } catch (error: unknown) {
      logError('SignUpScreen.handleSignUp', error);
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
            {/* Back Button */}
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={24} color="#0ea5e9" />
            </TouchableOpacity>

            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join PowerNetPro</Text>

            {/* Selected User Type Badge */}
            <View style={styles.userTypeBadge}>
              <MaterialCommunityIcons
                name={userType === 'buyer' ? 'cart-outline' : 'solar-power'}
                size={20}
                color="#0ea5e9"
              />
              <Text style={styles.userTypeBadgeText}>
                Signing up as {userType === 'buyer' ? 'Energy Buyer' : 'Energy Seller'}
              </Text>
            </View>

            {/* Full Name Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Full Name</Text>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="person-outline"
                  size={20}
                  color="#64748b"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your name"
                  placeholderTextColor="#94a3b8"
                  autoCapitalize="words"
                  autoCorrect={false}
                  value={name}
                  onChangeText={(text) => {
                    setName(text);
                    if (serverError) setServerError('');
                  }}
                />
              </View>
            </View>

            {/* Email Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email Address *</Text>
              <View
                style={[
                  styles.inputWrapper,
                  emailTouched && !emailValidation.isValid && email.length > 0
                    ? styles.inputError
                    : emailTouched && emailValidation.isValid
                      ? styles.inputSuccess
                      : null,
                ]}
              >
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color="#64748b"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email address"
                  placeholderTextColor="#94a3b8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (serverError) setServerError('');
                  }}
                  onBlur={() => setEmailTouched(true)}
                />
                {emailTouched && email.length > 0 && (
                  <Ionicons
                    name={emailValidation.isValid ? 'checkmark-circle' : 'alert-circle'}
                    size={20}
                    color={emailValidation.isValid ? '#0ea5e9' : '#ef4444'}
                  />
                )}
              </View>
              {emailTouched && !emailValidation.isValid && email.length > 0 && (
                <Text style={styles.errorText}>{emailValidation.error}</Text>
              )}
            </View>

            {/* Mobile Number Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Mobile Number *</Text>
              <View
                style={[
                  styles.inputWrapper,
                  mobileTouched && !mobileValidation.isValid && mobileNumber.length > 0
                    ? styles.inputError
                    : mobileTouched && mobileValidation.isValid
                      ? styles.inputSuccess
                      : null,
                ]}
              >
                <Text style={styles.countryCode}>{INDIA_COUNTRY_CODE}</Text>
                <TextInput
                  style={[styles.input, styles.inputWithPrefix]}
                  placeholder="Enter 10 digit mobile number"
                  placeholderTextColor="#94a3b8"
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={mobileNumber}
                  onChangeText={handleMobileChange}
                  onBlur={() => setMobileTouched(true)}
                />
                {mobileTouched && mobileNumber.length > 0 && (
                  <Ionicons
                    name={mobileValidation.isValid ? 'checkmark-circle' : 'alert-circle'}
                    size={20}
                    color={mobileValidation.isValid ? '#0ea5e9' : '#ef4444'}
                  />
                )}
              </View>
              {mobileTouched && !mobileValidation.isValid && mobileNumber.length > 0 && (
                <Text style={styles.errorText}>{mobileValidation.error}</Text>
              )}
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password *</Text>
              <View
                style={[
                  styles.inputWrapper,
                  passwordTouched && !passwordValidation.isValid
                    ? styles.inputError
                    : passwordTouched && passwordValidation.isValid
                      ? styles.inputSuccess
                      : null,
                ]}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color="#64748b"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Create a strong password"
                  placeholderTextColor="#94a3b8"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (!passwordTouched) setPasswordTouched(true);
                    if (serverError) setServerError('');
                  }}
                  onBlur={() => setPasswordTouched(true)}
                />
                <TouchableOpacity
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

              {/* Password Requirements Checklist */}
              <View style={styles.passwordRequirements}>
                <Text style={styles.requirementsTitle}>Password must contain:</Text>
                <View style={styles.requirementRow}>
                  <Ionicons
                    name={passwordValidation.hasMinLength ? 'checkmark-circle' : 'ellipse-outline'}
                    size={14}
                    color={passwordValidation.hasMinLength ? '#0ea5e9' : '#94a3b8'}
                  />
                  <Text
                    style={[
                      styles.requirementText,
                      passwordValidation.hasMinLength && styles.requirementMet,
                    ]}
                  >
                    At least 8 characters
                  </Text>
                </View>
                <View style={styles.requirementRow}>
                  <Ionicons
                    name={passwordValidation.hasUppercase ? 'checkmark-circle' : 'ellipse-outline'}
                    size={14}
                    color={passwordValidation.hasUppercase ? '#0ea5e9' : '#94a3b8'}
                  />
                  <Text
                    style={[
                      styles.requirementText,
                      passwordValidation.hasUppercase && styles.requirementMet,
                    ]}
                  >
                    One uppercase letter (A-Z)
                  </Text>
                </View>
                <View style={styles.requirementRow}>
                  <Ionicons
                    name={passwordValidation.hasLowercase ? 'checkmark-circle' : 'ellipse-outline'}
                    size={14}
                    color={passwordValidation.hasLowercase ? '#0ea5e9' : '#94a3b8'}
                  />
                  <Text
                    style={[
                      styles.requirementText,
                      passwordValidation.hasLowercase && styles.requirementMet,
                    ]}
                  >
                    One lowercase letter (a-z)
                  </Text>
                </View>
                <View style={styles.requirementRow}>
                  <Ionicons
                    name={passwordValidation.hasNumber ? 'checkmark-circle' : 'ellipse-outline'}
                    size={14}
                    color={passwordValidation.hasNumber ? '#0ea5e9' : '#94a3b8'}
                  />
                  <Text
                    style={[
                      styles.requirementText,
                      passwordValidation.hasNumber && styles.requirementMet,
                    ]}
                  >
                    One number (0-9)
                  </Text>
                </View>
                <View style={styles.requirementRow}>
                  <Ionicons
                    name={passwordValidation.hasSpecialChar ? 'checkmark-circle' : 'ellipse-outline'}
                    size={14}
                    color={passwordValidation.hasSpecialChar ? '#0ea5e9' : '#94a3b8'}
                  />
                  <Text
                    style={[
                      styles.requirementText,
                      passwordValidation.hasSpecialChar && styles.requirementMet,
                    ]}
                  >
                    One special character (!@#$%^&*)
                  </Text>
                </View>
              </View>
            </View>

            {/* Confirm Password Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Confirm Password *</Text>
              <View
                style={[
                  styles.inputWrapper,
                  confirmPasswordTouched && !doPasswordsMatch && confirmPassword.length > 0
                    ? styles.inputError
                    : confirmPasswordTouched && doPasswordsMatch && confirmPassword.length > 0
                      ? styles.inputSuccess
                      : null,
                ]}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color="#64748b"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Confirm your password"
                  placeholderTextColor="#94a3b8"
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={confirmPassword}
                  onChangeText={(text) => {
                    setConfirmPassword(text);
                    if (!confirmPasswordTouched) setConfirmPasswordTouched(true);
                    if (serverError) setServerError('');
                  }}
                  onBlur={() => setConfirmPasswordTouched(true)}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={22}
                    color="#64748b"
                  />
                </TouchableOpacity>
              </View>
              {/* Confirm Password Error/Success */}
              {confirmPasswordTouched && confirmPassword.length > 0 && !doPasswordsMatch && (
                <Text style={styles.errorText}>Passwords do not match</Text>
              )}
              {confirmPasswordTouched && confirmPassword.length > 0 && doPasswordsMatch && (
                <View style={styles.matchRow}>
                  <Ionicons name="checkmark-circle" size={14} color="#0ea5e9" />
                  <Text style={styles.matchText}>Passwords match</Text>
                </View>
              )}
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

            {/* Sign Up Button */}
            <TouchableOpacity
              style={[
                styles.button,
                (!isFormValid || isLoading) && styles.buttonDisabled,
              ]}
              onPress={handleSignUp}
              disabled={!isFormValid || isLoading}
            >
              <Text style={styles.buttonText}>
                {isLoading ? 'Creating Account...' : 'Sign Up'}
              </Text>
            </TouchableOpacity>

            {/* Sign In Link */}
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.linkButton}
            >
              <Text style={styles.linkText}>
                Already have an account? <Text style={styles.linkTextBold}>Sign In</Text>
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
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  // User Type Badge Styles
  userTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f9ff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#bae6fd',
    gap: 8,
  },
  userTypeBadgeText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0ea5e9',
  },
  userTypeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  userTypeCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#bae6fd',
    position: 'relative',
  },
  userTypeCardSelected: {
    borderColor: '#0ea5e9',
    backgroundColor: '#f0f9ff',
  },
  userTypeIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f0f9ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  userTypeIconContainerSelected: {
    backgroundColor: '#0ea5e9',
  },
  userTypeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  userTypeTitleSelected: {
    color: '#0ea5e9',
  },
  userTypeDescription: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  selectedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
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
  inputIcon: {
    marginRight: 8,
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
  passwordRequirements: {
    marginTop: 10,
    paddingHorizontal: 4,
  },
  requirementsTitle: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 6,
    fontWeight: '500',
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  requirementText: {
    fontSize: 11,
    color: '#94a3b8',
    marginLeft: 6,
  },
  requirementMet: {
    color: '#0ea5e9',
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
  },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  matchText: {
    fontSize: 12,
    color: '#0ea5e9',
    marginLeft: 4,
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
    marginBottom: 20,
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
    marginBottom: 16,
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
    alignItems: 'center',
    marginBottom: 24,
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
