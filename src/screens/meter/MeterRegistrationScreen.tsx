import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types';
import { DISCOM_NAMES } from '@/utils/constants';
import { useMeterStore } from '@/store';
import * as DocumentPicker from 'expo-document-picker';
import { ocrService } from '@/services/mlkit/ocrService';
import HardwareRequestScreen from './HardwareRequestScreen';

type MeterRegistrationScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'MeterRegistration'
>;
type MeterRegistrationScreenRouteProp = {
  params?: { isHardwareRequest?: boolean };
};

interface Props {
  navigation: MeterRegistrationScreenNavigationProp;
  route?: MeterRegistrationScreenRouteProp;
}

export default function MeterRegistrationScreen({ navigation, route }: Props) {
  // Check if this is a hardware request flow
  const isHardwareRequest = route?.params?.isHardwareRequest || false;
  const { setCurrentMeter } = useMeterStore();
  const [discomName, setDiscomName] = useState('');
  const [consumerNumber, setConsumerNumber] = useState('');
  const [meterSerialId, setMeterSerialId] = useState('');
  const [billImageUri, setBillImageUri] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDiscomPicker, setShowDiscomPicker] = useState(false);
  const [showHardwareRequest, setShowHardwareRequest] = useState(false);

  if (isHardwareRequest || showHardwareRequest) {
    return <HardwareRequestScreen navigation={navigation} />;
  }

  const handleBillUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'image/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        setBillImageUri(result.assets[0].uri);

        // Try to extract consumer number and DISCOM from bill
        try {
          const ocrResult = await ocrService.recognizeText(result.assets[0].uri);
          const extractedConsumerNumber = ocrService.extractConsumerNumber(ocrResult);
          const extractedDISCOM = ocrService.extractDISCOMName(ocrResult);

          if (extractedConsumerNumber) {
            setConsumerNumber(extractedConsumerNumber);
          }
          if (extractedDISCOM) {
            setDiscomName(extractedDISCOM);
          }
        } catch (ocrError) {
          // OCR failed, but continue with manual input
          console.log('OCR extraction failed:', ocrError);
        }
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to upload bill');
    }
  };

  const handleSubmit = async () => {
    if (!discomName || !consumerNumber || !meterSerialId) {
      Alert.alert('Validation Error', 'Please fill in all required fields');
      return;
    }

    if (!billImageUri) {
      Alert.alert('Validation Error', 'Please upload your electricity bill');
      return;
    }

    setIsSubmitting(true);
    try {
      // TODO: Implement API call to register meter
      // const response = await meterService.registerMeter({
      //   discomName,
      //   consumerNumber,
      //   meterSerialId,
      //   billImageUri,
      // });

      // Mock implementation
      const mockMeter = {
        id: '1',
        userId: 'current_user_id',
        discomName,
        consumerNumber,
        meterSerialId,
        verificationStatus: 'pending' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      setCurrentMeter(mockMeter);

      Alert.alert(
        'Meter Registered',
        'Your meter has been registered and is pending verification. You will be notified once verification is complete.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to register meter');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <Text style={styles.title}>Register Your Smart Meter</Text>
          <Text style={styles.subtitle}>
            Connect your existing smart meter to start trading energy
          </Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>DISCOM Name *</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowDiscomPicker(!showDiscomPicker)}
            >
              <Text style={[styles.pickerText, !discomName && styles.placeholder]}>
                {discomName || 'Select DISCOM'}
              </Text>
              <Text style={styles.pickerArrow}>▼</Text>
            </TouchableOpacity>
            {showDiscomPicker && (
              <View style={styles.pickerOptions}>
                {DISCOM_NAMES.map((discom) => (
                  <TouchableOpacity
                    key={discom}
                    style={styles.pickerOption}
                    onPress={() => {
                      setDiscomName(discom);
                      setShowDiscomPicker(false);
                    }}
                  >
                    <Text style={styles.pickerOptionText}>{discom}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Consumer Number *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your consumer number"
              value={consumerNumber}
              onChangeText={setConsumerNumber}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Meter Serial ID *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter meter serial ID"
              value={meterSerialId}
              onChangeText={setMeterSerialId}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Electricity Bill *</Text>
            <TouchableOpacity style={styles.uploadButton} onPress={handleBillUpload}>
              <Text style={styles.uploadButtonText}>
                {billImageUri ? 'Bill Uploaded ✓' : 'Upload Latest Electricity Bill'}
              </Text>
            </TouchableOpacity>
            {billImageUri && (
              <Text style={styles.uploadHint}>
                Bill uploaded successfully. Consumer number and DISCOM will be auto-extracted if
                possible.
              </Text>
            )}
          </View>

          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.submitButtonText}>Register Meter</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.hardwareRequestButton}
            onPress={() => setShowHardwareRequest(true)}
          >
            <Text style={styles.hardwareRequestText}>
              Don't have a Smart Meter? Request Installation
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 20,
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
    padding: 12,
    fontSize: 16,
    color: '#111827',
  },
  pickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
  },
  pickerText: {
    fontSize: 16,
    color: '#111827',
  },
  placeholder: {
    color: '#9ca3af',
  },
  pickerArrow: {
    fontSize: 12,
    color: '#6b7280',
  },
  pickerOptions: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    maxHeight: 200,
  },
  pickerOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  pickerOptionText: {
    fontSize: 16,
    color: '#111827',
  },
  uploadButton: {
    borderWidth: 2,
    borderColor: '#10b981',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 24,
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
  },
  uploadButtonText: {
    fontSize: 16,
    color: '#10b981',
    fontWeight: '600',
  },
  uploadHint: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 8,
    fontStyle: 'italic',
  },
  submitButton: {
    backgroundColor: '#10b981',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  hardwareRequestButton: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  hardwareRequestText: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '500',
  },
});
