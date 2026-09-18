"use client";

import { useCallback } from "react";

export function useWhatsAppShare(customerId: string, customerPhone?: string) {
  const getWhatsAppShareUrl = useCallback(() => {
    if (typeof window === "undefined" || !customerPhone) return null;

    const url = `${window.location.origin}/khata/${customerId}`;
    const text = encodeURIComponent(`Please verify your D-Khata ledger: ${url}`);

    let phone = customerPhone;
    if (phone.startsWith("0")) {
      phone = "92" + phone.substring(1);
    }

    return `https://wa.me/${phone}?text=${text}`;
  }, [customerPhone, customerId]);

  const openShareInTemporaryTab = useCallback(() => {
    if (typeof window === "undefined") return;

    const shareUrl = getWhatsAppShareUrl();
    if (!shareUrl) return;

    const shareTab = window.open(shareUrl, "_blank");
    if (!shareTab) return;

    window.setTimeout(() => {
      try {
        shareTab.close();
      } catch {
        // Ignore close failures; some browsers restrict closing after navigation.
      }
    }, 3000);
  }, [getWhatsAppShareUrl]);

  const share = useCallback(() => {
    openShareInTemporaryTab();
  }, [openShareInTemporaryTab]);

  return { share };
}
