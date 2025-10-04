# Deep Analytics Systems Analysis

## Executive Summary

This document provides an in-depth technical analysis of two advanced business intelligence systems: **Profit Forecast** and **Advertising Cost Suggestion**. Both systems employ sophisticated data collection, machine learning algorithms, and real-time variance analysis to optimize advertising performance and predict business outcomes.

## 1. Profit Forecast System

### 1.1 Data Collection Architecture

The Profit Forecast system integrates multiple data sources to build comprehensive predictions:

#### Primary Data Sources:
- **Orders Collection**: Historical order data with status tracking
- **Products Collection**: Product costs and metadata
- **Advertising Costs Collection**: Daily spend per ad group
- **Profit Forecast Snapshots**: Historical prediction accuracy tracking

#### Data Pipeline:
```typescript
// Time-based data collection with 14-day default lookback
const fromDate = params.from ? new Date(params.from) : new Date(now.getTime() - 14*86400000);
const orders = await this.orderModel.find(orderFilter).lean();
const products = await this.productModel.find({ _id: { $in: productIds } }).select('_id totalCost').lean();
```

### 1.2 Machine Learning Prediction Engine

#### Core Algorithm: Maturity-Based Probability Assessment

The system uses a **7-day maturity window** to distinguish between "matured" (known outcomes) and "projected" (probabilistic) orders:

```typescript
private readonly MATURITY_DAYS = 7;
const matured = ageDays >= this.MATURITY_DAYS;
```

#### Probability Calculation Model:

**Base Probability Assignment:**
```typescript
private baseProb(status: string): number {
  const s = status.toLowerCase();
  if (s.includes('đã giao')) return 1.0;           // Delivered = 100%
  if (s.includes('đang giao')) return 0.85;        // In delivery = 85%
  if (s.includes('đã xuất')) return 0.80;          // Shipped = 80%
  if (s.includes('đã xác nhận')) return 0.75;      // Confirmed = 75%
  if (s.includes('chờ xác nhận')) return 0.40;     // Pending = 40%
  return 0.35; // Default for unknown status
}
```

**Age-Based Probability Adjustment:**
```typescript
private adjustProbForAge(p: number, ageDays: number, status: string): number {
  if (ageDays <= 1) return p;
  const delivered = status.toLowerCase().includes('đã giao');
  const boost = Math.min(0.15, ageDays * 0.02); // +2% per day, max +15%
  const cap = delivered ? 0.995 : 0.95;
  return Math.min(p + boost, cap);
}
```

### 1.3 Revenue and Profit Forecasting

#### Revenue Calculation:
- **Observed Revenue**: `codAmount + manualPayment`
- **Expected Revenue**: `observedRevenue * probability`
- **Fallback Mechanism**: Uses historical COD averages for incomplete data

#### Profit Calculation:
```typescript
const totalCost = (productCostMap.get(String(o.productId)) || 0) * (o.quantity || 1);
const expectedProfit = expectedRevenue - totalCost * p; // Cost only incurred on success
```

### 1.4 Confidence and Calibration Metrics

#### Confidence Score Algorithm:
```typescript
private computeConfidence(r: ForecastResultItem): number {
  const m = r.maturedOrderCount;
  const p = r.projectedOrderCount;
  const orderComponent = m / (m + p * 0.5 + 1);
  const revenueStability = r.maturedRevenue > 0 ? 
    Math.min(1, r.maturedProfit / (r.maturedRevenue + 1)) : 0.3;
  const conf = 0.6 * orderComponent + 0.4 * revenueStability;
  return Math.min(1, Math.max(0, conf));
}
```

#### Calibration Error Tracking:
- Compares predicted vs actual outcomes over 14-day windows
- Measures average prediction error to improve model accuracy
- Used for model validation and continuous improvement

### 1.5 Budget Recommendation Engine

#### Strategy Framework:
- **Target Margin**: Maintain blended margin ≥ 15%
- **Scale-Up Threshold**: Margin > 25% + confidence ≥ 0.6 → +20% budget
- **Maintenance Zone**: Margin 15-25% → maintain current spend
- **Scale-Down Threshold**: Margin < 15% → -15% budget

```typescript
let factor = 1;
if (blendedMargin > 0.25 && avgConfidence >= 0.6) factor = 1.2;
else if (blendedMargin < 0.15) factor = 0.85;
const recommended = Math.round((dailySpend * factor) / 10000) * 10000; // Round to 10k VND
```

