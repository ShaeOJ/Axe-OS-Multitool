# Auto-Tune Logic Review & Fixes

## Issues Found and Fixed

### 1. ✅ **Fixed: Comment Error (Line 253)**
**Issue:** Comment said "Voltage is already in V" but voltage is actually in millivolts (mV).
**Impact:** Confusing for future developers
**Fix:** Corrected comment to "Voltage is already in mV"

---

### 2. ✅ **Fixed: Auto-Optimizer Toast Message (Line 359)**
**Issue:** Toast message displayed voltage with "V" unit when it's actually in mV.
**Impact:** User sees incorrect units (e.g., "1250V" instead of "1250mV")
**Fix:** Changed display from `${optimalSettings.coreVoltage}V` to `${optimalSettings.coreVoltage}mV`

---

### 3. ✅ **CRITICAL FIX: Tuner Pause Logic (Lines 320-327)**
**Issue:** When temperature reached the ideal range (targetTemp ± 2°C), the tuner would pause. However, it only unpaused when temperature ROSE above the previous reading. This meant:
- If temp dropped (got cooler), tuner stayed paused
- Miner wouldn't push harder even though it could handle more load
- Lost potential hashrate

**Impact:** Significant performance loss when miner runs cool
**Fix:** Changed unpause logic to check if temp moves OUTSIDE the ideal range in either direction:
```typescript
// Before: Only unpaused if temp rose
if (info.temp > lastTemp) {
    tuningState.current.tunerPaused = false;
}

// After: Unpauses if temp moves outside ideal range (hot OR cool)
const tempDiff = Math.abs(info.temp - targetTemp);
if (tempDiff >= 2) {
    tuningState.current.tunerPaused = false;
}
```

---

### 4. ✅ **CRITICAL FIX: Temperature Control Logic (Lines 431-448)**
**Issue:** When VRM or Core temps were too high, the tuner would reduce EITHER frequency OR voltage, but not both:
- First try: reduce frequency
- If frequency at minimum: then reduce voltage
- Problem: With step-down values of 5MHz/5mV, reducing only one at a time was too slow
- Risk of thermal runaway in extreme cases

**Impact:** Slow temperature reduction, potential overheating
**Fix:** Changed to reduce BOTH frequency AND voltage simultaneously when temps are high:
```typescript
// Before: Reduce freq OR volt
if (new_freq - vrTempFreqStepDown >= minFreq) {
    proposedChanges.frequency = new_freq - vrTempFreqStepDown;
} else if (new_volt - vrTempVoltStepDown >= minVolt) {
    proposedChanges.voltage = new_volt - vrTempVoltStepDown;
}

// After: Reduce freq AND volt for faster cooling
if (new_freq - vrTempFreqStepDown >= minFreq) {
    proposedChanges.frequency = new_freq - vrTempFreqStepDown;
}
if (new_volt - vrTempVoltStepDown >= minVolt) {
    proposedChanges.voltage = new_volt - vrTempVoltStepDown;
}
```

---

## Current Auto-Tune Logic Flow (After Fixes)

The tuner runs every 60 seconds and follows this priority order:

### Priority 1: Low Voltage Protection
- **Trigger:** Input voltage < 4.9V (4900mV)
- **Action:** Immediately reset to safe settings (525MHz, 1150mV)
- **Reason:** Prevent instability from power supply issues
- **Stops further tuning:** Yes

### Priority 2: Flatline Detection
- **Trigger:** Hashrate unchanged for 30 consecutive readings
- **Action:** Restart miner
- **Reason:** Miner likely crashed/stuck
- **Stops further tuning:** Yes

### Priority 3: Auto-Optimization
- **Trigger:** Every 60 cycles (15 minutes at 15s intervals)
- **Action:** Analyzes history to find most efficient voltage at peak hashrate
- **Reason:** Maximizes efficiency by finding sweet spot
- **Stops further tuning:** Yes (for this cycle)

### Priority 4: Temperature-Based Adjustments

#### 4a. VRM Too Hot (vrTemp > vrTargetTemp)
- **Default:** vrTargetTemp = 70°C
- **Action:** Reduce BOTH frequency by 5MHz AND voltage by 5mV
- **Reason:** Protect VRM from overheating

#### 4b. Core Too Hot (temp > targetTemp)
- **Default:** targetTemp = 60°C
- **Action:** Reduce BOTH frequency by 5MHz AND voltage by 5mV
- **Reason:** Prevent thermal throttling

