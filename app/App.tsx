"use client";

import Footer from "@/components/footer";
import Header from "@/components/header";
import RecentBetsLane from "@/components/RecentBetsLane";
import MobileBottomNav from "@/components/MobileBottomNav";
import WalletConnectionDebug from "@/components/WalletConnectionDebug";

export default function App({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Header />
      <RecentBetsLane />
      <main className={`container-nav mx-auto my-16 grow pb-20 lg:pb-0`}>
        {children}
      </main>
      <Footer />
      <MobileBottomNav />
      <WalletConnectionDebug />
    </>
  );
}