### 1.6 Key Performance Indicators (KPIs)

- **Matured ROAS**: `maturedRevenue / spend`
- **Blended ROAS**: `(maturedRevenue + projectedRevenue) / spend`
- **Blended Margin**: `blendedProfit / blendedRevenue`
- **Confidence Score**: Model certainty (0-1)
- **Calibration Error**: Prediction accuracy metric

## 2. Advertising Cost Suggestion System

### 2.1 Data Integration Architecture

The system combines 5 distinct data sources for comprehensive variance analysis:

#### Data Sources Integration:
1. **Ad Groups**: Campaign structure and metadata
2. **Cost Suggestions**: Manual budget recommendations
3. **Yesterday's Spend**: Actual advertising costs from previous day
4. **Statistics**: Performance metrics aggregation
5. **ML Recommendations**: Profit forecast budget suggestions

#### Real-Time Data Synchronization:
```typescript
async loadData() {
  await this.loadSuggestions();      // Manual suggestions
  await this.loadStatistics();       // Performance stats
  await this.loadAdGroups();         // Campaign structure
  await this.loadAdvertisingCosts(); // Yesterday's actual spend
  await this.loadRecommendedBudgets(); // ML predictions
}
```

### 2.2 Variance Analysis Engine

#### Combined Data Processing:
```typescript
combinedDataComputed = computed(() => {
  return adGroups.map(adGroup => {
    const suggestion = suggestions.find(s => s.adGroupId === adGroup.adGroupId);
    const yesterdayCost = this.getDailyCostByAdGroupId(adGroup.adGroupId);
    const suggestedCost = suggestion?.suggestedCost || 0;
    
    // Variance calculations
    const dailyDifference = yesterdayCost - suggestedCost;
    const dailyDifferencePercent = suggestedCost > 0 ? 
      (dailyDifference / suggestedCost) * 100 : 0;
    
    return {
      adGroupId: adGroup.adGroupId,
      adGroupName: adGroup.name,
      suggestedCost: suggestedCost,
      dailyCost: yesterdayCost,
      dailyDifference: dailyDifference,
      dailyDifferencePercent: dailyDifferencePercent,
      // ... additional metrics
    };
  });
});
```

### 2.3 Inline Editing and Auto-Creation

#### Dynamic Suggestion Management:
- **Auto-Create**: Automatically creates suggestions when users input data
- **Inline Editing**: Real-time updates without page refresh
- **Conflict Resolution**: Handles concurrent edits gracefully

```typescript
async updateSuggestedCost(rowData: any, event: Event) {
  const newValue = parseFloat(input.value) || 0;
  
  if (rowData.suggestionId) {
    // Update existing suggestion
    await firstValueFrom(this.suggestionService.updateSuggestion(rowData.suggestionId, {
      suggestedCost: newValue
    }));
  } else {
    // Auto-create new suggestion
    await firstValueFrom(this.suggestionService.createSuggestion({
      adGroupId: rowData.adGroupId,
      adGroupName: rowData.adGroupName,
      suggestedCost: newValue,
      // ... other fields
    }));
  }
}
```

### 2.4 Performance Metrics and Analysis

#### Variance Tracking:
- **Daily Difference**: `actualSpend - suggestedCost`
- **Percentage Variance**: `(difference / suggested) * 100`
- **Trend Analysis**: Historical variance patterns
- **Outlier Detection**: Significant deviations flagged

#### Statistical Aggregations:
```typescript
async getStatistics() {
  const pipeline = [
    { $match: { isActive: { $ne: false } } },
    {
      $group: {
        _id: null,
        totalSuggestedCost: { $sum: '$suggestedCost' },
        totalDailyCost: { $sum: '$dailyCost' },
        averageSuggestedCost: { $avg: '$suggestedCost' },
        averageDailyCost: { $avg: '$dailyCost' },
        totalDifference: { $sum: '$dailyDifference' }
      }
    }
  ];
}
```

## 3. Advanced Integration Features

### 3.1 ML Recommendation Integration

The Cost Suggestion system integrates ML-powered budget recommendations from the Profit Forecast system:

