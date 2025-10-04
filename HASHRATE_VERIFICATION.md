# Hashrate Verification Feature

## Overview

The auto-tuner now includes an intelligent hashrate verification system that checks the impact of every adjustment and automatically reverts changes that hurt performance.

## How It Works

### 1. **Before Making Any Adjustment**
When the auto-tuner decides to change frequency or voltage, it:
- Stores the current frequency
- Stores the current voltage
- Records the current hashrate
- Applies the new settings
- Schedules a verification check for **20 seconds later**

### 2. **Verification Check (20 seconds after change)**
The tuner performs a mid-cycle check to evaluate the impact:

#### **✅ Success Cases (Keep New Settings):**
- Hashrate increased by **1 GH/s or more**
- Hashrate stayed stable (within -100 to +1 GH/s)

#### **🔴 Revert Cases (Restore Previous Settings):**
- Hashrate dropped by **more than 100 GH/s**
- Immediately reverts to previous frequency and voltage
- Shows destructive toast notification with details

### 3. **What Gets Verified**
All tuning adjustments trigger verification:
- ✅ Temperature-based adjustments (cooling/pushing)
- ✅ Low voltage protection resets
- ✅ Auto-optimizer changes
- ✅ Flatline detection restarts (N/A - restarts miner)
- ✅ Manual adjustments via frequency boost

## Example Timeline

```
Time 0:00 - Tuner runs normal cycle
            Current: 700MHz, 1200mV, 1500 GH/s
            Decision: Increase to 710MHz, 1210mV
            Action: Apply new settings
            Schedule: Verification at 0:20

Time 0:20 - Verification check runs
            Current hashrate: 1450 GH/s
            Previous hashrate: 1500 GH/s
            Difference: -50 GH/s
            Decision: Keep (within acceptable range)

Time 1:00 - Tuner runs normal cycle again
            Current: 710MHz, 1210mV, 1450 GH/s
            Decision: Increase to 720MHz, 1220mV
            Action: Apply new settings
            Schedule: Verification at 1:20

Time 1:20 - Verification check runs
            Current hashrate: 1350 GH/s
            Previous hashrate: 1450 GH/s
            Difference: -100 GH/s (threshold)
            Decision: Keep (exactly at threshold)

Time 2:00 - Tuner runs normal cycle again
            Current: 720MHz, 1220mV, 1350 GH/s
            Decision: Increase to 730MHz, 1230mV
            Action: Apply new settings
            Schedule: Verification at 2:20

Time 2:20 - Verification check runs
            Current hashrate: 1200 GH/s
            Previous hashrate: 1350 GH/s
            Difference: -150 GH/s
            Decision: REVERT to 720MHz, 1220mV
            Toast: "Hashrate dropped 150 GH/s. Reverted..."
```

## Thresholds

```typescript
const HASHRATE_DROP_THRESHOLD = 100; // GH/s - When to revert
const HASHRATE_INCREASE_MIN = 1;     // GH/s - Minimum to be considered improvement
```

### Why These Values?

**100 GH/s Drop Threshold:**
- Typical miners run at 1000-2000+ GH/s
- 100 GH/s is ~5-10% drop - significant enough to matter
- Prevents false reverts from normal hashrate variance (±50 GH/s)
- Allows graceful handling of cooling adjustments

**1 GH/s Increase Minimum:**
- Even tiny improvements count as success
- Encourages the tuner to keep trying
- Prevents over-aggressive reversions

## Verification Logging

The system logs all verification results to the console:

```typescript
// Success
[Verification] Success: HR increased from 1500.0 to 1520.5 GH/s (+20.5 GH/s)

// Stable (acceptable)
[Verification] Stable: HR change -45.2 GH/s (within acceptable range)

// Reverted
[Verification] Reverted: HR dropped from 1500.0 to 1350.0 GH/s
```

## User Notifications

### Success/Stable
No toast notification - logs to console only

### Reverted
Shows destructive (red) toast:
```
Title: "Auto-Tuner: Reverted [Miner Name]"
Description: "Hashrate dropped 150.0 GH/s. Reverted to F:720MHz, V:1220mV"
```

## Integration with Existing Features

### Low Voltage Protection
- Drops to safe settings (525MHz, 1150mV)
- Schedules verification to confirm miner is stable
- If hashrate drops >100 GH/s after protection kicks in:
  - Won't revert (already at safe minimums)
  - But user will be notified something is wrong

