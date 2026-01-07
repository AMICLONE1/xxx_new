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
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types';
import { getErrorMessage, logError } from '@/utils/errorUtils';
import {
  validateEmail,
  validateMobileNumber,
  validatePassword,
  passwordsMatch,
  validateTermsAccepted,
  INDIA_COUNTRY_CODE,
  formatMobileForDisplay,
  cleanMobileNumber,
} from '@/utils/authValidation';
import { authService } from '@/services/api/authService';
import { useAuthStore } from '@/store';
import { useTheme } from '@/contexts';
import { getThemedColors } from '@/utils/themedStyles';

type SignUpScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'SignUp'>;

interface Props {
  navigation: SignUpScreenNavigationProp;
}

export default function SignUpScreen({ navigation }: Props) {
  const { isDark } = useTheme();
  const colors = getThemedColors(isDark);
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
        // SECURITY: Never log password
      }

      const response = await authService.signUp({
        email: emailValidation.formattedEmail,
        password: password,
        name: name.trim() || undefined,
        phoneNumber: mobileValidation.formattedNumber,
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
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.primary }]}>Create Account</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Join PowerNetPro</Text>

          {/* Full Name Input */}
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Full Name</Text>
            <View style={[styles.inputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
              <Ionicons
                name="person-outline"
                size={20}
                color={colors.textSecondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, { color: colors.inputText }]}
                placeholder="Enter your name"
                placeholderTextColor={colors.inputPlaceholder}
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
            <Text style={[styles.label, { color: colors.text }]}>Email Address *</Text>
            <View
              style={[
                styles.inputWrapper,
                { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder },
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
                color={colors.textSecondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, { color: colors.inputText }]}
                placeholder="Enter your email address"
                placeholderTextColor={colors.inputPlaceholder}
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
                  color={emailValidation.isValid ? colors.success : colors.error}
                />
              )}
            </View>
            {emailTouched && !emailValidation.isValid && email.length > 0 && (
              <Text style={[styles.errorText, { color: colors.error }]}>{emailValidation.error}</Text>
            )}
          </View>

          {/* Mobile Number Input */}
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Mobile Number *</Text>
            <View
              style={[
                styles.inputWrapper,
                { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder },
                mobileTouched && !mobileValidation.isValid && mobileNumber.length > 0
                  ? styles.inputError
                  : mobileTouched && mobileValidation.isValid
                  ? styles.inputSuccess
                  : null,
              ]}
            >
              <Text style={[styles.countryCode, { color: colors.text }]}>{INDIA_COUNTRY_CODE}</Text>
              <TextInput
                style={[styles.input, styles.inputWithPrefix, { color: colors.inputText }]}
                placeholder="Enter 10 digit mobile number"
                placeholderTextColor={colors.inputPlaceholder}
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
                  color={mobileValidation.isValid ? colors.success : colors.error}
                />
              )}
            </View>
            {mobileTouched && !mobileValidation.isValid && mobileNumber.length > 0 && (
              <Text style={[styles.errorText, { color: colors.error }]}>{mobileValidation.error}</Text>
            )}
          </View>

          {/* Password Input */}
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Password *</Text>
            <View
              style={[
                styles.inputWrapper,
                { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder },
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
                color={colors.textSecondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, { color: colors.inputText }]}
                placeholder="Create a strong password"
                placeholderTextColor={colors.inputPlaceholder}
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
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
            
            {/* Password Requirements Checklist */}
            <View style={[styles.passwordRequirements, { backgroundColor: colors.backgroundSecondary }]}>
              <Text style={[styles.requirementsTitle, { color: colors.textSecondary }]}>Password must contain:</Text>
              <View style={styles.requirementRow}>
                <Ionicons
                  name={passwordValidation.hasMinLength ? 'checkmark-circle' : 'ellipse-outline'}
                  size={14}
                  color={passwordValidation.hasMinLength ? colors.success : colors.textMuted}
                />
                <Text
                  style={[
                    styles.requirementText,
                    { color: colors.textMuted },
                    passwordValidation.hasMinLength && { color: colors.success },
                  ]}
                >
                  At least 8 characters
                </Text>
              </View>
              <View style={styles.requirementRow}>
                <Ionicons
                  name={passwordValidation.hasUppercase ? 'checkmark-circle' : 'ellipse-outline'}
                  size={14}
                  color={passwordValidation.hasUppercase ? colors.success : colors.textMuted}
                />
                <Text
                  style={[
                    styles.requirementText,
                    { color: colors.textMuted },
                    passwordValidation.hasUppercase && { color: colors.success },
                  ]}
                >
                  One uppercase letter (A–Z)
                </Text>
              </View>
              <View style={styles.requirementRow}>
                <Ionicons
                  name={passwordValidation.hasLowercase ? 'checkmark-circle' : 'ellipse-outline'}
                  size={14}
                  color={passwordValidation.hasLowercase ? colors.success : colors.textMuted}
                />
                <Text
                  style={[
                    styles.requirementText,
                    { color: colors.textMuted },
                    passwordValidation.hasLowercase && { color: colors.success },
                  ]}
                >
                  One lowercase letter (a–z)
                </Text>
              </View>
              <View style={styles.requirementRow}>
                <Ionicons
                  name={passwordValidation.hasNumber ? 'checkmark-circle' : 'ellipse-outline'}
                  size={14}
                  color={passwordValidation.hasNumber ? colors.success : colors.textMuted}
                />
                <Text
                  style={[
                    styles.requirementText,
                    { color: colors.textMuted },
                    passwordValidation.hasNumber && { color: colors.success },
                  ]}
                >
                  One number (0–9)
                </Text>
              </View>
              <View style={styles.requirementRow}>
                <Ionicons
                  name={passwordValidation.hasSpecialChar ? 'checkmark-circle' : 'ellipse-outline'}
                  size={14}
                  color={passwordValidation.hasSpecialChar ? colors.success : colors.textMuted}
                />
                <Text
                  style={[
                    styles.requirementText,
                    { color: colors.textMuted },
                    passwordValidation.hasSpecialChar && { color: colors.success },
                  ]}
                >
                  One special character (!@#$%^&*)
                </Text>
              </View>
            </View>
          </View>

          {/* Confirm Password Input */}
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Confirm Password *</Text>
            <View
              style={[
                styles.inputWrapper,
                { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder },
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
                color={colors.textSecondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, { color: colors.inputText }]}
                placeholder="Confirm your password"
                placeholderTextColor={colors.inputPlaceholder}
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
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
            {/* Confirm Password Error/Success */}
            {confirmPasswordTouched && confirmPassword.length > 0 && !doPasswordsMatch && (
              <Text style={[styles.errorText, { color: colors.error }]}>Passwords do not match</Text>
            )}
            {confirmPasswordTouched && confirmPassword.length > 0 && doPasswordsMatch && (
              <View style={styles.matchRow}>
                <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                <Text style={[styles.matchText, { color: colors.success }]}>Passwords match</Text>
              </View>
            )}
          </View>

          {/* Server Error */}
          {serverError ? (
            <View style={[styles.serverErrorContainer, { backgroundColor: colors.errorBackground }]}>
              <Ionicons name="alert-circle" size={16} color={colors.error} />
              <Text style={[styles.serverErrorText, { color: colors.error }]}>{serverError}</Text>
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
              <View style={[styles.checkbox, { borderColor: colors.inputBorder }, termsAccepted && styles.checkboxChecked]}>
                {termsAccepted && (
                  <Ionicons name="checkmark" size={14} color="#ffffff" />
                )}
              </View>
              <Text style={[styles.termsText, { color: colors.textSecondary }]}>
                I agree to the{' '}
                <Text
                  style={[styles.termsLink, { color: colors.primary }]}
                  onPress={() => navigation.navigate('TermsConditions')}
                >
                  Terms & Conditions
                </Text>
                {' '}and{' '}
                <Text
                  style={[styles.termsLink, { color: colors.primary }]}
                  onPress={() => navigation.navigate('TermsConditions')}
                >
                  Privacy Policy
                </Text>
              </Text>
            </TouchableOpacity>
            {termsTouched && !termsValidation.isValid && (
              <Text style={[styles.termsError, { color: colors.error }]}>{termsValidation.error}</Text>
            )}
          </View>

          {/* Sign Up Button */}
          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: colors.primary },
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
            <Text style={[styles.linkText, { color: colors.textSecondary }]}>
              Already have an account? <Text style={[styles.linkTextBold, { color: colors.primary }]}>Sign In</Text>
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
  content: {
    flex: 1,
    padding: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#10b981',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 32,
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
    marginRight: 8,
  },
  countryCode: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
    marginRight: 4,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
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
    color: '#6b7280',
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
    color: '#9ca3af',
    marginLeft: 6,
  },
  requirementMet: {
    color: '#10b981',
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
    color: '#10b981',
    marginLeft: 4,
  },
  serverErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 8,
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
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#d1d5db',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  termsText: {
    flex: 1,
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 22,
  },
  termsLink: {
    color: '#10b981',
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
    backgroundColor: '#10b981',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
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
    color: '#6b7280',
  },
  linkTextBold: {
    color: '#10b981',
    fontWeight: '600',
  },
});