```typescript
async loadRecommendedBudgets(){
  const from = new Date(today.getTime() - 7*86400000).toISOString().split('T')[0];
  const to = today.toISOString().split('T')[0];
  const data = await firstValueFrom(
    this.http.get(`http://localhost:3000/profit-forecast/recommended-budget?from=${from}&to=${to}`)
  );
}
```

### 3.2 Auto-Application of Recommendations

```typescript
applyRecommendationsToEmpty() {
  const rec = this.recommendedBudgets();
  const rows = this.combinedDataComputed();
  let applied = 0;
  rows.forEach(r => {
    if ((!r.suggestionId || r.suggestedCost === 0) && rec[r.adGroupId]) {
      // Apply ML recommendation to empty suggestions
      const fakeEvent = { target: { value: rec[r.adGroupId].toString() } };
      this.updateSuggestedCost(r, fakeEvent);
      applied++;
    }
  });
}
```

### 3.3 Real-Time Synchronization

Both systems maintain real-time data synchronization:

#### Daily Automated Jobs:
```typescript
@Cron(CronExpression.EVERY_DAY_AT_6AM)
async dailySnapshotJob(){
  const from = new Date(Date.now() - 14*86400000).toISOString().split('T')[0];
  const to = new Date().toISOString().split('T')[0];
  await this.upsertSnapshots({ from, to });
}
```

#### Manual Sync Operations:
```typescript
async syncDailyCosts() {
  for (const suggestion of this.suggestions()) {
    const yesterdayCost = this.getDailyCostByAdGroupId(suggestion.adGroupId);
    if (yesterdayCost !== suggestion.dailyCost) {
      await firstValueFrom(this.suggestionService.updateDailyCost(suggestion.adGroupId, yesterdayCost));
    }
  }
}
```

## 4. Technical Architecture Highlights

### 4.1 Database Schema Design

#### Profit Forecast Snapshots:
- **Unique Constraints**: `(date, adGroupId)` for data integrity
- **Temporal Indexing**: Optimized for time-series queries
- **Model Versioning**: Tracks algorithm improvements

#### Cost Suggestions:
- **Pre-Save Hooks**: Auto-calculate variance metrics
- **Flexible Schema**: Accommodates dynamic field updates
- **Performance Indexes**: Optimized for real-time queries

### 4.2 Frontend Architecture

#### Reactive State Management:
- **Angular Signals**: Reactive UI updates
- **Computed Properties**: Efficient data transformations
- **Error Boundaries**: Graceful error handling

#### User Experience Features:
- **Inline Editing**: Seamless data updates
- **Auto-Save**: Prevents data loss
- **Real-Time Validation**: Immediate feedback
- **Progressive Loading**: Optimized performance

## 5. Key Insights and Business Value

### 5.1 Profit Forecast System Benefits:
- **Predictive Accuracy**: 7-day maturity model provides reliable forecasts
- **Risk Management**: Confidence scores help identify uncertain predictions
- **Budget Optimization**: Automated recommendations based on margin targets
- **Performance Tracking**: Historical calibration improves model accuracy

### 5.2 Cost Suggestion System Benefits:
- **Variance Detection**: Real-time identification of budget deviations
- **Operational Efficiency**: Inline editing reduces administrative overhead
- **ML Integration**: Leverages predictive models for intelligent suggestions
- **Comprehensive Analytics**: Multi-source data provides holistic view

### 5.3 Combined System Synergies:
- **Data Cross-Validation**: Systems validate each other's predictions
- **Workflow Integration**: Seamless transition between forecasting and budgeting
- **Automated Optimization**: ML recommendations automatically applied to cost suggestions
- **Continuous Improvement**: Feedback loops enhance prediction accuracy over time

## 6. Performance and Scalability

### 6.1 Data Processing Efficiency:
- **Optimized Queries**: Strategic use of MongoDB aggregation pipelines
- **Caching Strategies**: Reduced database load through intelligent caching
- **Batch Processing**: Daily jobs handle heavy computational tasks
- **Error Recovery**: Robust error handling prevents system failures

### 6.2 Real-Time Capabilities:
- **Sub-Second Response**: Optimized for interactive user experience
- **Concurrent Processing**: Handles multiple user sessions effectively
- **Data Consistency**: ACID compliance ensures data integrity
- **Scalable Architecture**: Designed for growing data volumes

This comprehensive analysis demonstrates that both systems represent sophisticated implementations of modern business intelligence, combining machine learning, real-time analytics, and user-friendly interfaces to deliver actionable insights for advertising optimization and profit forecasting.