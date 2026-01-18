import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { TelegramAuthProvider } from "@/components/TelegramAuthProvider";
import { CartProvider } from "@/contexts/CartContext";
import { FavoritesProvider } from "@/components/FavoritesContext";
import Index from "./pages/Index";
import SupplierRegistration from "./pages/SupplierRegistration";
import SupplierDashboard from "./pages/SupplierDashboard";
import ProductDetail from "./pages/ProductDetail";
import SearchResults from "./pages/SearchResults";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <TelegramAuthProvider>
        <CartProvider>
          <FavoritesProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/partner" element={<SupplierRegistration />} />
                <Route path="/supplier" element={<SupplierDashboard />} />
                <Route path="/product/:id" element={<ProductDetail />} />
                <Route path="/search" element={<SearchResults />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </FavoritesProvider>
        </CartProvider>
      </TelegramAuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;