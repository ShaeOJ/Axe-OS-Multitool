# Mobile Features & Optimizations

This document describes the mobile-specific features and optimizations in Axe-OS Multitool.

## 📱 Mobile UI Components

### Hooks

#### `useIsMobile()`
Detects if the app is running on a mobile device.

```typescript
import { useIsMobile } from '@/hooks/use-mobile';

function MyComponent() {
  const isMobile = useIsMobile();

  return (
    <div className={isMobile ? 'mobile-layout' : 'desktop-layout'}>
      {/* content */}
    </div>
  );
}
```

**Detection criteria:**
- Screen width < 768px
- Mobile user agent (Android, iOS, etc.)

#### `usePlatform()`
Identifies the specific platform (desktop, android, ios).

```typescript
import { usePlatform } from '@/hooks/use-mobile';

function MyComponent() {
  const platform = usePlatform();

  if (platform === 'android') {
    // Android-specific code
  }
}
```

### Layout Components

#### `MobileLayout`
Wrapper that adjusts padding and spacing for mobile devices.

```typescript
import { MobileLayout } from '@/components/mobile-layout';

<MobileLayout>
  {/* Automatically adjusts padding for mobile */}
</MobileLayout>
```

#### `MobileGrid`
Responsive grid that stacks on mobile, shows columns on desktop.

```typescript
import { MobileGrid } from '@/components/mobile-layout';

<MobileGrid>
  <Card>Miner 1</Card>
  <Card>Miner 2</Card>
  <Card>Miner 3</Card>
</MobileGrid>
```

#### `MobileSafeArea`
Adds safe area insets for notches and rounded corners.

```typescript
import { MobileSafeArea } from '@/components/mobile-layout';

<MobileSafeArea>
  {/* Content respects device notches */}
</MobileSafeArea>
```

---

## 🎨 Responsive Design

### Miner Dashboard

The dashboard automatically adapts to mobile:

**Desktop:**
- Horizontal header with centered stats
- "Add Miner" button in top-right
- Multi-column grid (2-3 columns)

**Mobile:**
- Vertical stacked header
- Full-width "Add Miner" button
- Single column grid
- Compact spacing

### Miner Cards

Cards are optimized for touch:

**Touch Targets:**
- All buttons are minimum 44x44px
- Adequate spacing between interactive elements
- Large touch areas for expand/collapse

**Layout:**
- Stat circles remain visible
- Charts scale appropriately
- Dialogs use full-width on mobile

---

## ⚡ Performance Optimizations

### Mobile-Specific Adjustments

1. **Reduced Animations**
   - Fewer transitions on mobile
   - Optimized for 60fps

2. **Efficient Rendering**
   - Only visible cards are fully rendered
   - Lazy loading for detailed views

3. **Network Efficiency**
   - Same 15-second polling interval
   - Efficient data caching

### Battery Considerations

For mobile devices, consider:
- Increasing polling interval (Settings → future feature)
- Pausing updates when app is backgrounded
- Using Android WorkManager for background updates

---

## 🔧 Platform-Specific Features

### Android

**Permissions Required:**
- `INTERNET` - Connect to miners
- `ACCESS_NETWORK_STATE` - Check connectivity
- `ACCESS_WIFI_STATE` - Wi-Fi status

**Configuration:**
- Cleartext traffic enabled for HTTP connections
- Optimized for Material Design
- Support for Android 10+ (API 29+)

### iOS (Future)

**Permissions Required:**
- Local Network (NSLocalNetworkUsageDescription)
- Bonjour services (NSBonjourServices)

---

## 📐 Design Guidelines

### Spacing

- **Mobile:** 8px (0.5rem) padding
- **Desktop:** 16px (1rem) padding

### Typography

- **Mobile Headings:** Slightly smaller
- **Desktop Headings:** Larger for readability

### Touch Targets

Minimum sizes:
- Buttons: 44x44px
- Icons: 24x24px with 44x44px touch area
- Switches: Native size with adequate padding

---

## 🎯 Current Mobile Support Status

### ✅ Implemented

- [x] Mobile detection hooks
- [x] Responsive dashboard layout
- [x] Mobile-optimized header
- [x] Touch-friendly miner cards
- [x] Adaptive grid layout
- [x] Safe area support
- [x] Platform detection
- [x] Mobile layout components

### 🚧 Future Enhancements

- [ ] Pull-to-refresh gesture
- [ ] Swipe gestures for navigation
- [ ] Offline mode support
- [ ] Push notifications for alerts
- [ ] Adjustable polling interval setting
- [ ] Dark mode optimization for OLED
- [ ] Haptic feedback
- [ ] Widget support (Android)

---

## 🧪 Testing on Mobile

### Browser Testing

Use Chrome DevTools:
1. Open DevTools (F12)
2. Click "Toggle device toolbar" (Ctrl+Shift+M)
3. Select a mobile device
4. Test responsive behavior

### Emulator Testing

**Android:**
```bash
npm run tauri android dev
```

**iOS (macOS only):**
```bash
npm run tauri ios dev
```

### Physical Device Testing

1. Enable developer mode on device
2. Connect via USB
3. Run: `npm run tauri android dev`
4. App installs and launches automatically

---

## 🐛 Troubleshooting

### UI looks wrong on mobile

Check if `useIsMobile()` is working:
```typescript
console.log('Is mobile:', useIsMobile());
```

### Touch targets too small

Ensure minimum 44x44px size:
```css
.button {
  min-width: 44px;
  min-height: 44px;
}
```

### Safe area not applied

Make sure to use `MobileSafeArea` wrapper:
```typescript
<MobileSafeArea>
  {/* Your content */}
</MobileSafeArea>
```

---

## 📚 Additional Resources

- [Tauri Mobile Docs](https://v2.tauri.app/develop/)
- [React Responsive Guide](https://react.dev/)
- [Material Design Guidelines](https://m3.material.io/)
- [iOS Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)

---

**Questions?** Open an issue or check ANDROID_SETUP.md for platform-specific setup.
