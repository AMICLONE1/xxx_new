# OCR Flow Diagram - How It Works Now

## User Uploads Image

```
User Clicks "Upload Image"
        ↓
Gallery/Camera Opens
        ↓
Image Selected
        ↓
processImage(imageUri) called
```

## OCR Processing Flow

```
recognizeText(imageUri)
        ↓
    ┌───────────────────────────────────┐
    │  Is running in Expo Go?           │
    └───────────────────────────────────┘
           ↙                      ↘
        YES                       NO
         ↓                        ↓
    ┌─────────────────┐      ┌──────────────────────┐
    │ Try Cloud OCR   │      │ Is ML Kit available? │
    │ if configured   │      └──────────────────────┘
    └─────────────────┘              ↙        ↘
         ↓  (fails)                 YES        NO
    Return empty text               ↓         ↓
         ↓                  ┌──────────────┐  │
         └──→ text = ''     │ Use ML Kit   │  │
                            │ Extract text │  │
                            └──────────────┘  │
                                  ↓           │
                            Return text      │
                                  ↓          │
                                  └──→ Try Cloud OCR
                                       └──→ Return empty text
```

## Result Processing

```
const extracted = extractBillData(ocrText)
        ↓
    ┌─────────────────────────────────┐
    │ If ocrText is empty:            │
    │ - All fields remain empty       │
    │ - extracted = {...empty...}     │
    │                                 │
    │ If ocrText has content:         │
    │ - Parse patterns                │
    │ - Fill relevant fields          │
    │ - extracted = {...filled...}    │
    └─────────────────────────────────┘
        ↓
    setExtractedData(extracted)
    setShowForm(true)
    setIsManualEntry(!hasKeyFields)
```

## Form Display

```
if (showForm) {
        ↓
    ┌──────────────────────────────────┐
    │ Display Form with Current Data   │
    │                                  │
    │ If data is empty:                │
    │ └─ Empty input fields            │
    │ └─ Alert: "No data extracted...  │
    │    Please enter details manually" │
    │                                  │
    │ If data is filled:               │
    │ └─ Pre-filled input fields       │
    │ └─ Alert: "Extracted: Consumer   │
    │    Number, Meter Number..."      │
    │                                  │
    │ User can:                        │
    │ ├─ Edit extracted data           │
    │ ├─ Fill empty fields             │
    │ └─ Upload another image          │
    └──────────────────────────────────┘
}
```

## Form Submission

```
User clicks Submit
        ↓
    ┌─────────────────────────────────┐
    │ Validation:                     │
    │ - At least Consumer OR Meter    │
    │ - User confirmation checkbox    │
    └─────────────────────────────────┘
        ↓ (Valid)
    submitDocument()
        ↓
    API Request
        ↓
    KYC Status Updated
        ↓
    ✅ Success!
```

## Key Differences

### OLD BEHAVIOR
```
Expo Go + Try OCR
    ↓
ExpoGoDetectedError thrown
    ↓
Error handler catches
    ↓
setIsManualEntry(true)
    ↓
Form shows (but user feels like something failed)
```

### NEW BEHAVIOR
```
Expo Go + Try OCR
    ↓
No errors thrown
    ↓
Returns empty text (valid result)
    ↓
extractBillData('') = empty fields
    ↓
setShowForm(true)
    ↓
Form shows naturally
    ↓
User fills manually (no sense of failure)
```

## State Management

### Expo Go with Cloud API configured:
```
isProcessing: true
isExpoGo: true
showForm: false
  ↓
(OCR processing...)
  ↓
isProcessing: false
showForm: true
extractedData: {consumerNumber: "12345", ...}
isManualEntry: false (because cloud OCR succeeded)
```

### Expo Go without Cloud API:
```
isProcessing: true
isExpoGo: true
showForm: false
  ↓
(OCR returns empty)
  ↓
isProcessing: false
showForm: true
extractedData: {consumerNumber: '', ...}
isManualEntry: true (because no key fields found)
```

### Development Build:
```
isProcessing: true
isExpoGo: false
showForm: false
  ↓
(ML Kit OCR processes...)
  ↓
isProcessing: false
showForm: true
extractedData: {consumerNumber: "12345", ...}
isManualEntry: false (ML Kit succeeded)
```

## Error Handling

```
try {
  ocrResult = await ocrService.recognizeText(uri);
  // Always succeeds - returns empty text if OCR unavailable
  
  const extracted = extractBillData(ocrResult.text);
  setExtractedData(extracted);
  setShowForm(true);
  
} catch (error) {
  // This block rarely executes now
  // Only for unexpected errors (file read fails, etc.)
  
  Alert.alert('Unexpected error - please try again');
  setShowForm(true); // Still show form
  setIsManualEntry(true);
}
```

## Result

✅ **OCR no longer blocks the user**
- Form always appears
- User always has path forward
- No confusing error messages
- Graceful degradation to manual entry