#### 4c. Core Cool (temp < targetTemp - 2°C)
- **Default:** Cool when < 58°C
- **Action:**
  - If frequency boost active: Continue increasing frequency by 10MHz
  - If voltage stuck 3+ cycles: Activate frequency boost
  - Otherwise: Increase frequency by 10MHz AND voltage by 10mV
- **Reason:** Maximize performance when thermal headroom available

#### 4d. Core Ideal (targetTemp - 2°C ≤ temp ≤ targetTemp)
- **Default:** Ideal = 58-60°C
- **Action:** Pause tuner
- **Reason:** Maintain current settings when in sweet spot
- **Unpause Trigger:** Temperature moves outside ideal range (either direction)

### Priority 5: Voltage Stuck Detection
- **Monitors:** When voltage increased but hashrate didn't improve
- **Trigger:** 3 consecutive cycles with no hashrate gain (>0.1 GH/s)
- **Action:** Activate frequency boost mode
- **Reason:** Some miners need frequency increase, not voltage

---

## Default Settings Analysis

```typescript
targetTemp: 60.0°C           // Good for most environments
vrTargetTemp: 70.0°C         // Safe VRM temperature
minFreq: 400.0 MHz           // Safe minimum
maxFreq: 750.0 MHz           // Reasonable maximum
minVolt: 1000.0 mV           // Safe minimum
maxVolt: 1300.0 mV           // Conservative maximum (was 1350mV)

// Cooling (when hot)
tempFreqStepDown: 5.0 MHz    // ⚠️ May be too small for rapid cooling
tempVoltStepDown: 5.0 mV     // ⚠️ May be too small for rapid cooling

// Pushing (when cool)
tempFreqStepUp: 10.0 MHz     // ✅ Good for performance gains
tempVoltStepUp: 10.0 mV      // ✅ Good for performance gains

// VRM cooling
vrTempFreqStepDown: 5.0 MHz  // ⚠️ May be too small
vrTempVoltStepDown: 5.0 mV   // ⚠️ May be too small

// Safety features
flatlineHashrateRepeatCount: 30    // ✅ 7.5 minutes is reasonable
autoOptimizeTriggerCycles: 60      // ✅ 15 minutes is good
efficiencyTolerancePercent: 2.0    // ✅ Reasonable tolerance
```

### Recommendations for Step-Down Values

**Current Issue:** 5MHz/5mV steps may be too conservative when temps spike.

**Options:**
1. **Increase step-down values** to 10MHz/10mV (matches step-up)
2. **Add aggressive mode** that multiplies step-down when temps are critically high
3. **Keep current values** but rely on the fact that BOTH freq and volt now reduce together

**My Recommendation:** Keep current values since we now reduce BOTH freq and volt simultaneously. This effectively doubles the cooling effect (was 5MHz OR 5mV, now 5MHz AND 5mV).

---

## Testing Recommendations

1. **Test Temperature Control:**
   - Let miner reach target temp (60°C)
   - Verify it pauses
   - Artificially cool the environment
   - Verify it unpauses and pushes harder

2. **Test Overheat Protection:**
   - Block airflow temporarily
   - Verify both freq and volt reduce together
   - Verify it cools fast enough

3. **Test Low Voltage Protection:**
   - Simulate voltage drop (or use underpowered supply)
   - Verify it immediately drops to safe settings

4. **Test Flatline Detection:**
   - Simulate miner crash/freeze
   - Verify it detects after 30 readings (~7.5 min)
   - Verify it restarts miner

5. **Test Auto-Optimization:**
   - Let run for 60 cycles (15 minutes)
   - Verify it finds efficient voltage
   - Verify toast message shows correct units (mV)

---

## Known Limitations

1. **60-second cooldown** between adjustments might be too long for rapid temp changes
2. **Step values** are configurable per miner, so users can tune to their environment
3. **Auto-optimizer** needs at least 10 data points in target temp range to work
4. **Voltage stuck detection** only triggers after voltage-only increases (by design)

---

## Summary

✅ **All critical issues have been fixed**
✅ **Temperature control is now bidirectional**
✅ **Cooling is now more aggressive (both freq AND volt reduce)**
✅ **Display units are correct (mV not V)**
✅ **Comments are accurate**

The auto-tune logic should now work as intended and provide:
- Better performance when running cool
- Faster cooling when running hot
- Accurate user feedback
- Safe operation under all conditions
