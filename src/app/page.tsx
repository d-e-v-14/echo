"use client";

export const dynamic = "force-dynamic";

import React, { Suspense, useEffect, useRef, useState } from "react";
import SharkWithEyes from "@/components/shark";
import AOS from "aos";
// import "aos/dist/aos.css";
import { useRouter } from "next/navigation";
import Modal from "react-modal";
import { FaGoogle } from "react-icons/fa";
import { supabase } from "@/lib/supabaseClient";
import { tokenStore } from "@/lib/auth/tokenStore";
import InlineSpinner from "@/components/loading/InlineSpinner";
import { toast } from "@/contexts/ToastContext";
import { getAuthErrorMessage } from "@/components/toast/errorNormalizer";
import { SignInNotice } from "@/components/SignInNotice";
import { buildPath } from "@/lib/navigation/paths";

Modal.setAppElement("body");

export default function Home() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [showNavbar, setShowNavbar] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [showPopup] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  const handleGoogleSignIn = async () => {
    if (signingIn) return;
    setSigningIn(true);
    const next = new URLSearchParams(window.location.search).get("next");
    if (next) {
      localStorage.setItem("redirectAfterLogin", next);
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/oauth-callback`,
        queryParams: {
          prompt: "select_account",
        },
      },
    });

    if (error) {
      console.error("Error initiating Google sign-in:", error);
      toast.error(getAuthErrorMessage(error));
      setSigningIn(false);
    }
  };

  const signedInCheckedRef = useRef(false);

  useEffect(() => {
    if (signedInCheckedRef.current) return;
    signedInCheckedRef.current = true;

    if (!tokenStore.hasRefreshToken()) return;

    setSignedIn(true);
    toast.warning("You're signed in. Please log out to visit the Google sign-in page.");
    router.replace(buildPath("SERVERS"));
  }, [router]);

  useEffect(() => {
    let didFinish = false;
    const bgImage = new Image();

    bgImage.src = "/bg1.webp";

    const finalize = () => {
      if (didFinish) return;

      didFinish = true;
      setLoading(false);
    };

    if (bgImage.complete) {
      finalize();
    } else {
      bgImage.onload = finalize;
      bgImage.onerror = finalize;
    }

    const fallbackTimer = setTimeout(finalize, 1500);

    return () => {
      bgImage.onload = null;
      bgImage.onerror = null;
      clearTimeout(fallbackTimer);
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY < 10) {
        setShowNavbar(true);
      } else if (currentScrollY > lastScrollY) {
        setShowNavbar(false);
      } else {
        setShowNavbar(true);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll);

    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    handleResize();

    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash;
      if (!hash) return;
      const params = new URLSearchParams(hash.substring(1));
      const type = params.get("type");
      const token = params.get("access_token");

      if (token && type === "recovery") {
        // Let Supabase ingest the recovery hash into the local session, then
        // forward to the reset page without leaking the token in the URL.
        supabase.auth.getSession().then(() => {
          router.replace(buildPath("RESET_PASSWORD"));
        });
      }
    }
  }, [router]);

  useEffect(() => {
    if (isMobile && showPopup) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [showPopup, isMobile]);

  useEffect(() => {
    AOS.init({
      duration: 800,
      once: true,
    });
  }, []);

  /* Hide scrollbar visually while preserving scrolling */
  useEffect(() => {
    const style = document.createElement("style");

    style.innerHTML = `
      html {
        scrollbar-width: none;
        -ms-overflow-style: none;
      }

      html::-webkit-scrollbar {
        display: none;
        width: 0;
        height: 0;
      }

      body {
        overflow-x: hidden;
      }
    `;

    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <>
      <Suspense fallback={null}>
        <SignInNotice />
      </Suspense>

      {/* Initial Loading Screen */}
      <div
        className={`
          fixed inset-0 z-[9999]
          flex items-center justify-center
          bg-black
          transition-opacity duration-700 ease-in-out
          ${loading ? "opacity-100" : "pointer-events-none opacity-0"}
        `}
      >
        <div
          className={`
            flex flex-col items-center
            text-center
            transition-all duration-700
            ${loading ? "scale-100 opacity-100" : "scale-95 opacity-0"}
          `}
        >
          <div className="mb-6">
            <div className="relative inline-block">
              <div className="font-jersey text-[64px] font-normal text-white">
                echo
              </div>

              <svg
                width="13"
                height="34"
                className="absolute left-[116px] top-[34px]"
                fill="none"
              >
                <path
                  d="M2 2C14.2659 13.7159 13.7311 20.2841 2 32"
                  stroke="white"
                  strokeWidth="4"
                />
              </svg>

              <svg
                width="16"
                height="46"
                className="absolute left-[120px] top-[28px]"
                fill="none"
              >
                <path
                  d="M2 2C18.3545 18.4022 17.6415 27.5977 2 44"
                  stroke="white"
                  strokeWidth="4"
                />
              </svg>
            </div>
          </div>

          <InlineSpinner
            size="lg"
            className="mx-auto"
            label="Loading"
          />
        </div>
      </div>

      {/* Main Page */}
      <div className="relative min-h-screen w-screen overflow-x-hidden">
        {/* Background */}
        <div
          className="fixed inset-0 -z-20 bg-[url('/bg1.webp')] bg-cover bg-center"
          aria-hidden="true"
        />

        {/* Navbar + Events Banner */}
        <div className={`fixed left-0 top-6 z-50 w-full transition-transform duration-300 ${showNavbar ? "translate-y-0" : "-translate-y-full"}`}>
          <div className="mx-auto w-full max-w-6xl px-4 py-4">
            <nav className="mx-auto flex w-fit max-w-full flex-wrap items-center justify-center gap-1 rounded-2xl border border-white/10 bg-black/90 px-3 py-2 backdrop-blur-md">
              <span className="px-2 text-[12px] font-semibold uppercase tracking-wider text-white/80">
                Upcoming Events
              </span>

              <a
                href="https://gravitas.vit.ac.in/events/4160a46a-3701-4622-8e7c-66909769704b"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-[13px] font-semibold text-white/85 transition-colors hover:bg-white/10 hover:text-white"
              >
                <img src="/battlecode_logo.webp" alt="Battlecode logo" className="h-6 w-6 object-contain" />
                Battlecode
              </a>

              <a
                href="https://gravitas.vit.ac.in/events/d440eb17-cc8b-4651-943a-1d449a2efeee"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-[13px] font-semibold text-white/85 transition-colors hover:bg-white/10 hover:text-white"
              >
                <img src="/redefine_logo.webp" alt="Redeine logo" className="h-6 w-6 object-contain" />
                Redeine
              </a>

              <a
                href="https://gravitas.vit.ac.in/events/abc220f9-a716-4235-b108-a96c25cfdb9d"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-[13px] font-semibold text-white/85 transition-colors hover:bg-white/10 hover:text-white"
              >
                <img src="/what_the_flag_logo.webp" alt="What the Flag logo" className="h-6 w-6 object-contain" />
                What the Flag
              </a>
            </nav>
          </div>
        </div>

        {/* Hero */}
        <section
          className="
            relative
            flex h-screen
            items-center
            overflow-hidden
            px-6
            pt-24
            pb-12
            md:px-12
            md:pt-28
            md:pb-16
            lg:px-20
            xl:px-28
          "
        >
          <div
            className="
              mx-auto
              flex w-full max-w-[1500px]
              items-center
              justify-between
              gap-10
              lg:gap-14
              xl:gap-20
            "
          >
            {/* Left Content */}
            <div
              className="
                flex w-full
                max-w-[620px]
                flex-col
                justify-center
                text-white
                md:w-[54%]
                lg:w-[48%]
              "
              data-aos="fade-right"
            >
              <h1
                className="
                  max-w-[620px]
                  text-[40px]
                  font-semibold
                  leading-[1.08]
                  tracking-[-0.02em]
                  sm:text-[48px]
                  md:text-[56px]
                  lg:text-[60px]
                  xl:text-[68px]
                "
              >
                IEEE
                <br />
                Computer Society
              </h1>

              <p
                className="
                  mt-5
                  max-w-[540px]
                  text-[16px]
                  leading-7
                  text-white/85
                  sm:text-[17px]
                  md:text-lg
                  lg:text-xl
                "
                data-aos="fade-right"
                data-aos-delay="100"
              >
                We promote learning, innovation, and collaboration in
                technology. Explore new ideas, build meaningful projects,
                sharpen your skills, and grow alongside a community of
                passionate computer science enthusiasts.
              </p>

              {/* Google Login */}
              <div
                className="mt-8"
                data-aos="fade-right"
                data-aos-delay="180"
              >
{signedIn ? (
                  <div className="inline-flex min-h-[50px] items-center justify-center gap-3 rounded-lg bg-white/5 px-5 py-3 text-[15px] font-semibold text-[#b5bac1]">
                    <InlineSpinner size="sm" />
                    <span>Redirecting to servers&hellip;</span>
                  </div>
                ) : (
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={signingIn}
                  className="
                    inline-flex
                    min-h-[50px]
                    items-center
                    justify-center
                    gap-3
                    rounded-lg
                    bg-white
                    px-5
                    py-3
                    text-[15px]
                    font-semibold
                    text-gray-800
                    shadow-lg
                    transition-all
                    duration-200
                    hover:-translate-y-0.5
                    hover:bg-gray-100
                    hover:shadow-xl
                    active:translate-y-0
                    disabled:cursor-not-allowed
                    disabled:opacity-70
                  "
                >
                  {signingIn ? (
                    <>
                      <InlineSpinner size="sm" className="border-gray-300 border-t-[#4285F4]" />
                      <span>Redirecting to Google…</span>
                    </>
                  ) : (
                    <>
                      <FaGoogle className="text-[19px] text-[#4285F4]" />
                      <span>Continue with Google</span>
                    </>
                  )}
                </button>
                )}
              </div>
            </div>

            {/* Right Visual */}
            <div
              className="
                hidden
                w-[46%]
                items-center
                justify-center
                md:flex
                lg:w-[50%]
              "
              data-aos="zoom-in"
            >
              <div
                className="
                  flex
                  w-full
                  max-w-[720px]
                  items-center
                  justify-center
                "
              >
                <SharkWithEyes />
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