### Auto-Optimizer
- Finds optimal efficiency settings
- Schedules verification
- If the "optimal" settings tank hashrate:
  - Reverts to previous settings
  - Prevents bad optimization decisions

### Temperature Control
- When cooling (reducing freq/volt):
  - Verification ensures we didn't cool too aggressively
  - Prevents unnecessary performance loss
- When pushing (increasing freq/volt):
  - Verification confirms the push was beneficial
  - Reverts if the increase caused instability

### Frequency Boost Mode
- When voltage stuck, tries frequency boost
- Verification confirms boost helped
- Reverts if frequency increase didn't improve hashrate

## Edge Cases Handled

### 1. **Multiple Adjustments in 60 Seconds**
- Only the most recent adjustment gets verified
- Previous verification is cancelled
- Prevents conflicting verifications

### 2. **Miner Restart During Verification Window**
- Hashrate drops to 0 temporarily
- Won't trigger revert (hashrate not available)
- Next cycle will pick up normal operation

### 3. **Network Issues During Verification**
- If we can't fetch current hashrate:
  - No verification performed
  - Flag is cleared
  - Waits for next successful data fetch

### 4. **Manual User Changes**
- If user manually changes settings via UI:
  - Auto-tuner verification still runs
  - Might revert user's change if it hurts performance
  - This is intentional (protection feature)

## Benefits

1. **Safety Net**
   - Prevents bad adjustments from tanking hashrate
   - Automatically recovers from mistakes

2. **Faster Optimization**
   - Tuner can be more aggressive knowing it can revert
   - Learns what doesn't work by trying and reverting

3. **Reduced Manual Intervention**
   - User doesn't need to watch for bad adjustments
   - System self-corrects automatically

4. **Better Logging**
   - Clear console logs show verification results
   - Easy to debug tuning behavior

## Limitations

1. **20-Second Delay**
   - Some hashrate changes take longer to stabilize
   - 20 seconds is a compromise between speed and accuracy

2. **100 GH/s Threshold**
   - Might be too high for very small miners (<500 GH/s)
   - Might be too low for very large miners (>5000 GH/s)
   - Consider making this configurable as percentage

3. **Single Data Point**
   - Only checks hashrate once at 20 seconds
   - Doesn't average over multiple readings
   - Could be affected by short-term variance

## Future Improvements

### Suggested Enhancements:

1. **Configurable Thresholds**
   ```typescript
   type VerificationSettings = {
     dropThresholdGHS: number;    // Default: 100
     dropThresholdPercent: number; // Default: 5 (%)
     increaseMinGHS: number;       // Default: 1
     verificationDelayMs: number;  // Default: 20000
     requireMultipleSamples: boolean; // Default: false
   };
   ```

2. **Multiple Sample Verification**
   - Check at 10s, 20s, 30s
   - Average the results
   - More accurate but slower

3. **Percentage-Based Threshold**
   - Instead of fixed 100 GH/s
   - Use 5% of current hashrate
   - Scales better across different miner sizes

4. **Revert History**
   - Track what changes got reverted
   - Learn patterns (e.g., "760MHz always fails")
   - Avoid trying known-bad settings

5. **Gradual Rollback**
   - Instead of full revert
   - Try intermediate settings
   - Find the sweet spot between old and new

## Testing Recommendations

1. **Test Beneficial Change**
   - Set miner to low frequency
   - Let auto-tuner increase it
   - Verify it keeps the increase

2. **Test Harmful Change**
   - Manually set very high frequency
   - Let auto-tuner try to increase further
   - Should revert when hashrate drops

3. **Test Cooling Scenario**
   - Block airflow (carefully!)
   - Let tuner reduce freq/volt
   - Verify it doesn't over-reduce

4. **Test Low Voltage Protection**
   - Simulate voltage drop
   - Verify it resets to safe settings
   - Verify it tracks the change

## Summary

✅ **Verification runs 20 seconds after every adjustment**
✅ **Reverts if hashrate drops >100 GH/s**
✅ **Keeps settings if hashrate improves ≥1 GH/s**
✅ **Keeps settings if hashrate stable (±100 GH/s)**
✅ **Works with all tuning modes**
✅ **Logs all decisions to console**
✅ **Shows toast on reversions**

This feature makes the auto-tuner much more robust and intelligent!
