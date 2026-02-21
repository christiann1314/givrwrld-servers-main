# Fix Duplicate Headers

The following pages need to have their Header and Footer imports removed since they're already included in App.tsx:

## Pages that need Header removed:
- VPS.tsx
- Terms.tsx
- Support.tsx
- SLA.tsx
- Status.tsx
- RustConfig.tsx
- Refund.tsx
- PurchaseSuccess.tsx
- PurchaseConfirmed.tsx
- PalworldConfig.tsx
- Privacy.tsx
- MinecraftConfig.tsx
- GivrwrldEssentials.tsx
- FAQ.tsx
- GameExpansionPack.tsx
- Deploy.tsx
- Discord.tsx
- DashboardSettings.tsx
- DashboardOrder.tsx
- CommunityPack.tsx
- Billing.tsx
- Blog.tsx
- Affiliate.tsx
- About.tsx

## Pages that need Footer removed:
- Dashboard.tsx
- VPS.tsx
- Terms.tsx
- Support.tsx
- SLA.tsx
- Status.tsx
- RustConfig.tsx
- Refund.tsx
- PurchaseSuccess.tsx
- PurchaseConfirmed.tsx
- PalworldConfig.tsx
- Privacy.tsx
- MinecraftConfig.tsx
- Index.tsx
- GivrwrldEssentials.tsx
- FAQ.tsx
- GameExpansionPack.tsx
- Deploy.tsx
- Discord.tsx
- DashboardSettings.tsx
- DashboardSupport.tsx
- DashboardBilling.tsx
- DashboardOrder.tsx
- DashboardAffiliate.tsx
- CommunityPack.tsx
- Billing.tsx
- Blog.tsx
- Affiliate.tsx
- About.tsx

## Pages that need both removed:
Most pages need both Header and Footer removed.

## Pages that should keep their own Header/Footer:
- Auth.tsx (login page should not have main header)
- Checkout.tsx (checkout flow should not have main header)
- Success.tsx (success page should not have main header)
- NotFound.tsx (404 page should not have main header)
