# 🔧 Egg ID Corrections Needed

## Verification Results

### ✅ Correct (No Changes Needed)
- **Minecraft Paper**: Egg ID 39 ✅ (found in nest 16)
- **Terraria**: Egg ID 16 ✅
- **ARK**: Egg ID 14 ✅
- **Factorio**: Egg ID 21 ✅
- **Mindustry**: Egg ID 29 ✅
- **Rimworld**: Egg ID 26 ✅
- **Vintage Story**: Egg ID 32 ✅
- **Teeworlds**: Egg ID 33 ✅
- **Among Us**: Egg ID 34 ✅

### ❌ Incorrect (Need Updates)
- **Rust**: 
  - Current in code: 2
  - Actual options: 
    - Nest 4: Egg ID 13 (rust generic)
    - Nest 19: Egg ID 50 (Rust)
  - **Recommendation**: Use egg ID 50 (nest 19, simply named "Rust")

- **Palworld**:
  - Current in code: 3
  - Actual: Egg ID 15
  - **Fix**: Change to 15

## Summary of Changes

1. Rust: Change `eggId: 2` → `eggId: 50` (or 13 if you prefer "rust generic")
2. Palworld: Change `eggId: 3` → `eggId: 15`

