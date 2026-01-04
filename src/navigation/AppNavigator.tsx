import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { RootStackParamList, MainTabParamList } from '@/types';
import { useAuthStore } from '@/store';

// Auth Screens
import LoginScreen from '@/screens/auth/LoginScreen';
import SignUpScreen from '@/screens/auth/SignUpScreen';
import OTPScreen from '@/screens/auth/OTPScreen';
import OnboardingScreen from '@/screens/auth/OnboardingScreen';
import TermsConditionsScreen from '@/screens/auth/TermsConditionsScreen';
import ForgotPasswordScreen from '@/screens/auth/ForgotPasswordScreen';
import VerifyResetCodeScreen from '@/screens/auth/VerifyResetCodeScreen';
import ResetPasswordScreen from '@/screens/auth/ResetPasswordScreen';

// Main Screens
import HomeScreen from '@/screens/home/HomeScreen';
import AnalyticsScreen from '@/screens/analytics/AnalyticsScreen';
import MarketplaceScreen from '@/screens/trading/MarketplaceScreen';
import HistoryScreen from '@/screens/history/HistoryScreen';
import WalletScreen from '@/screens/wallet/WalletScreen';
import ProfileScreen from '@/screens/profile/ProfileScreen';

// KYC & Meter Screens
import KYCScreen from '@/screens/kyc/KYCScreen';
import AadhaarScanScreen from '@/screens/kyc/AadhaarScanScreen';
import PANScanScreen from '@/screens/kyc/PANScanScreen';
import ElectricityBillScanScreen from '@/screens/kyc/ElectricityBillScanScreen';
import GSTScanScreen from '@/screens/kyc/GSTScanScreen';
import SocietyRegistrationScanScreen from '@/screens/kyc/SocietyRegistrationScanScreen';
import MeterRegistrationScreen from '@/screens/meter/MeterRegistrationScreen';

// Trading Screens
import OrderScreen from '@/screens/trading/OrderScreen';

// Home Screens
import EnergyChartScreen from '@/screens/home/EnergyChartScreen';
import TradeAnalyticsScreen from '@/screens/analytics/TradeAnalyticsScreen';
import AgreementScreen from '@/screens/analytics/AgreementScreen';

// Profile Screens
import TradingBotScreen from '@/screens/profile/TradingBotScreen';
import EditProfileScreen from '@/screens/profile/EditProfileScreen';

// Wallet Screens
import TopUpScreen from '@/screens/wallet/TopUpScreen';
import WithdrawScreen from '@/screens/wallet/WithdrawScreen';

// Meter Screens
import MeterStatusScreen from '@/screens/meter/MeterStatusScreen';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const MainTabs = createBottomTabNavigator<MainTabParamList>();

const MainTabNavigator = () => {
  return (
    <MainTabs.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#10b981',
        tabBarInactiveTintColor: '#6b7280',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#e5e7eb',
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <MainTabs.Screen 
        name="Home" 
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons 
              name={focused ? 'home' : 'home-outline'} 
              size={size} 
              color={color} 
            />
          ),
          tabBarLabel: 'Home',
        }}
      />
      <MainTabs.Screen 
        name="Analytics" 
        component={AnalyticsScreen}
        options={{
          tabBarIcon: ({ color, size, focused }) => (
            <MaterialCommunityIcons 
              name={focused ? 'chart-line' : 'chart-line'} 
              size={size} 
              color={color} 
            />
          ),
          tabBarLabel: 'Analytics',
        }}
      />
      <MainTabs.Screen 
        name="Marketplace" 
        component={MarketplaceScreen}
        options={{
          tabBarIcon: ({ color, size, focused }) => (
            <MaterialCommunityIcons 
              name={focused ? 'store' : 'store-outline'} 
              size={size} 
              color={color} 
            />
          ),
          tabBarLabel: 'Marketplace',
        }}
      />
      <MainTabs.Screen 
        name="Wallet" 
        component={WalletScreen}
        options={{
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons 
              name={focused ? 'wallet' : 'wallet-outline'} 
              size={size} 
              color={color} 
            />
          ),
          tabBarLabel: 'Wallet',
        }}
      />
      <MainTabs.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons 
              name={focused ? 'person' : 'person-outline'} 
              size={size} 
              color={color} 
            />
          ),
          tabBarLabel: 'Profile',
        }}
      />
    </MainTabs.Navigator>
  );
};

export const AppNavigator = () => {
  const { isAuthenticated } = useAuthStore();

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <>
            <RootStack.Screen name="Login" component={LoginScreen} />
            <RootStack.Screen name="SignUp" component={SignUpScreen} />
            <RootStack.Screen name="TermsConditions" component={TermsConditionsScreen} />
            <RootStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            <RootStack.Screen name="VerifyResetCode" component={VerifyResetCodeScreen} />
            <RootStack.Screen name="ResetPassword" component={ResetPasswordScreen} />
            <RootStack.Screen name="Onboarding" component={OnboardingScreen} />
          </>
        ) : (
          <>
            <RootStack.Screen name="Main" component={MainTabNavigator} />
            <RootStack.Screen
              name="Onboarding"
              component={OnboardingScreen}
              options={{ presentation: 'modal' }}
            />
            <RootStack.Screen
              name="KYC"
              component={KYCScreen}
              options={{ presentation: 'modal' }}
            />
            <RootStack.Screen
              name="AadhaarScan"
              component={AadhaarScanScreen}
              options={{ presentation: 'modal' }}
            />
            <RootStack.Screen
              name="PANScan"
              component={PANScanScreen}
              options={{ presentation: 'modal' }}
            />
            <RootStack.Screen
              name="ElectricityBillScan"
              component={ElectricityBillScanScreen}
              options={{ presentation: 'modal' }}
            />
            <RootStack.Screen
              name="GSTScan"
              component={GSTScanScreen}
              options={{ presentation: 'modal' }}
            />
            <RootStack.Screen
              name="SocietyRegistrationScan"
              component={SocietyRegistrationScanScreen}
              options={{ presentation: 'modal' }}
            />
            <RootStack.Screen
              name="MeterRegistration"
              component={MeterRegistrationScreen}
              options={{ presentation: 'modal' }}
            />
            <RootStack.Screen
              name="Order"
              component={OrderScreen}
              options={{ presentation: 'modal' }}
            />
            <RootStack.Screen
              name="EnergyChart"
              component={EnergyChartScreen}
              options={{ presentation: 'modal' }}
            />
            <RootStack.Screen
              name="TradeAnalytics"
              component={TradeAnalyticsScreen}
              options={{ presentation: 'modal' }}
            />
            <RootStack.Screen
              name="Agreement"
              component={AgreementScreen}
              options={{ presentation: 'modal' }}
            />
            <RootStack.Screen
              name="History"
              component={HistoryScreen}
              options={{ presentation: 'modal' }}
            />
            <RootStack.Screen
              name="TradingBot"
              component={TradingBotScreen}
              options={{ presentation: 'modal' }}
            />
            <RootStack.Screen
              name="EditProfile"
              component={EditProfileScreen}
              options={{ presentation: 'modal' }}
            />
            <RootStack.Screen
              name="TopUp"
              component={TopUpScreen}
              options={{ presentation: 'modal' }}
            />
            <RootStack.Screen
              name="Withdraw"
              component={WithdrawScreen}
              options={{ presentation: 'modal' }}
            />
            <RootStack.Screen
              name="MeterStatus"
              component={MeterStatusScreen}
              options={{ presentation: 'modal' }}
            />
          </>
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
};

