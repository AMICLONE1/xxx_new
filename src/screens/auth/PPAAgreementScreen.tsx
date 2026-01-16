import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Platform,
    SafeAreaView,
    ScrollView,
    Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '@/types';

type PPAAgreementScreenNavigationProp = NativeStackNavigationProp<
    RootStackParamList,
    'PPAAgreement'
>;

type PPAAgreementScreenRouteProp = RouteProp<RootStackParamList, 'PPAAgreement'>;

interface Props {
    navigation: PPAAgreementScreenNavigationProp;
    route: PPAAgreementScreenRouteProp;
}

export default function PPAAgreementScreen({ navigation, route }: Props) {
    const { userType } = route.params;
    const [hasScrolledToEnd, setHasScrolledToEnd] = useState(false);
    const [isAgreed, setIsAgreed] = useState(false);
    const scrollViewRef = useRef<ScrollView>(null);
    const checkboxScale = useRef(new Animated.Value(1)).current;

    const isBuyer = userType === 'buyer';
    const currentDate = new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    });

    const handleScroll = (event: any) => {
        const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
        const paddingToBottom = 50;
        if (layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom) {
            setHasScrolledToEnd(true);
        }
    };

    const handleCheckboxPress = () => {
        if (!hasScrolledToEnd) return;

        Animated.sequence([
            Animated.timing(checkboxScale, {
                toValue: 0.9,
                duration: 100,
                useNativeDriver: true,
            }),
            Animated.timing(checkboxScale, {
                toValue: 1,
                duration: 100,
                useNativeDriver: true,
            }),
        ]).start();

        setIsAgreed(!isAgreed);
    };

    const handleContinue = () => {
        if (isAgreed) {
            navigation.navigate('SignUp', { userType });
        }
    };

    return (
        <LinearGradient
            colors={['#f8fafc', '#f1f5f9', '#ffffff']}
            style={styles.gradientBackground}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
        >
            <SafeAreaView style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="arrow-back" size={24} color="#0ea5e9" />
                    </TouchableOpacity>
                    <View style={styles.headerTitleContainer}>
                        <MaterialCommunityIcons
                            name="file-document-outline"
                            size={24}
                            color="#0ea5e9"
                        />
                        <Text style={styles.headerTitle}>Power Purchase Agreement</Text>
                    </View>
                    <View style={styles.headerSpacer} />
                </View>

                {/* Agreement Type Badge */}
                <View style={styles.badgeContainer}>
                    <View style={[styles.badge, isBuyer ? styles.buyerBadge : styles.sellerBadge]}>
                        <MaterialCommunityIcons
                            name={isBuyer ? 'cart-outline' : 'solar-power'}
                            size={16}
                            color={isBuyer ? '#0ea5e9' : '#f59e0b'}
                        />
                        <Text style={[styles.badgeText, isBuyer ? styles.buyerBadgeText : styles.sellerBadgeText]}>
                            {isBuyer ? 'Energy Buyer Agreement' : 'Energy Seller Agreement'}
                        </Text>
                    </View>
                </View>

                {/* Agreement Content */}
                <View style={styles.agreementContainer}>
                    <ScrollView
                        ref={scrollViewRef}
                        style={styles.scrollView}
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={true}
                        onScroll={handleScroll}
                        scrollEventThrottle={16}
                    >
                        {/* Document Header */}
                        <View style={styles.documentHeader}>
                            <Text style={styles.documentTitle}>
                                POWER PURCHASE AGREEMENT (PPA)
                            </Text>
                            <Text style={styles.documentSubtitle}>
                                Peer-to-Peer Energy Trading Platform
                            </Text>
                            <Text style={styles.documentDate}>
                                Effective Date: {currentDate}
                            </Text>
                        </View>

                        {/* Parties Section */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>1. PARTIES TO THE AGREEMENT</Text>
                            <Text style={styles.paragraph}>
                                This Power Purchase Agreement ("Agreement") is entered into between:
                            </Text>
                            <View style={styles.partyBox}>
                                <Text style={styles.partyLabel}>FIRST PARTY (Platform Provider):</Text>
                                <Text style={styles.partyText}>
                                    PowerNetPro Energy Trading Platform{'\n'}
                                    A registered peer-to-peer energy trading facilitator under the Electricity Act, 2003 and relevant CERC/SERC regulations.
                                </Text>
                            </View>
                            <View style={styles.partyBox}>
                                <Text style={styles.partyLabel}>SECOND PARTY ({isBuyer ? 'Energy Buyer' : 'Energy Seller'}):</Text>
                                <Text style={styles.partyText}>
                                    The individual or entity registering as {isBuyer ? 'an Energy Buyer' : 'an Energy Seller'} on the PowerNetPro platform, whose details shall be captured during registration.
                                </Text>
                            </View>
                        </View>

                        {/* Definitions Section */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>2. DEFINITIONS</Text>
                            <View style={styles.definitionItem}>
                                <Text style={styles.definitionTerm}>"Energy Unit"</Text>
                                <Text style={styles.definitionText}>means one kilowatt-hour (kWh) of electrical energy.</Text>
                            </View>
                            <View style={styles.definitionItem}>
                                <Text style={styles.definitionTerm}>"Trading Period"</Text>
                                <Text style={styles.definitionText}>means 15-minute intervals as per grid synchronization requirements.</Text>
                            </View>
                            <View style={styles.definitionItem}>
                                <Text style={styles.definitionTerm}>"Settlement Price"</Text>
                                <Text style={styles.definitionText}>means the mutually agreed price per kWh between buyer and seller.</Text>
                            </View>
                            <View style={styles.definitionItem}>
                                <Text style={styles.definitionTerm}>"Smart Meter"</Text>
                                <Text style={styles.definitionText}>means the AMI-compliant metering device registered with the DISCOM.</Text>
                            </View>
                        </View>

                        {/* Scope Section */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>3. SCOPE OF AGREEMENT</Text>
                            {isBuyer ? (
                                <>
                                    <Text style={styles.paragraph}>
                                        As an Energy Buyer, you agree to:
                                    </Text>
                                    <View style={styles.bulletPoint}>
                                        <Text style={styles.bullet}>a)</Text>
                                        <Text style={styles.bulletText}>
                                            Purchase renewable energy from registered sellers through the platform's marketplace.
                                        </Text>
                                    </View>
                                    <View style={styles.bulletPoint}>
                                        <Text style={styles.bullet}>b)</Text>
                                        <Text style={styles.bulletText}>
                                            Maintain sufficient wallet balance to honor purchase commitments.
                                        </Text>
                                    </View>
                                    <View style={styles.bulletPoint}>
                                        <Text style={styles.bullet}>c)</Text>
                                        <Text style={styles.bulletText}>
                                            Ensure your registered meter is capable of receiving energy from the grid.
                                        </Text>
                                    </View>
                                    <View style={styles.bulletPoint}>
                                        <Text style={styles.bullet}>d)</Text>
                                        <Text style={styles.bulletText}>
                                            Comply with all applicable DISCOM regulations and grid codes.
                                        </Text>
                                    </View>
                                </>
                            ) : (
                                <>
                                    <Text style={styles.paragraph}>
                                        As an Energy Seller, you agree to:
                                    </Text>
                                    <View style={styles.bulletPoint}>
                                        <Text style={styles.bullet}>a)</Text>
                                        <Text style={styles.bulletText}>
                                            Sell surplus renewable energy generated from your registered solar/wind installation.
                                        </Text>
                                    </View>
                                    <View style={styles.bulletPoint}>
                                        <Text style={styles.bullet}>b)</Text>
                                        <Text style={styles.bulletText}>
                                            Ensure accurate metering and reporting of energy generation and export.
                                        </Text>
                                    </View>
                                    <View style={styles.bulletPoint}>
                                        <Text style={styles.bullet}>c)</Text>
                                        <Text style={styles.bulletText}>
                                            Maintain your generation equipment in compliance with safety standards.
                                        </Text>
                                    </View>
                                    <View style={styles.bulletPoint}>
                                        <Text style={styles.bullet}>d)</Text>
                                        <Text style={styles.bulletText}>
                                            Honor all confirmed trade orders within the specified delivery window.
                                        </Text>
                                    </View>
                                </>
                            )}
                        </View>

                        {/* Pricing Section */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>4. PRICING AND PAYMENT TERMS</Text>
                            <View style={styles.bulletPoint}>
                                <Text style={styles.bullet}>4.1</Text>
                                <Text style={styles.bulletText}>
                                    Energy prices are determined by market dynamics between buyers and sellers, subject to regulatory price bands.
                                </Text>
                            </View>
                            <View style={styles.bulletPoint}>
                                <Text style={styles.bullet}>4.2</Text>
                                <Text style={styles.bulletText}>
                                    Platform service fee of 2% shall be applicable on each successful transaction.
                                </Text>
                            </View>
                            <View style={styles.bulletPoint}>
                                <Text style={styles.bullet}>4.3</Text>
                                <Text style={styles.bulletText}>
                                    Wheeling charges and transmission losses as per DISCOM tariff shall be borne by the buyer.
                                </Text>
                            </View>
                            <View style={styles.bulletPoint}>
                                <Text style={styles.bullet}>4.4</Text>
                                <Text style={styles.bulletText}>
                                    All payments are processed through the platform's secure wallet system. Settlement occurs within 24 hours of trade confirmation.
                                </Text>
                            </View>
                        </View>

                        {/* Regulatory Compliance */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>5. REGULATORY COMPLIANCE</Text>
                            <Text style={styles.paragraph}>
                                Both parties acknowledge and agree to comply with:
                            </Text>
                            <View style={styles.bulletPoint}>
                                <Text style={styles.bullet}>-</Text>
                                <Text style={styles.bulletText}>The Electricity Act, 2003 and amendments thereof</Text>
                            </View>
                            <View style={styles.bulletPoint}>
                                <Text style={styles.bullet}>-</Text>
                                <Text style={styles.bulletText}>CERC/SERC regulations on peer-to-peer energy trading</Text>
                            </View>
                            <View style={styles.bulletPoint}>
                                <Text style={styles.bullet}>-</Text>
                                <Text style={styles.bulletText}>Relevant DISCOM grid connectivity and metering requirements</Text>
                            </View>
                            <View style={styles.bulletPoint}>
                                <Text style={styles.bullet}>-</Text>
                                <Text style={styles.bulletText}>Renewable Energy Certificate (REC) mechanism guidelines</Text>
                            </View>
                            <View style={styles.bulletPoint}>
                                <Text style={styles.bullet}>-</Text>
                                <Text style={styles.bulletText}>KYC and AML regulations as applicable</Text>
                            </View>
                        </View>

                        {/* Metering Requirements */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>6. METERING AND DATA</Text>
                            <View style={styles.bulletPoint}>
                                <Text style={styles.bullet}>6.1</Text>
                                <Text style={styles.bulletText}>
                                    All energy transactions shall be recorded through DISCOM-approved smart meters with AMI capabilities.
                                </Text>
                            </View>
                            <View style={styles.bulletPoint}>
                                <Text style={styles.bullet}>6.2</Text>
                                <Text style={styles.bulletText}>
                                    Metering data shall be captured at 15-minute intervals for accurate billing and settlement.
                                </Text>
                            </View>
                            <View style={styles.bulletPoint}>
                                <Text style={styles.bullet}>6.3</Text>
                                <Text style={styles.bulletText}>
                                    In case of meter disputes, DISCOM meter reading shall be considered final.
                                </Text>
                            </View>
                        </View>

                        {/* Liability */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>7. LIABILITY AND INDEMNIFICATION</Text>
                            <View style={styles.bulletPoint}>
                                <Text style={styles.bullet}>7.1</Text>
                                <Text style={styles.bulletText}>
                                    The platform acts solely as a facilitator and shall not be liable for grid failures, force majeure events, or regulatory changes.
                                </Text>
                            </View>
                            <View style={styles.bulletPoint}>
                                <Text style={styles.bullet}>7.2</Text>
                                <Text style={styles.bulletText}>
                                    {isBuyer ? 'Buyers' : 'Sellers'} shall indemnify the platform against any claims arising from their breach of this agreement.
                                </Text>
                            </View>
                            <View style={styles.bulletPoint}>
                                <Text style={styles.bullet}>7.3</Text>
                                <Text style={styles.bulletText}>
                                    Maximum liability of the platform shall be limited to the transaction value of the disputed trade.
                                </Text>
                            </View>
                        </View>

                        {/* Termination */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>8. TERMINATION</Text>
                            <View style={styles.bulletPoint}>
                                <Text style={styles.bullet}>8.1</Text>
                                <Text style={styles.bulletText}>
                                    Either party may terminate this agreement with 30 days written notice.
                                </Text>
                            </View>
                            <View style={styles.bulletPoint}>
                                <Text style={styles.bullet}>8.2</Text>
                                <Text style={styles.bulletText}>
                                    All pending transactions must be settled before account closure.
                                </Text>
                            </View>
                            <View style={styles.bulletPoint}>
                                <Text style={styles.bullet}>8.3</Text>
                                <Text style={styles.bulletText}>
                                    Platform reserves the right to terminate accounts for regulatory non-compliance or fraudulent activity.
                                </Text>
                            </View>
                        </View>

                        {/* Dispute Resolution */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>9. DISPUTE RESOLUTION</Text>
                            <Text style={styles.paragraph}>
                                Any disputes arising from this agreement shall be resolved through:
                            </Text>
                            <View style={styles.bulletPoint}>
                                <Text style={styles.bullet}>a)</Text>
                                <Text style={styles.bulletText}>
                                    First, through the platform's internal grievance redressal mechanism within 15 days.
                                </Text>
                            </View>
                            <View style={styles.bulletPoint}>
                                <Text style={styles.bullet}>b)</Text>
                                <Text style={styles.bulletText}>
                                    If unresolved, through arbitration under the Arbitration and Conciliation Act, 1996.
                                </Text>
                            </View>
                            <View style={styles.bulletPoint}>
                                <Text style={styles.bullet}>c)</Text>
                                <Text style={styles.bulletText}>
                                    Jurisdiction shall be the courts of New Delhi, India.
                                </Text>
                            </View>
                        </View>

                        {/* Governing Law */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>10. GOVERNING LAW</Text>
                            <Text style={styles.paragraph}>
                                This Agreement shall be governed by and construed in accordance with the laws of India, including the Electricity Act, 2003, and all applicable CERC/SERC regulations pertaining to peer-to-peer energy trading.
                            </Text>
                        </View>

                        {/* Scroll Indicator */}
                        {!hasScrolledToEnd && (
                            <View style={styles.scrollIndicator}>
                                <Ionicons name="chevron-down" size={20} color="#94a3b8" />
                                <Text style={styles.scrollIndicatorText}>
                                    Scroll down to read the complete agreement
                                </Text>
                            </View>
                        )}
                    </ScrollView>
                </View>

                {/* Agreement Actions */}
                <View style={styles.actionsContainer}>
                    {/* Checkbox */}
                    <TouchableOpacity
                        style={[
                            styles.checkboxRow,
                            !hasScrolledToEnd && styles.checkboxRowDisabled,
                        ]}
                        onPress={handleCheckboxPress}
                        activeOpacity={hasScrolledToEnd ? 0.7 : 1}
                    >
                        <Animated.View
                            style={[
                                styles.checkbox,
                                isAgreed && styles.checkboxChecked,
                                !hasScrolledToEnd && styles.checkboxDisabled,
                                { transform: [{ scale: checkboxScale }] },
                            ]}
                        >
                            {isAgreed && (
                                <Ionicons name="checkmark" size={16} color="#ffffff" />
                            )}
                        </Animated.View>
                        <Text style={[
                            styles.checkboxLabel,
                            !hasScrolledToEnd && styles.checkboxLabelDisabled,
                        ]}>
                            I have read and agree to the terms of this Power Purchase Agreement
                        </Text>
                    </TouchableOpacity>

                    {!hasScrolledToEnd && (
                        <Text style={styles.scrollHint}>
                            Please scroll through the entire agreement to continue
                        </Text>
                    )}

                    {/* Continue Button */}
                    <TouchableOpacity
                        style={[
                            styles.continueButton,
                            (!isAgreed || !hasScrolledToEnd) && styles.continueButtonDisabled,
                        ]}
                        onPress={handleContinue}
                        disabled={!isAgreed || !hasScrolledToEnd}
                        activeOpacity={0.8}
                    >
                        <Text style={[
                            styles.continueButtonText,
                            (!isAgreed || !hasScrolledToEnd) && styles.continueButtonTextDisabled,
                        ]}>
                            Sign Agreement & Continue
                        </Text>
                        <Ionicons
                            name="arrow-forward"
                            size={20}
                            color={isAgreed && hasScrolledToEnd ? '#ffffff' : '#94a3b8'}
                        />
                    </TouchableOpacity>

                    {/* Sign In Link */}
                    <TouchableOpacity
                        onPress={() => navigation.navigate('Login')}
                        style={styles.linkButton}
                    >
                        <Text style={styles.linkText}>
                            Already have an account? <Text style={styles.linkTextBold}>Sign In</Text>
                        </Text>
                    </TouchableOpacity>
                </View>
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 10 : 40,
        paddingBottom: 12,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#ffffff',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#0ea5e9',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    headerTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1e293b',
    },
    headerSpacer: {
        width: 40,
    },
    badgeContainer: {
        alignItems: 'center',
        paddingBottom: 12,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 8,
    },
    buyerBadge: {
        backgroundColor: '#e0f2fe',
    },
    sellerBadge: {
        backgroundColor: '#fef3c7',
    },
    badgeText: {
        fontSize: 14,
        fontWeight: '600',
    },
    buyerBadgeText: {
        color: '#0ea5e9',
    },
    sellerBadgeText: {
        color: '#f59e0b',
    },
    agreementContainer: {
        flex: 1,
        marginHorizontal: 20,
        backgroundColor: '#ffffff',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        overflow: 'hidden',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    documentHeader: {
        alignItems: 'center',
        paddingBottom: 20,
        borderBottomWidth: 2,
        borderBottomColor: '#0ea5e9',
        marginBottom: 20,
    },
    documentTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#1e293b',
        textAlign: 'center',
        letterSpacing: 0.5,
    },
    documentSubtitle: {
        fontSize: 13,
        color: '#64748b',
        marginTop: 4,
    },
    documentDate: {
        fontSize: 12,
        color: '#94a3b8',
        marginTop: 8,
    },
    section: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1e293b',
        marginBottom: 10,
        textTransform: 'uppercase',
        letterSpacing: 0.3,
    },
    paragraph: {
        fontSize: 13,
        color: '#475569',
        lineHeight: 20,
        marginBottom: 10,
    },
    partyBox: {
        backgroundColor: '#f8fafc',
        padding: 12,
        borderRadius: 8,
        marginBottom: 10,
        borderLeftWidth: 3,
        borderLeftColor: '#0ea5e9',
    },
    partyLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: '#0ea5e9',
        marginBottom: 4,
    },
    partyText: {
        fontSize: 12,
        color: '#64748b',
        lineHeight: 18,
    },
    definitionItem: {
        marginBottom: 8,
    },
    definitionTerm: {
        fontSize: 13,
        fontWeight: '600',
        color: '#1e293b',
    },
    definitionText: {
        fontSize: 12,
        color: '#64748b',
        marginLeft: 8,
        lineHeight: 18,
    },
    bulletPoint: {
        flexDirection: 'row',
        marginBottom: 8,
        paddingRight: 10,
    },
    bullet: {
        fontSize: 12,
        color: '#0ea5e9',
        fontWeight: '600',
        width: 24,
    },
    bulletText: {
        flex: 1,
        fontSize: 12,
        color: '#64748b',
        lineHeight: 18,
    },
    scrollIndicator: {
        alignItems: 'center',
        paddingTop: 20,
    },
    scrollIndicatorText: {
        fontSize: 12,
        color: '#94a3b8',
        marginTop: 4,
    },
    actionsContainer: {
        padding: 20,
        backgroundColor: '#ffffff',
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
    },
    checkboxRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    checkboxRowDisabled: {
        opacity: 0.5,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: '#cbd5e1',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
        marginTop: 2,
    },
    checkboxChecked: {
        backgroundColor: '#0ea5e9',
        borderColor: '#0ea5e9',
    },
    checkboxDisabled: {
        borderColor: '#e2e8f0',
    },
    checkboxLabel: {
        flex: 1,
        fontSize: 13,
        color: '#475569',
        lineHeight: 20,
    },
    checkboxLabelDisabled: {
        color: '#94a3b8',
    },
    scrollHint: {
        fontSize: 12,
        color: '#f59e0b',
        textAlign: 'center',
        marginBottom: 12,
    },
    continueButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0ea5e9',
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 12,
        gap: 8,
    },
    continueButtonDisabled: {
        backgroundColor: '#e2e8f0',
    },
    continueButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#ffffff',
    },
    continueButtonTextDisabled: {
        color: '#94a3b8',
    },
    linkButton: {
        alignItems: 'center',
        paddingTop: 16,
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
