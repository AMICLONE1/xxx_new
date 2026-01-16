import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Platform,
    SafeAreaView,
    ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, UserType } from '@/types';

type UserTypeSelectionScreenNavigationProp = NativeStackNavigationProp<
    RootStackParamList,
    'UserTypeSelection'
>;

interface Props {
    navigation: UserTypeSelectionScreenNavigationProp;
}

export default function UserTypeSelectionScreen({ navigation }: Props) {
    const handleSelectUserType = (userType: UserType) => {
        navigation.navigate('PPAAgreement', { userType });
    };

    return (
        <LinearGradient
            colors={['#e0f2fe', '#f0f9ff', '#ffffff']}
            style={styles.gradientBackground}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
        >
            <SafeAreaView style={styles.container}>
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    bounces={true}
                >
                    {/* Back Button */}
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="arrow-back" size={24} color="#0ea5e9" />
                    </TouchableOpacity>

                    {/* Header */}
                    <View style={styles.headerContainer}>
                        <View style={styles.iconWrapper}>
                            <MaterialCommunityIcons name="lightning-bolt" size={40} color="#0ea5e9" />
                        </View>
                        <Text style={styles.title}>Welcome to PowerNetPro</Text>
                        <Text style={styles.subtitle}>
                            Choose how you want to participate in the energy marketplace
                        </Text>
                    </View>

                    {/* User Type Cards */}
                    <View style={styles.cardsContainer}>
                        {/* Buyer Card */}
                        <TouchableOpacity
                            style={styles.userTypeCard}
                            onPress={() => handleSelectUserType('buyer')}
                            activeOpacity={0.85}
                        >
                            <LinearGradient
                                colors={['#ffffff', '#f0f9ff']}
                                style={styles.cardGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            >
                                <View style={styles.cardHeader}>
                                    <View style={styles.cardIconContainer}>
                                        <MaterialCommunityIcons
                                            name="cart-outline"
                                            size={28}
                                            color="#0ea5e9"
                                        />
                                    </View>
                                    <View style={styles.cardTitleContainer}>
                                        <Text style={styles.cardTitle}>Buy Energy</Text>
                                        <Text style={styles.cardDescription}>
                                            Purchase clean energy from local producers
                                        </Text>
                                    </View>
                                </View>
                                <View style={styles.cardFeatures}>
                                    <View style={styles.featureRow}>
                                        <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                                        <Text style={styles.featureText}>Save on electricity bills</Text>
                                    </View>
                                    <View style={styles.featureRow}>
                                        <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                                        <Text style={styles.featureText}>Support green energy</Text>
                                    </View>
                                    <View style={styles.featureRow}>
                                        <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                                        <Text style={styles.featureText}>Choose your supplier</Text>
                                    </View>
                                </View>
                                <View style={styles.selectButton}>
                                    <Text style={styles.selectButtonText}>Continue as Buyer</Text>
                                    <Ionicons name="arrow-forward" size={18} color="#ffffff" />
                                </View>
                            </LinearGradient>
                        </TouchableOpacity>

                        {/* Seller Card */}
                        <TouchableOpacity
                            style={styles.userTypeCard}
                            onPress={() => handleSelectUserType('seller')}
                            activeOpacity={0.85}
                        >
                            <LinearGradient
                                colors={['#ffffff', '#fef3c7']}
                                style={styles.cardGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            >
                                <View style={styles.cardHeader}>
                                    <View style={[styles.cardIconContainer, styles.sellerIconContainer]}>
                                        <MaterialCommunityIcons
                                            name="solar-power"
                                            size={28}
                                            color="#f59e0b"
                                        />
                                    </View>
                                    <View style={styles.cardTitleContainer}>
                                        <Text style={styles.cardTitle}>Sell Energy</Text>
                                        <Text style={styles.cardDescription}>
                                            Monetize your excess solar energy
                                        </Text>
                                    </View>
                                </View>
                                <View style={styles.cardFeatures}>
                                    <View style={styles.featureRow}>
                                        <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                                        <Text style={styles.featureText}>Earn from excess power</Text>
                                    </View>
                                    <View style={styles.featureRow}>
                                        <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                                        <Text style={styles.featureText}>Set your own prices</Text>
                                    </View>
                                    <View style={styles.featureRow}>
                                        <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                                        <Text style={styles.featureText}>Automatic trading bot</Text>
                                    </View>
                                </View>
                                <View style={[styles.selectButton, styles.sellerButton]}>
                                    <Text style={styles.selectButtonText}>Continue as Seller</Text>
                                    <Ionicons name="arrow-forward" size={18} color="#ffffff" />
                                </View>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>

                    {/* Sign In Link */}
                    <TouchableOpacity
                        onPress={() => navigation.navigate('Login')}
                        style={styles.linkButton}
                    >
                        <Text style={styles.linkText}>
                            Already have an account? <Text style={styles.linkTextBold}>Sign In</Text>
                        </Text>
                    </TouchableOpacity>
                </ScrollView>
            </SafeAreaView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    gradientBackground: {
        flex: 1,
    },
    container: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        padding: 24,
        paddingTop: Platform.OS === 'ios' ? 20 : 40,
        paddingBottom: 32,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#ffffff',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
        shadowColor: '#0ea5e9',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    headerContainer: {
        alignItems: 'center',
        marginBottom: 24,
    },
    iconWrapper: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#f0f9ff',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
        borderWidth: 2,
        borderColor: '#bae6fd',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#0ea5e9',
        textAlign: 'center',
        marginBottom: 6,
    },
    subtitle: {
        fontSize: 14,
        color: '#64748b',
        textAlign: 'center',
        lineHeight: 20,
        paddingHorizontal: 16,
    },
    cardsContainer: {
        gap: 16,
    },
    userTypeCard: {
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 4,
    },
    cardGradient: {
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 14,
    },
    cardIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#e0f2fe',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    sellerIconContainer: {
        backgroundColor: '#fef3c7',
    },
    cardTitleContainer: {
        flex: 1,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1e293b',
        marginBottom: 2,
    },
    cardDescription: {
        fontSize: 13,
        color: '#64748b',
        lineHeight: 18,
    },
    cardFeatures: {
        marginBottom: 14,
        gap: 6,
    },
    featureRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    featureText: {
        fontSize: 13,
        color: '#475569',
        marginLeft: 8,
    },
    selectButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0ea5e9',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 10,
        gap: 6,
    },
    sellerButton: {
        backgroundColor: '#f59e0b',
    },
    selectButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#ffffff',
    },
    linkButton: {
        alignItems: 'center',
        paddingVertical: 20,
        marginTop: 8,
    },
    linkText: {
        fontSize: 14,
        color: '#64748b',
    },
    linkTextBold: {
        fontWeight: '600',
        color: '#0ea5e9',
    },
});
