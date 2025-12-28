import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types';
import { validateEmail } from '@/utils/helpers';
import { authService } from '@/services/api/authService';
import { useAuthStore } from '@/store';

type LoginScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

interface Props {
  navigation: LoginScreenNavigationProp;
}

export default function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTermsError, setShowTermsError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { setUser, setToken } = useAuthStore();

  const handleLogin = async () => {
    // Check terms acceptance first
    if (!termsAccepted) {
      setShowTermsError(true);
      return;
    }

    const trimmedEmail = email.trim().toLowerCase();

    if (!validateEmail(trimmedEmail)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address');
      return;
    }

    if (!password || password.length < 6) {
      Alert.alert('Invalid Password', 'Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    try {
      if (__DEV__) {
        console.log('🚀 Starting sign in process...');
        // SECURITY: Never log password
      }

      const response = await authService.signIn({
        email: trimmedEmail,
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
        // No need to manually navigate - AppNavigator will show Main screen
        if (__DEV__) {
          console.log('✅ User authenticated, AppNavigator will show Main screen automatically');
        }
      } else {
        if (__DEV__) {
          console.error('❌ Sign in failed:', response.error);
        }
        Alert.alert('Sign In Failed', response.error || 'Invalid email or password');
      }
    } catch (error: any) {
      if (__DEV__) {
        console.error('❌ Sign in exception:', error);
      }
      Alert.alert('Error', error.message || 'Failed to sign in. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
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

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your email address"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={setEmail}
              autoFocus
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordInputWrapper}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Enter your password"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={22}
                  color="#6b7280"
                />
              </TouchableOpacity>
            </View>
            
            {/* Forgot Password Link */}
            <TouchableOpacity
              style={styles.forgotPasswordButton}
              onPress={() => navigation.navigate('ForgotPassword')}
            >
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>

          {/* Terms & Conditions Checkbox */}
          <View style={styles.termsContainer}>
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => {
                setTermsAccepted(!termsAccepted);
                if (showTermsError) setShowTermsError(false);
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
            {showTermsError && (
              <Text style={styles.termsError}>
                Please accept Terms & Conditions to continue
              </Text>
            )}
          </View>

          <TouchableOpacity
            style={[
              styles.button,
              (!termsAccepted || isLoading) && styles.buttonDisabled,
            ]}
            onPress={handleLogin}
            disabled={isLoading || !email.trim() || !password.trim() || !termsAccepted}
          >
            <Text style={styles.buttonText}>
              {isLoading ? 'Signing In...' : 'Sign In'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('SignUp')}
            style={styles.linkButton}
          >
            <Text style={styles.linkText}>
              Don't have an account? <Text style={styles.linkTextBold}>Sign Up</Text>
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
    justifyContent: 'center',
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
    marginBottom: 48,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  passwordInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  eyeButton: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginTop: 8,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '500',
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
    marginTop: 16,
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

