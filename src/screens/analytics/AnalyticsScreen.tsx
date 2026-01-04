import React from 'react';
import { View, Text, ScrollView, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types';

const { width } = Dimensions.get('window');

const AnalyticsScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <LinearGradient colors={['#10b981', '#059669']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
        <View style={styles.headerContent}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Analytics</Text>
            <Text style={styles.headerSubtitle}>Your Energy & Trading Performance</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerChip}
              onPress={() => navigation.navigate('TradeAnalytics', { mode: 'buyer' })}
            >
              <MaterialCommunityIcons name="account-arrow-left" size={16} color="#065f46" />
              <Text style={styles.headerChipText}>Buyers</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerChip}
              onPress={() => navigation.navigate('TradeAnalytics', { mode: 'seller' })}
            >
              <MaterialCommunityIcons name="account-arrow-right" size={16} color="#065f46" />
              <Text style={styles.headerChipText}>Sellers</Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      {/* Stats Cards in 2x2 Grid */}
      <View style={styles.statsContainer}>
        <View style={styles.statsRow}>
          {/* Energy Generated */}
          <View style={[styles.statCard, { flex: 1, marginRight: 6 }]}>
            <View style={styles.statIconContainer}>
              <MaterialCommunityIcons name="lightning-bolt" size={24} color="#10b981" />
            </View>
            <Text style={styles.statLabel}>Energy Generated</Text>
            <Text style={styles.statValue}>1,245 kWh</Text>
            <Text style={styles.statChange}>↑ 12% this month</Text>
          </View>

          {/* Total Revenue */}
          <View style={[styles.statCard, { flex: 1, marginLeft: 6 }]}>
            <View style={styles.statIconContainer}>
              <MaterialCommunityIcons name="currency-inr" size={24} color="#f59e0b" />
            </View>
            <Text style={styles.statLabel}>Total Revenue</Text>
            <Text style={styles.statValue}>₹15,420</Text>
            <Text style={styles.statChange}>↑ 8% this month</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          {/* Active Trades */}
          <View style={[styles.statCard, { flex: 1, marginRight: 6 }]}>
            <View style={styles.statIconContainer}>
              <MaterialCommunityIcons name="trending-up" size={24} color="#3b82f6" />
            </View>
            <Text style={styles.statLabel}>Active Trades</Text>
            <Text style={styles.statValue}>24</Text>
            <Text style={styles.statChange}>3 new today</Text>
          </View>

          {/* Efficiency Rating */}
          <View style={[styles.statCard, { flex: 1, marginLeft: 6 }]}>
            <View style={styles.statIconContainer}>
              <MaterialCommunityIcons name="star" size={24} color="#ec4899" />
            </View>
            <Text style={styles.statLabel}>Efficiency</Text>
            <Text style={styles.statValue}>94%</Text>
            <Text style={styles.statChange}>Excellent</Text>
          </View>
        </View>
      </View>

      {/* Buyers & Sellers */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Buyers & Sellers</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.buyerSellerContainer}
        >
          {/* Buyers */}
          <View style={[styles.buyerSellerCard, styles.buyerCard]}>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="arrow-down-circle" size={20} color="#ef4444" />
              <Text style={styles.cardTitle}>Buyers</Text>
            </View>
            {[
              { name: 'Raj Kumar', amount: '₹8,500' },
              { name: 'Priya Singh', amount: '₹6,200' },
              { name: 'Amit Patel', amount: '₹5,100' },
            ].map((buyer, index) => (
              <View key={index} style={styles.buyerSellerItem}>
                <View style={styles.userAvatar}>
                  <Text style={styles.avatarText}>{buyer.name.charAt(0)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.userName}>{buyer.name}</Text>
                </View>
                <Text style={styles.userAmount}>{buyer.amount}</Text>
              </View>
            ))}
          </View>

          {/* Sellers */}
          <View style={[styles.buyerSellerCard, styles.sellerCard]}>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="arrow-up-circle" size={20} color="#10b981" />
              <Text style={styles.cardTitle}>Sellers</Text>
            </View>
            {[
              { name: 'Vikas Sharma', amount: '₹7,800' },
              { name: 'Maya Desai', amount: '₹6,900' },
              { name: 'Arjun Nair', amount: '₹5,400' },
            ].map((seller, index) => (
              <View key={index} style={styles.buyerSellerItem}>
                <View style={styles.userAvatar}>
                  <Text style={styles.avatarText}>{seller.name.charAt(0)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.userName}>{seller.name}</Text>
                </View>
                <Text style={styles.userAmount}>{seller.amount}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Recent Transactions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        {[
          { id: 1, type: 'Sale', amount: '₹2,400', date: 'Today, 2:30 PM', status: 'Completed' },
          { id: 2, type: 'Purchase', amount: '₹1,200', date: 'Yesterday, 10:15 AM', status: 'Completed' },
          { id: 3, type: 'Sale', amount: '₹3,100', date: '2 days ago', status: 'Completed' },
        ].map((transaction) => (
          <View key={transaction.id} style={styles.transactionItem}>
            <View style={styles.transactionLeft}>
              <View style={[styles.transactionIcon, { backgroundColor: transaction.type === 'Sale' ? '#d1fae5' : '#fef3c7' }]}>
                <MaterialCommunityIcons 
                  name={transaction.type === 'Sale' ? 'arrow-up' : 'arrow-down'} 
                  size={18} 
                  color={transaction.type === 'Sale' ? '#10b981' : '#f59e0b'} 
                />
              </View>
              <View>
                <Text style={styles.transactionType}>{transaction.type}</Text>
                <Text style={styles.transactionDate}>{transaction.date}</Text>
              </View>
            </View>
            <View style={styles.transactionRight}>
              <Text style={[styles.transactionAmount, { color: transaction.type === 'Sale' ? '#10b981' : '#ef4444' }]}>
                {transaction.type === 'Sale' ? '+' : '-'}{transaction.amount}
              </Text>
              <Text style={styles.transactionStatus}>{transaction.status}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Monthly Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Monthly Summary</Text>
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Generation Time</Text>
            <Text style={styles.summaryValue}>18.5 hours/day</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Avg. Daily Revenue</Text>
            <Text style={styles.summaryValue}>₹487</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Peak Trading Hours</Text>
            <Text style={styles.summaryValue}>10 AM - 4 PM</Text>
          </View>
        </View>
      </View>

      {/* Empty Space */}
      <View style={{ height: 20 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    padding: 20,
    paddingTop: 40,
    paddingBottom: 30,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf3',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    marginLeft: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  headerChipText: {
    marginLeft: 6,
    color: '#065f46',
    fontWeight: '700',
    fontSize: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#d1fae5',
  },
  statsContainer: {
    paddingHorizontal: 12,
    marginTop: -20,
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  statCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  statIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0fdf4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statLabel: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  statChange: {
    fontSize: 12,
    color: '#10b981',
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  transactionItem: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionType: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  transactionStatus: {
    fontSize: 11,
    color: '#9ca3af',
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  summaryLabel: {
    fontSize: 13,
    color: '#6b7280',
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1f2937',
  },
  buyerSellerContainer: {
    flexDirection: 'row',
    paddingHorizontal: 8,
  },
  buyerSellerCard: {
    width: Math.max(width * 0.65, 240),
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  buyerCard: {
    marginRight: 12,
  },
  sellerCard: {
    marginRight: 0,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1f2937',
    marginLeft: 8,
  },
  buyerSellerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1f2937',
  },
  userName: {
    fontSize: 11,
    fontWeight: '500',
    color: '#1f2937',
  },
  userAmount: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10b981',
  },
});

export default AnalyticsScreen;
