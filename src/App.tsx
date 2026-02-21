import * as React from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import GlobalErrorBoundary from "@/components/GlobalErrorBoundary";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import Home from "@/pages/Index";
import Deploy from "@/pages/Deploy";
import Dashboard from "@/pages/Dashboard";
import Auth from "@/pages/Auth";
import Checkout from "@/pages/Checkout";
import Success from "@/pages/Success";
import Status from "@/pages/Status";
import Support from "@/pages/Support";
import FAQ from "@/pages/FAQ";
import Blog from "@/pages/Blog";
import Discord from "@/pages/Discord";
import Affiliate from "@/pages/Affiliate";
import Privacy from "@/pages/Privacy";
import Terms from "@/pages/Terms";
import NotFound from "@/pages/NotFound";
import DashboardBilling from "@/pages/DashboardBilling";
import DashboardOrder from "@/pages/DashboardOrder";
import DashboardSettings from "@/pages/DashboardSettings";
import DashboardSupport from "@/pages/DashboardSupport";
import DashboardAffiliate from "@/pages/DashboardAffiliate";
import DashboardServices from "@/pages/DashboardServices";
import MinecraftConfig from "@/pages/MinecraftConfig";
import RustConfig from "@/pages/RustConfig";
import PalworldConfig from "@/pages/PalworldConfig";
import ArkConfig from "@/pages/ArkConfig";
import TerrariaConfig from "@/pages/TerrariaConfig";
import FactorioConfig from "@/pages/FactorioConfig";
import MindustryConfig from "@/pages/MindustryConfig";
import RimworldConfig from "@/pages/RimworldConfig";
import VintageStoryConfig from "@/pages/VintageStoryConfig";
import TeeworldsConfig from "@/pages/TeeworldsConfig";
import AmongUsConfig from "@/pages/AmongUsConfig";
import VelorenConfig from "@/pages/VelorenConfig";
import CommunityPack from "@/pages/CommunityPack";
import GameExpansionPack from "@/pages/GameExpansionPack";
import GivrwrldEssentials from "@/pages/GivrwrldEssentials";
import PurchaseSuccess from "@/pages/PurchaseSuccess";
import PurchaseConfirmed from "@/pages/PurchaseConfirmed";
import VerifyEmail from "@/pages/VerifyEmail";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <TooltipProvider>
        <BrowserRouter>
          <ScrollToTop />
          <GlobalErrorBoundary>
            <div className="min-h-screen bg-gray-900 text-white">
              <Header />
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/deploy" element={<Deploy />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/verify-email" element={<VerifyEmail />} />
                {/* Checkout routes removed - using configure pages instead */}
                <Route path="/success" element={<Success />} />
                <Route path="/status" element={<Status />} />
                <Route path="/support" element={<Support />} />
                <Route path="/faq" element={<FAQ />} />
                <Route path="/blog" element={<Blog />} />
                <Route path="/discord" element={<Discord />} />
                <Route path="/affiliate" element={<Affiliate />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/dashboard/billing" element={<DashboardBilling />} />
                <Route path="/dashboard/order" element={<DashboardOrder />} />
                <Route path="/dashboard/services" element={<DashboardServices />} />
                <Route path="/dashboard/settings" element={<DashboardSettings />} />
                <Route path="/dashboard/support" element={<DashboardSupport />} />
                <Route path="/dashboard/affiliate" element={<DashboardAffiliate />} />
                <Route path="/configure/minecraft" element={<MinecraftConfig />} />
                <Route path="/configure/rust" element={<RustConfig />} />
                <Route path="/configure/palworld" element={<PalworldConfig />} />
                <Route path="/configure/ark" element={<ArkConfig />} />
                <Route path="/configure/terraria" element={<TerrariaConfig />} />
                <Route path="/configure/factorio" element={<FactorioConfig />} />
                <Route path="/configure/mindustry" element={<MindustryConfig />} />
                <Route path="/configure/rimworld" element={<RimworldConfig />} />
                <Route path="/configure/vintage-story" element={<VintageStoryConfig />} />
                <Route path="/configure/teeworlds" element={<TeeworldsConfig />} />
                <Route path="/configure/among-us" element={<AmongUsConfig />} />
                <Route path="/configure/veloren" element={<VelorenConfig />} />
                <Route path="/community-pack" element={<CommunityPack />} />
                <Route path="/game-expansion-pack" element={<GameExpansionPack />} />
                <Route path="/givrwrld-essentials" element={<GivrwrldEssentials />} />
                <Route path="/purchase-success" element={<PurchaseSuccess />} />
                <Route path="/purchase-confirmed" element={<PurchaseConfirmed />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
              <Footer />
            </div>
          </GlobalErrorBoundary>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;