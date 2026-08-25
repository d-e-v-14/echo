"use client";

export const dynamic = "force-dynamic";

import React, { useEffect, useState } from "react";
import Navbar from "@/components/navbar";
import SharkWithEyes from "@/components/shark";
import AOS from "aos";
// import "aos/dist/aos.css";
import { useRouter } from "next/navigation";
import Modal from "react-modal";
import { FaGoogle } from "react-icons/fa";
import { supabase } from "@/lib/supabaseClient";
import InlineSpinner from "@/components/loading/InlineSpinner";

Modal.setAppElement("body");

export default function Home() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [showNavbar, setShowNavbar] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [showPopup] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const handleGoogleSignIn = async () => {
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
    }
  };

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
      const match = hash.match(/access_token=([^&]+)/);
      const token = match ? match[1] : null;

      if (token) {
        router.replace(`/reset-password?token=${token}`);
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

        {/* Navbar */}
        <div
          className={`
            fixed left-0 top-0 z-50 w-full
            transition-transform duration-300
            ${showNavbar ? "translate-y-0" : "-translate-y-full"}
          `}
        >
          <Navbar />
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
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  className="
                    inline-flex
                    min-h-[50px]
                    items-center
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
                  "
                >
                  <FaGoogle className="text-[19px] text-[#4285F4]" />

                  <span>Continue with Google</span>
                </button>
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

