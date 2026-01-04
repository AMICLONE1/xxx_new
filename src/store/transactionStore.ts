import { create } from 'zustand';
import { Transaction } from '@/types';

// Mock initial transactions for demonstration
const mockInitialTransactions: Transaction[] = [
  {
    id: 'tx_mock_1',
    userId: 'user1',
    type: 'energy_purchase',
    amount: 450,
    currency: 'INR',
    status: 'completed',
    energyAmount: 15,
    pricePerUnit: 30,
    counterPartyName: 'Solar Power Solutions',
    tradeType: 'buy',
    timestamp: new Date('2026-01-05T10:30:00'),
    description: 'Purchased 15 kWh',
  },
  {
    id: 'tx_mock_2',
    userId: 'user1',
    type: 'energy_sale',
    amount: 600,
    currency: 'INR',
    status: 'completed',
    energyAmount: 20,
    pricePerUnit: 30,
    counterPartyName: 'Green Energy Co.',
    tradeType: 'sell',
    timestamp: new Date('2026-01-04T15:45:00'),
    description: 'Sold 20 kWh',
  },
  {
    id: 'tx_mock_3',
    userId: 'user1',
    type: 'energy_purchase',
    amount: 300,
    currency: 'INR',
    status: 'completed',
    energyAmount: 10,
    pricePerUnit: 30,
    counterPartyName: 'Kothrud Solar Farm',
    tradeType: 'buy',
    timestamp: new Date('2026-01-03T09:15:00'),
    description: 'Purchased 10 kWh',
  },
  {
    id: 'tx_mock_4',
    userId: 'user1',
    type: 'energy_sale',
    amount: 750,
    currency: 'INR',
    status: 'completed',
    energyAmount: 25,
    pricePerUnit: 30,
    counterPartyName: 'EcoWatt Industries',
    tradeType: 'sell',
    timestamp: new Date('2026-01-02T14:20:00'),
    description: 'Sold 25 kWh',
  },
  {
    id: 'tx_mock_5',
    userId: 'user1',
    type: 'energy_purchase',
    amount: 540,
    currency: 'INR',
    status: 'completed',
    energyAmount: 18,
    pricePerUnit: 30,
    counterPartyName: 'Renewable Energy Hub',
    tradeType: 'buy',
    timestamp: new Date('2026-01-01T11:30:00'),
    description: 'Purchased 18 kWh',
  },
];

interface TransactionState {
  transactions: Transaction[];
  addTransaction: (transaction: Omit<Transaction, 'id' | 'timestamp'>) => void;
  getTransactions: (filter?: 'buy' | 'sell' | 'all') => Transaction[];
  getTotalStats: () => {
    totalBuyAmount: number;
    totalSellAmount: number;
    totalBuyEnergy: number;
    totalSellEnergy: number;
    netAmount: number;
    netEnergy: number;
  };
}

export const useTransactionStore = create<TransactionState>((set, get) => ({
  transactions: mockInitialTransactions,

  addTransaction: (transaction) => {
    const newTransaction: Transaction = {
      ...transaction,
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    };

    set((state) => ({
      transactions: [newTransaction, ...state.transactions],
    }));

    // Log for debugging
    console.log('[TransactionStore] New transaction added:', {
      type: newTransaction.tradeType,
      amount: newTransaction.amount,
      energy: newTransaction.energyAmount,
    });
  },

  getTransactions: (filter = 'all') => {
    const { transactions } = get();
    if (filter === 'all') return transactions;
    return transactions.filter((tx) => tx.tradeType === filter);
  },

  getTotalStats: () => {
    const { transactions } = get();
    
    const buyTransactions = transactions.filter((tx) => tx.tradeType === 'buy');
    const sellTransactions = transactions.filter((tx) => tx.tradeType === 'sell');

    const totalBuyAmount = buyTransactions.reduce((sum, tx) => sum + (tx.amount || 0), 0);
    const totalSellAmount = sellTransactions.reduce((sum, tx) => sum + (tx.amount || 0), 0);
    const totalBuyEnergy = buyTransactions.reduce((sum, tx) => sum + (tx.energyAmount || 0), 0);
    const totalSellEnergy = sellTransactions.reduce((sum, tx) => sum + (tx.energyAmount || 0), 0);

    return {
      totalBuyAmount,
      totalSellAmount,
      totalBuyEnergy,
      totalSellEnergy,
      netAmount: totalSellAmount - totalBuyAmount,
      netEnergy: totalSellEnergy - totalBuyEnergy,
    };
  },
}));
